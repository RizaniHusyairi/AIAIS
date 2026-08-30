<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Facility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Fasilitas terminal bandara.
 *
 * Foto fasilitas datang dari dua zaman sekaligus: baris warisan v1 menyimpan
 * lintasan `fasilitas/…` pada cakram `legacy` (satu di `assets_landing/…` pada
 * `legacy_public`), sedangkan unggahan v2 ditulis ke `facilities/` pada cakram
 * `public`. Keduanya sama-sama dilayani `ResolvesFileUrl` saat dibaca; yang
 * membedakan hanya siapa yang berwenang menghapus berkasnya — lihat
 * `hapusBerkas()`.
 */
class FacilityController extends Controller
{
    /** Tempat foto unggahan v2 disimpan pada cakram `public`. */
    private const DIR_FOTO = 'facilities';

    public function index(Request $request)
    {
        $query = Facility::where('is_operational', true);

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        $facilities = $query->get();
        return ApiResponse::success($facilities, 'Daftar fasilitas bandara');
    }

    /** Semua fasilitas (termasuk non-operasional) untuk panel admin */
    public function adminIndex()
    {
        $facilities = Facility::orderBy('category')->orderBy('name')->get();
        return ApiResponse::success($facilities, 'Seluruh fasilitas bandara');
    }

