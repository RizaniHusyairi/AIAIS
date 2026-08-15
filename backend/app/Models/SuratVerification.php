<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu tahap dalam rantai verifikasi sebuah surat.
 *
 * Urutannya ditentukan kolom `order`, dan rantainya adalah daftar verifikator
 * yang DIPILIH PEMBUAT SURAT — bukan hierarki jabatan. Kolom `parent_role_id`
 * pada tabel `roles` memang ada dan di-seed, tetapi nol baris kode v1 pernah
 * membacanya; menambahkan pewarisan hierarki di sini berarti menciptakan jalur
 * kewenangan kedua yang dapat memberi persetujuan kepada orang di luar daftar.
 */
class SuratVerification extends Model
{
    public const STATUSES = ['Menunggu', 'Disetujui', 'Ditolak'];

    protected $fillable = ['persuratan_id', 'user_id', 'status', 'order', 'comments'];

    protected function casts(): array
    {
        return ['order' => 'integer'];
    }

    public function persuratan(): BelongsTo
    {
        return $this->belongsTo(Persuratan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
