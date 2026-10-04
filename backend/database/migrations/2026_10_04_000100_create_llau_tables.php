<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rekapitulasi LLAU (Lalu Lintas Angkutan Udara) bulanan.
 *
 * Dua tabel: `llau_reports` satu baris per bulan — siapa mengunggah, berkas
 * aslinya, dan total yang tercetak di kaki Excel — lalu `llau_flights` satu
 * baris per penerbangan persis seperti di lembar LLAU.
 *
 * Yang disimpan adalah baris mentahnya, bukan hanya agregat. Pertanyaan baru
 * ("berapa penerbangan perintis ke Long Apung?") tidak perlu menunggu petugas
 * mengunggah ulang dua belas berkas — cukup kueri baru atas baris yang sama.
 *
 * Tanda tangan dan NIP koordinator di kaki berkas TIDAK punya kolom di sini,
 * dan memang tidak dibaca parser. NIP adalah data pribadi (UU 27/2022); berkas
 * aslinya tetap diarsipkan di cakram privat.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('llau_reports', function (Blueprint $table) {
            $table->id();
            // Tanggal pertama bulan laporan. Unik: mengunggah ulang bulan yang
            // sama MENGGANTI laporannya, bukan menambah kembaran.
            $table->date('period')->unique();
            $table->string('file_path', 500);
            $table->string('original_name', 255);
            $table->unsignedInteger('flight_count')->default(0);
            // Total di baris JUMLAH berkas aslinya, untuk dibandingkan dengan
            // hasil hitung; disimpan supaya selisih yang sengaja diabaikan
            // petugas tetap dapat ditelusuri kemudian.
            $table->json('excel_totals')->nullable();
            $table->json('warnings')->nullable();
            $table->boolean('mismatch_ignored')->default(false);
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();
        });

        Schema::create('llau_flights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('llau_report_id')->constrained('llau_reports')->cascadeOnDelete();
            $table->unsignedInteger('row_number');

            $table->date('flight_date')->index();
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('actual_at')->nullable();
            // Selisih aktual − terjadwal dalam menit; negatif berarti lebih awal.
            $table->integer('delay_minutes')->nullable();
            $table->string('delay_category', 60)->nullable();

            $table->string('origin', 30);
            $table->string('destination', 30);
            $table->string('operator_name', 150);
            $table->string('operator_icao', 10)->nullable()->index();
            $table->string('operator_brand', 150)->nullable();
            $table->string('flight_category', 40)->nullable()->index();
            $table->string('route_type', 30)->nullable();
            $table->string('remarks', 255)->nullable();
            $table->string('flight_number', 30)->nullable();
            $table->string('registration', 20)->nullable();
            $table->string('aircraft_type', 30)->nullable();
            $table->unsignedInteger('seat_capacity')->nullable();
            // A = kedatangan, D = keberangkatan.
            $table->char('direction', 1);

            $table->unsignedInteger('pax_adult')->default(0);
            $table->unsignedInteger('pax_child')->default(0);
            $table->unsignedInteger('pax_infant')->default(0);
            $table->unsignedInteger('transit_adult')->default(0);
            $table->unsignedInteger('transit_child')->default(0);
            $table->unsignedInteger('transit_infant')->default(0);
            $table->unsignedInteger('baggage_kg')->default(0);
            $table->unsignedInteger('cargo_kg')->default(0);
            $table->unsignedInteger('mail_kg')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('llau_flights');
        Schema::dropIfExists('llau_reports');
    }
};
