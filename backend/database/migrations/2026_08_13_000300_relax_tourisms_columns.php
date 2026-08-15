<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Longgarkan kolom `tourisms` warisan v1.
 *
 * `status` dilepas dari enum sesuai konvensi proyek — menambah keadaan baru
 * tidak boleh menuntut migrasi ALTER lebih dulu. Nilai `published`/`draft`
 * dipertahankan apa adanya.
 *
 * Kolom berkas dilebarkan agar muat menampung lintasan unggahan v2 maupun URL
 * penuh, bentuk nilai yang memang didukung ResolvesFileUrl. `cover_image` juga
 * dibuat nullable: satu destinasi tetap layak tercatat meski fotonya belum
 * ada, dan model sudah menangani keadaan itu lewat `has_cover`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tourisms', function (Blueprint $table) {
            $table->string('status', 20)->default('draft')->change();
            $table->string('category', 100)->index()->change();
            $table->string('name', 255)->change();
            $table->string('cover_image', 500)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('tourisms', function (Blueprint $table) {
            $table->dropIndex(['category']);
        });
    }
};
