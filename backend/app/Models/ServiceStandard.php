<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;

/**
 * Standar Pelayanan, Maklumat Pelayanan, dan Survei Kepuasan Masyarakat.
 *
 * Tabelnya milik portal v1. Dokumennya bisa datang dari dua arah — berkas yang
 * diunggah petugas (`file_path`) atau tautan ke penyimpanan luar
 * (`document_link`) — dan v1 memakai keduanya bergantian. `document_url`
 * menyatukannya menjadi satu nilai siap pakai, dengan berkas unggahan
 * didahulukan karena itu satu-satunya yang keberadaannya dapat dipastikan.
 *
 * `has_document` bernilai false bila dokumennya belum ada. Tampilan wajib
 * mengatakannya apa adanya — memasang tombol unduh yang berujung 404 pada
 * dokumen tolok ukur pelayanan publik lebih buruk daripada mengaku belum ada.
 */
class ServiceStandard extends Model
{
    use ResolvesFileUrl;

    /**
     * Jenis dokumen yang dikenali, urut menurut alur dokumennya sendiri:
     * standar disusun lebih dulu, dijanjikan lewat maklumat, lalu dievaluasi
     * lewat survei. Urutan ini bermakna dan tidak boleh diganti abjad.
     */
    public const TYPES = [
        'Standar Pelayanan',
        'Maklumat Pelayanan',
        'Survei Kepuasan Masyarakat',
    ];

    protected $fillable = [
        'type', 'title', 'document_number', 'description',
        'file_path', 'document_link', 'published_date', 'is_active',
    ];

    protected $casts = [
        'published_date' => 'date',
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
