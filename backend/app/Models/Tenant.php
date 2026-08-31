<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Gerai yang sudah beroperasi di bandara.
 *
 * Tabelnya `airport_tenants`, bukan `tenants`. Tabel `tenants` warisan v1
 * adalah berkas permohonan sewa lahan usaha berikut status dan dokumen
 * lampirannya — bukan daftar gerai yang sudah buka.
 */
class Tenant extends Model
{
    use HasFactory, ResolvesFileUrl;

    /** Kategori gerai; kolomnya string agar kategori baru tak perlu ALTER. */
    public const CATEGORIES = [
        'food_beverage', 'retail', 'lounge', 'transportation', 'services',
    ];

    protected $table = 'airport_tenants';

    protected $fillable = [
        'name',
        'category',
        'location',
        'operating_hours',
        'contact_phone',
        'image_path',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Foto gerai dapat berupa lintasan unggahan maupun URL penuh milik server
     * lain, jadi tampilannya membaca `image_url` — bukan kolomnya langsung.
     * Bernilai null bila berkasnya tidak ditemukan di cakram mana pun, dan
     * itulah yang membuat panel admin bisa menandai foto yang hilang.
     */
    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->fileUrl($this->image_path);
    }
}
