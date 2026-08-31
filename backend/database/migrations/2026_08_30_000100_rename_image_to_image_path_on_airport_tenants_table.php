<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Samakan nama kolom foto gerai dengan modul berkas lain: `image_path`.
 *
 * Seluruh portal memakai satu pasangan nama — kolom `image_path` menyimpan
 * lintasan atau URL, sedangkan medan multipart bernama `image` membawa berkas
 * unggahannya (lihat `Facility` dan `FacilityController`). Selama kolom gerai
 * masih bernama `image`, kedua hal itu bertabrakan di satu permintaan yang sama
 * dan unggahan berkas tidak mungkin ditambahkan tanpa nama medan yang mengada-ada.
 *
 * Aman diganti namanya: `airport_tenants` lahir di portal v2 (migrasi
 * `2026_07_22_100005`), bukan tabel warisan v1 yang dibaca kode lain.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('airport_tenants', function (Blueprint $table) {
            $table->renameColumn('image', 'image_path');
        });
    }

    public function down(): void
    {
        Schema::table('airport_tenants', function (Blueprint $table) {
            $table->renameColumn('image_path', 'image');
        });
    }
};
