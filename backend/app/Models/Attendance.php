<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Satu peserta yang menandatangani daftar hadir.
 *
 * Berkas tanda tangan disimpan di cakram PRIVAT. v1 menaruhnya di cakram
 * publik, sehingga gambar tanda tangan berikut nama penandatangannya dapat
 * dibuka siapa pun yang menebak lintasannya — kelas cacat yang sama sudah
 * ditemukan pada dokumen bertanda tangan Extend Advance.
 *
 * Kolom `signature` menyimpan LINTASAN berkasnya, bukan gambarnya. Nama
 * kolomnya diwarisi v1 dan dipertahankan.
 */
class Attendance extends Model
{
    public const DISK = 'local';

    protected $fillable = ['meeting_id', 'name', 'department', 'phone'];

    /** Lintasan tanda tangan tidak pernah keluar dari API. */
    protected $hidden = ['signature'];

    protected $appends = ['has_signature'];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function getHasSignatureAttribute(): bool
    {
        return filled($this->attributes['signature'] ?? null);
    }

    public function hapusBerkas(): void
    {
        $lintasan = $this->attributes['signature'] ?? null;

        if ($lintasan && Storage::disk(self::DISK)->exists($lintasan)) {
            Storage::disk(self::DISK)->delete($lintasan);
        }
    }
}
