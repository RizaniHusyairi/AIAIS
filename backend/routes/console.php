<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Jadwal
|--------------------------------------------------------------------------
|
| PENTING: jadwal ini hanya berjalan bila server memiliki satu baris cron yang
| memanggil `php artisan schedule:run` tiap menit. Tanpa itu tidak ada galat
| apa pun — isinya sekadar tidak pernah berubah, dan gejalanya sulit dikenali.
| Lihat docs/DEPLOY.md.
|
*/

/*
 * Pemroses antrean.
 *
 * `QUEUE_CONNECTION=database`, tetapi server ini TIDAK menjalankan worker
 * apa pun — `deploy.sh` tidak memasang supervisor maupun pm2 untuk itu. Tanpa
 * baris ini, setiap pekerjaan yang diantrekan (notifikasi WhatsApp, kiriman
 * push) menumpuk di tabel `jobs` selamanya tanpa satu pun galat: gejalanya
 * persis seperti berhasil.
 *
 * Menumpang cron `schedule:run` yang memang sudah wajib ada, jadi tidak
 * menambah beban ops sama sekali. `--stop-when-empty` membuatnya berhenti
 * begitu antrean habis; `--max-time=50` menjamin ia selesai sebelum menit
 * berikutnya memanggil lagi.
 *
 * Konsekuensinya notifikasi berantre tertunda paling lama satu menit. Lonceng
 * di panel tidak ikut tertunda — kanal `database`-nya berjalan `sync`.
 */
Schedule::command('queue:work --stop-when-empty --max-time=50 --tries=3')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// Unggahan Instagram untuk beranda. Tiap tiga jam sudah jauh lebih sering
// daripada laju bandara mengunggah, dan jauh di bawah batas Graph API.
Schedule::command('aiais:sync-instagram')
    ->everyThreeHours()
    ->withoutOverlapping()
    ->runInBackground();

// Token Instagram berumur ±60 hari. Diperiksa harian; yang disegarkan hanya
// yang sisa umurnya kurang dari sepuluh hari — lihat perintahnya.
Schedule::command('aiais:refresh-instagram-token')
    ->dailyAt('03:15')
    ->withoutOverlapping();

// Laporan kehilangan yang urusannya sudah selesai memuat nama, ponsel, dan
// surel orang yang tidak lagi berkepentingan. Dimusnahkan sesudah setahun.
//
// `--apply` WAJIB ada di sini: tanpa bendera itu perintahnya hanya memeriksa,
// sehingga jadwalnya akan berjalan tiap bulan tanpa pernah menghapus apa pun —
// gagal senyap yang persis bentuknya seperti berhasil.
Schedule::command('aiais:purge-lost-reports --apply')
    ->monthlyOn(1, '02:30')
    ->withoutOverlapping();
