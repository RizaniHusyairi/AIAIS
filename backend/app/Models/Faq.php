<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pertanyaan yang sering diajukan.
 *
 * Tabelnya milik portal v1 berikut sepuluh pertanyaan yang selama ini tayang.
 *
 * `answer` berisi HTML dari editor teks kaya panel admin — paragraf dan
 * penebalan pada informasi penting seperti jam operasional dan jenis identitas
 * yang diterima. Portal menyaringnya sebelum dirender; lihat komponen
 * `SafeHtml` di frontend beserta alasannya.
 *
 * `service_id` mengaitkan pertanyaan dengan satu layanan pengajuan, sehingga
 * halaman layanan dapat menampilkan pertanyaan yang relevan dengannya.
 */
class Faq extends Model
{
    protected $fillable = [
        'question', 'answer', 'category', 'service_id',
        'sort_order', 'is_featured', 'is_active',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
