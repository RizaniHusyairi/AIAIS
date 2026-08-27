<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pejabat struktural Kantor UPBU Kelas I A.P.T. Pranoto.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PELINDUNGAN DATA PRIBADI — UU 27/2022
 *
 * Tabel ini SENGAJA TIDAK MEMILIKI kolom pendidikan, NIP, pangkat/golongan,
 * tanggal lahir, agama, alamat, nomor ponsel, atau nomor identitas apa pun.
 * Itu bukan kelalaian dan bukan sesuatu yang boleh "ditambahkan nanti kalau
 * perlu": riwayat pendidikan pernah ada pada data pejabat portal ini dan
 * dicabut secara sadar (lihat kepala `frontend/src/lib/airportProfile.ts`).
 *
 * Selama kolomnya tidak ada, tidak ada jalan bagi petugas berikutnya untuk
 * mengisinya kembali tanpa seseorang menyunting migrasi ini lebih dulu —
 * dan itulah gunanya.
 *
 * Yang ada di sini semuanya melekat pada JABATAN, bukan pada pribadi
 * pemangkunya, dan UU 14/2008 tentang Keterbukaan Informasi Publik justru
 * mewajibkan pengumumannya: nama, nomenklatur jabatan, foto resmi kedinasan,
 * riwayat jabatan, dan penghargaan kedinasan.
 * ────────────────────────────────────────────────────────────────────────
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('officials', function (Blueprint $table) {
            $table->id();

            // Kunci stabil yang dipakai frontend sebagai React key dan sebagai
            // penanda "siapa Kepala Kantor" pada kartu profil. Unik supaya dua
            // baris tidak pernah memperebutkan kunci yang sama.
            $table->string('slug')->unique();

            $table->string('name');

            /** Nomenklatur lengkap, dipakai halaman profil dan dialog. */
            $table->string('title');

            /** Nomenklatur ringkas untuk kartu dan carousel yang sempit. */
            $table->string('short_title');

            /**
             * Lintasan berkas ATAU URL penuh.
             *
             * Foto lima pejabat yang sekarang tayang masih berupa aset statis
             * frontend (`frontend/public/pejabat/*.png`) dan dilayani Next.js,
             * bukan Laravel — nilainya berawalan "/". Unggahan dari panel admin
             * masuk ke disk `public` milik Laravel. Model yang membedakan
             * ketiganya; lihat `App\Models\Official::getPhotoUrlAttribute`.
             */
            $table->string('photo')->nullable();

            /** Riwayat jabatan, satu baris satu jabatan; urutannya bermakna. */
            $table->json('position_history')->nullable();

            /** Penghargaan kedinasan. */
            $table->json('awards')->nullable();

            /**
             * Urutan tampil, bukan sekadar hiasan: susunan pejabat mengikuti
             * hierarki jabatan (Kepala Kantor lebih dulu), sehingga tidak boleh
             * bergantung pada urutan `id` maupun abjad nama.
             */
            $table->unsignedSmallInteger('sort_order')->default(0)->index();

            /**
             * Penyaring halaman publik.
             *
             * Sengaja TIDAK memakai keberadaan foto sebagai penyaring seperti
             * modul `letters`. Foto hanya pelengkap tampilan, sedangkan nama
             * dan jabatan justru wajib diumumkan menurut UU 14/2008 —
             * menyembunyikan pejabat karena fotonya belum diunggah berarti
             * menahan informasi yang seharusnya terbuka.
             */
            $table->boolean('is_published')->default(true)->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('officials');
    }
};
