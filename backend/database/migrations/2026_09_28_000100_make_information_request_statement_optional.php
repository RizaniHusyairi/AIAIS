<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Permohonan baru tidak lagi meminta surat pernyataan; arsip lama tetap tersimpan.
        Schema::table('public_informations', function (Blueprint $table) {
            $table->string('statement_path', 500)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Nilai kosong dari permohonan baru tidak dapat dipaksa menjadi berkas lama.
    }
};
