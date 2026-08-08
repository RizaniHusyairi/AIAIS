<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Surat resmi bandara: Surat Keputusan dan Surat Edaran.
 *
 * Aturan penting yang diwarisi dari v1: surat yang berkasnya TIDAK ada di
 * cakram tidak boleh tampil di halaman publik. Kolom `file_path` bisa
 * menunjuk berkas yang tidak pernah ada — sisa data contoh atau berkas yang
 * terhapus manual — dan tanpa pemeriksaan ini tautannya berujung 404.
 */
class Letter extends Model
{
    /** Jenis surat yang dikenali; dipakai pula sebagai aturan validasi. */
    public const TYPES = ['keputusan', 'edaran'];

    protected $fillable = ['type', 'number', 'title', 'issue_date', 'file_path'];

    protected $casts = [
        'issue_date' => 'date',
    ];

    /** Ikut terkirim pada JSON — frontend hanya perlu URL siap pakai. */
    protected $appends = ['file_url', 'has_file'];

    /**
     * Apakah berkasnya benar-benar dapat dibuka.
     *
     * URL penuh dianggap ada: dokumen yang masih dilayani server v1 tidak
     * punya jejak di cakram v2, dan memeriksanya lewat jaringan akan membuat
     * setiap permintaan daftar bergantung pada server lain.
     */
    public function getHasFileAttribute(): bool
    {
        if (empty($this->file_path)) {
            return false;
        }

        if ($this->isAbsoluteUrl($this->file_path)) {
            return true;
        }

        return Storage::disk('public')->exists($this->file_path);
    }

    /** URL publik berkas, atau null bila berkasnya tidak ada. */
    public function getFileUrlAttribute(): ?string
    {
        if (! $this->has_file) {
            return null;
        }

        return $this->isAbsoluteUrl($this->file_path)
            ? $this->file_path
            : Storage::disk('public')->url($this->file_path);
    }

    private function isAbsoluteUrl(string $path): bool
    {
        return str_starts_with($path, 'http://') || str_starts_with($path, 'https://');
    }
}
