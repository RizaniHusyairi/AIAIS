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

        // Video hero (dipertahankan agar kompatibel dengan pengaturan lama)
        'hero_video_url' => 'https://assets.mixkit.co/videos/preview/mixkit-airplane-taking-off-at-sunset-41484-large.mp4',

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
    ];

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
