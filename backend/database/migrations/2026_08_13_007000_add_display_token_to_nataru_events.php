<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Layar TV posko memerlukan token KEDUA, terpisah dari token petugas.
 *
 * v1 memakai token yang sama untuk dua hal yang sangat berbeda:
 *
 *     /posko/input/{token}   → MENULIS data penerbangan
 *     /posko/tv/{token}      → hanya menampilkan
 *
 * Layar TV terpampang di ruang publik posko, dan URL-nya kerap terlihat —
 * pada bilah alamat peramban, saat layar disetel, atau dari foto yang diambil
 * orang. Siapa pun yang membacanya memperoleh kemampuan menulis catatan
 * penerbangan yang dipakai menyusun laporan resmi.
 *
 * `display_token` hanya membuka tampilan baca. Token petugas tetap terpisah
 * dan tetap dapat diputar sendiri tanpa mengganggu layar yang sedang menyala.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('nataru_events') || Schema::hasColumn('nataru_events', 'display_token')) {
            return;
        }

        Schema::table('nataru_events', function (Blueprint $table) {
            $table->string('display_token', 64)->nullable()->after('public_token');
        });

        DB::table('nataru_events')->whereNull('display_token')->orderBy('id')->each(function ($periode) {
            DB::table('nataru_events')->where('id', $periode->id)->update([
                'display_token' => Str::random(48),
            ]);
        });

        // Indeks unik SESUDAH pengisian — memasangnya lebih dulu akan menolak
        // baris kedua yang tokennya masih NULL.
        Schema::table('nataru_events', function (Blueprint $table) {
            $table->unique('display_token', 'nataru_events_display_token_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('nataru_events', 'display_token')) {
            return;
        }

        Schema::table('nataru_events', function (Blueprint $table) {
            $table->dropUnique('nataru_events_display_token_unique');
            $table->dropColumn('display_token');
        });
    }
};
