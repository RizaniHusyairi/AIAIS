<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Gerai komersial dan mitra transportasi bandara.
 *
 * Foto gerai datang lewat dua jalan sekaligus: berkas unggahan panel admin
 * (medan `image`, disimpan ke `tenants/` pada cakram `public`) dan alamat
 * gambar yang ditempel apa adanya (kolom `image_path` berisi URL penuh milik
 * server lain). Keduanya dilayani `ResolvesFileUrl` saat dibaca; yang
 * membedakan hanya siapa yang berwenang menghapus berkasnya — lihat
 * `hapusBerkas()`.
 */
class TenantController extends Controller
{
    /** Tempat foto unggahan disimpan pada cakram `public`. */
    private const DIR_FOTO = 'tenants';

    public function index(Request $request)
    {
        $query = Tenant::where('is_active', true);

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        $tenants = $query->get();
        return ApiResponse::success($tenants, 'Direktori tenant & layanan bandara');
    }

    /** Semua tenant (termasuk nonaktif) untuk panel admin */
    public function adminIndex()
    {
        $tenants = Tenant::orderBy('category')->orderBy('name')->get();
        return ApiResponse::success($tenants, 'Seluruh tenant bandara');
    }

    public function store(Request $request)
    {
        $validated = $this->validasi($request, true);

        // Dulu `image` tidak ikut divalidasi di sini sama sekali, sehingga
        // alamat gambar yang diketik petugas saat menambah gerai baru dibuang
        // diam-diam — hanya mode ubah yang menyimpannya.
        if ($foto = $this->simpanFoto($request)) {
            $validated['image_path'] = $foto;
        }

        $validated['is_active'] = $request->boolean('is_active', true);

        $this->kosongJadiNull($validated);

        $tenant = Tenant::create($validated);

        return ApiResponse::success($tenant, 'Tenant berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $tenant = Tenant::findOrFail($id);
        $validated = $this->validasi($request, false);

        // Foto lama baru dihapus setelah penggantinya benar-benar tersimpan,
        // supaya unggahan yang gagal tidak meninggalkan gerai tanpa foto.
        $lama = $tenant->image_path;
        $foto = $this->simpanFoto($request);

        if ($foto !== null) {
            $validated['image_path'] = $foto;
        }

        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $this->kosongJadiNull($validated);

        // Berkas lama tidak lagi dirujuk siapa pun. Dua jalan menuju ke sini:
        // petugas menekan "hapus foto" (kolomnya jadi null), atau ia menempel
        // alamat gambar milik server lain sebagai pengganti unggahan.
        $digantiAlamat = $foto === null
            && array_key_exists('image_path', $validated)
            && $validated['image_path'] !== $lama;

        $tenant->update($validated);

        if ($foto !== null || $digantiAlamat) {
            $this->hapusBerkas($lama);
        }

        return ApiResponse::success($tenant->fresh(), 'Tenant berhasil diperbarui');
    }

    public function destroy($id)
    {
        $tenant = Tenant::findOrFail($id);
        $lintasan = $tenant->image_path;

        $tenant->delete();
        $this->hapusBerkas($lintasan);

        return ApiResponse::success(null, 'Tenant berhasil dihapus');
    }

    /**
     * Aturan tulis-menulis gerai.
     *
     * `image_path` menerima string biasa karena sebagian foto gerai berupa URL
     * milik server lain yang ditempel petugas; form mengirimkan nilainya kembali
     * apa adanya supaya lestari. Berkas unggahan datang terpisah lewat `image`,
     * sehingga keduanya bisa hidup berdampingan.
     *
     * Pada mode ubah seluruh aturan berawalan `sometimes`. Itulah yang menjaga
     * permintaan parsial — sakelar status di tabel admin hanya mengirim
     * `is_active` — tidak mengosongkan kolom yang tidak ikut dikirim.
     */
    private function validasi(Request $request, bool $baru): array
    {
        $wajib = $baru ? 'required' : 'sometimes|required';

        return $request->validate([
            'name' => $wajib.'|string|max:255',
            // Daftar kategorinya milik model; sebelumnya tersalin sebagai string
            // `in:` di dua method sekaligus dan wajib disunting dua kali.
            'category' => $wajib.'|string|in:'.implode(',', Tenant::CATEGORIES),
            'location' => $wajib.'|string|max:255',
            'operating_hours' => $wajib.'|string|max:100',
            'contact_phone' => 'sometimes|nullable|string|max:50',
            'description' => 'sometimes|nullable|string|max:5000',
            'image_path' => 'sometimes|nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ], [
            'name.required' => 'Nama tenant wajib diisi.',
            'name.max' => 'Nama tenant maksimal 255 karakter.',
            'category.required' => 'Kategori wajib dipilih.',
            'category.in' => 'Kategori tenant tidak dikenali.',
            'location.required' => 'Lokasi tenant wajib diisi.',
            'location.max' => 'Lokasi tenant maksimal 255 karakter.',
            'operating_hours.required' => 'Jam operasional wajib diisi.',
            'operating_hours.max' => 'Jam operasional maksimal 100 karakter.',
            'contact_phone.max' => 'Nomor telepon maksimal 50 karakter.',
            'description.max' => 'Deskripsi maksimal 5.000 karakter.',
            'image_path.max' => 'Alamat gambar maksimal 500 karakter.',
            'is_active.boolean' => 'Status tayang tidak sah.',
        ]);
    }

    /** Simpan foto gerai bila ada; kembalikan lintasannya. */
    private function simpanFoto(Request $request): ?string
    {
        if (! $request->hasFile('image')) {
            return null;
        }

        $request->validate([
            'image' => 'image|mimes:jpg,jpeg,png,webp|max:5120',   // 5 MB
        ], [
            'image.image' => 'Foto tenant harus berupa berkas gambar.',
            'image.mimes' => 'Foto tenant harus berformat JPG, PNG, atau WEBP.',
            'image.max' => 'Ukuran foto tenant maksimal 5 MB.',
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
        foreach (['contact_phone', 'description', 'image_path'] as $kolom) {
            if (array_key_exists($kolom, $validated) && $validated[$kolom] === '') {
                $validated[$kolom] = null;
            }
        }
    }

    /**
     * Hapus berkas unggahan gerai.
     *
     * URL penuh dilewati: berkasnya milik server lain dan menghapusnya bukan
     * kewenangan modul ini. Penjaga prefiks memastikan hanya berkas yang benar-
     * benar diunggah lewat panel inilah yang dibuang.
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
