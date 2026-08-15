<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/** Suku cadang beserta stoknya. */
class SparePart extends Model
{
    public const DISK = 'public';

    protected $fillable = ['name', 'stock'];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return ['stock' => 'integer'];
    }

    public function requests(): HasMany
    {
        return $this->hasMany(SparePartRequest::class)->orderByDesc('created_at');
    }

    public function getPhotoUrlAttribute(): ?string
    {
        $lintasan = $this->attributes['photo_path'] ?? null;

        if (blank($lintasan)) {
            return null;
        }

        return str_starts_with($lintasan, 'http')
            ? $lintasan
            : Storage::disk(self::DISK)->url($lintasan);
    }

    public function hapusFoto(): void
    {
        $lintasan = $this->attributes['photo_path'] ?? null;

        if (blank($lintasan) || str_starts_with($lintasan, 'http')) {
            return;
        }

        if (Storage::disk(self::DISK)->exists($lintasan)) {
            Storage::disk(self::DISK)->delete($lintasan);
        }
    }
}
