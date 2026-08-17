<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Perayaan bertanggal yang memicu animasi sambutan di beranda.
 *
 * TANGGALNYA DISIMPAN DI BASIS DATA, BUKAN DIHITUNG KODE. Hanya sebagian hari
 * besar yang jatuh pada tanggal tetap (17 Agustus, 1 Januari). Idul Fitri,
 * Tahun Baru Islam, Nyepi, dan Imlek mengikuti kalender Hijriah, Saka, dan
 * Tionghoa — tanggal Masehinya bergeser tiap tahun dan ditetapkan lewat SKB
 * Tiga Menteri. Menghitungnya sendiri berarti mengarang tanggal hari besar
 * keagamaan, dan portal resmi bandara tidak boleh melakukan itu.
 *
 * Petugas mengisinya dari panel setiap kali SKB terbit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_events', function (Blueprint $table) {
            $table->id();

            /** Nama perayaan sebagaimana ditulis petugas, mis. "HUT RI ke-81". */
            $table->string('name');

            /*
             * Tema animasi. `string`, bukan `enum`: menambah tema baru cukup
             * menambah komponen di frontend dan satu nilai pada
             * `SiteEvent::THEMES` — tanpa migrasi ALTER.
             */
            $table->string('theme', 40);

            /** Rentang tayang, inklusif di kedua ujungnya. */
            $table->date('starts_on');
            $table->date('ends_on');

            /** Kalimat sambutan di layar animasi; kosong berarti pakai bawaan tema. */
            $table->string('greeting')->nullable();
            $table->string('subgreeting')->nullable();

            $table->boolean('is_active')->default(true);

            /*
             * Bila dua perayaan bertindih tanggalnya, yang angkanya kecil
             * menang. Nataru dan Tahun Baru Masehi memang saling tumpang
             * tindih tiap tahun, dan beranda hanya boleh memainkan satu.
             */
            $table->unsignedSmallInteger('priority')->default(10);

            $table->timestamps();

            $table->index(['is_active', 'starts_on', 'ends_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_events');
    }
};
