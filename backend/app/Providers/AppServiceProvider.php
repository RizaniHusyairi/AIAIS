<?php

namespace App\Providers;

use Carbon\Carbon;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\DB;
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
