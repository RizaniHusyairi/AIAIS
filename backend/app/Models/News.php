<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Berita dan siaran pers bandara.
 *
 * Tabelnya milik portal v1, dilengkapi kolom tambahan v2 lewat migrasi aditif.
 * Dua penyesuaian yang perlu diketahui:
 *
 *   - `thumbnail` bukan kolom. Gambar berita sudah punya rumah di kolom `image`
 *     warisan v1, dan menyimpan lintasan berkas yang sama di dua kolom hanya
 *     menunggu keduanya berbeda isi. Pasangan accessor/mutator di bawah
 *     membuat seluruh kode v2 tetap bisa menyebutnya `thumbnail`.
 *
 *   - `is_published` dan `is_headline` warisan v1 masih ada di tabel dan tetap
 *     diselaraskan saat menulis, supaya aplikasi v1 menampilkan hal yang sama
 *     selama masa transisi. Keduanya dibuang pada perapian pasca-cutover.
 */
class News extends Model
{
    use HasFactory, ResolvesFileUrl;

    /** Status yang dikenali; dipakai pula sebagai aturan validasi. */
    public const STATUSES = ['draft', 'published'];

    protected $fillable = [
        'title',
        'slug',
        'category',
        'excerpt',
        'content',
        'thumbnail',
        'author',
        'views_count',
        'is_featured',
        'status',
        'published_at',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'published_at' => 'datetime',
        'views_count' => 'integer',
    ];

    /**
     * `thumbnail` — nilai mentah kolomnya, dibutuhkan panel admin supaya form
     * ubah tahu sampul apa yang sedang terpasang. Tanpa ini hanya `image` yang
     * terkirim, dan panel v2 yang menyebutnya `thumbnail` akan mengira berita
     * itu belum bergambar lalu mengosongkannya saat disimpan.
     *
     * `thumbnail_url` — URL siap pakai; menangani berkas v1 maupun unggahan v2.
     */
    protected $appends = ['thumbnail', 'thumbnail_url'];

    /** Nama v2 untuk kolom `image` warisan v1. */
    protected function thumbnail(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->attributes['image'] ?? null,
            set: fn (?string $value): array => ['image' => $value],
        );
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->fileUrl($this->attributes['image'] ?? null);
    }

    /**
     * Jaga kolom v1 tetap selaras dengan padanan v2-nya.
     *
     * Selama v1 belum dipensiunkan, berita yang diterbitkan lewat panel admin
     * v2 juga harus tampil di portal lama — dan sebaliknya penyuntingan di v1
     * tidak boleh membuat beritanya hilang dari v2.
     */
    protected static function booted(): void
    {
        static::saving(function (self $news) {
            $news->attributes['is_published'] = ($news->status ?? 'published') === 'published' ? 1 : 0;
            $news->attributes['is_headline'] = $news->is_featured ? 1 : 0;
        });
    }
}
