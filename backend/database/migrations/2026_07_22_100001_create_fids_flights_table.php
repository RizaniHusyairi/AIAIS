<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Papan informasi penerbangan (FIDS).
 *
 * Namanya sengaja `fids_flights`, bukan `flights`. Basis data v1 sudah punya
 * tabel `flights` — sisa templat aplikasi pemesanan tiket 2022 dengan relasi ke
 * `airlines`, `planes`, dan `airports`, dan sama sekali bukan papan informasi.
 * Memakai nama yang sama berarti bertabrakan dengan tabel berisi data yang
 * bukan milik kita.
 *
 * Status `check_in` sudah termasuk di sini; di v2 lama ia ditambahkan lewat
 * migrasi ALTER terpisah yang kini tidak diperlukan lagi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fids_flights', function (Blueprint $table) {
            $table->id();
            $table->string('flight_number'); // mis. GA-581, ID-6672, JT-660
            $table->string('airline');       // mis. Garuda Indonesia, Batik Air
            $table->string('airline_logo')->nullable();
            $table->string('origin');        // mis. Jakarta (CGK)
            $table->string('destination');   // mis. Samarinda (AAP)
            $table->string('scheduled_time'); // mis. 08:30 WITA
            $table->string('estimated_time')->nullable();
            $table->string('terminal')->default('T1');
            $table->string('gate')->nullable();

            // String, bukan enum: menambah jenis atau status baru tidak boleh
            // memerlukan migrasi ALTER. Nilai sahnya ada di konstanta model.
            $table->string('flight_type', 20);
            $table->string('status', 20)->default('scheduled');

            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['flight_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fids_flights');
    }
};
