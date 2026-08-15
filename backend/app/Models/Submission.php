<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Induk seluruh pengajuan layanan bandara.
 *
 * Enam tabel pengajuan v1 — `tenants`, `rentals`, `licenses`, `ads`,
 * `lelangs`, `work_permits` — berbentuk nyaris sama: satu judul, satu uraian,
 * satu jenis, larik berkas syarat, lalu tiga kolom keputusan petugas
 * (`submission_status`, `staff_notes`, `reply_document_path`). Yang berbeda
 * hanya NAMA kolom judul dan jenisnya, dan beberapa kolom tambahan.
 *
 * Karena itu perilakunya ditaruh di sini sekali, bukan disalin enam kali.
 * Yang disalin akan berbeda diam-diam: satu modul lupa `$hidden`, satu lagi
 * lupa menghapus berkas saat dihapus — persis jenis kekeliruan yang sudah
 * terjadi sekali pada `FieldTrip` sebelum ujinya diperkuat.
 *
 * `fieldtrips` sengaja TIDAK diturunkan dari kelas ini. Ia sudah selesai,
 * teruji, dan menjadi acuan bentuk; memindahkannya sekarang berarti mengubah
 * kode yang sudah terbukti demi kerapian semata.
 */
abstract class Submission extends Model
{
    /** Status pengajuan; ditiru apa adanya dari v1. */
    public const STATUSES = ['Diajukan', 'Disetujui', 'Ditolak', 'Revisi Diperlukan'];

    /** Status yang boleh disetel petugas — 'Diajukan' hanya lahir dari pemohon. */
    public const STAFF_STATUSES = ['Disetujui', 'Ditolak', 'Revisi Diperlukan'];

    /** Cakram privat; berkas syarat memuat dokumen resmi berkop instansi. */
    public const DISK = 'local';

    /**
     * Lintasan berkas tidak pernah keluar dari API.
     *
     * Yang dikirim hanya `document_count`; berkasnya diambil per indeks lewat
     * endpoint bertoken. Ditaruh di induk supaya tidak ada turunan yang bisa
     * lupa memasangnya.
     */
    protected $hidden = ['documents'];

    protected $appends = ['document_count'];

    /**
     * `documents` di v1 bertipe `longtext` pada sebagian tabel dan `json` pada
     * sebagian lain, tetapi isinya sama-sama JSON. Cast `array` menangani
     * keduanya, jadi tak ada migrasi penyeragaman yang perlu dijalankan.
     */
    protected function casts(): array
    {
        return ['documents' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getDocumentCountAttribute(): int
    {
        return count($this->documents ?? []);
    }

    /** Direktori penyimpanan berkas syarat jenis ini. */
    abstract public function folderBerkas(): string;

    public function hapusBerkas(): void
    {
        foreach ($this->documents ?? [] as $lintasan) {
            if (Storage::disk(static::DISK)->exists($lintasan)) {
                Storage::disk(static::DISK)->delete($lintasan);
            }
        }
    }
}
