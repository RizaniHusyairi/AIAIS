<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Surat resmi yang ditayangkan pada menu Regulasi (Surat Keputusan & Surat
 * Edaran). Bentuknya mengikuti tabel `letters` v1 supaya data lama bisa
 * dipindahkan apa adanya, dengan dua perbedaan yang disengaja:
 *
 *   - `type` memakai string, bukan enum. Menambah jenis surat baru di v1
 *     memerlukan migrasi ALTER pada enum; di sini cukup satu baris validasi.
 *   - `file_path` boleh menyimpan URL penuh, bukan hanya lintasan pada cakram
 *     publik — lihat App\Models\Letter. Ini yang memungkinkan dokumen yang
 *     masih tersimpan di server v1 tetap tayang selama masa peralihan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letters', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index();       // keputusan | edaran
            $table->string('number')->unique();    // mis. AU.108/8121/APTP/2025
            $table->string('title');
            $table->date('issue_date')->index();
            $table->string('file_path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letters');
    }
};
