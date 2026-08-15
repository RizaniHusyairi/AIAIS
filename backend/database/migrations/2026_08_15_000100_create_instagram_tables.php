<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unggahan Instagram yang disalin ke portal, beserta kredensialnya.
 *
 * Keduanya tabel BARU — v1 tidak punya padanannya — jadi aturan tabel baru
 * berlaku: `string` + konstanta model, bukan enum, supaya menambah jenis media
 * baru kelak tidak menuntut migrasi ALTER.
 *
 * ============================================================
 * KENAPA ADA `local_image_path`
 * ============================================================
 *
 * `media_url` dari Graph API menunjuk CDN Meta dan MATI dalam hitungan jam.
 * Menyimpan URL-nya lalu menampilkannya langsung menghasilkan beranda penuh
 * gambar rusak beberapa jam kemudian — kekeliruan yang paling sering merusak
 * integrasi Instagram. Karena itu gambarnya diunduh dan disimpan sendiri, dan
 * kolom inilah yang ditampilkan portal.
 *
 * ============================================================
 * KENAPA KREDENSIALNYA PUNYA TABEL SENDIRI
 * ============================================================
 *
 * Bukan di `settings`: tabel itu memang dirancang untuk dibaca publik, dan
 * menaruh rahasia di sana menggantungkan keamanannya pada seseorang yang kelak
 * tidak keliru menambahkan kuncinya ke daftar putih `SettingController`.
 *
 * Bukan pula di `.env`: token ini harus DITULIS ULANG tiap penyegaran otomatis,
 * dan berkas `.env` bukan tempat yang boleh ditulis aplikasi saat berjalan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('instagram_posts', function (Blueprint $table) {
            $table->id();

            // Kunci penyandingan saat sinkronisasi berulang; unik supaya satu
            // unggahan tidak pernah tergandakan.
            $table->string('ig_id', 64)->unique();

            $table->string('permalink', 500);
            $table->string('media_type', 32);

            /*
             * Salinan lokal gambarnya. Nullable karena unduhannya dapat gagal
             * sementara — barisnya tetap tersimpan supaya sinkronisasi
             * berikutnya dapat mencoba lagi tanpa kehilangan takarir dan
             * tautannya.
             */
            $table->string('local_image_path', 255)->nullable();

            $table->text('caption')->nullable();
            $table->timestamp('posted_at')->nullable();

            /*
             * Kendali redaksi. Portal pemerintah bukan cermin buta Instagram:
             * kuis berhadiah atau ucapan kedaluwarsa wajar di sana, belum tentu
             * pantas jadi muka halaman depan bandara. Petugas menyembunyikannya
             * di sini tanpa menghapusnya di Instagram, dan sinkronisasi
             * berikutnya tidak menyalakannya kembali.
             */
            $table->boolean('is_visible')->default(true);

            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            // Beranda selalu meminta unggahan tampil, terbaru lebih dulu.
            $table->index(['is_visible', 'posted_at']);
        });

        Schema::create('instagram_credentials', function (Blueprint $table) {
            $table->id();
            $table->text('access_token');
            $table->timestamp('expires_at')->nullable();
            // Akun yang tokennya mewakili; dipakai panel untuk menunjukkan
            // sambungannya menuju akun yang benar.
            $table->string('account_username', 125)->nullable();
            $table->timestamp('last_refreshed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instagram_posts');
        Schema::dropIfExists('instagram_credentials');
    }
};
