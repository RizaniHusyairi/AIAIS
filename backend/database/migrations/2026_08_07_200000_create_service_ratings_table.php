<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penilaian kepuasan atas tiket layanan yang sudah selesai.
 *
 * Satu tabel untuk semua kanal, bukan kolom tambahan pada `chat_threads` dan
 * `complaints` masing-masing: angka Survei Kepuasan Masyarakat harus dapat
 * dihitung dengan satu kueri, bukan `UNION` yang harus diperbarui setiap kali
 * kanal baru ditambahkan.
 *
 * `ticket_number` dibuat unik — satu tiket hanya boleh dinilai sekali.
 * Penjagaan di sisi basis data, bukan hanya di controller, karena dua
 * permintaan yang datang bersamaan dapat lolos pemeriksaan aplikasi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_ratings', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->string('channel')->index();   // chat | complaint
            $table->unsignedTinyInteger('score'); // 1 – 5
            $table->text('comment')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_ratings');
    }
};
