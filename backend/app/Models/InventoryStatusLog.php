<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu perpindahan status aset inventaris.
 *
 * Baris di sini TIDAK PERNAH disunting atau dihapus lewat API. Ia riwayat:
 * yang menjawab sejak kapan sebuah aset rusak, siapa yang mencatatnya, dan
 * apa alasannya. Riwayat yang dapat disunting tidak menjawab apa pun.
 *
 * Hanya punya `created_at` — v1 tidak membuat `updated_at`, dan itu justru
 * konsisten dengan sifatnya yang sekali-tulis.
 */
class InventoryStatusLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['inventory_id', 'user_id', 'previous_status', 'new_status', 'notes'];

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
