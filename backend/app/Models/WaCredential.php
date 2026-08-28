<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Kunci gateway WhatsApp — SATU baris saja.
 *
 * Berdiri terpisah dari tabel `settings` dan itu bukan pilihan gaya:
 * `GET /settings` bersifat publik, sehingga kunci yang disimpan di sana akan
 * ikut tersaji ke peramban setiap pengunjung portal. Pola yang sama dipakai
 * `InstagramCredential`, dengan alasan yang sama.
 *
 * `token` tidak pernah ikut terserialisasi. Panel hanya perlu tahu APAKAH
 * kuncinya sudah terpasang dan empat huruf terakhirnya, bukan isinya.
 */
class WaCredential extends Model
{
    protected $fillable = ['token', 'device_id'];

    protected $hidden = ['token'];

    /** Kredensial yang berlaku, atau null bila belum pernah dipasang. */
    public static function aktif(): ?self
    {
        return static::query()->latest('id')->first();
    }

    /**
     * Petunjuk kunci untuk panel: empat karakter terakhir saja.
     *
     * Cukup bagi petugas memastikan kunci mana yang terpasang tanpa
     * mengembalikan rahasianya ke peramban.
     */
    public function petunjuk(): string
    {
        return '••••' . mb_substr($this->token, -4);
    }
}
