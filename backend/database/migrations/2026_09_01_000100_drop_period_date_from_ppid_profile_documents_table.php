<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Buang kolom bulan laporan.
 *
 * PPID bandara menerbitkan rekapitulasi seluruh bulan sebagai satu dokumen,
 * bukan satu dokumen per bulan. Kolom ini memaksa dokumen gabungan itu
 * mendarat di satu kotak bulan sementara sebelas kotak lainnya permanen
 * bertuliskan "belum terbit" — keterangan yang keliru bagi pengunjung.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ppid_profile_documents', function (Blueprint $table) {
            $table->dropColumn('period_date');
        });
    }

    public function down(): void
    {
        Schema::table('ppid_profile_documents', function (Blueprint $table) {
            $table->date('period_date')->nullable()->after('published_date');
        });
    }
};
