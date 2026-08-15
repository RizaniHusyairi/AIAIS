<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Kredensial Instagram — SATU baris saja.
 *
 * `access_token` tidak pernah ikut terserialisasi. Panel hanya perlu tahu
 * KAPAN tokennya habis, bukan isinya; dan satu-satunya cara token ini bocor
 * adalah lewat respons yang tidak sengaja membawanya.
 *
 * Ambang penyegaran sengaja jauh sebelum kedaluwarsa: token Instagram berumur
 * ±60 hari, dan menyegarkannya pada hari terakhir berarti satu kegagalan
 * jaringan sudah cukup untuk memutus sambungan sampai ada orang yang
 * menyadarinya.
 */
class InstagramCredential extends Model
{
    /** Segarkan bila sisa umurnya kurang dari ini. */
    public const AMBANG_SEGAR_HARI = 10;

    /** Token Instagram berumur panjang: ±60 hari. */
    public const UMUR_HARI = 60;

    protected $fillable = ['access_token', 'expires_at', 'account_username', 'last_refreshed_at'];

    protected $hidden = ['access_token'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_refreshed_at' => 'datetime',
        ];
    }

    /** Kredensial yang berlaku, atau null bila belum pernah dipasang. */
    public static function aktif(): ?self
    {
        return static::query()->latest('id')->first();
    }

    /** Sisa umur token dalam hari; negatif berarti sudah lewat. */
    public function sisaHari(): ?int
    {
        return $this->expires_at ? (int) now()->diffInDays($this->expires_at, false) : null;
    }

    public function sudahKedaluwarsa(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function perluDisegarkan(): bool
    {
        $sisa = $this->sisaHari();

        return $sisa !== null && $sisa < self::AMBANG_SEGAR_HARI;
    }
}
