<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Buka `instagram_posts` untuk unggahan yang dimasukkan petugas sendiri.
 *
 * ============================================================
 * KENAPA TABELNYA PERLU DILONGGARKAN
 * ============================================================
 *
 * Tabel ini dibuat khusus untuk hasil tarikan Graph API, sehingga dua kolomnya
 * mensyaratkan hal yang tidak dimiliki unggahan manual:
 *
 *   `ig_id`     — unggahan manual tidak berasal dari Instagram, jadi tidak
 *                 punya id di sana.
 *   `permalink` — petugas boleh saja hanya mengunggah gambar dan menulis
 *                 takarir, tanpa ada tautan Instagram yang menyertainya.
 *
 * Keduanya dijadikan nullable. `ig_id` tetap unik: indeks unik MySQL
 * mengizinkan banyak baris NULL sekaligus, jadi berapa pun unggahan manualnya
 * tidak akan pernah bertabrakan satu sama lain.
 *
 * ============================================================
 * KENAPA ADA `source`
 * ============================================================
 *
 * Sinkronisasi harus tahu persis baris mana yang boleh disentuhnya. Secara
 * kebetulan hal itu sudah aman — pencariannya lewat `ig_id`, dan yang NULL
 * tidak pernah cocok — tetapi keamanan yang bergantung pada kebetulan akan
 * lenyap begitu seseorang kelak mengisi `ig_id` manual dengan nilai penanda.
 * Kolom ini membuat batasnya tertulis, bukan tersirat.
 *
 * Baris yang sudah ada bernilai `api`, dan itu benar: seluruhnya berasal dari
 * sinkronisasi.
 *
 * Tabel ini milik v2 sepenuhnya — v1 tidak punya padanannya — jadi mengubah
 * bentuk kolomnya tidak menyentuh satu pun data warisan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('instagram_posts', function (Blueprint $table) {
            // `string` + konstanta model, bukan enum: menambah sumber baru
            // kelak tidak boleh menuntut migrasi ALTER.
            $table->string('source', 10)->default('api')->after('id');

            $table->string('ig_id', 64)->nullable()->change();
            $table->string('permalink', 500)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('instagram_posts', function (Blueprint $table) {
            $table->dropColumn('source');

            // Dikembalikan NOT NULL. Baris manual harus sudah dibersihkan
            // lebih dulu; tanpa itu pembalikan ini memang akan gagal, dan itu
            // lebih baik daripada diam-diam mengisi kolomnya dengan tebakan.
            $table->string('ig_id', 64)->nullable(false)->change();
            $table->string('permalink', 500)->nullable(false)->change();
        });
    }
};
