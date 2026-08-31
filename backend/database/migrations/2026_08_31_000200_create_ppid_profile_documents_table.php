<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dokumen yang tampil pada halaman Profil PPID.
 *
 * Dua jenis dalam satu tabel — SK Tim PPID dan Laporan Bulanan PPID — dengan
 * alasan yang sama seperti `service_standards`: keduanya berbentuk identik
 * (judul, nomor, tanggal, berkas atau tautan) dan hanya berbeda tempat
 * tampilnya. Nilai sahnya ada di konstanta model, bukan di kolom `enum`,
 * supaya jenis baru tidak memerlukan migrasi ALTER.
 *
 * Sebelum tabel ini ada, SK PPID adalah sebuah konstanta di
 * `frontend/src/lib/ppidData.ts` — mengganti SK berarti menyunting kode dan
 * merilis ulang portal, padahal SK diperbarui setiap kali susunan tim berubah.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ppid_profile_documents', function (Blueprint $table) {
            $table->id();

            $table->string('type', 40)->index();   // lihat PpidProfileDocument::TYPES
            $table->string('title', 500);
            $table->string('document_number', 150)->nullable();
            $table->text('description')->nullable();

            $table->date('published_date');

            /**
             * Bulan yang dilaporkan, selalu tanggal 1. Sengaja dipisah dari
             * `published_date`: laporan bulan Agustus lazim diterbitkan pada
             * September, dan menyatukan keduanya membuat laporan mendarat di
             * kotak bulan yang salah pada papan bulanan.
             */
            $table->date('period_date')->nullable();

            // Dokumennya bisa datang dari dua arah, seperti `service_standards`.
            $table->string('file_path', 500)->nullable();
            $table->string('document_link', 500)->nullable();

            /** SK yang sedang berlaku. Hanya bermakna bagi jenis SK PPID. */
            $table->boolean('is_current')->default(false);

            /** Tayang di portal publik. */
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ppid_profile_documents');
    }
};
