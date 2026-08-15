<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Satu catatan jurnal pemeliharaan sebuah aset.
 *
 * `documentation` berisi larik lintasan foto kegiatan. Foto pemeliharaan
 * adalah bukti pekerjaan, bukan data pribadi, jadi cakramnya publik — sama
 * seperti foto asetnya sendiri.
 */
class InventoryLogbook extends Model
{
    public const DISK = 'public';

    protected $fillable = [
        'inventory_id', 'user_id', 'log_date', 'schedule_time', 'notes', 'documentation',
    ];

    protected $appends = ['documentation_urls'];

    protected function casts(): array
    {
        return ['log_date' => 'date', 'documentation' => 'array'];
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return string[] */
    public function getDocumentationUrlsAttribute(): array
    {
        return array_map(
            fn ($p) => str_starts_with($p, 'http') ? $p : Storage::disk(self::DISK)->url($p),
            $this->documentation ?? [],
        );
    }

    public function hapusBerkas(): void
    {
        foreach ($this->documentation ?? [] as $lintasan) {
            if (str_starts_with($lintasan, 'http')) {
                continue;
            }

            if (Storage::disk(self::DISK)->exists($lintasan)) {
                Storage::disk(self::DISK)->delete($lintasan);
            }
        }
    }
}
