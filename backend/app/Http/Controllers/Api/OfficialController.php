<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Official;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Pejabat struktural bandara.
 *
 * Daftar publik menyaring lewat `is_published`, BUKAN lewat keberadaan foto.
 * Modul `letters` memang menyembunyikan surat yang berkasnya hilang, tetapi
 * alasannya tidak berlaku di sini: surat tanpa PDF tidak ada gunanya bagi
 * pembaca, sedangkan pejabat tanpa foto tetap wajib diumumkan nama dan
 * jabatannya menurut UU 14/2008. Yang belum berfoto ditandai di panel admin,
 * tidak disembunyikan dari publik.
 */
class OfficialController extends Controller
{
    /** Folder foto pejabat pada cakram publik. */
    private const DIR = 'pejabat';

    /** Daftar publik — hanya yang ditayangkan, menurut urutan jabatan. */
    public function index()
    {
        $pejabat = Official::query()
            ->where('is_published', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ApiResponse::success($pejabat, 'Daftar pejabat bandara');
    }

    /** Daftar admin — seluruhnya, termasuk yang belum tayang dan belum berfoto. */
    public function adminIndex()
    {
        $pejabat = Official::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ApiResponse::success($pejabat, 'Daftar pejabat bandara');
    }

    public function store(Request $request)
    {
        $validated = $this->validasi($request);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $this->simpanFoto($request);
        }

        // Pejabat baru ditaruh di urutan terakhir bila tidak ditentukan —
        // menaruhnya di 0 akan menyerobot posisi Kepala Kantor.
        $validated['sort_order'] ??= (int) Official::max('sort_order') + 1;

        $pejabat = Official::create($validated);

        return ApiResponse::success($pejabat, 'Pejabat berhasil ditambahkan', null, 201);
    }

    /**
     * Perbarui data pejabat.
     *
     * Dilayani `PUT` maupun `POST /{id}` — foto dikirim sebagai multipart, dan
     * peramban tidak dapat mengirim multipart lewat `PUT`. Pola yang sama
     * dipakai rute `letters`.
     */
    public function update(Request $request, $id)
    {
        $pejabat = Official::findOrFail($id);

        $validated = $this->validasi($request, wajib: false, abaikanId: $pejabat->id);

        if ($request->hasFile('photo')) {
            $lama = $pejabat->photo;
            $validated['photo'] = $this->simpanFoto($request);

            $this->hapusFoto($lama);
        }

        $pejabat->update($validated);

        return ApiResponse::success($pejabat->fresh(), 'Data pejabat berhasil diperbarui');
    }

    public function destroy($id)
    {
        $pejabat = Official::findOrFail($id);
        $foto = $pejabat->photo;

        $pejabat->delete();

        $this->hapusFoto($foto);

        return ApiResponse::success(null, 'Pejabat berhasil dihapus');
    }

    /* ------------------------------------------------------------------ */

    /** Aturan validasi bersama `store` dan `update`. */
    private function validasi(Request $request, bool $wajib = true, ?int $abaikanId = null): array
    {
        $w = $wajib ? 'required' : 'sometimes|required';

        $unikSlug = 'unique:officials,slug' . ($abaikanId ? ',' . $abaikanId : '');

        $validated = $request->validate([
            'slug' => "$w|string|max:60|alpha_dash|$unikSlug",
            'name' => "$w|string|max:150",
            'title' => "$w|string|max:200",
            'short_title' => "$w|string|max:120",
            'position_history' => 'nullable|array',
            'position_history.*' => 'string|max:300',
            'awards' => 'nullable|array',
            'awards.*' => 'string|max:300',
            'sort_order' => 'nullable|integer|min:0|max:999',
            'is_published' => 'nullable|boolean',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            'slug.required' => 'Slug wajib diisi.',
            'slug.alpha_dash' => 'Slug hanya boleh berisi huruf, angka, dan tanda hubung.',
            'slug.unique' => 'Slug ini sudah dipakai pejabat lain.',
            'name.required' => 'Nama pejabat wajib diisi.',
            'title.required' => 'Nomenklatur jabatan wajib diisi.',
            'short_title.required' => 'Jabatan ringkas wajib diisi.',
            'position_history.*.max' => 'Setiap baris riwayat jabatan maksimal 300 karakter.',
            'awards.*.max' => 'Setiap baris penghargaan maksimal 300 karakter.',
            'photo.image' => 'Foto harus berupa gambar (JPG, PNG, atau WEBP).',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
        ]);

        // Berkas ikut tervalidasi di atas, tetapi tidak boleh masuk sebagai
        // nilai kolom — kolom `photo` diisi lintasan hasil `simpanFoto()`.
        unset($validated['photo']);

        // Multipart mengirim segalanya sebagai teks, termasuk "0"/"1" dan
        // "false"/"true"; tanpa penormalan ini "false" bernilai benar.
        if ($request->has('is_published')) {
            $validated['is_published'] = $request->boolean('is_published');
        }

        return $validated;
    }

    private function simpanFoto(Request $request): string
    {
        return $request->file('photo')->storeAs(
            self::DIR,
            Str::uuid() . '.' . $request->file('photo')->extension(),
            'public',
        );
    }

    /**
     * Hapus foto lama bila memang milik kita.
     *
     * Dua bentuk nilai sengaja dilewati: URL penuh (berkas milik server lain)
     * dan lintasan berawalan "/" (aset statis frontend yang ikut dibundel,
     * bukan hasil unggahan). Menghapusnya berarti mencoba menghapus berkas
     * yang tidak pernah ada di disk ini — dan pada aset frontend, kalau
     * lintasannya kebetulan cocok, menghapus berkas milik repositori.
     */
    private function hapusFoto(?string $photo): void
    {
        if (empty($photo) || str_starts_with($photo, '/') || Str::startsWith($photo, ['http://', 'https://'])) {
            return;
        }

        Storage::disk('public')->delete($photo);
    }
}
