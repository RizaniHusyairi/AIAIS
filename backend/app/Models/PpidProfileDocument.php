<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;

/**
 * Dokumen pada halaman Profil PPID: SK Tim PPID dan Laporan Bulanan.
 *
 * Dokumennya bisa datang dari dua arah — berkas yang diunggah petugas
 * (`file_path`) atau tautan ke penyimpanan luar (`document_link`) — karena SK
 * yang tayang selama ini masih menumpang Google Drive milik bandara sementara
 * dokumen baru sebaiknya diunggah sendiri. `document_url` menyatukan keduanya
 * menjadi satu nilai siap pakai, dengan berkas unggahan didahulukan karena itu
 * satu-satunya yang keberadaannya dapat dipastikan.
 *
 * `has_document` bernilai false bila dokumennya belum ada. Tampilan wajib
 * mengatakannya apa adanya alih-alih memasang tombol yang berujung 404 —
 * alasan yang sama tertulis pada `ServiceStandard`.
 */
class PpidProfileDocument extends Model
{
    use ResolvesFileUrl;

    /**
     * Jenis dokumen yang dikenali.
     *
     * SK lebih dulu karena ia yang menetapkan tim PPID; laporan bulanan adalah
     * pertanggungjawaban tim itu sesudahnya.
     */
    public const TYPES = ['SK PPID', 'Laporan Bulanan'];

    /** Jenis yang mengenal penanda "berlaku". */
    public const TYPE_SK = 'SK PPID';

    /** Jenis rekapitulasi layanan; seluruh bulan terbit sebagai satu dokumen. */
    public const TYPE_LAPORAN = 'Laporan Bulanan';

    protected $fillable = [
        'type', 'title', 'document_number', 'description',
        'published_date',
        'file_path', 'document_link', 'is_current', 'is_active',
    ];

    protected $casts = [
        'published_date' => 'date',
        'is_current' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected $appends = ['document_url', 'has_document'];

    public function getHasDocumentAttribute(): bool
    {
        return $this->document_url !== null;
    }

    /** Berkas unggahan didahulukan; tautan luar dipakai bila tidak ada. */
    public function getDocumentUrlAttribute(): ?string
    {
        $fromFile = $this->fileUrl($this->file_path);

        if ($fromFile !== null) {
            return $fromFile;
        }

        $link = trim((string) $this->document_link);

        return $link === '' ? null : $link;
    }
}
