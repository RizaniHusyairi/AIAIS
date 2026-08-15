<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Informasi Berkala — dokumen yang wajib diumumkan secara rutin.
 *
 * Tabelnya milik portal v1 dan dipakai apa adanya. Kategorinya bebas teks,
 * bukan daftar tertutup: petugas menambah kelompok baru (Survey Kepuasan,
 * LHKPN, Rencana Kinerja Anggaran, ...) langsung dari panel admin, dan
 * mengunci nilainya di kode berarti mengembalikan kebebasan itu ke tangan
 * pengembang.
 *
 * `pejabat_name` hanya terisi pada dokumen LHKPN, yang memang diumumkan per
 * pejabat. `document_path` selalu tautan Google Drive, bukan berkas unggahan.
 */
class PeriodicDocument extends Model
{
    protected $fillable = ['category', 'title', 'document_path', 'published_date', 'pejabat_name'];

    protected $casts = [
        'published_date' => 'date',
    ];
}
