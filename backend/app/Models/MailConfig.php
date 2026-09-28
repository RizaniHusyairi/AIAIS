<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Penyetelan server surel dari panel — SATU baris saja.
 *
 * Lihat migrasinya untuk alasan tabel ini terpisah dari `settings`.
 *
 * `password` disimpan TERENKRIPSI (cast `encrypted`, kunci `APP_KEY`) dan
 * tidak pernah ikut terserialisasi. Berbeda dengan kunci WhatsApp yang
 * tersimpan polos, kata sandi SMTP kerap sama dengan kata sandi kotak surel
 * dinas seseorang; bocornya salinan basis data tidak boleh ikut membocorkannya.
 * Akibatnya: mengganti `APP_KEY` membuat kata sandi ini tak terbaca dan harus
 * diisi ulang dari panel.
 */
class MailConfig extends Model
{
    public const ENKRIPSI = ['tls', 'ssl', 'none'];

    protected $fillable = [
        'aktif', 'host', 'port', 'enkripsi', 'username', 'password', 'from_address', 'from_name',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'aktif' => 'boolean',
        'port' => 'integer',
        'password' => 'encrypted',
    ];

    /** Penyetelan yang berlaku, atau null bila belum pernah diisi. */
    public static function aktif(): ?self
    {
        return static::query()->latest('id')->first();
    }

    /** Apakah kata sandi sudah terpasang — tanpa membacanya balik. */
    public function adaSandi(): bool
    {
        return filled($this->getRawOriginal('password'));
    }
}
