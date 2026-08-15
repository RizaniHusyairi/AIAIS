<?php

namespace App\Models;

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
    use HasFactory;

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
        'image',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
