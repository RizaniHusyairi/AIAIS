<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Kunci pengaturan yang diizinkan beserta nilai bawaannya.
     * Hanya kunci pada daftar ini yang dapat dibaca maupun disimpan.
     */
    public const DEFAULTS = [
        // Latar header/hero tiap halaman
        'bg_home' => '/bg/bg-beranda.png',
        'bg_news' => 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1400&q=80',
        'bg_profile' => 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1800&q=80',
        'bg_tenants' => 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1800&q=80',
        'bg_facilities' => 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=80',
        'bg_tourism' => 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1800&q=80',
        'bg_app_home' => 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80',
        'bg_app_news' => 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80',

        /**
         * Latar hero halaman Profil PPID.
         *
         * Bawaannya KOSONG, tidak seperti latar lain. Hero PPID sudah punya
         * gradien langit berpartikel sendiri, dan itu tampilan yang berlaku
         * sampai petugas benar-benar memilih gambar. Bawaan berupa foto stok
         * berarti halaman resmi PPID memajang gambar yang tidak dipilih
         * siapa pun.
         */
        'bg_ppid' => '',

        // Video hero (dipertahankan agar kompatibel dengan pengaturan lama)
        'hero_video_url' => 'https://assets.mixkit.co/videos/preview/mixkit-airplane-taking-off-at-sunset-41484-large.mp4',

        // Satu ukuran kanvas untuk seluruh Slide Informasi pada beranda.
        'info_slide_width' => '1400',
        'info_slide_height' => '525',

        /*
         * Survei Kepuasan Masyarakat.
         *
         * Ketiga kunci pertama SUDAH ADA isinya di tabel `settings` warisan v1
         * — portal lama punya halaman pengaturannya. v2 sempat menuliskan
         * nilainya keras di `frontend/src/lib/serviceStandardData.ts`, sehingga
         * nilainya kebetulan sama persis tetapi petugas tidak dapat
         * mengubahnya. Nilai bawaan di bawah sengaja disamakan dengan isi
         * basis data, jadi memindahkannya ke sini tidak mengubah apa pun yang
         * tampil.
         *
         * Tautan SKM dapat berganti sewaktu-waktu (ia milik Kemenhub, bukan
         * bandara), dan tautan mati pada halaman kewajiban UU 25/2009 adalah
         * hal yang harus bisa dibetulkan petugas sendiri — tanpa menunggu
         * penggelaran ulang.
         */
        'skm_url' => 'https://skm.dephub.go.id/ly/ApfkINxw',
        'skm_label' => 'Isi Survei Kepuasan Masyarakat',
        'skm_is_active' => '1',

        // Judul dan pengantar ajakan SKM. Tidak ada di v1 — teksnya lahir di
        // v2, tetapi diletakkan di sini supaya seluruh blok SKM dapat disunting
        // dari satu tempat, bukan setengahnya dari panel dan setengahnya dari kode.
        'skm_title' => 'Ikut Serta dalam Survei Kepuasan Masyarakat',
        'skm_text' => 'Penilaian Anda kami olah menjadi Indeks Kepuasan Masyarakat, dan laporan hasilnya diterbitkan pada halaman ini.',

        /*
         * Sumber konten Instagram pada beranda: 'auto' atau 'manual'.
         *
         *   auto   — sinkronisasi terjadwal menarik unggahan dari Graph API.
         *            Menuntut token yang sudah lolos App Review Meta.
         *   manual — petugas memasukkan unggahannya sendiri lewat panel, dan
         *            KEDUA pekerjaan terjadwal berhenti di awal.
         *
         * Bawaannya sengaja `manual`. Token Meta belum ada; kalau bawaannya
         * `auto`, tiap pemasangan baru langsung menjadwalkan pekerjaan yang
         * pasti gagal tiap tiga jam — tanpa gejala apa pun di portal.
         *
         * Ditaruh di `settings` dan bukan di `instagram_credentials`: ini
         * sakelar tampilan, bukan rahasia. Pola yang sama dipakai
         * `skm_is_active`.
         */
        'instagram_mode' => 'manual',

        /*
         * Blok "Tentang Bandar Udara APT Pranoto" pada beranda.
         *
         * BAWAANNYA SENGAJA KOSONG, berbeda dari seluruh kunci di atas.
         *
         * Teks yang tayang hari ini tinggal di kamus dwibahasa frontend
         * (`lib/kamus/id.ts` dan `en.ts`). Menyalinnya ke sini sebagai nilai
         * bawaan berarti dua sumber untuk kalimat yang sama, dan yang satu
         * pasti menyimpang dari yang lain begitu salah satunya disunting.
         * Dengan bawaan kosong, keadaan "belum pernah disunting petugas" tetap
         * punya satu sumber saja, dan isian di panel murni berupa penimpaan.
         *
         * Frontend memperlakukan nilai kosong sebagai "pakai teks kamus";
         * lihat `lib/tentang.ts`.
         *
         * Sepasang kunci per teks karena portalnya dwibahasa. Yang versi
         * Inggrisnya dibiarkan kosong jatuh ke terjemahan di kamus, bukan ke
         * teks Indonesia yang diisi petugas — halaman berbahasa Inggris yang
         * separuhnya Indonesia lebih membingungkan daripada terjemahan baku
         * yang belum disesuaikan.
         */
        'tentang_kicker_id' => '',
        'tentang_kicker_en' => '',
        'tentang_judul_id' => '',
        'tentang_judul_en' => '',
        'tentang_teks_id' => '',
        'tentang_teks_en' => '',
        'tentang_caption_id' => '',
        'tentang_caption_en' => '',

        /** Gambar sampul kartu; kosong berarti memakai /bg/bg-beranda.png. */
        'tentang_gambar' => '',

        /**
         * Tautan video profil (YouTube).
         *
         * Kosong berarti tombol putarnya TIDAK dirender sama sekali. Sebelum
         * kunci ini ada, tombol itu selalu tampil dan tidak melakukan apa pun
         * — tombol mati lebih buruk daripada tidak ada tombol.
         */
        'tentang_video_url' => '',

        /**
         * Video Profil PPID pada halaman /ppid.
         *
         * Berdiri sendiri dari 'tentang_video_url': yang satu memperkenalkan
         * bandara, yang ini memperkenalkan layanan informasi publiknya. Kosong
         * berarti seluruh bagian videonya TIDAK dirender — bukan pemutar
         * kosong, dan bukan tombol yang tidak melakukan apa pun.
         *
         * 'ppid_video_gambar' adalah sampulnya. Sampul itulah satu-satunya yang
         * dimuat sebelum pengunjung menekan putar; iframe YouTube baru lahir
         * sesudahnya. Lihat catatan privasi di VideoProfil.tsx.
         */
        'ppid_video_url' => '',
        'ppid_video_gambar' => '',

        /*
         * Notifikasi WhatsApp ke petugas piket.
         *
         * HANYA yang bukan rahasia yang boleh ada di sini. Endpoint
         * GET /settings bersifat publik, jadi kunci API gateway dan nomor
         * ponsel petugas TIDAK pernah masuk daftar ini — keduanya punya
         * tabelnya sendiri (wa_credentials, wa_recipients) yang hanya terbaca
         * lewat endpoint bertoken. Lihat WaController.
         *
         * Bawaannya kosong supaya nilai .env yang sudah terpasang tetap
         * berlaku sampai petugas benar-benar menyuntingnya dari panel; lihat
         * WhatsAppGateway::setelan().
         */
        'wa_enabled' => '',
        'wa_endpoint' => '',
        'wa_daily_cap' => '',
    ];

    /** Mode yang dikenali; dipakai pula sebagai aturan validasi. */
    public const INSTAGRAM_MODES = ['auto', 'manual'];

    /**
     * Mode Instagram yang sedang berlaku.
     *
     * Dibaca perintah terjadwal dan `InstagramController`. Nilai yang tidak
     * dikenali dianggap `manual` — keadaan yang tidak menjadwalkan apa pun
     * lebih aman daripada keadaan yang memanggil Meta dengan token entah ada
     * entah tidak.
     */
    public static function modeInstagram(): string
    {
        $nilai = Setting::where('key', 'instagram_mode')->value('value')
            ?? self::DEFAULTS['instagram_mode'];

        return in_array($nilai, self::INSTAGRAM_MODES, true) ? $nilai : 'manual';
    }

    /** Ambil seluruh pengaturan, digabung dengan nilai bawaan. */
    public function index()
    {
        $stored = Setting::pluck('value', 'key')->toArray();

        $settings = [];
        foreach (self::DEFAULTS as $key => $default) {
            $value = $stored[$key] ?? null;
            $settings[$key] = ($value === null || $value === '') ? $default : $value;
        }

        return ApiResponse::success($settings, 'Pengaturan tampilan portal');
    }

    /**
     * Simpan satu atau beberapa pengaturan sekaligus.
     * Kunci di luar daftar DEFAULTS diabaikan.
     * Nilai kosong mengembalikan kunci tersebut ke nilai bawaan.
     */
    public function update(Request $request)
    {
        $incoming = array_intersect_key($request->all(), self::DEFAULTS);

        if (empty($incoming)) {
            return ApiResponse::error('Tidak ada pengaturan yang dikenali untuk disimpan', null, 422);
        }

        $batasUkuran = [
            'info_slide_width' => [320, 1400, 'Lebar slide harus antara 320–1.400 piksel.'],
            'info_slide_height' => [160, 900, 'Tinggi slide harus antara 160–900 piksel.'],
        ];

        foreach ($batasUkuran as $key => [$minimum, $maksimum, $pesan]) {
            if (! array_key_exists($key, $incoming) || $incoming[$key] === '') {
                continue;
            }

            $nilai = filter_var($incoming[$key], FILTER_VALIDATE_INT);
            if ($nilai === false || $nilai < $minimum || $nilai > $maksimum) {
                return ApiResponse::error($pesan, [$key => [$pesan]], 422);
            }
        }

        foreach ($incoming as $key => $value) {
            if ($value === null || $value === '') {
                Setting::where('key', $key)->delete(); // kembali ke bawaan

                continue;
            }

            if (! is_string($value) || mb_strlen($value) > 2048) {
                return ApiResponse::error("Nilai untuk '{$key}' tidak valid", null, 422);
            }

            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return $this->index();
    }
}
