<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penilaian lomba karaoke internal.
 *
 * Empat tabel baru — tidak ada padanannya di portal v1 — jadi aturan tabel
 * baru berlaku sepenuhnya: `string` + konstanta model, bukan enum.
 *
 * ============================================================
 * KENAPA JURI PUNYA TABEL SENDIRI
 * ============================================================
 *
 * Yang paling menggoda adalah menyimpan nama ketiga juri sebagai kolom pada
 * acara (`judge_1`, `judge_2`, `judge_3`) dan nilainya sebagai kolom pada
 * peserta. Itu mengunci jumlah juri pada tiga selamanya, dan lomba berikutnya
 * yang memakai lima juri menuntut migrasi ALTER beserta seluruh kode yang
 * menyebut nama kolomnya.
 *
 * Alasan yang lebih keras: setiap juri memegang TAUTAN BERTOKENNYA SENDIRI.
 * Token itu perlu tempat untuk tinggal, perlu dapat diputar ulang satu per
 * satu tanpa mengganggu juri lain, dan tidak boleh ikut respons — persis
 * seperti `meetings.public_token`. Kolom pada acara tidak bisa memberi itu.
 *
 * ============================================================
 * KENAPA NILAI SATU BARIS PER JURI PER PESERTA
 * ============================================================
 *
 * `karaoke_scores` unik atas pasangan (juri, peserta). Papan juri menyimpan
 * otomatis setiap kali slidernya digeser, jadi endpointnya memanggil
 * `updateOrCreate` puluhan kali untuk peserta yang sama. Tanpa indeks unik
 * itu, satu peserta akan meninggalkan puluhan baris nilai dan rata-ratanya
 * menjadi omong kosong.
 *
 * Kelima kriteria disimpan sebagai kolom terpisah, bukan JSON: bobotnya tetap,
 * jumlahnya lima, dan rekap admin perlu menjumlahkan per kriteria lintas juri.
 *
 * ============================================================
 * BATAS DATA PRIBADI
 * ============================================================
 *
 * Yang tersimpan hanya nama juri dan nama peserta — identitas yang memang
 * diumumkan dalam sebuah lomba. TIDAK ADA NIP, nomor ponsel, alamat, maupun
 * unggahan identitas. Jangan menambahkannya kelak tanpa alasan yang lebih
 * kuat daripada "supaya lengkap".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('karaoke_events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->date('held_on');
            $table->string('location')->nullable();
            // open | locked — lihat KaraokeEvent::STATUSES.
            $table->string('status', 20)->default('open');
            $table->timestamps();

            $table->index(['status', 'held_on']);
        });

        Schema::create('karaoke_judges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karaoke_event_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            // Urutan tampil, sekaligus penomoran "Juri 1/2/3" di layar.
            $table->unsignedTinyInteger('position')->default(1);
            $table->string('public_token', 64)->unique();
            $table->timestamps();

            $table->unique(['karaoke_event_id', 'position']);
        });

        Schema::create('karaoke_contestants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karaoke_event_id')->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            // Nomor undian peserta. Nullable: sebagian lomba tidak memakainya.
            $table->unsignedSmallInteger('number')->nullable();
            $table->string('song_title')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['karaoke_event_id', 'sort_order']);
        });

        Schema::create('karaoke_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karaoke_judge_id')->constrained()->cascadeOnDelete();
            $table->foreignId('karaoke_contestant_id')->constrained()->cascadeOnDelete();

            /*
             * Nullable, bukan default 0.
             *
             * Kriteria yang belum dinilai harus dapat dibedakan dari kriteria
             * yang dinilai nol — papan juri menandai peserta "belum lengkap"
             * atas dasar itu, dan nol bukan nilai yang sah (rentangnya 1-100).
             */
            $table->unsignedTinyInteger('teknik_vokal')->nullable();
            $table->unsignedTinyInteger('ketepatan_irama')->nullable();
            $table->unsignedTinyInteger('penjiwaan')->nullable();
            $table->unsignedTinyInteger('penampilan_panggung')->nullable();
            $table->unsignedTinyInteger('kesan_keseluruhan')->nullable();

            $table->timestamps();

            // Satu juri, satu baris, satu peserta. Lihat catatan di kepala berkas.
            $table->unique(['karaoke_judge_id', 'karaoke_contestant_id'], 'karaoke_scores_juri_peserta_unique');
        });
    }

    public function down(): void
    {
        // Urutannya terbalik dari `up()`: nilai memegang kunci asing ke juri
        // dan peserta, keduanya memegang kunci asing ke acara.
        Schema::dropIfExists('karaoke_scores');
        Schema::dropIfExists('karaoke_contestants');
        Schema::dropIfExists('karaoke_judges');
        Schema::dropIfExists('karaoke_events');
    }
};
