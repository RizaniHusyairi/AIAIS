<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Permohonan Informasi Publik (UU 14/2008).
 *
 * Skema ini menggantikan `public_informations` milik aptpairport.id, yang
 * tidak dapat menampung permohonan dari publik:
 *
 *   1. Kolom `user_id` di sana bersifat NOT NULL tanpa nilai bawaan, padahal
 *      formulir publik tidak pernah mengisinya — setiap pengiriman dari warga
 *      gagal pada batasan basis data.
 *   2. Kolom `nama`, `alamat`, `no_hp`, dan `email` sama sekali tidak ada,
 *      padahal formulirnya meminta keempatnya. Tanpa itu petugas tidak punya
 *      cara menghubungi pemohon, dan tenggat 10 hari kerja mustahil dipenuhi.
 *
 * Di sini identitas pemohon disimpan lengkap, dan tidak ada relasi ke tabel
 * pengguna: permohonan informasi publik adalah hak setiap orang dan tidak
 * boleh mensyaratkan akun.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('information_requests', function (Blueprint $table) {
            $table->id();

            // Nomor tiket untuk pelacakan mandiri, mengikuti pola tabel
            // `complaints`: PIP-20260802-XXXX.
            $table->string('ticket_number')->unique();

            // Berkas syarat. Menyimpan LINTASAN pada cakram privat, bukan URL
            // publik — isinya scan KTP. Lihat catatan di InformationRequestController.
            $table->string('ktp_path');
            $table->string('statement_path');

            // Asal permintaan: nama instansi/organisasi, atau "Individu".
            $table->text('request_from');

            // Identitas pemohon
            $table->string('name');
            $table->text('address');
            $table->string('occupation');
            $table->string('npwp');
            $table->string('phone');
            $table->string('email');

            // Isi permohonan
            $table->text('information_details');
            $table->text('information_purpose');
            $table->string('obtain_method');
            $table->string('copy_method');

            // Penanganan. Nilai enum memakai bahasa Inggris seperti tabel
            // `complaints` agar konsisten di dalam kode; pelabelan bahasa
            // Indonesia dilakukan di sisi tampilan.
            $table->enum('status', ['submitted', 'in_progress', 'fulfilled', 'rejected'])
                ->default('submitted');
            $table->text('admin_response')->nullable();
            $table->string('response_link')->nullable();
            $table->timestamp('responded_at')->nullable();

            // Tenggat jawaban menurut UU 14/2008: 10 hari kerja, dapat
            // diperpanjang 7 hari kerja. Disimpan agar petugas dan pemohon
            // melihat angka yang sama.
            $table->date('due_date')->nullable();
            $table->boolean('is_extended')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('information_requests');
    }
};
