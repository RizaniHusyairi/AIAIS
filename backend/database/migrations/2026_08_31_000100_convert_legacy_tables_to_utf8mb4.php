<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Naikkan seluruh tabel warisan v1 dari utf8mb3 ke utf8mb4.
 *
 * Basis data v1 dibuat dengan charset `utf8` MySQL — yang meskipun namanya
 * "utf8" hanya menyimpan tiga bita per karakter, sehingga TIDAK dapat menampung
 * emoji maupun sebagian besar aksara di luar Bidang Multibahasa Dasar. Koneksi
 * Laravel sendiri sudah utf8mb4, jadi setiap teks beremoji yang diketik petugas
 * ditolak MySQL di ambang pintu:
 *
 *   SQLSTATE[HY000]: General error: 3988 Conversion from collation
 *   utf8mb4_unicode_ci into utf8mb3_unicode_ci impossible for parameter
 *
 * Itu yang terjadi saat menyimpan maklumat Serta-Merta berisi ✈️ dan ⚠️ —
 * dan menunggu terjadi di setiap modul lain yang teksnya diketik petugas
 * (berita, pengaduan, FAQ, wisata, layanan, …). Karena itu konversinya menyapu
 * seluruh tabel yang masih utf8mb3, bukan hanya tabel yang kebetulan pertama
 * kali menabraknya.
 *
 * Aman dijalankan pada basis data ini: seluruh tabelnya berformat baris
 * DYNAMIC (batas kunci indeks 3072 bita) dan tidak satu pun indeks teksnya
 * melebihi 768 karakter, sehingga tidak ada indeks yang meluap saat tiap
 * karakter berubah dari 3 menjadi 4 bita.
 *
 * Tabel v2 tidak ikut tersentuh karena memang sudah lahir utf8mb4 — basis
 * datanya sendiri sudah berdefault utf8mb4_unicode_ci.
 */
return new class extends Migration
{
    private const COLLATION = 'utf8mb4_unicode_ci';

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        $tabel = $this->tabelUtf8mb3();

        if (empty($tabel)) {
            return;
        }

        /* Kunci asing dimatikan sementara: selama konversi berjalan tabel-tabel
           sesaat berbeda charset satu sama lain, dan MySQL menolak kunci asing
           yang kolom rujukannya berbeda charset di tengah proses. */
        DB::statement('SET FOREIGN_KEY_CHECKS = 0');

        try {
            foreach ($tabel as $nama) {
                DB::statement(sprintf(
                    'ALTER TABLE `%s` CONVERT TO CHARACTER SET utf8mb4 COLLATE %s',
                    str_replace('`', '', $nama),
                    self::COLLATION,
                ));
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1');
        }
    }

    /**
     * Konversi ini TIDAK dapat dibatalkan.
     *
     * Mengembalikan tabel ke utf8mb3 berarti membuang setiap karakter empat
     * bita yang sudah tersimpan — persis teks yang membuat migrasi ini ada.
     * Kehilangan data diam-diam bukan harga yang pantas untuk sebuah rollback,
     * jadi `down()` sengaja tidak melakukan apa-apa.
     */
    public function down(): void
    {
        // Sengaja kosong; lihat catatan di atas.
    }

    /**
     * Nama tabel yang masih berkoleksi utf8mb3.
     *
     * MySQL 8.0.30 ke atas melaporkannya sebagai `utf8mb3_*`, versi sebelumnya
     * sebagai `utf8_*`. Keduanya diperiksa supaya migrasi ini tetap mengenali
     * tabelnya di mesin mana pun.
     *
     * @return list<string>
     */
    private function tabelUtf8mb3(): array
    {
        $rows = DB::select(
            "SELECT TABLE_NAME AS nama
               FROM information_schema.TABLES
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_TYPE = 'BASE TABLE'
                AND (TABLE_COLLATION LIKE 'utf8mb3\\_%' OR TABLE_COLLATION LIKE 'utf8\\_%')
              ORDER BY TABLE_NAME"
        );

        return array_map(static fn ($r) => $r->nama, $rows);
    }
};
