<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PpidImageDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Dokumen bergambar halaman Profil PPID — daftar bebas yang disusun petugas.
 *
 * Berbeda dari `PpidProfileDocumentController`, daftar publik di sini MENYARING
 * baris yang gambarnya tidak ada: kartu bergambar tanpa gambar hanyalah kotak
 * kosong, dan tidak ada kewajiban hukum untuk mengumumkan "belum terbit" bagi
 * sebuah bagan.
 */
class PpidImageDocumentController extends Controller
{
    /** Folder penyimpanan gambar pada cakram publik. */
    private const DIR = 'ppid-gambar';

    /** Daftar publik — hanya baris aktif yang gambarnya benar-benar ada. */
    public function index()
    {
        $items = PpidImageDocument::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->filter(fn (PpidImageDocument $d) => $d->has_image)
            ->values();

        return ApiResponse::success($items, 'Dokumen bergambar PPID');
    }

    /** Daftar admin — seluruh baris, termasuk yang gambarnya hilang. */
    public function adminIndex()
    {
        $items = PpidImageDocument::orderBy('sort_order')->orderBy('id')->get();

        return ApiResponse::success($items, 'Seluruh dokumen bergambar PPID');
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $gambar = $this->resolveImage($request);

        if (($gambar['image_path'] ?? null) === null) {
            return ApiResponse::error(
                'Gambar dokumen wajib diunggah atau ditautkan.',
                ['file' => ['Gambar dokumen wajib diunggah atau ditautkan.']],
                422,
            );
        }

        // Tanpa urutan eksplisit, baris baru diletakkan paling belakang —
        // bukan di urutan 0 yang akan mendorongnya ke depan kartu lama.
        $validated['sort_order'] ??= (int) PpidImageDocument::max('sort_order') + 1;

        $item = PpidImageDocument::create($validated + $gambar);

        return ApiResponse::success($item->fresh(), 'Dokumen bergambar ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = PpidImageDocument::findOrFail($id);
        $validated = $this->validated($request, $item->id);

        // Gambar lama baru dihapus setelah yang baru tersimpan.
        $gambar = $this->resolveImage($request);

        if ($gambar !== [] && $gambar['image_path'] === null) {
            return ApiResponse::error('Gambar dokumen tidak boleh dikosongkan.', null, 422);
        }

        $old = $item->image_path;
        $item->update($validated + $gambar);

        if ($gambar !== [] && $old !== $item->image_path) {
            $this->deleteStoredFile($item, $old);
        }

        return ApiResponse::success($item->fresh(), 'Dokumen bergambar diperbarui');
    }

    public function destroy($id)
    {
        $item = PpidImageDocument::findOrFail($id);
        $path = $item->image_path;

        $item->delete();
        $this->deleteStoredFile($item, $path);

        return ApiResponse::success(null, 'Dokumen bergambar dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        $validated = $request->validate([
            'title' => $partial.'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'sort_order' => 'nullable|integer|min:0|max:9999',
            'is_active' => 'boolean',
        ], [
            'title.required' => 'Judul dokumen wajib diisi.',
            'sort_order.integer' => 'Urutan harus berupa angka.',
        ]);

        if ($request->exists('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        if (array_key_exists('sort_order', $validated) && $validated['sort_order'] === null) {
            unset($validated['sort_order']);
        }

        return $validated;
    }

    /**
     * Tentukan gambar dari unggahan (`file`) atau tautan (`image_link`).
     *
     * Larik kosong berarti pemanggil tidak mengirim keduanya, jadi nilai lama
     * dipertahankan. `image_path` null berarti tautan sengaja dikosongkan.
     */
    private function resolveImage(Request $request): array
    {
        if ($request->hasFile('file')) {
            $request->validate([
                'file' => 'file|mimes:jpg,jpeg,png,webp|max:10240',   // 10 MB
            ], [
                'file.mimes' => 'Gambar harus berformat JPG, PNG, atau WEBP.',
                'file.max' => 'Ukuran gambar maksimal 10 MB.',
            ]);

            $berkas = $request->file('file');

            // Nama berkas diacak: nama unggahan asli kerap memuat spasi.
            return [
                'image_path' => $berkas->storeAs(
                    self::DIR,
                    Str::uuid().'.'.strtolower($berkas->extension()),
                    'public',
                ),
            ];
        }

        if ($request->exists('image_link')) {
            $link = trim((string) $request->input('image_link', ''));

            if ($link === '') {
                return ['image_path' => null];
            }

            $request->validate([
                'image_link' => 'url|max:500',
            ], [
                'image_link.url' => 'Tautan gambar tidak sah.',
            ]);

            // Tautan berbagi Drive adalah halaman penampil, bukan berkas
            // gambar — `<img>` tidak dapat merendernya dan kartunya tampil
            // rusak. Lebih baik ditolak di sini daripada tersimpan diam-diam.
            if (preg_match('#^https?://(drive|docs)\.google\.com/#i', $link)) {
                throw ValidationException::withMessages([
                    'image_link' => 'Tautan Google Drive tidak dapat ditampilkan sebagai gambar. Unduh gambarnya lalu unggah di sini.',
                ]);
            }

            return ['image_path' => $link];
        }

        return [];
    }

    /** Hapus berkas di disk; URL luar dan aset statis frontend dibiarkan. */
    private function deleteStoredFile(PpidImageDocument $item, ?string $path): void
    {
        if (empty($path) || $item->isStaticAsset($path)
            || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
