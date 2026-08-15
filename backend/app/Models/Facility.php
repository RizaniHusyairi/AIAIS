<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Fasilitas bandara sebagaimana ditampilkan kepada pengunjung.
 *
 * Tabelnya milik portal v1 dan dipakai apa adanya — di sanalah 22 fasilitas
 * yang selama ini tayang di halaman publik tersimpan, dikelompokkan menjadi
 * Sisi Udara, Sisi Darat, dan Umum.
 *
 * `details` adalah larik butir keterangan warisan v1 ("Tersedia: 16 Counter",
 * "Proses check-in yang cepat"). Isinya juga diringkas ke `description` saat
 * migrasi, sehingga tampilan yang belum memanfaatkan bentuk lariknya tetap
 * memperoleh keterangan yang sama.
 */
class Facility extends Model
{
    use HasFactory, ResolvesFileUrl;

    protected $fillable = [
        'name',
        'category',
        'location_description',
        'icon',
        'description',
        'details',
        'image_path',
        'is_operational',
    ];

    protected $casts = [
        'is_operational' => 'boolean',
        'details' => 'array',
    ];

    /** Gambar fasilitas warisan v1 tinggal di luar direktori unggahan. */
    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->fileUrl($this->image_path);
    }
}
