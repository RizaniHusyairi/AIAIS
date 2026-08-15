<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Jejak audit sebuah surat.
 *
 * Sekali-tulis. Tidak ada endpoint yang menyunting atau menghapusnya, dan itu
 * disengaja: inilah satu-satunya catatan yang menjawab siapa menyetujui apa
 * dan kapan. Jejak yang dapat disunting tidak membuktikan apa pun.
 */
class SuratEvent extends Model
{
    public const TYPES = [
        'created', 'assigned', 'verification_requested', 'verified',
        'rejected', 'revision_requested', 'revision_submitted', 'final_approved',
    ];

    protected $fillable = ['persuratan_id', 'actor_user_id', 'event_type', 'meta'];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    public function persuratan(): BelongsTo
    {
        return $this->belongsTo(Persuratan::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
