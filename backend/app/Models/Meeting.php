<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Rapat beserta daftar hadirnya.
 *
 * Polanya sama dengan Posko Nataru: satu tautan publik bertoken, penulis yang
 * berganti-ganti, dan penjaga berupa status buka/tutup. Yang membedakan hanya
 * isinya — di sini yang dikirim peserta adalah identitas dan tanda tangan.
 *
 * `public_token` TIDAK PERNAH ikut respons. Ia diambil lewat endpoint khusus
 * saat petugas hendak membagikannya, persis seperti token Posko Nataru: siapa
 * pun yang melihatnya di layar dapat mengisi daftar hadir.
 */
class Meeting extends Model
{
    protected $fillable = [
        'title', 'slug', 'date', 'start_time', 'location',
        'organizer', 'organizer_nip', 'user_id',
    ];

    protected $hidden = ['public_token'];

    protected function casts(): array
    {
        return ['date' => 'date', 'is_active' => 'boolean'];
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class)->orderBy('created_at');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /*
     * Jumlah peserta TIDAK dijadikan aksesor.
     *
     * Aksesor akan menjalankan satu kueri hitung untuk setiap baris pada daftar
     * rapat — N+1 yang tak terlihat sampai daftarnya panjang. Controller
     * memakai `withCount('attendances')`, dan Eloquent menyisipkan
     * `attendances_count` pada responsnya dengan satu kueri saja.
     */

    /** Token acak-aman; panjangnya sama dengan token Posko Nataru. */
    public static function tokenBaru(): string
    {
        return Str::random(48);
    }

    /**
     * Slug yang unik.
     *
     * Dipertahankan meski tautannya sudah memakai token — v1 masih membacanya
     * sampai cutover, dan kolomnya NOT NULL.
     */
    public static function slugBaru(string $judul): string
    {
        $dasar = Str::slug($judul) ?: 'rapat';
        $slug = $dasar;
        $n = 1;

        while (static::where('slug', $slug)->exists()) {
            $slug = $dasar.'-'.(++$n);
        }

        return $slug;
    }
}
