<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pengajuan Extend Advance — permohonan beroperasi di luar jam layanan bandara.
 *
 * Alurnya BERBEDA dari pengajuan lain, dan perbedaannya bukan kosmetik:
 *
 *   1. Pemohon mengisi rencana penerbangan → status `Menunggu Dokumen
 *      Ditandatangani`.
 *   2. Sistem menerbitkan surat pernyataan tanggung jawab; Pilot In Command
 *      menandatanganinya.
 *   3. Pemohon mengunggah pernyataan bertanda tangan → status `Diajukan`.
 *   4. Petugas memutuskan.
 *
 * Langkah 2–3 ada karena yang ditandatangani adalah PENERIMAAN RISIKO: bandara
 * hanya melayani jam tertentu, dan penerbangan di luar itu menjadi tanggung
 * jawab maskapai. Melewati langkah itu berarti menyetujui penerbangan tanpa
 * ada yang memikul risikonya.
 *
 * `statement_notes` MENYALIN teks pernyataan yang berlaku pada saat pengajuan
 * dibuat, bukan merujuknya. Teks itu dapat berubah bila NOTAM-nya berubah, dan
 * yang mengikat adalah bunyi yang benar-benar ditandatangani PIC — bukan bunyi
 * terbaru. Perilaku ini ditiru dari v1 dan sengaja dipertahankan.
 *
 * Berkas bertanda tangan disimpan di cakram PRIVAT. v1 menyimpannya di cakram
 * publik, sehingga surat berisi nama dan tanda tangan PIC beserta pernyataan
 * tanggung jawab maskapai dapat dibuka siapa pun yang menebak lintasannya.
 */
class ExtendAdvance extends Model
{
    /** Status; nilainya ditiru apa adanya dari enum v1. */
    public const STATUSES = [
        'Menunggu Dokumen Ditandatangani', 'Diajukan', 'Disetujui', 'Ditolak', 'Revisi Diperlukan',
    ];

    public const STAFF_STATUSES = ['Disetujui', 'Ditolak', 'Revisi Diperlukan'];

    public const MENUNGGU_TANDA_TANGAN = 'Menunggu Dokumen Ditandatangani';

    public const DISK = 'local';

    protected $fillable = [
        'user_id', 'operator', 'aircraft_type', 'registration_and_flight_number',
        'flight_date', 'eobt', 'aobt', 'route', 'take_off_alternate',
        'purpose_of_flight', 'pic_name',
    ];

    /**
     * Lintasan berkas bertanda tangan tidak keluar dari API; keberadaannya
     * dilaporkan lewat `has_signed_document`, dan berkasnya diambil lewat
     * endpoint bertoken.
     */
    protected $hidden = ['signed_document_path'];

    protected $appends = ['has_signed_document'];

    protected function casts(): array
    {
        return ['flight_date' => 'date'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getHasSignedDocumentAttribute(): bool
    {
        return filled($this->attributes['signed_document_path'] ?? null);
    }
}
