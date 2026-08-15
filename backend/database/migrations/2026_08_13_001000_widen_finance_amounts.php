<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Perlebar kolom rupiah pada tabel keuangan warisan v1.
 *
 * v1 menyimpan rupiah dalam `int`, yang memberi langit-langit keras:
 * `finances.amount` (unsigned) mentok di Rp 4.294.967.295, dan
 * `budget_expenses.amount` (SIGNED — v1 lupa `unsigned`) mentok di
 * Rp 2.147.483.647. Baris terbesar yang ada sekarang Rp 1,5 miliar, jadi
 * jaraknya tinggal satu kali lipat: satu anggaran tahunan bandara yang
 * dicatat utuh sudah melewatinya.
 *
 * Server ini berjalan dengan STRICT_TRANS_TABLES, jadi nilai yang melampaui
 * batas DITOLAK dengan galat, bukan dipangkas diam-diam. Itu kabar baik —
 * tetapi berarti petugas keuangan tidak akan bisa menyimpan anggaran besar
 * sama sekali, dan yang dilihatnya cuma kegagalan tanpa sebab yang jelas.
 * Pada server lain yang mode strict-nya mati, akibatnya lebih buruk: angka
 * rupiah resmi tersimpan terpangkas tanpa seorang pun tahu.
 *
 * Pelebaran bersifat aditif: v1 tetap berjalan di atas kolom yang lebih
 * lebar tanpa perubahan kode apa pun.
 *
 * `MODIFY` mentah dipakai, bukan `->change()`, karena Blueprint menyusun
 * ulang seluruh definisi kolom berikut indeksnya — pada tabel warisan itu
 * cara termudah menabrak nama indeks yang sudah ada.
 */
return new class extends Migration
{
    /** @var array<string, string> tabel => kolom */
    private const SASARAN = [
        'finances' => 'amount',
        'budget_expenses' => 'amount',
    ];

    public function up(): void
    {
        foreach (self::SASARAN as $tabel => $kolom) {
            if (! Schema::hasColumn($tabel, $kolom) || $this->sudahBigint($tabel, $kolom)) {
                continue;
            }

            DB::statement("ALTER TABLE `{$tabel}` MODIFY `{$kolom}` BIGINT UNSIGNED NOT NULL");
        }
    }

    public function down(): void
    {
        // Sengaja tidak dipersempit kembali. Menyempitkan kolom yang sudah
        // menampung nilai besar akan memangkas datanya diam-diam — persis
        // kerusakan yang dicegah migrasi ini.
    }

    /** Sudah lebar? Migrasi ini harus aman dijalankan ulang. */
    private function sudahBigint(string $tabel, string $kolom): bool
    {
        $tipe = DB::selectOne(
            'SELECT DATA_TYPE AS t FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$tabel, $kolom]
        );

        return $tipe !== null && strtolower($tipe->t) === 'bigint';
    }
};
