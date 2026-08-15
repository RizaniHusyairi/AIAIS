<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Gerai yang beroperasi di bandara: kuliner, ritel, lounge, transportasi.
 *
 * Namanya sengaja `airport_tenants`, bukan `tenants`. Tabel `tenants` di basis
 * data v1 adalah berkas permohonan sewa lahan usaha — pengajuan berstatus
 * Diajukan/Disetujui/Ditolak berikut dokumen lampirannya — bukan daftar gerai
 * yang sudah buka. Dua hal berbeda yang kebetulan bernama sama.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('airport_tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // mis. Roti 'O, Solaria, DAMRI

            // String, bukan enum: kategori gerai baru tidak boleh memerlukan
            // migrasi ALTER. Nilai sahnya ada di konstanta model.
            $table->string('category', 40);

            $table->string('location'); // mis. Terminal Keberangkatan Lt. 2
            $table->string('operating_hours')->default('06:00 - 20:00 WITA');
            $table->string('contact_phone')->nullable();
            $table->string('image')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('airport_tenants');
    }
};
