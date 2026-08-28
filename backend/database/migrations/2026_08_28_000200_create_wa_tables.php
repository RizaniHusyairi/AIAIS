<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Notifikasi WhatsApp ke petugas piket.
 *
 * Mesin pengirimnya sudah ada sejak sebelum migrasi ini (`WhatsAppGateway`,
 * `KirimWhatsApp`, `Notifikasi::kirim`), tetapi seluruh penyetelannya hanya
 * dapat diubah lewat `.env` — artinya menambah satu nomor piket menuntut akses
 * server dan penggelaran ulang. Dua tabel di bawah memindahkannya ke panel.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PELINDUNGAN DATA PRIBADI — UU 27/2022
 *
 * `wa_recipients` menyimpan NOMOR PONSEL, dan nomor ponsel adalah data
 * pribadi. Tiga hal yang menyertainya dan tidak boleh dilonggarkan:
 *
 *   1. Tidak ada satu pun endpoint publik yang membaca tabel ini. Seluruh
 *      aksesnya lewat grup `admin` yang dijaga token.
 *   2. Nomornya tidak pernah masuk log — lihat `WhatsAppGateway`, yang
 *      sengaja mencatat galat tanpa menyebut nomor tujuan.
 *   3. Kolomnya berhenti di nama dan nomor. TIDAK ADA jabatan, NIP, surel,
 *      alamat, atau apa pun yang membuat tabel ini menjadi direktori
 *      kepegawaian bayangan. Yang dibutuhkan pengiriman hanya nomor, dan
 *      nama hanya supaya petugas tahu nomor siapa yang sedang dimatikan.
 *
 * `wa_credentials` menyimpan kunci API gateway. Ia TIDAK boleh masuk tabel
 * `settings`: `GET /settings` bersifat publik, dan kunci yang tersimpan di
 * sana akan ikut tersaji ke peramban siapa pun yang membuka portal. Alasan
 * yang sama sudah tertulis pada `config/whatsapp.php`.
 * ────────────────────────────────────────────────────────────────────────
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wa_recipients', function (Blueprint $table) {
            $table->id();

            /** Nama pemegang nomor; hanya untuk dikenali petugas di panel. */
            $table->string('nama', 100);

            /**
             * Nomor tujuan.
             *
             * Disimpan sebagaimana diketik petugas; pembersihannya (menghapus
             * spasi, tanda plus, dan tanda hubung) dikerjakan saat mengirim.
             * Menormalkan saat menyimpan membuat nomor yang salah ketik jadi
             * sulit dikenali kembali oleh orang yang memasukkannya.
             */
            $table->string('nomor', 30);

            /**
             * Jenis kejadian yang ingin diterima nomor ini.
             *
             * Larik JSON berisi kunci `AktivitasPusatBantuan::JENIS`. NULL atau
             * larik kosong berarti SELURUH jenis — bawaan yang aman: nomor baru
             * yang lupa dicentangi tetap menerima kabar, alih-alih diam-diam
             * tidak pernah menerima apa pun.
             *
             * JSON, bukan satu kolom boolean per jenis: daftar jenisnya milik
             * kode dan sudah tumbuh sekali (`pengajuan` menyusul belakangan).
             * Satu kolom per jenis berarti satu migrasi tiap kali daftarnya
             * bertambah. Penyaringannya dikerjakan di PHP — daftar nomor piket
             * berisi belasan baris, bukan ribuan.
             */
            $table->json('jenis')->nullable();

            $table->boolean('is_active')->default(true)->index();

            $table->timestamps();
        });

        Schema::create('wa_credentials', function (Blueprint $table) {
            $table->id();

            /** Kunci gateway (`wag_<prefix>.<secret>`). Tidak pernah diserialisasi. */
            $table->text('token');

            /**
             * Perangkat pengirim pada gateway multi-perangkat.
             *
             * Bawaannya '0', yang berarti "PAKAI PERANGKAT BAWAAN KUNCI API" —
             * bukan "perangkat nomor nol". Tidak ada perangkat ber-ID 0 pada
             * gateway mana pun (penomorannya mulai dari 1), sehingga nilai itu
             * aman dipakai sebagai penanda "tidak ditentukan" dan
             * `WhatsAppGateway` memang menghilangkan `deviceId` dari badan
             * permintaan ketika membacanya.
             *
             * Itu juga perilaku yang dijanjikan dokumentasi gateway bandara:
             * `deviceId` hanya perlu disertakan bila kunci API tidak punya
             * perangkat bawaan. Karena kunci yang dipakai portal ini selalu
             * punya, kolomnya tidak dimunculkan sebagai isian di panel.
             */
            $table->string('device_id', 30)->default('0');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_credentials');
        Schema::dropIfExists('wa_recipients');
    }
};
