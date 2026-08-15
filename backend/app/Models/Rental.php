<?php

namespace App\Models;

/** Pengajuan sewa ruang atau lahan di area bandara. */
class Rental extends Submission
{
    protected $table = 'rentals';

    protected $fillable = [
        'user_id', 'rental_name', 'rental_type', 'rental_more', 'description',
        'documents', 'area', 'location', 'quantity',
    ];

    protected function casts(): array
    {
        return [...parent::casts(), 'area' => 'integer', 'quantity' => 'integer'];
    }

    public function folderBerkas(): string
    {
        return 'rentals';
    }
}
