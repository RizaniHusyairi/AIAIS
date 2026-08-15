<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Satu periode Posko Nataru — pemantauan Natal dan Tahun Baru.
 *
 * `public_token` adalah rahasia yang dibagikan kepada petugas lapangan supaya
 * mereka dapat mengirim data penerbangan TANPA akun. Itu keputusan sadar
 * portal v1 dan dipertahankan: petugas berganti tiap giliran jaga, dan
 * membuatkan akun untuk tiap orang hanya akan membuat data tidak terkirim.
 *
 * Konsekuensinya token itu setara kata sandi. Karena itu ia dibangkitkan
 * acak-aman, tidak pernah ikut pada respons publik, dan endpoint yang
 * memakainya dibatasi laju.
 *
 * `compare_event_id` menunjuk periode tahun sebelumnya untuk pembandingan.
 * `peak_date` adalah hari puncak arus, ditetapkan petugas.
 */
class NataruEvent extends Model
{
    protected $fillable = [
        'name', 'start_date', 'end_date', 'peak_date',
        'public_token', 'display_token', 'is_active', 'compare_event_id', 'description',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'peak_date' => 'date',
        'is_active' => 'boolean',
    ];

    /**
     * Token TIDAK pernah ikut terserialisasi.
     *
     * Ia setara kata sandi bagi petugas lapangan; membocorkannya lewat respons
     * daftar mana pun berarti siapa saja dapat menyuntikkan data penerbangan.
     * Panel admin mengambilnya lewat endpoint tersendiri saat tautannya hendak
     * dibagikan.
     *
     * KEDUA token disembunyikan. `display_token` hanya membuka layar TV dan
     * tidak dapat menulis, tetapi ia tetap rahasia — token layar yang bocor
     * membuka data operasional posko kepada siapa pun.
     */
    protected $hidden = ['public_token', 'display_token'];

    public function flights(): HasMany
    {
        return $this->hasMany(NataruFlight::class);
    }

    public function compareTo(): BelongsTo
    {
        return $this->belongsTo(self::class, 'compare_event_id');
    }

    /** Token acak-aman; dipakai saat periode baru dibuat atau tokennya diputar. */
    public static function tokenBaru(): string
    {
        return Str::random(48);
    }
}
