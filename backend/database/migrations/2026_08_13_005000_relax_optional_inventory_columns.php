<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Longgarkan kolom inventaris yang sebenarnya opsional.
 *
 * Dua kolom ditandai NOT NULL tanpa nilai bawaan, padahal isinya jelas
 * pelengkap:
 *
 *  - `inventories.photo_path` — aset dapat dicatat sebelum sempat difoto.
 *    Formulir v1 selalu mengirim sesuatu, jadi cacatnya tak pernah terlihat;
 *    begitu aset dicatat tanpa foto, penyisipannya GAGAL di tingkat SQL
 *    dengan pesan yang tidak berarti apa-apa bagi petugas.
 *  - `inventory_logbooks.schedule_time` — tidak semua kegiatan pemeliharaan
 *    punya jam terjadwal; sebagian dikerjakan begitu kerusakan ditemukan.
 *
 * Melonggarkan NOT NULL bersifat aditif: baris lama tetap sah, dan v1 yang
 * selalu mengisi keduanya tetap berjalan tanpa perubahan kode.
 */
return new class extends Migration
{
    /** @var array<string, array<string, string>> */
    private const SASARAN = [
        'inventories' => ['photo_path' => 'VARCHAR(125) NULL'],
        'inventory_logbooks' => ['schedule_time' => 'TIME NULL'],
    ];

    public function up(): void
    {
        foreach (self::SASARAN as $tabel => $kolomIni) {
            if (! Schema::hasTable($tabel)) {
                continue;
            }

            foreach ($kolomIni as $kolom => $tipe) {
                if (! Schema::hasColumn($tabel, $kolom) || $this->sudahNullable($tabel, $kolom)) {
                    continue;
                }

                DB::statement("ALTER TABLE `{$tabel}` MODIFY `{$kolom}` {$tipe}");
            }
        }
    }

    public function down(): void
    {
        // Sengaja tidak dikembalikan: memasang NOT NULL kembali akan gagal
        // begitu ada satu baris yang kolomnya memang kosong.
    }

    private function sudahNullable(string $tabel, string $kolom): bool
    {
        $info = DB::selectOne(
            'SELECT IS_NULLABLE AS nullable FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$tabel, $kolom]
        );

        return $info !== null && strtoupper($info->nullable) === 'YES';
    }
};
