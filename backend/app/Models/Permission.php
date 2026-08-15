<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Satu kewenangan fungsional, mis. "Manajemen Berita".
 *
 * Kolomnya bernama `permission_name`, bukan `name`. Itu tampak janggal, dan
 * memang janggal — tetapi menggantinya berarti menyentuh seluruh kode
 * persuratan dan inventaris v1 yang akan diporting. Yang DIPERBAIKI di sini
 * adalah kekeliruan v1: model di sana menulis `$fillable = ['name']`, kolom
 * yang tidak ada, sehingga `Permission::create()` diam-diam menyimpan baris
 * kosong tanpa ada yang menyadarinya.
 */
class Permission extends Model
{
    protected $fillable = ['permission_name'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'permission_role')->withTimestamps();
    }
}
