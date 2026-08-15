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
