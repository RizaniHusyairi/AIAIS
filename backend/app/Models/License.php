<?php

namespace App\Models;

/** Pengajuan perizinan usaha di area bandara. */
class License extends Submission
{
    protected $table = 'licenses';

    protected $fillable = [
        'user_id', 'license_name', 'license_type', 'license_more',
        'description', 'documents',
    ];

    public function folderBerkas(): string
    {
        return 'licenses';
    }
}
