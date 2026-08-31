<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->guardAgainstSeedingRealData();

        $this->call(AirportDatabaseSeeder::class);

        /*
         * Perayaan beranda. Isinya bukan data karangan — 17 Agustus dan
         * 1 Januari fakta kalender — sehingga aman dijalankan pada basis data
         * sungguhan sekalipun. Karena penjaga di atas menghentikan seluruh
         * `db:seed`, pada basis data produksi jalankan tersendiri:
         *
         *     php artisan db:seed --class=SiteEventSeeder
         */
        $this->call(SiteEventSeeder::class);

        /*
         * Pejabat struktural. Sama seperti perayaan di atas, isinya BUKAN data
         * karangan — seluruhnya salinan verbatim halaman "Pejabat Bandara"
         * aptpairport.id, lengkap dengan provenansnya — sehingga aman
         * dijalankan pada basis data sungguhan. Karena penjaga di atas
         * menghentikan seluruh `db:seed`, di sana jalankan tersendiri:
         *
         *     php artisan db:seed --class=OfficialSeeder
         *
         * Seeder itu tidak menimpa foto yang sudah diunggah lewat panel admin,
         * jadi menjalankannya ulang tidak menghapus pekerjaan petugas.
         */
        $this->call(OfficialSeeder::class);

        /*
         * Angka ringkas beranda. Isinya BUKAN angka baru: seluruhnya salinan
         * konstanta yang selama ini sudah tayang di beranda, dipindahkan ke
         * basis data agar petugas dapat menyuntingnya. Karena itu aman
         * dijalankan pada basis data sungguhan — yang tampil tidak berubah
         * satu angka pun. Di sana jalankan tersendiri:
         *
         *     php artisan db:seed --class=AirportStatSeeder
         *
         * Baca blok provenans di seedernya sebelum mengubah angka mana pun;
         * angka-angka itu belum pernah diverifikasi terhadap dokumen resmi.
         */
        $this->call(AirportStatSeeder::class);

        /*
         * SK Tim PPID yang selama ini tayang — dipindahkan dari konstanta
         * frontend ke basis data supaya petugas dapat menggantinya sendiri.
         * Aman diulang: seedernya memakai firstOrCreate atas tautan SK-nya.
         */
        $this->call(PpidProfileDocumentSeeder::class);
    }

    /**
     * Tolak menyemai basis data yang berisi data sungguhan.
     *
     * Portal v2 berjalan di atas basis data portal v1. Seeder di proyek ini
     * memuat contoh ilustratif — berita, pengaduan, gerai — dan menjalankannya
     * di sana berarti menerbitkan berita karangan di portal resmi bandara.
     * Itu persis yang dilarang aturan "jangan mengarang data resmi", dan
     * sekali terjadi tidak ada yang membedakannya dari berita sungguhan.
     *
     * Basis data v1 tidak memerlukan penyemaian: isinya sudah lengkap,
     * termasuk akun petugas untuk masuk ke panel admin.
     */
    private function guardAgainstSeedingRealData(): void
    {
        $database = DB::connection()->getDatabaseName();

        if (! in_array($database, config('legacy.protected_databases', []), true)) {
            return;
        }

        throw new RuntimeException(
            "Penyemaian dibatalkan: '{$database}' berisi data sungguhan portal bandara. "
            .'Seeder memuat contoh ilustratif yang tidak boleh tercampur ke sana. '
            .'Untuk mencoba seeder, tunjuk DB_DATABASE ke basis data kosong.'
        );
    }
}