    public function store(Request $request)
    {
        $validated = $this->validasi($request, true);

        if ($foto = $this->simpanFoto($request)) {
            $validated['image_path'] = $foto;
        }

        $validated['is_operational'] = $request->boolean('is_operational', true);

        // `details` warisan v1 berkolom NOT NULL tanpa nilai bawaan, sementara
        // panel v2 belum menyuntingnya. Tanpa larik kosong ini, menambah
        // fasilitas baru gagal di tingkat basis data.
        $validated['details'] ??= [];

        $this->kosongJadiNull($validated);

        $facility = Facility::create($validated);

        return ApiResponse::success($facility, 'Fasilitas berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $facility = Facility::findOrFail($id);
        $validated = $this->validasi($request, false);

        // Foto lama baru dihapus setelah penggantinya benar-benar tersimpan,
        // supaya unggahan yang gagal tidak meninggalkan fasilitas tanpa foto.
        $lama = $facility->image_path;
        $foto = $this->simpanFoto($request);

        if ($foto !== null) {
            $validated['image_path'] = $foto;
        }

        if ($request->has('is_operational')) {
            $validated['is_operational'] = $request->boolean('is_operational');
        }

        $this->kosongJadiNull($validated);

        // Petugas menekan "hapus gambar": kolomnya dikosongkan tanpa ada berkas
        // pengganti, dan berkas lamanya ikut dibuang.
        $dikosongkan = $foto === null
            && array_key_exists('image_path', $validated)
            && $validated['image_path'] === null;

        $facility->update($validated);

        if ($foto !== null || $dikosongkan) {
            $this->hapusBerkas($lama);
        }

        return ApiResponse::success($facility->fresh(), 'Fasilitas berhasil diperbarui');
    }

    public function destroy($id)
    {
        $facility = Facility::findOrFail($id);
        $lintasan = $facility->image_path;

        $facility->delete();
        $this->hapusBerkas($lintasan);

        return ApiResponse::success(null, 'Fasilitas berhasil dihapus');
    }

    /**
     * Aturan tulis-menulis fasilitas.
     *
     * `image_path` tetap menerima string biasa karena fasilitas warisan v1
     * menyimpan lintasan yang tidak pernah melewati panel ini; form mengirimkan
     * nilainya kembali apa adanya supaya lestari. Berkas unggahan datang
     * terpisah lewat `image`, sehingga keduanya bisa hidup berdampingan.
     *
     * Pada mode ubah seluruh aturan berawalan `sometimes`. Itulah yang menjaga
     * permintaan parsial — sakelar status di tabel admin hanya mengirim
     * `is_operational` — tidak mengosongkan kolom yang tidak ikut dikirim.
     */
    private function validasi(Request $request, bool $baru): array
    {
        $wajib = $baru ? 'required' : 'sometimes|required';

        return $request->validate([
            'name' => $wajib.'|string|max:255',
            'category' => $wajib.'|string|max:100',
            'location_description' => $wajib.'|string|max:500',
            'icon' => 'sometimes|nullable|string|max:100',
            'description' => 'sometimes|nullable|string|max:5000',
            'image_path' => 'sometimes|nullable|string|max:500',
            'details' => 'sometimes|nullable|array|max:20',
            'details.*' => 'string|max:500',
            'is_operational' => 'sometimes|boolean',
        ], [
            'name.required' => 'Nama fasilitas wajib diisi.',
            'name.max' => 'Nama fasilitas maksimal 255 karakter.',
            'category.required' => 'Kategori wajib dipilih.',
            'category.max' => 'Kategori maksimal 100 karakter.',
            'location_description.required' => 'Lokasi fasilitas wajib diisi.',
            'location_description.max' => 'Lokasi fasilitas maksimal 500 karakter.',
            'description.max' => 'Keterangan maksimal 5.000 karakter.',
            'details.max' => 'Butir keterangan maksimal 20 baris.',
            'details.*.max' => 'Tiap butir keterangan maksimal 500 karakter.',
            'is_operational.boolean' => 'Status operasional tidak sah.',
        ]);
    }

    /** Simpan foto fasilitas bila ada; kembalikan lintasannya. */
    private function simpanFoto(Request $request): ?string
    {
        if (! $request->hasFile('image')) {
            return null;
        }

        $request->validate([
            'image' => 'image|mimes:jpg,jpeg,png,webp|max:5120',   // 5 MB
        ], [
            'image.image' => 'Foto fasilitas harus berupa berkas gambar.',
            'image.mimes' => 'Foto fasilitas harus berformat JPG, PNG, atau WEBP.',
            'image.max' => 'Ukuran foto fasilitas maksimal 5 MB.',
        ]);

        return $request->file('image')->storeAs(
            self::DIR_FOTO,
            Str::uuid().'.'.$request->file('image')->extension(),
            'public',
        );
    }

    /**
     * Samakan isian kosong dengan null.
     *
     * Multipart tidak mengenal null — isian yang dikosongkan petugas tiba
     * sebagai "". Dibiarkan begitu, `image_path` bernilai "" akan diperlakukan
     * `ResolvesFileUrl` sebagai lintasan berkas yang tidak pernah ada.
     *
     * @param  array<string, mixed>  $validated
     */
    private function kosongJadiNull(array &$validated): void
    {
        foreach (['icon', 'description', 'image_path'] as $kolom) {
            if (array_key_exists($kolom, $validated) && $validated[$kolom] === '') {
                $validated[$kolom] = null;
            }
        }
    }

    /**
     * Hapus berkas pada cakram v2.
     *
     * Berkas warisan v1 dan URL milik server lain dilewati: keduanya tidak
     * berada di cakram yang dikelola portal ini, dan menghapusnya bukan
     * kewenangan modul ini. Penjaga prefiks di bawah itulah yang menyelamatkan
     * seluruh foto fasilitas warisan — lintasannya berawalan `fasilitas/` dan
     * `assets_landing/`, bukan `facilities/`. Kemiripan dua nama pertama itu
     * sengaja dihindari saat memilih nama direktori v2.
     */
    private function hapusBerkas(?string $lintasan): void
    {
        if (empty($lintasan) || str_starts_with($lintasan, 'http://') || str_starts_with($lintasan, 'https://')) {
            return;
        }

        if (! str_starts_with($lintasan, self::DIR_FOTO.'/')) {
            return;
        }

        Storage::disk('public')->delete($lintasan);
    }
}
