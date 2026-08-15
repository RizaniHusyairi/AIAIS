<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel token reset kata sandi untuk Laravel 13.
 *
 * Basis data warisan v1 punya `password_resets` — nama yang dipakai Laravel 9.
 * Laravel 13 mencari `password_reset_tokens` (lihat config/auth.php), sehingga
 * tanpa tabel ini fitur lupa-sandi gagal senyap: tokennya tidak pernah
 * tersimpan, dan setiap tautan yang dikirim akan ditolak sebagai tidak sah.
 *
 * Tabel lama SENGAJA dibiarkan dan isinya TIDAK disalin. Alasannya dua:
 * selama v1 masih hidup ia masih memakainya, dan token reset berumur 60 menit
 * — memindahkan token yang hampir pasti sudah kedaluwarsa tidak ada gunanya.
 * Permohonan reset yang sedang berjalan di v1 saat cutover perlu diulang.
 *
 * `password_resets` dibersihkan pada perapian pasca-cutover, bukan di sini.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('password_reset_tokens')) {
            return;
        }

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
