<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Selaraskan tabel Posko Nataru warisan v1.
 *
 * Tiga perubahan, masing-masing menutup satu kekurangan nyata:
 *
 * 1. **`seat_capacity` ditambahkan.** v1 meminta kapasitas kursi pada formulir
 *    petugas, memakainya menghitung load factor, lalu MEMBUANGNYA. Tanpa angka
 *    itu, load factor yang tersimpan tidak dapat diperiksa ulang maupun
 *    dihitung ulang bila jumlah penumpangnya dikoreksi.
 *
 * 2. **`load_factor` bernilai 0 dijadikan NULL.** v1 menyimpan 0 ketika
 *    kapasitas kursi tidak diisi, sehingga "tidak diketahui" tidak dapat
 *    dibedakan dari "sama sekali kosong" — dan nol itu ikut menyeret turun
 *    setiap rata-rata. Kolomnya memang sudah nullable; hanya pengisiannya yang
 *    keliru.
 *
 * 3. **`direction` dan `status_flight` dilepas dari enum**, sesuai konvensi.
 *
 * SETIAP LANGKAH DIJAGA `hasColumn`. MySQL tidak membatalkan perubahan skema
 * dalam transaksi, sehingga migrasi yang gagal di tengah meninggalkan basis
 * data setengah berubah sementara migrasinya sendiri tercatat belum jalan —
 * menjalankannya ulang lalu gagal pada langkah yang terlanjur sukses. Penjaga
 * di bawah membuat pengulangannya aman.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('nataru_flights', 'seat_capacity')) {
            Schema::table('nataru_flights', function (Blueprint $table) {
                $table->unsignedInteger('seat_capacity')->nullable()->after('aircraft_registration');
            });
        }

        Schema::table('nataru_flights', function (Blueprint $table) {
            $table->string('direction', 20)->change();
            $table->string('status_flight', 50)->change();
        });

        // Nol di sini selalu berarti "kapasitas kursi tidak diisi": penerbangan
        // yang benar-benar mengangkut nol penumpang tetap punya kapasitas, dan
        // load factor-nya tercatat sebagai angka kecil, bukan tepat nol.
        DB::table('nataru_flights')->where('load_factor', 0)->update(['load_factor' => null]);

        // `public_token` SENGAJA tidak disentuh. Kolomnya sudah unik, dan
        // menyatakan ulang `unique()` pada `change()` membuat Laravel mencoba
        // menambah indeks bernama sama — persis kegagalan yang membuat migrasi
        // ini sempat berhenti separuh jalan.
        Schema::table('nataru_events', function (Blueprint $table) {
            $table->string('name', 255)->change();
        });
    }

    public function down(): void
    {
        Schema::table('nataru_flights', function (Blueprint $table) {
            $table->dropColumn('seat_capacity');
        });
    }
};
