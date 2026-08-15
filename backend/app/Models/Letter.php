<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;

/**
 * Surat resmi bandara: Surat Keputusan dan Surat Edaran.
 *
 * Tabelnya milik portal v1 dan dipakai apa adanya — kolomnya kebetulan sudah
 * persis sama dengan yang dibutuhkan v2. Yang berbeda hanya letak berkasnya:
 * PDF lama ada di direktori unggahan v1 (disk `legacy`), PDF baru ditulis ke
 * disk `public` v2. Trait ResolvesFileUrl yang menyatukan keduanya.
 *
 * Aturan penting yang diwarisi dari v1: surat yang berkasnya TIDAK ada tidak
 * boleh tampil di halaman publik. Kolom `file_path` bisa menunjuk berkas yang
 * tidak pernah ada — sisa data contoh atau berkas yang terhapus manual — dan
 * tanpa pemeriksaan ini tautannya berujung 404.
 */
class Letter extends Model
{
    use ResolvesFileUrl;

    /** Jenis surat yang dikenali; dipakai pula sebagai aturan validasi. */
    public const TYPES = ['keputusan', 'edaran'];

    protected $fillable = ['type', 'number', 'title', 'issue_date', 'file_path'];

    protected $casts = [
        'issue_date' => 'date',
    ];

    /** Ikut terkirim pada JSON — frontend hanya perlu URL siap pakai. */
    protected $appends = ['file_url', 'has_file'];

    public function getHasFileAttribute(): bool
    {
        return $this->fileExists($this->file_path);
    }

    public function getFileUrlAttribute(): ?string
    {
        return $this->fileUrl($this->file_path);
    }
}
