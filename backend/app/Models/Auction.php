<?php

namespace App\Models;

/**
 * Pengajuan beauty contest / lelang ruang usaha.
 *
 * Tabelnya bernama `lelangs` di v1; nama kelasnya diinggriskan mengikuti
 * konvensi v2, tetapi NAMA TABEL tidak diubah — tabelnya masih milik v1
 * sampai cutover.
 */
class Auction extends Submission
{
    protected $table = 'lelangs';

    protected $fillable = [
        'user_id', 'name', 'lelang_type', 'description',
        'documents', 'additional_documents',
    ];

    public function folderBerkas(): string
    {
        return 'lelangs';
    }
}
