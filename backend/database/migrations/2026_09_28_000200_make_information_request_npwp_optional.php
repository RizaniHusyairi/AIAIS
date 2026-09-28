<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // NPWP tidak lagi wajib: mahasiswa, pelajar, dan warga tanpa NPWP pun
        // berhak memohon informasi, dan KTP sudah cukup sebagai identitas —
        // meminta NPWP juga bertentangan dengan asas minimisasi UU 27/2022.
        // Panjang 125 dipertahankan dari kolom v1.
        Schema::table('public_informations', function (Blueprint $table) {
            $table->string('npwp', 125)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Permohonan baru boleh tanpa NPWP; nilai kosongnya tidak dapat dipaksa kembali wajib.
    }
};
