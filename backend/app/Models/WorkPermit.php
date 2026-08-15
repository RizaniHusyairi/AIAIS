<?php

namespace App\Models;

/**
 * Pengajuan izin kerja di area bandara.
 *
 * Satu-satunya jenis pengajuan sederhana yang membawa RENTANG TANGGAL, dan
 * itu bukan hiasan: izin kerja mengikat orang di sisi udara pada jangka waktu
 * tertentu, sehingga tanggal mulai dan selesai adalah bagian dari izinnya
 * sendiri, bukan keterangan tambahan.
 */
class WorkPermit extends Submission
{
    protected $table = 'work_permits';

    protected $fillable = [
        'user_id', 'work_type', 'location', 'description',
        'start_date', 'end_date', 'documents',
    ];

    protected function casts(): array
    {
        return [...parent::casts(), 'start_date' => 'datetime', 'end_date' => 'datetime'];
    }

    public function folderBerkas(): string
    {
        return 'work-permits';
    }
}
