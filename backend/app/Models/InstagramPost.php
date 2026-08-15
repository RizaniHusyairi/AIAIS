<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Satu unggahan Instagram yang sudah disalin ke portal.
 *
 * Yang ditampilkan portal adalah SALINAN LOKAL gambarnya, bukan URL dari
 * Instagram — URL CDN Meta mati dalam hitungan jam. Lihat catatan pada
 * migrasi 2026_08_15_000100.
 */
class InstagramPost extends Model
{
    /** Jenis media yang dikenali Graph API. */
    public const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];

    /** Cakram penyimpanan salinan gambar — publik, isinya memang publik. */
    public const DISK = 'public';

    /** Direktori salinan gambar di dalam cakram. */
    public const FOLDER = 'instagram';

    protected $fillable = [
        'ig_id', 'permalink', 'media_type', 'local_image_path',
        'caption', 'posted_at', 'synced_at',
    ];

    protected $appends = ['image_url', 'caption_excerpt'];

    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
            'synced_at' => 'datetime',
            'is_visible' => 'boolean',
        ];
    }

    /** Hanya unggahan yang boleh tampil di portal, terbaru lebih dulu. */
    public function scopeTampil($query)
    {
        return $query->where('is_visible', true)
            ->whereNotNull('local_image_path')
            ->orderByDesc('posted_at');
    }

    /**
     * URL gambar yang dipakai portal.
     *
     * SELALU salinan lokal. Bila salinannya belum ada, kembalikan null dan
     * biarkan tampilan menanganinya — memakai `media_url` Instagram sebagai
     * cadangan hanya menunda gambar rusaknya beberapa jam.
     */
    public function getImageUrlAttribute(): ?string
    {
        $lintasan = $this->attributes['local_image_path'] ?? null;

        return $lintasan ? Storage::disk(self::DISK)->url($lintasan) : null;
    }

    /**
     * Potongan takarir untuk kartu di beranda.
     *
     * Takarir Instagram kerap sangat panjang dan berakhir dengan belasan
     * tagar. Kartu beranda hanya perlu kalimat pembukanya.
     */
    public function getCaptionExcerptAttribute(): ?string
    {
        $takarir = trim((string) ($this->attributes['caption'] ?? ''));

        if ($takarir === '') {
            return null;
        }

        // Tagar di akhir dibuang; ia menuhi kartu tanpa memberi keterangan.
        $bersih = trim(preg_replace('/(\s*#[\p{L}\p{N}_]+)+\s*$/u', '', $takarir) ?? $takarir);

        return mb_strimwidth($bersih === '' ? $takarir : $bersih, 0, 160, '…');
    }

    public function hapusBerkas(): void
    {
        $lintasan = $this->attributes['local_image_path'] ?? null;

        if ($lintasan && Storage::disk(self::DISK)->exists($lintasan)) {
            Storage::disk(self::DISK)->delete($lintasan);
        }
    }
}
