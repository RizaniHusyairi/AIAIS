<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Tourism;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Destinasi wisata di sekitar bandara.
 *
 * Daftar publik hanya memuat destinasi berstatus `published`; daftar admin
 * memuat semuanya. Berbeda dari modul dokumen, destinasi yang fotonya belum
 * ada TETAP ditayangkan — nama, alamat, dan keterangannya sudah berguna bagi
 * pengunjung, dan tampilan menangani ketiadaan foto lewat `has_cover`.
 *
 * Foto sampul dan foto galeri diunggah terpisah: sampul selalu satu dan
 * mengganti yang lama, sedangkan galeri bertambah. Menyatukannya dalam satu
 * permintaan akan membuat "ganti sampul" tidak sengaja menghapus galeri.
 */
class TourismController extends Controller
{
    private const DIR_SAMPUL = 'tourism/covers';

    private const DIR_GALERI = 'tourism/gallery';

    /** Daftar publik. `?category=` menyaring jenis destinasi. */
    public function index(Request $request)
    {
        $items = Tourism::query()
            ->where('status', 'published')
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->orderBy('name')
            ->get();

        return ApiResponse::success($items, 'Daftar destinasi wisata');
    }

    /** Satu destinasi berdasarkan slug. */
    public function show(string $slug)
    {
        $item = Tourism::where('slug', $slug)->where('status', 'published')->first();

        if (! $item) {
            return ApiResponse::error('Destinasi tidak ditemukan.', null, 404);
        }

        return ApiResponse::success($item, 'Detail destinasi wisata');
    }

    /** Daftar admin — termasuk yang masih draf. */
    public function adminIndex()
    {
        return ApiResponse::success(Tourism::orderBy('name')->get(), 'Daftar seluruh destinasi');
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $validated['gallery'] = [];

        $sampul = $this->simpanSampul($request);
        if ($sampul !== null) {
            $validated['cover_image'] = $sampul;
        }

        $item = Tourism::create($validated);
        $this->tambahGaleri($request, $item);

        return ApiResponse::success($item->fresh(), 'Destinasi berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = Tourism::findOrFail($id);
        $validated = $this->validated($request, $item->id);

        // Sampul lama baru dihapus setelah yang baru tersimpan, supaya
        // kegagalan unggahan tidak meninggalkan destinasi tanpa foto.
        $sampul = $this->simpanSampul($request);

        if ($sampul !== null) {
            $lama = $item->cover_image;
            $validated['cover_image'] = $sampul;
            $item->update($validated);
            $this->hapusBerkas($lama);
        } else {
            $item->update($validated);
        }

        $this->tambahGaleri($request, $item);

        return ApiResponse::success($item->fresh(), 'Destinasi berhasil diperbarui');
    }

    /** Hapus satu foto dari galeri, berikut berkasnya. */
    public function destroyGalleryItem(Request $request, $id)
    {
        $item = Tourism::findOrFail($id);

        $request->validate([
            'path' => 'required|string',
        ], ['path.required' => 'Lintasan foto wajib disertakan.']);

        $lintasan = $request->input('path');
        $galeri = array_values(array_filter($item->gallery ?? [], fn ($p) => $p !== $lintasan));

        $item->update(['gallery' => $galeri]);
        $this->hapusBerkas($lintasan);

        return ApiResponse::success($item->fresh(), 'Foto galeri berhasil dihapus');
    }

    public function destroy($id)
    {
        $item = Tourism::findOrFail($id);
        $berkas = array_merge([$item->cover_image], $item->gallery ?? []);

        $item->delete();

        foreach ($berkas as $lintasan) {
            $this->hapusBerkas($lintasan);
        }

        return ApiResponse::success(null, 'Destinasi berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'name' => $partial.'required|string|max:255',
            'slug' => [
                ...($ignoreId !== null ? ['sometimes'] : []),
                'required', 'string', 'max:125', 'regex:/^[a-z0-9-]+$/',
                Rule::unique('tourisms', 'slug')->ignore($ignoreId),
            ],
            'category' => $partial.'required|string|max:100',
            // Perkiraan perjalanan darat, bukan angka resmi — karena itu
            // `duration` teks bebas, bukan satuan menit.
            'distance_km' => 'nullable|numeric|min:0|max:9999',
            'duration' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'short_desc' => $partial.'required|string|max:1000',
            'description' => $partial.'required|string|max:20000',
            'highlights' => 'nullable|array|max:12',
            'highlights.*' => 'string|max:200',
            'address' => $partial.'required|string|max:1000',
            'gmaps_url' => 'nullable|url|max:1000',
            'status' => $partial.'required|in:'.implode(',', Tourism::STATUSES),
        ], [
            'name.required' => 'Nama destinasi wajib diisi.',
            'slug.required' => 'Slug wajib diisi.',
            'slug.regex' => 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
            'slug.unique' => 'Slug ini sudah dipakai destinasi lain.',
            'category.required' => 'Kategori wajib diisi.',
            'short_desc.required' => 'Keterangan singkat wajib diisi.',
            'description.required' => 'Keterangan lengkap wajib diisi.',
            'address.required' => 'Alamat wajib diisi.',
            'gmaps_url.url' => 'Tautan Google Maps tidak sah.',
            'status.in' => 'Status hanya boleh published atau draft.',
        ]);
    }

    /** Simpan foto sampul bila ada; kembalikan lintasannya. */
    private function simpanSampul(Request $request): ?string
    {
        if (! $request->hasFile('cover')) {
            return null;
        }

        $request->validate([
            'cover' => 'image|mimes:jpg,jpeg,png,webp|max:5120',   // 5 MB
        ], [
            'cover.image' => 'Foto sampul harus berupa gambar.',
            'cover.max' => 'Ukuran foto sampul maksimal 5 MB.',
        ]);

        return $request->file('cover')->storeAs(
            self::DIR_SAMPUL,
            Str::uuid().'.'.$request->file('cover')->extension(),
            'public',
        );
    }

    /** Tambahkan foto galeri baru ke destinasi. */
    private function tambahGaleri(Request $request, Tourism $item): void
    {
        if (! $request->hasFile('gallery')) {
            return;
        }

        $request->validate([
            'gallery' => 'array|max:10',
            'gallery.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            'gallery.max' => 'Maksimal 10 foto sekali unggah.',
            'gallery.*.image' => 'Seluruh berkas galeri harus berupa gambar.',
            'gallery.*.max' => 'Ukuran tiap foto galeri maksimal 5 MB.',
        ]);

        $galeri = $item->gallery ?? [];

        foreach ($request->file('gallery') as $berkas) {
            $galeri[] = $berkas->storeAs(
                self::DIR_GALERI,
                Str::uuid().'.'.$berkas->extension(),
                'public',
            );
        }

        $item->update(['gallery' => $galeri]);
    }

    /**
     * Hapus berkas pada cakram v2.
     *
     * Berkas warisan v1 dan URL milik server lain dilewati: keduanya tidak
     * berada di cakram yang dikelola portal ini, dan menghapusnya bukan
     * kewenangan modul ini.
     */
    private function hapusBerkas(?string $lintasan): void
    {
        if (empty($lintasan) || str_starts_with($lintasan, 'http://') || str_starts_with($lintasan, 'https://')) {
            return;
        }

        if (! str_starts_with($lintasan, 'tourism/')) {
            return;
        }

        Storage::disk('public')->delete($lintasan);
    }
}
