<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Informasi Setiap Saat — dokumen yang tersedia kapan pun diminta.
 *
 * Tabelnya milik portal v1. Nama tabelnya tunggal (`evergreen_information`),
 * menyimpang dari kelaziman Laravel, sehingga `$table` harus disebut eksplisit
 * agar Eloquent tidak mencari `evergreen_informations`.
 *
 * Seperti Informasi Berkala, kategorinya bebas teks dan dikelola petugas.
 */
class EvergreenInformation extends Model
{
    protected $table = 'evergreen_information';

    protected $fillable = ['title', 'category', 'published_date', 'document_link'];

    protected $casts = [
        'published_date' => 'date',
    ];
}
