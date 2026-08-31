<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\InfoSlide;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Slide informasi beranda — papan pengumuman bergambar, seperti pada portal v1.
 *
 * BERBEDA DARI MODUL DOKUMEN. Standar Pelayanan dan Profil PPID tetap mengirim
 * baris yang berkasnya belum ada, karena keberadaan dokumennya sendiri wajib
 * diumumkan. Di sini kebalikannya: satu slide TIDAK punya isi selain gambarnya.
 * Slide tanpa gambar yang dapat dibuka bukan pengumuman yang belum terbit —
 * ia kotak kosong. Karena itu `index()` menyaringnya, dan hanya panel admin
 * yang menampilkannya lengkap dengan penanda supaya petugas tahu mana yang
 * perlu diunggah ulang.
 */
class InfoSlideController extends Controller
{
    /** Tempat gambar unggahan v2 disimpan pada cakram `public`. */
    private const DIR = 'info-slides';

    /** Daftar publik — hanya slide tampil yang gambarnya benar-benar ada. */
    public function index()
    {
        $slides = InfoSlide::where('is_visible', true)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->filter(fn (InfoSlide $s) => $s->has_image)
            ->values();

        return ApiResponse::success($slides, 'Slide informasi beranda');
    }

    /** Daftar admin — termasuk yang disembunyikan dan yang gambarnya hilang. */
    public function adminIndex()
    {
        $slides = InfoSlide::orderByDesc('created_at')->orderByDesc('id')->get();

        return ApiResponse::success($slides, 'Seluruh slide informasi');
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        // Gambar wajib pada slide baru: tanpa gambar, slide itu tidak punya isi.
        if (! $request->hasFile('image')) {
            return ApiResponse::error('Gambar slide wajib diunggah.', [
                'image' => ['Gambar slide wajib diunggah.'],
            ], 422);
        }

        $validated['image_path'] = $this->simpanGambar($request);

        $slide = InfoSlide::create($validated);

        return ApiResponse::success($slide, 'Slide berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $slide = InfoSlide::findOrFail($id);
        $validated = $this->validated($request, $slide->id);

        // Gambar lama baru dihapus setelah penggantinya benar-benar tersimpan,
        // supaya unggahan yang gagal tidak meninggalkan slide tanpa gambar.
        $lama = $slide->image_path;
        $baru = $request->hasFile('image') ? $this->simpanGambar($request) : null;

        if ($baru !== null) {
            $validated['image_path'] = $baru;
        }

        $slide->update($validated);

        if ($baru !== null) {
            $this->hapusBerkas($lama);
        }

        return ApiResponse::success($slide->fresh(), 'Slide berhasil diperbarui');
    }

    public function destroy($id)
    {
        $slide = InfoSlide::findOrFail($id);
        $lintasan = $slide->image_path;

        $slide->delete();
        $this->hapusBerkas($lintasan);

        return ApiResponse::success(null, 'Slide berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    /**
     * Aturan tulis-menulis slide.
     *
     * `image_path` tidak divalidasi di sini — ia tidak pernah datang dari
     * formulir, melainkan dari berkas yang diunggah. Pada mode ubah seluruh
     * aturan berawalan `sometimes`, sehingga sakelar tampil di tabel admin
     * yang hanya mengirim `is_visible` tidak mengosongkan tautannya.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        $validated = $request->validate([
            // Kolom warisan v1 hanya menampung 125 karakter.
            'link_url' => $partial.'nullable|url|max:125',
            'is_visible' => 'sometimes|boolean',
        ], [
            'link_url.url' => 'Tautan slide tidak sah.',
            'link_url.max' => 'Tautan slide maksimal 125 karakter.',
            'is_visible.boolean' => 'Status tampil tidak sah.',
        ]);

        // Multipart mengirim boolean sebagai '1'/'0'; `boolean()` yang
        // menerjemahkannya, bukan aturan validasi.
        if ($request->exists('is_visible')) {
            $validated['is_visible'] = $request->boolean('is_visible');
        }

        // Multipart tidak mengenal null: tautan yang dikosongkan tiba sebagai "".
        if (array_key_exists('link_url', $validated) && trim((string) $validated['link_url']) === '') {
            $validated['link_url'] = null;
        }

        return $validated;
    }

    /** Simpan gambar slide dan kembalikan lintasannya. */
    private function simpanGambar(Request $request): string
    {
        $request->validate([
            'image' => 'image|mimes:jpg,jpeg,png,webp|max:5120',   // 5 MB
        ], [
            'image.image' => 'Slide harus berupa berkas gambar.',
            'image.mimes' => 'Slide harus berformat JPG, PNG, atau WEBP.',
            'image.max' => 'Ukuran gambar slide maksimal 5 MB.',
        ]);

        // Nama berkas diacak: nama unggahan asli kerap memuat spasi.
        return $request->file('image')->storeAs(
            self::DIR,
            Str::uuid().'.'.$request->file('image')->extension(),
            'public',
        );
    }

    /**
     * Hapus berkas pada cakram v2.
     *
     * Gambar warisan v1 dan URL milik server lain dilewati: keduanya tidak
     * berada di cakram yang dikelola portal ini.
     */
    private function hapusBerkas(?string $lintasan): void
    {
        if (empty($lintasan) || str_starts_with($lintasan, 'http://') || str_starts_with($lintasan, 'https://')) {
            return;
        }

        if (! str_starts_with($lintasan, self::DIR.'/')) {
            return;
        }

        Storage::disk('public')->delete($lintasan);
    }
}
