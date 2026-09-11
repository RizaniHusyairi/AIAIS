<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Satu acara lomba karaoke beserta juri dan pesertanya.
 *
 * Polanya sama dengan Rapat dan Posko Nataru: tautan publik bertoken, penulis
 * yang berganti-ganti, dan penjaga berupa status buka/tutup. Bedanya, di sini
 * tokennya dipegang per JURI, bukan per acara — lihat `KaraokeJudge`.
 */
class KaraokeEvent extends Model
{
    /** Jumlah juri yang dibuatkan otomatis saat acara baru dibuat. */
    public const JURI_BAWAAN = 3;

    /**
     * `locked` menutup penilaian: papan juri masih dapat dibuka dan dibaca,
     * tetapi setiap tulisan ditolak. Dipakai begitu pemenang diumumkan, supaya
     * nilai tidak berubah sesudahnya.
     */
    public const STATUSES = ['open', 'locked'];

    protected $fillable = ['title', 'held_on', 'location', 'status'];

    protected function casts(): array
    {
        return ['held_on' => 'date'];
    }

    public function judges(): HasMany
    {
        return $this->hasMany(KaraokeJudge::class)->orderBy('position');
    }

    public function contestants(): HasMany
    {
        return $this->hasMany(KaraokeContestant::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /** Benar bila penilaian masih dibuka. */
    public function terbuka(): bool
    {
        return $this->status === 'open';
    }

    /**
     * Token acak-aman; panjangnya sama dengan token Rapat dan Posko Nataru.
     *
     * 48 aksara `Str::random` bukan angka yang dipilih asal: token ini satu-
     * satunya penjaga papan nilai juri, dan tertempel di URL yang dibagikan
     * lewat pesan singkat.
     */
    public static function tokenBaru(): string
    {
        return Str::random(48);
    }
}
