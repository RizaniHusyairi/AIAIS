<?php

namespace Database\Seeders;

use App\Models\Announcement;
use Illuminate\Database\Seeder;

/**
 * Menghapus pengumuman contoh yang ditulis `AnnouncementDemoSeeder`.
 *
 * Hanya baris yang judulnya bertanda "[CONTOH]" yang dihapus, sehingga
 * pengumuman sungguhan yang ditulis petugas lewat panel tidak ikut terbawa.
 *
 *     php artisan db:seed --class=AnnouncementDemoRevertSeeder
 */
class AnnouncementDemoRevertSeeder extends Seeder
{
    public function run(): void
    {
        $jumlah = Announcement::where('title', 'like', AnnouncementDemoSeeder::TANDA.'%')->delete();

        $this->command?->info("Pengumuman contoh dihapus: {$jumlah} baris.");
    }
}
