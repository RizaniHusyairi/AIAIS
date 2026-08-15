<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;

/**
 * Destinasi wisata di sekitar bandara.
 *
 * Tabelnya milik portal v1 berikut tiga destinasi yang selama ini tayang.
 *
 * DUA KEJANGGALAN DATA v1 yang ditangani di sini, bukan dibiarkan sampai ke
 * tampilan:
 *
 *   1. **Entri galeri berulang.** Ketiga destinasi mencatat foto yang sama
 *      dua sampai tiga kali. Menampilkannya apa adanya berarti galeri berisi
 *      gambar kembar — jelas bukan yang dimaksud petugas saat mengunggahnya.
 *   2. **Ekstensi ganda.** Sebagian lintasan berakhir `.jpg.jpg`, sisa
 *      penamaan berkas di v1. Lintasannya tidak diubah — berkas di cakram
 *      produksi memang bernama begitu, dan "membetulkannya" justru akan
 *      memutus gambar yang selama ini tampil.
 *
 * Galeri karena itu disaring: hanya berkas yang benar-benar dapat dibuka yang
 * dikirim, dan tanpa pengulangan. Yang disaring adalah TAMPILANNYA; nilai di
 * basis data dibiarkan utuh supaya petugas tetap melihat apa yang tersimpan
 * di panel admin.
 */
class Tourism extends Model
{
    use ResolvesFileUrl;

    /** Status yang dikenali; dipakai pula sebagai aturan validasi. */
    public const STATUSES = ['published', 'draft'];

    protected $fillable = [
        'name', 'slug', 'category', 'distance_km', 'duration', 'city',
        'cover_image', 'gallery', 'short_desc', 'description', 'highlights',
        'address', 'gmaps_url', 'status',
    ];

    protected $casts = [
        'gallery' => 'array',
        'highlights' => 'array',
        'distance_km' => 'float',
    ];

    protected $appends = ['cover_url', 'has_cover', 'gallery_urls'];

    public function getHasCoverAttribute(): bool
    {
        return $this->fileExists($this->cover_image);
    }

    public function getCoverUrlAttribute(): ?string
    {
        return $this->fileUrl($this->cover_image);
    }

    /**
     * URL foto galeri yang benar-benar dapat dibuka, tanpa pengulangan.
     *
     * Urutan aslinya dipertahankan — petugas menyusunnya dengan urutan itu.
     *
     * @return array<int, string>
     */
    public function getGalleryUrlsAttribute(): array
    {
        $urls = [];

        foreach ($this->gallery ?? [] as $lintasan) {
            if (! is_string($lintasan)) {
                continue;
            }

            $url = $this->fileUrl($lintasan);

            if ($url !== null && ! in_array($url, $urls, true)) {
                $urls[] = $url;
            }
        }

        return $urls;
    }
}
