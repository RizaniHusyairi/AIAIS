<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\InstagramCredential;
use App\Models\InstagramPost;
use App\Models\Setting;
use App\Services\Instagram\InstagramSync;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Unggahan Instagram yang ditampilkan portal.
 *
 * Endpoint publiknya membaca TABEL LOKAL, tidak pernah memanggil Instagram.
 * Dua alasannya: token tidak boleh sampai ke peramban pengunjung, dan Instagram
 * yang sedang bermasalah tidak boleh ikut merusak beranda.
 *
 * Gambar yang dikirim juga selalu salinan lokal — URL CDN Meta mati dalam
 * hitungan jam. Lihat catatan pada `InstagramSync`.
 */
class InstagramController extends Controller
{
    /* ------------------------- publik ------------------------- */

    /** Unggahan terbaru untuk beranda; hanya yang tampil dan bergambar. */
    public function index()
    {
        $posts = InstagramPost::tampil()
            ->limit(config('instagram.display_limit'))
            ->get(['id', 'permalink', 'media_type', 'local_image_path', 'caption', 'posted_at']);

        return ApiResponse::success($posts, 'Unggahan terbaru Instagram');
    }

    /* ------------------------- panel ------------------------- */

    /**
     * Keadaan sambungan.
     *
     * Tokennya TIDAK pernah dikirim — yang dilaporkan hanya kapan ia habis.
     * Hitung mundur itulah bagian terpenting halaman panel: satu-satunya cara
     * integrasi ini mati diam-diam adalah token yang lewat tanggal tanpa ada
     * yang menyadarinya.
     */
    public function status()
    {
        $kredensial = InstagramCredential::aktif();
        $terakhir = InstagramPost::max('synced_at');

        return ApiResponse::success([
            // Mode menentukan apakah panel token masih relevan, dan apakah
            // penjadwal sedang berjalan sama sekali.
            'mode' => SettingController::modeInstagram(),
            'api_posts' => InstagramPost::where('source', 'api')->count(),
            'manual_posts' => InstagramPost::where('source', 'manual')->count(),

            'connected' => $kredensial !== null && ! $kredensial->sudahKedaluwarsa(),
            'account_username' => $kredensial?->account_username,
            'expires_at' => $kredensial?->expires_at?->toDateString(),
            'days_left' => $kredensial?->sisaHari(),
            'needs_refresh' => (bool) $kredensial?->perluDisegarkan(),
            'last_refreshed_at' => $kredensial?->last_refreshed_at?->toDateTimeString(),
            'last_synced_at' => $terakhir,
            'total_posts' => InstagramPost::count(),
            'visible_posts' => InstagramPost::tampil()->count(),
            'display_limit' => config('instagram.display_limit'),
        ], 'Status sambungan Instagram');
    }

    /** Daftar seluruh unggahan untuk kendali redaksi. */
    public function adminIndex()
    {
        $posts = InstagramPost::orderByDesc('posted_at')->get();

        return ApiResponse::success($posts, 'Daftar unggahan Instagram');
    }

    /** Tarik ulang sekarang, tanpa menunggu jadwal berikutnya. */
    public function sync(InstagramSync $sync)
    {
        try {
            $hasil = $sync->jalankan();
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }

        return ApiResponse::success($hasil, sprintf(
            'Sinkronisasi selesai: %d unggahan baru, %d diperbarui.',
            $hasil['baru'],
            $hasil['diperbarui'],
        ));
    }

    /**
     * Sembunyikan atau tampilkan satu unggahan.
     *
     * Menyembunyikan di sini TIDAK menghapusnya di Instagram, dan sinkronisasi
     * berikutnya tidak menyalakannya kembali.
     */
    public function toggleVisibility($id)
    {
        $post = InstagramPost::findOrFail($id);
        $post->is_visible = ! $post->is_visible;
        $post->save();

        return ApiResponse::success($post->fresh(), $post->is_visible
            ? 'Unggahan ditampilkan di beranda'
            : 'Unggahan disembunyikan dari beranda. Unggahannya tetap ada di Instagram.');
    }

