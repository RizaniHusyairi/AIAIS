<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Perlebar kolom tautan pada aplikasi internal.
 *
 * Cacat yang sama untuk ketiga kalinya: kolom yang isinya URL disimpan dalam
 * `varchar(125)`. Sudah ditemukan pada `fieldtrips`, lalu merata di seluruh
 * tabel pengajuan; di sini muncul lagi pada `inventories.maintenance_report_link`
 * dan `spare_part_requests.memo_link`.
 *
 * Keduanya berisi tautan berbagi ke laporan pemeliharaan dan nota dinas —
 * bentuk tautan yang rutin melewati 125 aksara. Dengan STRICT_TRANS_TABLES
 * aktif, penyimpanannya GAGAL tanpa sebab yang jelas bagi petugas.
 *
 * `inventory_status_logs.notes` ikut dilebarkan. Kolom itu mencatat ALASAN
 * sebuah aset berpindah status ke Pemeliharaan; 125 aksara tidak cukup untuk
 * menerangkan kerusakan, dan catatan yang terpotong membuat riwayat aset
 * kehilangan justru bagian yang menjelaskan.
 */
return new class extends Migration
{
    /** @var array<string, array<string, string>> tabel => [kolom => tipe baru] */
    private const SASARAN = [
        'inventories' => ['maintenance_report_link' => 'VARCHAR(500) NULL'],
        'spare_part_requests' => ['memo_link' => 'VARCHAR(500) NULL'],
        'inventory_status_logs' => ['notes' => 'TEXT NULL'],
    ];

    public function up(): void
    {
        foreach (self::SASARAN as $tabel => $kolomIni) {
            if (! Schema::hasTable($tabel)) {
                continue;
            }

            foreach ($kolomIni as $kolom => $tipe) {
                if (! Schema::hasColumn($tabel, $kolom) || $this->sudahLebar($tabel, $kolom)) {
                    continue;
                }

                DB::statement("ALTER TABLE `{$tabel}` MODIFY `{$kolom}` {$tipe}");
            }
        }
    }

    public function down(): void
    {
        // Sengaja tidak dipersempit — menyempitkannya memotong data yang sah.
    }

    private function sudahLebar(string $tabel, string $kolom): bool
    {
        $info = DB::selectOne(
            'SELECT DATA_TYPE AS tipe, CHARACTER_MAXIMUM_LENGTH AS panjang
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$tabel, $kolom]
        );

        if ($info === null) {
            return false;
        }

        return strtolower($info->tipe) === 'text' || (int) $info->panjang >= 500;
    }
};
