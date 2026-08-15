<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Pengajuan kunjungan lapangan (field trip) ke area bandara.
 *
 * Tabel warisan v1, nol baris — modul ini yang pertama kali mengisinya.
 *
 * `documents` berisi larik lintasan berkas syarat. Bentuknya JSON di v1 dan
 * dipertahankan: jumlah berkasnya memang bervariasi, dan memecahnya ke tabel
 * anak tidak memberi apa pun selama tak ada yang dikueri per berkas.
 *
 * Berkas syarat disimpan di cakram PRIVAT. Isinya surat pengantar sekolah atau
 * instansi lengkap dengan kop, nama, dan tanda tangan pejabat — dilayani lewat
 * endpoint bertoken, tidak pernah lewat URL publik yang dapat ditebak.
 */
class FieldTrip extends Model
{
    /** Status pengajuan; sekaligus aturan validasi. Nilainya ditiru dari v1. */
    public const STATUSES = ['Diajukan', 'Disetujui', 'Ditolak', 'Revisi Diperlukan'];

    /** Status yang boleh disetel petugas — 'Diajukan' hanya lahir dari pemohon. */
    public const STAFF_STATUSES = ['Disetujui', 'Ditolak', 'Revisi Diperlukan'];

    /**
     * Cakram penyimpanan berkas syarat.
     *
     * `local` berakar di `storage/app/private` dan tidak punya URL publik —
     * cakram yang sama dipakai berkas KTP di InformationRequestController.
     */
    public const DISK = 'local';

    protected $table = 'fieldtrips';

    protected $fillable = [
        'user_id', 'fieldtrip_name', 'description', 'fieldtrip_type', 'documents',
    ];

    protected $casts = ['documents' => 'array'];

    /**
     * Lintasan berkas tidak pernah keluar dari API.
     *
     * Yang dikirim hanya `document_count`; berkasnya sendiri diambil per
     * indeks lewat endpoint bertoken. Tanpa `$hidden` ini, larik lintasannya
     * ikut terserialisasi pada tiap respons — dan meski cakramnya privat,
     * membagikan lintasan persis adalah separuh jalan menuju berkasnya.
     */
    protected $hidden = ['documents'];

    protected $appends = ['document_count'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Berapa berkas syarat yang terlampir.
     *
     * Lintasan berkasnya sendiri TIDAK ikut respons — nama berkas kerap memuat
     * nama sekolah atau instansi pemohon, dan lintasan yang bocor mempersempit
     * jarak menuju berkasnya. Yang dikirim cuma jumlahnya; berkasnya diambil
     * per indeks lewat endpoint bertoken.
     */
    public function getDocumentCountAttribute(): int
    {
        return count($this->documents ?? []);
    }

    /** Hapus seluruh berkas syarat dari cakram privat. */
    public function hapusBerkas(): void
    {
        foreach ($this->documents ?? [] as $lintasan) {
            if (Storage::disk(self::DISK)->exists($lintasan)) {
                Storage::disk(self::DISK)->delete($lintasan);
            }
        }
    }
}
