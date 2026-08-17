<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Laporan kehilangan barang dari pengunjung bandara.
 *
 * Dikirim tanpa akun: pengunjung yang baru saja kehilangan tas tidak akan
 * mendaftar lebih dulu, dan menuntutnya menyaring habis wisatawan serta
 * penumpang transit. Sebagai gantinya pelapor menerima nomor tiket dan
 * memantau statusnya lewat nomor itu — pola yang sama dengan `Complaint` dan
 * `ChatThread`.
 *
 * Baris ini memuat nama, nomor ponsel, dan surel orang. Satu-satunya jalan
 * keluarnya ke publik adalah `publicView()` di bawah, dan itu disengaja.
 */
class LostReport extends Model
{
    use HasFactory, ResolvesFileUrl;

    /**
     * Kategori barang.
     *
     * Dicerminkan di `frontend/src/lib/laporHilang.ts` — bila daftar ini
     * berubah, ubah juga di sana. `FoundItem::CATEGORIES` menunjuk ke sini
     * supaya pencocokan tidak pernah membandingkan dua daftar yang menyimpang.
     */
    public const CATEGORIES = [
        'Dokumen & Identitas',
        'Tas & Koper',
        'Elektronik',
        'Dompet & Kartu',
        'Perhiasan & Jam',
        'Pakaian',
        'Kunci',
        'Lainnya',
    ];

    /**
     * Area terminal tempat barang diperkirakan hilang.
     *
     * Nama gate mengikuti penamaan terminal — A1, A2, A3, B1 — bukan angka
     * mentah yang dikirim FIDS. Pengunjung membaca papan, bukan basis data.
     */
    public const AREAS = [
        'Area Parkir & Drop-off',
        'Lobi Keberangkatan',
        'Area Check-in',
        'Pemeriksaan Keamanan (SCP)',
        'Ruang Tunggu',
        'Gate A1',
        'Gate A2',
        'Gate A3',
        'Gate B1',
        'Di Dalam Pesawat',
        'Area Pengambilan Bagasi',
        'Lobi Kedatangan',
        'Musala',
        'Toilet',
        'Area Komersial & Kantin',
        'Tidak Ingat / Lainnya',
    ];

    /**
     * Perjalanan sebuah laporan.
     *
     *   submitted — baru masuk, belum disentuh petugas
     *   searching — petugas sedang mencarikan
     *   matched   — sudah dicocokkan dengan sebuah barang temuan
     *   returned  — barangnya sudah diserahkan kepada pelapor
     *   not_found — pencarian dihentikan tanpa hasil
     */
    public const STATUSES = ['submitted', 'searching', 'matched', 'returned', 'not_found'];

    /** Status yang dianggap selesai; hanya ini yang boleh dimusnahkan berkala. */
    public const CLOSED_STATUSES = ['returned', 'not_found'];

    protected $fillable = [
        'ticket_number',
        'reporter_name',
        'reporter_phone',
        'reporter_email',
        'category',
        'item_description',
        'lost_area',
        'lost_at',
        'flight_number',
        'photo',
        'status',
        'found_item_id',
        'admin_note',
        'responded_at',
    ];

    protected $casts = [
        'lost_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->fileUrl($this->photo);
    }

    /** Barang temuan yang dicocokkan petugas, bila ada. */
    public function foundItem()
    {
        return $this->belongsTo(FoundItem::class);
    }

    /**
     * Nomor tiket baru.
     *
     * Delapan karakter acak, bukan empat seperti `Complaint`. Alasannya isi
     * yang dilindungi: pengaduan membocorkan judul dan status, laporan
     * kehilangan membocorkan ciri barang berharga beserta status penemuannya.
     * `Str::upper(Str::random(8))` memberi ruang tebakan yang tidak sepadan
     * dengan hasilnya, dan endpoint pelacaknya juga diberi throttle.
     */
    public static function buatNomorTiket(): string
    {
        do {
            $nomor = 'HLG-' . date('Ymd') . '-' . Str::upper(Str::random(8));
        } while (static::where('ticket_number', $nomor)->exists());

        return $nomor;
    }

    /**
     * Bentuk yang boleh dilihat pemegang nomor tiket.
     *
     * SATU-SATUNYA jalan keluar model ini ke publik. Yang sengaja TIDAK ada di
     * sini:
     *
     *   - nama, ponsel, dan surel pelapor — data pribadi, dan pemegang tiket
     *     seharusnya sudah tahu miliknya sendiri;
     *   - apa pun tentang barang temuan yang tercocokkan, termasuk tempat
     *     penyimpanannya. Menampilkannya mengubah nomor tiket menjadi kunci
     *     pengambilan barang. Yang perlu disampaikan ditulis petugas sendiri
     *     di `admin_note`, dengan pertimbangannya sendiri.
     */
    public function publicView(): array
    {
        return [
            'ticket_number' => $this->ticket_number,
            'category' => $this->category,
            'item_description' => $this->item_description,
            'lost_area' => $this->lost_area,
            'lost_at' => $this->lost_at,
            'flight_number' => $this->flight_number,
            'status' => $this->status,
            'submitted_at' => $this->created_at,
            'admin_note' => $this->admin_note,
            'responded_at' => $this->responded_at,
            'photo_url' => $this->photo_url,
        ];
    }
}
