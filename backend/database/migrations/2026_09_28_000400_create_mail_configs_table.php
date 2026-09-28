<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penyetelan server surel (SMTP) yang disunting dari panel admin.
 *
 * Tabel sendiri, BUKAN baris di `settings`: `GET /settings` publik, dan
 * nama pengguna serta kata sandi SMTP akan ikut tersaji ke setiap pengunjung.
 * Pola yang sama dengan `wa_credentials` dan `instagram_credentials`.
 *
 * Satu baris saja. Tanpa baris, pengiriman memakai `MAIL_*` dari .env seperti
 * sebelum tabel ini ada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_configs', function (Blueprint $table) {
            $table->id();
            $table->boolean('aktif')->default(false);
            $table->string('host');
            $table->unsignedSmallInteger('port')->default(587);
            // tls | ssl | none — string, bukan enum (lihat CLAUDE.md).
            $table->string('enkripsi', 10)->default('tls');
            $table->string('username')->nullable();
            // Terenkripsi oleh cast `encrypted` di model; teks panjang karena
            // hasil enkripsinya jauh lebih panjang daripada kata sandinya.
            $table->text('password')->nullable();
            $table->string('from_address');
            $table->string('from_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_configs');
    }
};
