<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Barang temuan di area bandara — catatan internal petugas.
 *
 * TIDAK ADA JALUR PUBLIK KE MODEL INI. Seluruh rutenya berada di balik
 * `auth:sanctum`. Menerbitkan katalog barang temuan mengundang klaim palsu:
 * siapa pun yang membaca "iPhone 15 Pro hitam, ditemukan 14 Agustus di gate A2"
 * sudah memegang seluruh keterangan yang dibutuhkan untuk mengaku pemiliknya.
 * Verifikasi kepemilikan hanya bisa dilakukan berhadapan langsung di loket.
 */
class FoundItem extends Model
{
    use HasFactory, ResolvesFileUrl;

    /**
     * Kategori barang. Sengaja dibuat sama persis dengan
     * `LostReport::CATEGORIES` — pencocokan menyaring berdasarkan kategori,
     * dan dua daftar yang menyimpang akan membuat kandidatnya tidak pernah
     * bertemu.
     */
    public const CATEGORIES = LostReport::CATEGORIES;

    /**
     * Keadaan barang.
     *
     *   stored   — tersimpan, belum ada yang mengklaim
     *   matched  — sudah dicocokkan dengan sebuah laporan kehilangan
     *   returned — sudah diserahkan kepada pemiliknya
     *   disposed — dimusnahkan atau diserahkan ke pihak lain setelah lewat
     *              batas penyimpanan
     */
    public const STATUSES = ['stored', 'matched', 'returned', 'disposed'];

    /** Jenis identitas yang diterima saat serah terima. */
    public const ID_TYPES = ['KTP', 'SIM', 'Paspor', 'KITAS', 'Kartu Pelajar', 'Lainnya'];

    protected $fillable = [
        'code',
        'category',
        'description',
        'found_area',
        'found_at',
        'finder_name',
        'storage_location',
        'photo',
        'status',
        'returned_at',
        'receiver_name',
        'receiver_id_type',
        'receiver_id_number',
        'handover_officer',
        'handover_note',
    ];

    /**
     * Nomor identitas pengambil tidak pernah ikut terserialisasi.
     *
     * Seluruh rute model ini memang sudah bertoken, jadi ini lapis kedua.
     * Tetapi lapis kedua itulah yang dulu menyelamatkan `FieldTrip`, yang
     * lintasan dokumennya terbukti bocor sampai sebuah tes membuktikannya.
     * Nomornya tetap tersimpan dan tetap tercetak pada berita acara — yang
     * ditutup hanyalah jalur JSON.
     */
    protected $hidden = ['receiver_id_number'];

    protected $casts = [
        'found_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->fileUrl($this->photo);
    }

    /** Laporan kehilangan yang tertaut, bila sudah dicocokkan. */
    public function lostReport()
    {
        return $this->hasOne(LostReport::class);
    }

    /**
     * Kandidat pencocokan untuk sebuah laporan kehilangan.
     *
     * Penyaringnya sengaja longgar — kategori sama, dan ditemukan dalam
     * jendela waktu di sekitar perkiraan kehilangan. Barang kerap baru
     * diserahkan ke pos beberapa hari sesudah tertinggal, sehingga jendelanya
     * dibuat lebih lebar ke depan daripada ke belakang.
     *
     * Yang memutuskan cocok atau tidak tetap petugas: ciri barang ditulis
     * bebas oleh dua orang yang berbeda, dan salah cocok berarti mengabari
     * seseorang bahwa barangnya ketemu padahal bukan.
     */
    public function scopeKandidat(Builder $q, string $category, Carbon $lostAt): Builder
    {
        return $q->where('status', 'stored')
            ->where('category', $category)
            ->whereBetween('found_at', [
                $lostAt->copy()->subDay(),
                $lostAt->copy()->addDays(7),
            ])
            ->orderBy('found_at');
    }
}
