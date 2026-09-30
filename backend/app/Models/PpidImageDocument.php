<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;

/**
 * Dokumen bergambar pada halaman Profil PPID (bagan struktur, maklumat, dsb.).
 *
 * `image_path` mengenal satu bentuk lebih banyak daripada kolom berkas lain:
 * lintasan berawalan "/" menunjuk aset statis milik frontend (mis.
 * "/ppid/struktur-ppid.jpg"). Itulah tempat ketiga gambar bawaan tinggal
 * sebelum modul ini ada, dan seeder memindahkannya apa adanya supaya tidak
 * ada yang berubah di halaman publik. Backend tidak dapat memeriksa berkas di
 * sisi frontend, jadi — sama seperti URL penuh — keberadaannya diandaikan.
 *
 * `has_image` false berarti berkas unggahannya hilang dari disk. Daftar publik
 * menyaring baris seperti itu; daftar admin menampilkannya dengan penanda.
 */
class PpidImageDocument extends Model
{
    use ResolvesFileUrl;

    protected $fillable = ['title', 'description', 'image_path', 'sort_order', 'is_active'];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $appends = ['image_url', 'has_image'];

    public function getImageUrlAttribute(): ?string
    {
        if ($this->isStaticAsset($this->image_path)) {
            return $this->image_path;
        }

        return $this->fileUrl($this->image_path);
    }

    public function getHasImageAttribute(): bool
    {
        return $this->image_url !== null;
    }

    /** Aset statis frontend — bukan milik disk mana pun di backend. */
    public function isStaticAsset(?string $path): bool
    {
        return is_string($path) && str_starts_with($path, '/') && ! str_starts_with($path, '//');
    }
}