    /**
     * Pasang token hasil App Review.
     *
     * Umur token diperiksa langsung ke Instagram, bukan diterima dari yang
     * memasang: token yang salah ketik atau sudah mati harus ditolak SEKARANG,
     * bukan diketahui tiga jam kemudian saat sinkronisasi terjadwal gagal.
     */
    public function storeCredentials(Request $request)
    {
        $data = $request->validate([
            'access_token' => 'required|string|min:20',
        ], [
            'access_token.required' => 'Token Instagram wajib diisi.',
            'access_token.min' => 'Token Instagram tampak terlalu pendek.',
        ]);

        $url = rtrim(config('instagram.base_url'), '/').'/'.config('instagram.version').'/me';

        try {
            $res = Http::timeout(config('instagram.timeout'))->get($url, [
                'fields' => 'id,username',
                'access_token' => $data['access_token'],
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('Tidak dapat menghubungi Instagram: '.$e->getMessage(), null, 422);
        }

        if ($res->failed()) {
            return ApiResponse::error(
                'Instagram menolak token ini: '.($res->json('error.message') ?? 'tidak dikenali'),
                null,
                422
            );
        }

        InstagramCredential::query()->delete();

        $kredensial = InstagramCredential::create([
            'access_token' => $data['access_token'],
            // Umur baku 60 hari; perintah penyegar memperbaruinya dengan angka
            // sebenarnya pada penyegaran pertama.
            'expires_at' => now()->addDays(InstagramCredential::UMUR_HARI),
            'account_username' => $res->json('username'),
            'last_refreshed_at' => now(),
        ]);

        return ApiResponse::success(
            ['account_username' => $kredensial->account_username],
            'Token tersimpan. Portal tersambung ke akun @'.$kredensial->account_username.'.',
            null,
            201
        );
    }

    public function destroy($id)
    {
        $post = InstagramPost::findOrFail($id);
        $manual = $post->source === 'manual';

        $post->hapusBerkas();
        $post->delete();

        return ApiResponse::success(null, $manual
            ? 'Unggahan manual dihapus beserta gambarnya.'
            : 'Unggahan dihapus dari portal. Unggahannya tetap ada di Instagram.');
    }

    /* ------------------------- mode ------------------------- */

    /**
     * Ganti sumber konten beranda.
     *
     * Berpindah mode TIDAK menghapus apa pun. Unggahan lama — dari sumber mana
     * pun — tetap tersimpan, dan muncul lagi begitu modenya dikembalikan.
     * Petugas yang mencoba mode manual sebentar tidak boleh kehilangan hasil
     * sinkronisasi berbulan-bulan karenanya.
     */
    public function updateMode(Request $request)
    {
        $request->validate([
            'mode' => 'required|in:'.implode(',', SettingController::INSTAGRAM_MODES),
        ], [
            'mode.required' => 'Mode wajib dipilih.',
            'mode.in' => 'Mode tidak dikenali.',
        ]);

        Setting::updateOrCreate(['key' => 'instagram_mode'], ['value' => $request->mode]);

        return ApiResponse::success(
            ['mode' => $request->mode],
            $request->mode === 'auto'
                ? 'Mode otomatis. Sinkronisasi terjadwal dihidupkan kembali — pastikan tokennya masih berlaku.'
                : 'Mode manual. Sinkronisasi terjadwal dihentikan; unggahan dimasukkan lewat panel ini.',
        );
    }

    /* ------------------------- unggahan manual ------------------------- */

    /** Unggahan manual baru. Media wajib — tanpa media tidak ada yang tampil. */
    public function storeManual(Request $request)
    {
        $data = $this->validasiManual($request, wajibMedia: true);

        $post = new InstagramPost([
            'source' => 'manual',
            'media_type' => $this->jenisMedia($request),
            'caption' => $data['caption'] ?? null,
            'permalink' => $data['permalink'] ?? null,
            'posted_at' => $data['posted_at'] ?? now(),
            'is_visible' => true,
        ]);

        $post->local_image_path = $this->simpanMedia($request);
        $post->save();

        return ApiResponse::success($post, 'Unggahan manual ditambahkan', null, 201);
    }

    /**
     * Ubah unggahan manual.
     *
     * Dilayani `PUT` maupun `POST /{id}` — gambar dikirim multipart, dan
     * peramban tidak dapat mengirim multipart lewat `PUT`. Pola yang sama
     * dipakai rute `letters` dan `found-items`.
     */
    public function updateManual(Request $request, $id)
    {
        $post = InstagramPost::findOrFail($id);

        /*
         * Unggahan hasil sinkronisasi ditolak.
         *
         * Menyuntingnya percuma: sinkronisasi berikutnya menimpa takarir,
         * tautan, dan tanggalnya kembali dari Instagram. Petugas yang
         * menyangka suntingannya tersimpan lalu mendapatinya kembali seperti
         * semula akan berhenti mempercayai panelnya — dan itu kerugian yang
         * jauh lebih mahal daripada satu medan yang tidak dapat diubah.
         */
        if ($post->source !== 'manual') {
            return ApiResponse::error(
                'Unggahan ini berasal dari sinkronisasi Instagram dan tidak dapat disunting — '
                .'sinkronisasi berikutnya akan menimpanya kembali. '
                .'Yang dapat dilakukan hanyalah menyembunyikan atau menghapusnya.',
                null,
                422,
            );
        }

        $data = $this->validasiManual($request, wajibMedia: false);

        if ($request->hasFile('media')) {
            $post->hapusBerkas();
            $post->local_image_path = $this->simpanMedia($request);
            // Jenisnya ikut berubah: petugas boleh mengganti gambar dengan
            // video, dan `media_type` yang tertinggal membuat beranda merender
            // video di dalam <img> — kotak rusak tanpa pesan apa pun.
            $post->media_type = $this->jenisMedia($request);
        }

        // `permalink` dan `posted_at` boleh dikosongkan kembali, jadi
        // keduanya disetel dari nilai tervalidasi apa adanya — bukan lewat
        // `??` yang membuat pengosongan mustahil.
        $post->fill([
            'caption' => $data['caption'] ?? null,
            'permalink' => $data['permalink'] ?? null,
            'posted_at' => $data['posted_at'] ?? $post->posted_at,
        ])->save();

        return ApiResponse::success($post->fresh(), 'Unggahan manual diperbarui');
    }

    /* ------------------------------------------------------------------ */

    private function validasiManual(Request $request, bool $wajibMedia): array
    {
        return $request->validate([
            /*
             * SATU MEDAN UNTUK GAMBAR DAN VIDEO.
             *
             * Bukan dua medan terpisah: dua medan berarti petugas dapat
             * mengisi keduanya sekaligus, dan controller harus memutuskan mana
             * yang menang — keputusan yang tidak pernah terlihat oleh
             * pengisinya. Satu medan membuat pilihannya tegas sejak di layar.
             *
             * `file`, bukan `image`: aturan `image` menolak video mentah-mentah
             * sebelum `mimes` sempat diperiksa.
             *
             * Batas 60 MB untuk video, 5 MB untuk gambar — video pendek
             * Instagram lazimnya jauh di bawah itu, dan batas yang longgar
             * hanya membuat beranda memuat puluhan megabita di layar pertama.
             */
            'media' => [
                $wajibMedia ? 'required' : 'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp,mp4,webm',
                'max:61440',
            ],
            'caption' => 'nullable|string|max:2200',
            // Dibatasi ke tautan Instagram: kolom ini dipakai kartu beranda
            // sebagai "lihat unggahan aslinya", bukan tautan bebas ke mana pun.
            'permalink' => 'nullable|url|max:500|starts_with:https://www.instagram.com/,https://instagram.com/',
            'posted_at' => 'nullable|date|before_or_equal:now',
        ], [
            'media.required' => 'Gambar atau video wajib diunggah — unggahan tanpa media tidak ditampilkan di beranda.',
            'media.mimes' => 'Berkas harus berupa gambar (JPG, PNG, WEBP) atau video (MP4, WEBM).',
            'media.max' => 'Ukuran berkas maksimal 60 MB.',
            'caption.max' => 'Takarir maksimal 2.200 karakter, sama seperti batas Instagram.',
            'permalink.url' => 'Tautan tidak sah.',
            'permalink.starts_with' => 'Tautan harus menuju instagram.com.',
            'posted_at.before_or_equal' => 'Tanggal unggahan tidak boleh di masa depan.',
        ]);
    }

    /**
     * Gambar atau video?
     *
     * Ditentukan dari ekstensi berkasnya, bukan dari pilihan petugas: satu
     * medan lebih sedikit untuk diisi, dan satu peluang lebih sedikit bagi
     * jenis yang tidak cocok dengan isinya.
     */
    private function jenisMedia(Request $request): string
    {
        $ext = strtolower($request->file('media')->extension());

        return in_array($ext, ['mp4', 'webm'], true) ? 'VIDEO' : 'IMAGE';
    }

    /** Simpan media ke cakram yang sama dengan salinan hasil sinkronisasi. */
    private function simpanMedia(Request $request): string
    {
        return $request->file('media')->storeAs(
            InstagramPost::FOLDER,
            Str::uuid().'.'.$request->file('media')->extension(),
            InstagramPost::DISK,
        );
    }
}
