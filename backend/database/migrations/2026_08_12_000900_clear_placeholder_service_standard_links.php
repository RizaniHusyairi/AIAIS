<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Kosongkan tautan dokumen standar pelayanan yang hanya berupa contoh.
 *
 * Ketiga baris `service_standards` warisan v1 menunjuk
 * `drive.google.com/drive/folders/example-…` — harfiah berawalan "example-",
 * bukan ID Google Drive yang sah. Berkasnya tidak pernah diunggah.
 *
 * Membiarkannya berarti portal memasang tombol "Lihat Dokumen" yang berujung
 * 404, justru pada dokumen yang menjadi tolok ukur pelayanan publik. Kolom
 * kosong jauh lebih jujur: tampilan mengatakan "belum tersedia", dan berubah
 * sendiri menjadi tombol unduh begitu petugas mengisi tautan yang sebenarnya
 * lewat panel admin.
 *
 * Ini BUKAN penghapusan data resmi — yang dibuang justru nilai contoh yang
 * tidak pernah menunjuk dokumen mana pun.
 *
 * Penyaringnya sempit dengan sengaja: hanya nilai yang mengandung
 * "/example-". Bila basis data produksi ternyata sudah memuat tautan asli,
 * baris itu tidak tersentuh.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_standards', function (Blueprint $table) {
            $table->string('type', 100)->index()->change();
            $table->string('title', 500)->change();
            $table->string('file_path', 500)->nullable()->change();
        });

        DB::table('service_standards')
            ->where('document_link', 'like', '%/example-%')
            ->update(['document_link' => null]);
    }

    public function down(): void
    {
        // Nilai contohnya tidak dikembalikan: memulihkan tautan rusak bukan
        // pemulihan yang berguna bagi siapa pun.
        Schema::table('service_standards', function (Blueprint $table) {
            $table->dropIndex(['type']);
        });
    }
};
