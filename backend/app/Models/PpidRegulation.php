<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Peraturan yang menjadi dasar hukum keterbukaan informasi publik.
 *
 * Tabelnya milik portal v1 dan dipakai apa adanya, berikut sembilan peraturan
 * yang selama ini tayang di sana. Dokumennya tidak pernah diunggah ke bandara:
 * `document_link` selalu berupa tautan Google Drive, jadi modul ini tidak
 * memerlukan disk maupun penanda `has_file` seperti modul Regulasi Surat.
 */
class PpidRegulation extends Model
{
    /**
     * Kelompok peraturan yang dikenali; dipakai pula sebagai aturan validasi.
     *
     * Ejaan "Kementrian" pada kelompok ketiga mengikuti sumbernya di v1.
     * Membetulkannya menjadi "Kementerian" akan memecah peraturan lama dan
     * baru menjadi dua kelompok yang tampak berbeda di halaman publik.
     */
    public const CATEGORIES = [
        'Peraturan Undang-undang',
        'Peraturan Komisi Informasi Pusat',
        'Peraturan Kementrian Perhubungan Terkait Keterbukaan Informasi Publik',
    ];

    protected $fillable = ['category', 'title', 'document_link', 'published_date'];

    protected $casts = [
        'published_date' => 'date',
    ];
}
