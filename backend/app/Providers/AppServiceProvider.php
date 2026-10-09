<?php

namespace App\Providers;

use App\Helpers\ApiResponse;
use App\Services\Notifikasi\KonfigurasiSurel;
use Carbon\Carbon;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->guardIrreplaceableData();
        $this->arahkanTautanResetKePortal();
        $this->setelBahasaTanggal();
        $this->pakaiSurelDariPanel();
        $this->aturBatasLajuAbsensi();
    }

    /**
     * Batas laju daftar hadir rapat.
     *
     * `throttle:N,1` biasa — kunci per IP — salah sasaran di sini, dua kali:
     *
     *  1. Halaman `/absensi/{token}` mengambil keterangan rapat dari SISI
     *     SERVER Next. Bagi Laravel seluruh permintaan itu datang dari satu
     *     IP, milik server Next sendiri, sehingga jatah per IP menjadi jatah
     *     BERSAMA semua peserta. Peserta ke-31 yang memindai QR menjelang
     *     rapat dimulai mendapat "tautan tidak dikenali".
     *  2. Kirimannya memang dari peramban peserta, tetapi peserta rapat di
     *     kantor bandara keluar lewat satu IP Wi-Fi yang sama. 20 per menit
     *     per IP berarti rapat yang lebih besar dari itu tertahan di pintu.
     *
     * Karena itu jatahnya dihitung per TAUTAN (per rapat), dengan batas per
     * IP yang jauh lebih longgar sebagai pagar terhadap banjir permintaan.
     * Token 48 aksara tetap tidak dapat ditebak — batas ini menjaga beban,
     * bukan kerahasiaan.
     *
     * Jawaban 429-nya ditulis sendiri: bawaan Laravel berbunyi "Too Many
     * Attempts.", dan layar peserta menampilkan `message` apa adanya.
     */
    private function aturBatasLajuAbsensi(): void
    {
        $tolak = fn (Request $request, array $headers) => ApiResponse::error(
            'Daftar hadir sedang ramai diisi. Tunggu sebentar, lalu coba lagi.',
            null,
            429,
        )->withHeaders($headers);

        RateLimiter::for('absensi-baca', fn (Request $request) => [
            Limit::perMinute(300)->by('absensi-baca:token:'.$request->route('token'))->response($tolak),
            Limit::perMinute(600)->by('absensi-baca:ip:'.$request->ip())->response($tolak),
        ]);

        RateLimiter::for('absensi-tulis', fn (Request $request) => [
            // Per rapat per IP: satu Wi-Fi kantor yang dipakai puluhan peserta
            // sekaligus masih lega, satu perangkat yang membanjiri tidak.
            Limit::perMinute(60)->by('absensi-tulis:'.$request->route('token').':'.$request->ip())->response($tolak),
            Limit::perMinute(300)->by('absensi-tulis:token:'.$request->route('token'))->response($tolak),
        ]);
    }

    /**
     * Server surel dari panel admin (tabel `mail_configs`) menimpa `MAIL_*`.
     *
     * Dipasang pada saat `mail.manager` pertama kali dibutuhkan, bukan di
     * sini secara langsung: kebanyakan permintaan tidak mengirim surel sama
     * sekali dan tidak perlu menanyai basis data. Berlaku untuk SEMUA surel —
     * bukti permohonan ke warga maupun tautan reset kata sandi petugas.
     */
    private function pakaiSurelDariPanel(): void
    {
        $this->app->resolving('mail.manager', fn () => KonfigurasiSurel::terapkan());
    }

    /**
     * Nama hari dan bulan dalam bahasa Indonesia.
     *
     * `APP_LOCALE` sengaja dibiarkan `en`: mengubahnya membuat Laravel mencari
     * berkas terjemahan `lang/id/` yang tidak ada, dan seluruh pesan bawaan
     * kerangka kerja diam-diam jatuh kembali ke Inggris — tanpa ada yang
     * kelihatan berubah sampai sebuah pesan tak terduga muncul.
     *
     * Yang benar-benar perlu berbahasa Indonesia adalah tanggalnya, dan itu
     * urusan Carbon. Ketahuan pada cetakan PDF pertama: kop laporan resmi
     * tertulis "Periode October 2025".
     */
    private function setelBahasaTanggal(): void
    {
        Carbon::setLocale('id');
    }

    /**
     * Tautan reset kata sandi harus mendarat di portal, bukan di API.
     *
     * Bawaan Laravel menyusun tautan ke rute bernama `password.reset` di
     * aplikasi yang sama. Di sini tampilannya terpisah: Laravel hanya melayani
     * API, dan formulir reset ada di Next.js. Tanpa penyesuaian ini, penerima
     * surel mendarat pada rute yang tidak ada.
     *
     * Surel dan token dibawa lewat kueri karena formulir di portal harus
     * mengirimkan keduanya kembali saat menyimpan sandi baru.
     */
    private function arahkanTautanResetKePortal(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $portal = rtrim((string) config('app.frontend_url'), '/');
            $query = http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

            return "{$portal}/admin/reset-sandi?{$query}";
        });
    }

    /**
     * Tolak command perusak basis data.
     *
     * Portal v2 berjalan di atas basis data portal v1 — data operasional
     * bertahun-tahun yang tidak punya salinan pengganti. `migrate:fresh` sekali
     * saja menghapus seluruhnya, dan justru itulah command yang paling sering
     * diketik dari kebiasaan saat mengembangkan modul baru.
     *
     * Pemicunya sengaja bukan sekadar APP_ENV. Kekeliruan yang paling mungkin
     * terjadi bukan di server produksi, melainkan di mesin pengembangan yang
     * DB_DATABASE-nya kebetulan menunjuk basis data sungguhan.
     */
    private function guardIrreplaceableData(): void
    {
        $connection = config('database.default');
        $database = config("database.connections.{$connection}.database");

        DB::prohibitDestructiveCommands(
            $this->app->isProduction()
            || in_array($database, config('legacy.protected_databases', []), true)
        );
    }
}
