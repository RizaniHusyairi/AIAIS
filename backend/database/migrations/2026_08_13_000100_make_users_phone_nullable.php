<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Longgarkan `users.phone` menjadi nullable.
 *
 * Di v1 kolom ini `NOT NULL UNIQUE` karena satu-satunya cara akun lahir adalah
 * formulir pendaftaran publik, dan formulir itu selalu meminta nomor telepon.
 * v2 menambahkan jalur kedua: admin membuatkan akun untuk petugas. Nomor
 * telepon rekan kerja tidak selalu diketahui saat itu, dan dengan kolom
 * NOT NULL kegagalannya muncul sebagai galat SQL mentah, bukan pesan validasi
 * yang bisa dibaca.
 *
 * Keunikan DIPERTAHANKAN — MySQL mengizinkan banyak baris NULL pada indeks
 * unik, jadi nomor yang benar-benar diisi tetap tidak boleh kembar.
 *
 * Aman dijalankan selagi v1 masih hidup: ini pelonggaran, dan validasi
 * `required` di formulir pendaftaran v1 tetap berlaku di lapisan aplikasinya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 125)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 125)->nullable(false)->change();
        });
    }
};
