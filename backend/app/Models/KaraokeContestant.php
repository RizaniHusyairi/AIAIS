<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Seorang peserta lomba. Dikelola petugas dari panel admin, bukan dari papan juri. */
class KaraokeContestant extends Model
{
    protected $fillable = ['karaoke_event_id', 'name', 'number', 'song_title', 'sort_order'];

    protected function casts(): array
    {
        return ['number' => 'integer', 'sort_order' => 'integer'];
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
