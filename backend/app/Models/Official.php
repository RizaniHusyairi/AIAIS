<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;

/**
 * Pejabat struktural Kantor UPBU Kelas I A.P.T. Pranoto.
 *
 * Model ini hanya memuat keterangan yang melekat pada JABATAN. Tidak ada
 * pendidikan, NIP, pangkat, tanggal lahir, maupun nomor identitas — lihat
 * catatan PDP pada migrasi `create_officials_table`, dan jangan menambahkannya
 * kembali lewat `$fillable` tanpa membaca catatan itu lebih dulu.
 */
class Official extends Model
{
    use ResolvesFileUrl;

    protected $fillable = [
        'slug',
        'name',
        'title',
        'short_title',
        'photo',
        'position_history',
        'awards',
        'sort_order',
        'is_published',
    ];

    protected $casts = [
        'position_history' => 'array',
        'awards' => 'array',
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];

    /** Ikut terkirim pada JSON — frontend hanya perlu URL siap pakai. */
    protected $appends = ['photo_url', 'has_photo'];

    public function getPhotoUrlAttribute(): ?string
    {
        $aset = $this->asetStatisFrontend($this->photo);

        return $aset ?? $this->fileUrl($this->photo);
    }

    public function getHasPhotoAttribute(): bool
    {
        return $this->asetStatisFrontend($this->photo) !== null
            || $this->fileExists($this->photo);
    }

    /**
     * Foto yang dilayani Next.js, bukan Laravel.
     *
     * Kelima foto pejabat yang tayang sekarang ikut dibundel bersama frontend
     * di `frontend/public/pejabat/*.png`. Nilainya berawalan "/" dan sudah
     * merupakan lintasan siap pakai dari akar situs, jadi diteruskan apa
     * adanya — memeriksanya lewat `Storage` selalu gagal karena berkasnya
     * memang tidak pernah ada di disk milik Laravel.
     *
     * Pemeriksaan ini didahulukan supaya seeder tidak perlu menyalin aset
     * frontend ke `storage/`, dan supaya foto lama tidak mendadak hilang dari
     * halaman publik begitu modul ini dipasang.
     */
    private function asetStatisFrontend(?string $photo): ?string
    {
        if (empty($photo)) {
            return null;
        }

        return str_starts_with($photo, '/') ? $photo : null;
    }
}
