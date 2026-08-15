<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lengkapi tabel token v1 agar cocok dengan Sanctum yang dipakai v2.
 *
 * Tabel `personal_access_tokens` di v1 dibuat Sanctum versi Laravel 9, yang
 * belum mengenal masa berlaku token. Sanctum di v2 menulis dan membaca kolom
 * `expires_at` pada setiap penerbitan token — tanpa kolom ini, login admin
 * gagal seketika.
 *
 * Penambahan yang nullable, jadi aplikasi v1 tetap berjalan normal.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('personal_access_tokens', 'expires_at')) {
            return;
        }

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->index()->after('last_used_at');
        });
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropColumn('expires_at');
        });
    }
};
