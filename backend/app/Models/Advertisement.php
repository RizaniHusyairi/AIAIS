<?php

namespace App\Models;

/** Pengajuan pemasangan iklan di area bandara. */
class Advertisement extends Submission
{
    protected $table = 'ads';

    protected $fillable = ['user_id', 'ad_name', 'ad_type', 'description', 'documents'];

    public function folderBerkas(): string
    {
        return 'ads';
    }
}
