<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Longgarkan kolom `letters` warisan v1 agar muat dipakai v2.
 *
 * Tiga hal yang mendesak:
 *
 * 1. `title` varchar(125). Judul surat keputusan yang benar-benar tayang di
 *    portal v1 panjangnya 124 karakter — tersisa satu karakter. Surat
 *    berikutnya dengan judul sedikit lebih panjang akan gagal disimpan.
 *
 * 2. `file_path` varchar(125). Cukup untuk lintasan lokal, tapi tidak untuk
 *    URL penuh ke dokumen yang dilayani pihak lain — bentuk nilai yang memang
 *    didukung Letter::getFileUrlAttribute().
 *
 * 3. `file_path` NOT NULL. Surat yang berkasnya tercecer tetap harus tercatat:
 *    nomor, judul, dan tanggalnya adalah catatan resmi. Model Letter sudah
 *    menangani keadaan ini lewat `has_file`, sehingga daftar publik
 *    menyembunyikannya sementara halaman admin tetap menampilkannya.
 *
 * Semuanya pelonggaran, bukan pengetatan, jadi aplikasi v1 tetap berjalan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->string('title', 255)->change();
            $table->string('file_path', 500)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->string('title', 125)->change();
            $table->string('file_path', 125)->nullable(false)->change();
        });
    }
};
