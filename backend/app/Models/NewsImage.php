<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu foto pada galeri berita.
 *
 * `url` bernilai null bila berkasnya hilang dari cakram. Halaman publik
 * menyaring foto seperti itu; panel admin tetap menampilkannya dengan penanda
 * supaya petugas tahu ada yang perlu diunggah ulang.
 */
class NewsImage extends Model
{
    use ResolvesFileUrl;

    /** Batas foto per berita — galeri, bukan arsip foto kegiatan. */
    public const MAX_PER_NEWS = 12;

    protected $fillable = ['news_id', 'path', 'caption', 'sort_order'];

    protected $casts = [
        'news_id' => 'integer',
        'sort_order' => 'integer',
    ];

    protected $appends = ['url'];

    public function news(): BelongsTo
    {
        return $this->belongsTo(News::class);
    }

    public function getUrlAttribute(): ?string
    {
        return $this->fileUrl($this->path);
    }
}
