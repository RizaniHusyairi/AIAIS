<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Seorang juri pada satu acara, berikut tautan bertokennya.
 *
 * `public_token` TIDAK PERNAH ikut respons — alasannya sama persis dengan
 * `Meeting`: siapa pun yang melihatnya di layar dapat menilai atas nama juri
 * itu. Ia hanya keluar lewat endpoint admin `GET /admin/karaoke/{id}/tokens`,
 * saat petugas memang hendak membagikannya.
 */
class KaraokeJudge extends Model
{
    protected $fillable = ['karaoke_event_id', 'name', 'position', 'public_token'];

    protected $hidden = ['public_token'];

    protected function casts(): array
    {
        return ['position' => 'integer'];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(KaraokeEvent::class, 'karaoke_event_id');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(KaraokeScore::class);
    }
}
