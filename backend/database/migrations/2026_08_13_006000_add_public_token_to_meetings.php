<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Tautan absensi rapat memakai TOKEN, bukan slug.
 *
 * v1 membuka formulir absensi di `/absensi/{slug}`, dan slug-nya diturunkan
 * dari judul rapat — `rapat-koordinasi-januari` dan sejenisnya. Siapa pun yang
 * menebaknya dapat mengisi daftar hadir rapat internal, dan daftar hadir yang
 * dapat diisi orang luar tidak lagi membuktikan siapa yang benar-benar datang.
 *
 * Kolom `slug` DIPERTAHANKAN — ia dipakai v1 sampai cutover dan tetap berguna
 * sebagai pengenal yang terbaca manusia. Yang berpindah hanyalah alamat yang
 * dibagikan kepada peserta.
 *
 * Pola dan panjang tokennya sama dengan `nataru_events.public_token` (48
 * aksara acak-aman), supaya hanya ada satu bentuk "tautan publik bertoken"
 * yang perlu dipahami di portal ini.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('meetings') || Schema::hasColumn('meetings', 'public_token')) {
            return;
        }

        Schema::table('meetings', function (Blueprint $table) {
            $table->string('public_token', 64)->nullable()->after('slug');
        });

        // Rapat yang sudah ada (bila kelak ada) diberi token, supaya tidak ada
        // baris yang tautannya kosong dan tak dapat dibagikan sama sekali.
        DB::table('meetings')->whereNull('public_token')->orderBy('id')->each(function ($rapat) {
            DB::table('meetings')->where('id', $rapat->id)->update([
                'public_token' => Str::random(48),
            ]);
        });

        // Indeks unik dipasang SESUDAH pengisian — memasangnya lebih dulu akan
        // menolak baris kedua yang tokennya masih NULL.
        Schema::table('meetings', function (Blueprint $table) {
            $table->unique('public_token', 'meetings_public_token_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('meetings', 'public_token')) {
            return;
        }

        Schema::table('meetings', function (Blueprint $table) {
            $table->dropUnique('meetings_public_token_unique');
            $table->dropColumn('public_token');
        });
    }
};
