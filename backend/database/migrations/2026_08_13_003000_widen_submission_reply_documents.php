<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Perlebar kolom tautan surat balasan di SELURUH tabel pengajuan.
 *
 * Cacat yang sama ditemukan lebih dulu pada `fieldtrips` (lihat migrasi
 * 2026_08_13_002000) dan ternyata merata: kesembilan tabel pengajuan v1
 * memvalidasi `reply_document_path` sebagai URL tetapi menyimpannya dalam
 * `varchar(125)`. Tautan berbagi Google Drive rutin melewati batas itu.
 *
 * Dengan STRICT_TRANS_TABLES aktif, akibatnya penyimpanan GAGAL tepat saat
 * petugas hendak menyetujui sebuah pengajuan — kegagalan tanpa sebab yang
 * jelas. Pada server yang mode strict-nya mati, tautannya tersimpan terpotong
 * dan pemohon menerima surat balasan yang tidak dapat dibuka.
 *
 * Dikerjakan menyeluruh sekarang, bukan satu per satu saat modulnya diporting,
 * supaya tidak ada modul yang lolos dengan cacat yang sudah diketahui.
 *
 * `extend_advances.signed_document_path` ikut dilebarkan dengan alasan sama.
 */
return new class extends Migration
{
    /** @var array<string, string[]> tabel => kolom tautan yang dilebarkan */
    private const SASARAN = [
        'tenants' => ['reply_document_path'],
        'rentals' => ['reply_document_path'],
        'licenses' => ['reply_document_path'],
        'ads' => ['reply_document_path'],
        'lelangs' => ['reply_document_path'],
        'work_permits' => ['reply_document_path'],
        'slots' => ['reply_document_path'],
        'extend_advances' => ['reply_document_path', 'signed_document_path'],
    ];

    public function up(): void
    {
        foreach (self::SASARAN as $tabel => $kolomIni) {
            if (! Schema::hasTable($tabel)) {
                continue;
            }

            foreach ($kolomIni as $kolom) {
                if (! Schema::hasColumn($tabel, $kolom) || $this->sudahLebar($tabel, $kolom)) {
                    continue;
                }

                DB::statement("ALTER TABLE `{$tabel}` MODIFY `{$kolom}` VARCHAR(500) NULL");
            }
        }
    }

    public function down(): void
    {
        // Sengaja tidak dipersempit — menyempitkannya menolak tautan yang
        // sudah tersimpan sah.
    }

    private function sudahLebar(string $tabel, string $kolom): bool
    {
        $info = DB::selectOne(
            'SELECT CHARACTER_MAXIMUM_LENGTH AS panjang FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$tabel, $kolom]
        );

        return $info !== null && (int) $info->panjang >= 500;
    }
};
