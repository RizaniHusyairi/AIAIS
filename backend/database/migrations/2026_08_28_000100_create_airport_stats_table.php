<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Angka ringkas bandara yang tampil di beranda.
 *
 * Sebelum tabel ini ada, kelima angkanya hidup sebagai konstanta di TIGA
 * berkas frontend yang saling menyalin — `aboutStats` dan `dalamAngka` di
 * `app/page.tsx`, serta `ANGKA_HERO` di `components/home/HeroBoardingPass.tsx`
 * yang komentarnya sendiri mengakui: "Cermin dari ABOUT_STATS ... Bila angka
 * di sana berubah, ubah di sini juga." Petugas tidak punya jalan mengubah satu
 * pun tanpa penggelaran ulang.
 *
 * ────────────────────────────────────────────────────────────────────────
 * ANGKA DI SINI BUKAN DATA LALU LINTAS YANG TERVERIFIKASI.
 *
 * Portal ini punya modul lalu lintas udara sungguhan (`air_traffic_logs`,
 * `GET /air`) yang mencatat pergerakan pesawat, penumpang, bagasi, dan kargo
 * per periode. Tabel ini BUKAN itu, dan tidak boleh diperlakukan sebagai itu:
 * isinya klaim ringkas untuk halaman depan, dimasukkan tangan oleh petugas.
 *
 * Kalau kelak angka penumpang harus benar-benar berasal dari catatan
 * operasional, sambungkan ke modul lalu lintas — jangan diam-diam menganggap
 * baris di tabel ini sebagai sumber resmi.
 * ────────────────────────────────────────────────────────────────────────
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('airport_stats', function (Blueprint $table) {
            $table->id();

            /**
             * Kunci stabil yang dipakai frontend sebagai kunci React.
             *
             * Bukan `id`: urutan dan isi daftar berubah saat petugas menyunting,
             * dan kunci yang ikut bergeser memaksa React membuang lalu memasang
             * ulang seluruh kartunya — animasi masuknya terputar dari awal
             * setiap kali satu angka diubah.
             */
            $table->string('slug')->unique();

            /**
             * Nama ikon lucide sebagai teks ("Users", "Ruler").
             *
             * Frontend memetakannya lewat daftar ikon tertutup, bukan dengan
             * mengindeks `lucide-react` secara dinamis — pola yang sama dengan
             * `facilityMeta.ts`. Nama yang tidak dikenali jatuh ke ikon bawaan,
             * jadi salah ketik di panel tidak pernah mematahkan halaman.
             */
            $table->string('icon', 50)->nullable();

            /**
             * TEKS, bukan angka.
             *
             * Nilai yang tayang berbentuk "1.250.000+", "2.250 m", dan
             * "4 Star" — pemisah ribuan, satuan, dan tanda "lebih dari"
             * semuanya bagian dari yang ingin disampaikan. Menyimpannya sebagai
             * bilangan berarti memindahkan keputusan pemformatan ke kode dan
             * mencabutnya dari petugas.
             */
            $table->string('value', 50);

            /** Label dwibahasa; portal publik menyajikan keduanya. */
            $table->string('label_id', 100);
            $table->string('label_en', 100);

            /**
             * Tiga blok yang menampilkan angka, sebagai bendera terpisah.
             *
             * Bukan satu kolom "kelompok", karena datanya memang tumpang
             * tindih: "Destinasi" muncul di ketiganya, "Bandara Terakreditasi"
             * hanya di kartu Tentang, dan "Tingkat Kepuasan" hanya di blok
             * "dalam Angka". Satu kolom kelompok memaksa baris yang sama
             * digandakan tiga kali — dan gandaan itulah persoalan yang justru
             * hendak ditutup tabel ini.
             */
            $table->boolean('show_about')->default(true)->index();
            $table->boolean('show_numbers')->default(false)->index();
            $table->boolean('show_hero')->default(false)->index();

            /** Urutan tampil; ditetapkan petugas, bukan abjad maupun `id`. */
            $table->unsignedSmallInteger('sort_order')->default(0)->index();

            $table->boolean('is_active')->default(true)->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('airport_stats');
    }
};
