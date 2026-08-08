<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penanda pengunjung tanpa menyimpan identitasnya.
 *
 * Tabel ini semula menyediakan kolom `ip_address`, tetapi tidak pernah terisi
 * dari permintaan sungguhan. Begitu angka kunjungan tayang di footer publik,
 * pencatatannya menjadi nyata — dan menyimpan IP mentah pengunjung portal
 * instansi tidak diperlukan untuk itu.
 *
 * `visitor_hash` adalah HMAC-SHA256 dari IP + User-Agent dengan APP_KEY
 * sebagai kunci. Nilainya cukup untuk dua hal yang memang dibutuhkan —
 * menolak kunjungan ganda dan menghitung pengunjung yang sedang aktif —
 * tetapi tidak dapat dikembalikan menjadi alamat IP. Kolom `ip_address`
 * dibiarkan ada agar baris lama tidak hilang, namun berhenti diisi.
 *
 * Index pada `created_at` dipasang karena setiap pembacaan statistik
 * menyaring rentang waktu (hari ini, lima menit terakhir).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visitor_logs', function (Blueprint $table) {
            $table->string('visitor_hash', 64)->nullable()->after('ip_address')->index();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('visitor_logs', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['visitor_hash']);
            $table->dropColumn('visitor_hash');
        });
    }
};
