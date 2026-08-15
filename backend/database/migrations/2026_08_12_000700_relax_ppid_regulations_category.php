<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lepaskan `ppid_regulations.category` dari enum.
 *
 * Ketiga kategori v1 dituliskan sebagai enum, sehingga menambah kelompok
 * peraturan baru — misalnya peraturan daerah — menuntut migrasi ALTER lebih
 * dulu. Konvensi proyek memang menghindari enum justru untuk itu; nilai yang
 * sah dijaga konstanta model dan aturan validasi.
 *
 * Nilainya tidak diubah. Ejaan "Kementrian" pada kategori ketiga memang ada
 * pada sumbernya dan dipertahankan: itu label yang dikelola petugas, dan
 * membetulkannya di sini hanya akan membuat data lama dan baru terpisah ke
 * dua kelompok yang tampak berbeda.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ppid_regulations', function (Blueprint $table) {
            $table->string('category', 150)->index()->change();
        });
    }

    public function down(): void
    {
        Schema::table('ppid_regulations', function (Blueprint $table) {
            $table->dropIndex(['category']);
        });
    }
};
