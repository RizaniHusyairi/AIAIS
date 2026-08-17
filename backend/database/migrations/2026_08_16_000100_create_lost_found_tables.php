<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lapor kehilangan barang dan catatan barang temuan.
 *
 * Keduanya tabel BARU — portal v1 tidak punya fitur ini sama sekali — jadi
 * aturan tabel baru berlaku: `string` + konstanta model, bukan enum, supaya
 * menambah kategori atau status baru tidak menuntut migrasi ALTER.
 *
 * ============================================================
 * KENAPA DUA TABEL, BUKAN SATU
 * ============================================================
 *
 * Laporan kehilangan dan barang temuan datang dari dua arah yang berbeda dan
 * hidup terpisah: sebuah barang bisa ditemukan tanpa pernah ada yang
 * melaporkannya hilang, dan sebuah laporan bisa ditutup tanpa barangnya pernah
 * ketemu. Menyatukannya dalam satu tabel berkolom-kolom nullable akan
 * menyamarkan dua keadaan yang berbeda itu menjadi satu baris setengah kosong.
 *
 * Tautannya satu arah: `lost_reports.found_item_id`.
 *
 * ============================================================
 * BATAS DATA PRIBADI
 * ============================================================
 *
 * `lost_reports` menyimpan nama, ponsel, dan surel pelapor. `found_items`
 * menyimpan jenis dan nomor identitas orang yang mengambil barangnya. Tidak
 * satu pun boleh muncul pada respons publik — penyaringannya ada di
 * `LostReport::publicView()`, dan diuji, bukan sekadar diniatkan.
 *
 * Nomor identitas pengambil hanya dicatat, TIDAK disertai unggahan salinan
 * KTP. Menyimpan salinan identitas ratusan orang menuntut beban perlindungan
 * data yang tidak sebanding dengan urusan mengembalikan dompet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('found_items', function (Blueprint $table) {
            $table->id();

            // Kode internal, dipakai petugas menandai fisik barangnya.
            $table->string('code', 40)->unique();

            $table->string('category', 60);
            $table->text('description');
            $table->string('found_area', 100);
            $table->timestamp('found_at');

            // Penemu, atau petugas yang menyerahkan ke penyimpanan.
            $table->string('finder_name', 150)->nullable();

            /*
             * Tempat barangnya disimpan (loker, pos AVSEC, ruang jaga).
             * TIDAK PERNAH keluar ke respons publik: menggabungkan "barang Anda
             * ketemu" dengan "disimpan di sini" mengubah nomor tiket menjadi
             * kunci pengambilan barang.
             */
            $table->string('storage_location', 150)->nullable();

            $table->string('photo', 255)->nullable();

            // stored | matched | returned | disposed — lihat FoundItem::STATUSES
            $table->string('status', 20)->default('stored');

            /* ---- serah terima ---- */
            $table->timestamp('returned_at')->nullable();
            $table->string('receiver_name', 150)->nullable();
            $table->string('receiver_id_type', 30)->nullable();
            $table->string('receiver_id_number', 60)->nullable();
            $table->string('handover_officer', 150)->nullable();
            $table->text('handover_note')->nullable();

            $table->timestamps();

            // Pencarian kandidat pencocokan selalu menyaring kategori lalu
            // mempersempit dengan jendela waktu — lihat FoundItem::scopeKandidat.
            $table->index(['status', 'category', 'found_at']);
        });

        Schema::create('lost_reports', function (Blueprint $table) {
            $table->id();

            /*
             * Nomor tiket pelapor. Delapan karakter acak, bukan empat seperti
             * `complaints`: yang dilindungi di sini adalah ciri barang berharga
             * beserta status penemuannya — cukup bagi seseorang untuk menyusun
             * klaim palsu. Endpoint pelacaknya juga diberi throttle.
             */
            $table->string('ticket_number', 40)->unique();

            /* ---- data pribadi pelapor; tidak pernah publik ---- */
            $table->string('reporter_name', 150);
            $table->string('reporter_phone', 40);
            $table->string('reporter_email', 150)->nullable();

            $table->string('category', 60);
            $table->text('item_description');
            $table->string('lost_area', 100);
            $table->timestamp('lost_at');

            // Banyak kehilangan terjadi di dalam pesawat atau pada bagasi,
            // dan nomor penerbangan adalah petunjuk pencarian yang paling kuat.
            $table->string('flight_number', 20)->nullable();

            $table->string('photo', 255)->nullable();

            // submitted | searching | matched | returned | not_found
            $table->string('status', 20)->default('submitted');

            /*
             * Hasil pencocokan. `nullOnDelete` disengaja: menghapus catatan
             * barang temuan tidak boleh ikut melenyapkan laporan warganya —
             * laporannya kembali ke keadaan belum tercocokkan.
             */
            $table->foreignId('found_item_id')->nullable()
                ->constrained('found_items')->nullOnDelete();

            $table->text('admin_note')->nullable();
            $table->timestamp('responded_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['category', 'lost_at']);
        });
    }

    public function down(): void
    {
        // Urutannya terbalik dari `up()`: `lost_reports` memegang kunci asing
        // ke `found_items`.
        Schema::dropIfExists('lost_reports');
        Schema::dropIfExists('found_items');
    }
};
