<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Perlebar kolom tautan surat balasan pengajuan field trip.
 *
 * v1 memvalidasi `reply_document_path` sebagai URL tetapi menyimpannya dalam
 * `varchar(125)`. Tautan berbagi Google Drive — bentuk yang paling mungkin
 * dipakai petugas — rutin melewati 125 aksara. Dengan STRICT_TRANS_TABLES
 * aktif, akibatnya bukan pemangkasan senyap melainkan penyimpanan yang GAGAL,
 * dan petugas melihat kegagalan tanpa sebab yang jelas tepat saat hendak
 * menyetujui sebuah pengajuan.
 *
 * Kolomnya tetap nullable: pengajuan yang belum disetujui memang belum punya
 * surat balasan.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('fieldtrips', 'reply_document_path') || $this->sudahLebar()) {
            return;
        }

        DB::statement('ALTER TABLE `fieldtrips` MODIFY `reply_document_path` VARCHAR(500) NULL');
    }

    public function down(): void
    {
        // Sengaja tidak dipersempit kembali — menyempitkannya akan menolak
        // tautan yang sudah tersimpan sah.
    }

    private function sudahLebar(): bool
    {
        $kolom = DB::selectOne(
            'SELECT CHARACTER_MAXIMUM_LENGTH AS panjang FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            ['fieldtrips', 'reply_document_path']
        );

        return $kolom !== null && (int) $kolom->panjang >= 500;
    }
};
