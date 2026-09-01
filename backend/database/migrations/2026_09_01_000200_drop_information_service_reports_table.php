<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Buang tabel Laporan Layanan Informasi.
 *
 * Modulnya dihapus seutuhnya — halaman publik, layar PWA, panel admin, rute,
 * controller, dan modelnya sudah tidak ada lagi. Tabelnya sendiri warisan
 * portal v1 dan tidak pernah dibuat oleh migrasi mana pun di repositori ini,
 * jadi `dropIfExists`: pada basis data yang tidak pernah mengimpor dump v1,
 * tabel ini memang tidak ada sejak awal.
 *
 * `down()` hanya mengembalikan STRUKTURNYA, bukan isinya. Baris yang telanjur
 * ada ikut hilang bersama tabelnya — itu konsekuensi yang disetujui saat
 * modul ini dihapus, bukan kelalaian.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('information_service_reports');
    }

    public function down(): void
    {
        Schema::create('information_service_reports', function (Blueprint $table) {
            $table->id();
            $table->string('title', 500);
            $table->year('publication_year');
            $table->string('document_link');
            $table->timestamps();
        });
    }
};
