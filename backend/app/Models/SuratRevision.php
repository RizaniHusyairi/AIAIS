<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu permintaan revisi atas sebuah surat.
 *
 * `previous_status` menyimpan tahap surat SEBELUM dikembalikan, sehingga
 * riwayatnya tetap menunjukkan dari titik mana surat itu jatuh — keterangan
 * yang hilang bila hanya statusnya yang ditimpa.
 */
class SuratRevision extends Model
{
    protected $fillable = ['persuratan_id', 'user_id', 'comments', 'previous_status'];

    public function persuratan(): BelongsTo
    {
        return $this->belongsTo(Persuratan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
