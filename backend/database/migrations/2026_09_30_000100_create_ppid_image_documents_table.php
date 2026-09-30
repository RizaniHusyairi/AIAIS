<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dokumen bergambar pada halaman Profil PPID — Struktur Organisasi, Maklumat
 * Pelayanan, Standar Biaya Layanan, dan apa pun yang kelak ditambahkan petugas.
 *
 * Sebelum tabel ini ada, ketiganya konstanta `PPID_DOKUMEN` di
 * `frontend/src/lib/ppidData.ts` yang menunjuk berkas di `public/ppid/`.
 * Mengganti bagan struktur — yang berubah tiap kali susunan tim berganti —
 * berarti menimpa berkas di repo dan merilis ulang portal.
 *
 * Tabelnya terpisah dari `ppid_profile_documents` karena bentuknya berbeda:
 * yang di sana dokumen hukum bernomor dan bertanggal yang dibuka sebagai PDF,
 * yang di sini gambar yang ditampilkan langsung di halaman.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ppid_image_documents', function (Blueprint $table) {
            $table->id();

            $table->string('title', 255);
            $table->string('description', 1000)->nullable();

            /**
             * Tiga bentuk nilai: lintasan pada disk `public` (unggahan panel),
             * URL penuh, atau lintasan berawalan "/" untuk aset statis portal
             * di `frontend/public` — bentuk terakhir hanya dipakai baris hasil
             * seeder yang memindahkan konstanta lama. Lihat PpidImageDocument.
             */
            $table->string('image_path', 500)->nullable();

            /** Urutan tampil; kecil lebih dulu. */
            $table->unsignedInteger('sort_order')->default(0)->index();

            /** Tayang di portal publik. */
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ppid_image_documents');
    }
};
