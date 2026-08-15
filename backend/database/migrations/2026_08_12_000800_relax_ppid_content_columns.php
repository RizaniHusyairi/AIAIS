<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Longgarkan kolom empat tabel isi PPID warisan v1.
 *
 * Ketiganya dibuat dengan `varchar(125)` yang sama di seluruh basis data v1 —
 * panjang bawaan yang tampaknya diterapkan menyeluruh, bukan hasil pengukuran
 * isi sebenarnya. Judul dokumen resmi kerap melewatinya; salah satu yang sudah
 * ada, "LAKIP Badan Layanan Umum Unit Penyelenggara Bandar Udara...", nyaris
 * menyentuh batas itu.
 *
 * `link_url` pada informasi serta-merta menunjuk pos Instagram yang memuat
 * parameter kueri, sehingga juga perlu ruang lebih.
 *
 * Semuanya pelonggaran, bukan pengetatan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('periodic_documents', function (Blueprint $table) {
            $table->string('category', 150)->index()->change();
            $table->string('title', 500)->change();
        });

        Schema::table('evergreen_information', function (Blueprint $table) {
            $table->string('category', 150)->index()->change();
            $table->string('title', 500)->change();
        });

        Schema::table('immediate_information', function (Blueprint $table) {
            $table->string('link_url', 500)->change();
            $table->string('link_text', 150)->default('Lihat Detail')->change();
        });

        Schema::table('information_service_reports', function (Blueprint $table) {
            $table->string('title', 500)->change();
        });
    }

    public function down(): void
    {
        Schema::table('periodic_documents', function (Blueprint $table) {
            $table->dropIndex(['category']);
        });

        Schema::table('evergreen_information', function (Blueprint $table) {
            $table->dropIndex(['category']);
        });
    }
};
