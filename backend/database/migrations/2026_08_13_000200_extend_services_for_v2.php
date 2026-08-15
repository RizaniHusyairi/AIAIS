<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lengkapi tabel `services` warisan v1.
 *
 * Tabel v1 menyimpan nama, judul, persyaratan, alur, dan tarif — tetapi TIDAK
 * menyimpan kalimat ringkasan maupun paragraf pembuka halaman. Di v1 kedua
 * teks itu ditulis langsung di berkas tampilan, sehingga petugas tidak pernah
 * bisa menyuntingnya. Dua kolom ini memberi teks tersebut rumah yang benar.
 *
 * Keduanya nullable: portal v2 tetap memakai teks bawaan hasil transkripsi
 * halaman v1 selama kolomnya kosong, jadi tidak ada halaman yang mendadak
 * kehilangan paragraf pembukanya.
 *
 * `submission_url` dilebarkan karena nilainya akan berganti dari lintasan
 * pendek gaya v1 ("dashboard/tenant") menjadi lintasan portal v2 begitu modul
 * pengajuannya mendarat.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('summary', 500)->nullable()->after('title');
            $table->text('description')->nullable()->after('summary');

            $table->string('name', 150)->change();
            $table->string('title', 255)->change();
            $table->string('submission_url', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['summary', 'description']);
        });
    }
};
