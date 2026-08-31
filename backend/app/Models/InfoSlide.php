<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;

/**
 * Slide informasi pada beranda — papan pengumuman bergambar.
 *
 * Tabelnya milik portal v1 dan dipakai apa adanya: `image_path`, `link_url`,
 * `is_visible`. Tidak ada kolom judul maupun urutan, dan itu memang bentuk
 * aslinya — satu slide adalah selembar gambar yang boleh ditautkan ke suatu
 * alamat, bukan artikel bergambar.
 *
 * Gambarnya datang dari dua zaman: baris warisan v1 menyimpan lintasan pada
 * cakram `legacy` (`public/uploads` portal lama), sedangkan unggahan v2
 * ditulis ke `info-slides/` pada cakram `public`. Keduanya dilayani
 * `ResolvesFileUrl` saat dibaca; yang membedakan hanya siapa yang berwenang
 * menghapus berkasnya — lihat `InfoSlideController::hapusBerkas()`.
 */
class InfoSlide extends Model
{
    use ResolvesFileUrl;

    protected $table = 'info_slides';

    protected $fillable = [
        'image_path',
        'link_url',
        'is_visible',
    ];

    protected $casts = [
        'is_visible' => 'boolean',
    ];

    protected $appends = ['image_url', 'has_image'];

    /**
     * Berbeda dari modul dokumen, `has_image` false berarti slide itu TIDAK
     * dapat dipakai sama sekali: yang ditampilkan slide hanyalah gambarnya.
     * Karena itu daftar publik menyaringnya, dan daftar admin menandainya.
     */
    public function getHasImageAttribute(): bool
    {
        return $this->image_url !== null;
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->fileUrl($this->image_path);
    }
}
