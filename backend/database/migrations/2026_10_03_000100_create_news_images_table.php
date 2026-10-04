<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Galeri foto per berita.
 *
 * Gambar sengaja TIDAK disisipkan ke dalam HTML isi berita. `img` tidak ada di
 * daftar putih `frontend/src/lib/htmlAman.ts`, dan membukanya berarti
 * memercayakan `src` pada apa pun yang ditempel petugas. Sebagai baris
 * tersendiri, fotonya berstruktur: desktop menampilkannya sebagai kisi dengan
 * lightbox, PWA sebagai karusel, dari data yang sama.
 *
 * Kunci asingnya menunjuk tabel `news` warisan v1 (InnoDB, `id` bigint
 * unsigned). Baris galeri ikut terhapus bersama beritanya; berkasnya dihapus
 * oleh NewsController karena basis data tidak tahu apa-apa soal cakram.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('news_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_id')->constrained('news')->cascadeOnDelete();

            /** Lintasan pada disk `public` — selalu unggahan v2. */
            $table->string('path', 500);

            /** Keterangan foto; juga dipakai sebagai teks `alt`. */
            $table->string('caption', 255)->nullable();

            /** Urutan tampil; kecil lebih dulu. */
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['news_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('news_images');
    }
};
