<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lengkapi tabel `tourisms` dengan medan yang dipakai portal v2.
 *
 * Halaman wisata v2 menampilkan jarak dan waktu tempuh dari terminal, kota,
 * serta daftar daya tarik singkat — semuanya tidak punya kolom di v1, sehingga
 * selama ini tertulis di kode dan tidak dapat disunting petugas.
 *
 * Empat kolom ini yang membuat peralihan halaman publik ke basis data nanti
 * tidak kehilangan apa pun. Semuanya nullable: tiga destinasi yang sudah ada
 * tetap sah tanpa harus dilengkapi lebih dulu.
 *
 * Jarak dan waktu tempuh adalah PERKIRAAN perjalanan darat pada lalu lintas
 * normal, bukan angka resmi — karena itu `duration` berupa teks bebas
 * ("±15 menit"), bukan satuan menit yang menyiratkan ketelitian yang tidak
 * dimilikinya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tourisms', function (Blueprint $table) {
            $table->decimal('distance_km', 5, 1)->nullable()->after('category');
            $table->string('duration', 50)->nullable()->after('distance_km');
            $table->string('city', 100)->nullable()->after('duration');
            $table->json('highlights')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('tourisms', function (Blueprint $table) {
            $table->dropColumn(['distance_km', 'duration', 'city', 'highlights']);
        });
    }
};
