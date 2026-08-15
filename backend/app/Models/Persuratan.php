<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Surat dinas beserta rantai verifikasinya.
 *
 * Modul internal pegawai yang paling berlapis di portal ini. Alurnya:
 *
 *   dibuat → verifikator ke-1 → ke-2 → ... → penandatangan akhir → Disetujui
 *
 * Setiap tahap dapat mengembalikan surat ke pembuatnya (`Revisi Diperlukan`)
 * atau menghentikannya (`Ditolak`). Surat yang direvisi MELANJUTKAN rantainya
 * dari verifikator yang belum menjawab — bukan mengulang dari awal, karena
 * verifikator yang sudah menyetujui tidak perlu menyetujui dua kali.
 *
 * Rantainya adalah daftar verifikator yang dipilih pembuat surat, tersimpan
 * berurutan di `surat_verifications.order`. Bukan hierarki jabatan — lihat
 * catatan pada `SuratVerification`.
 *
 * `assigned_to_user_id` adalah SATU-SATUNYA penunjuk giliran. Siapa pun yang
 * bukan pemegang giliran ditolak controller; v1 tidak memeriksanya sama sekali.
 */
class Persuratan extends Model
{
    /** Status surat; nilainya ditiru apa adanya dari enum v1. */
    public const STATUSES = [
        'Verifikasi Tambahan', 'Menunggu Persetujuan Atasan',
        'Disetujui', 'Ditolak', 'Revisi Diperlukan',
    ];

    /** Tahap ketika surat masih berjalan di rantai verifikator. */
    public const TAHAP_VERIFIKASI = 'Verifikasi Tambahan';

    /** Tahap ketika seluruh verifikator selesai dan menunggu tanda tangan. */
    public const TAHAP_ATASAN = 'Menunggu Persetujuan Atasan';

    /**
     * Inang tautan lampiran yang diizinkan.
     *
     * Dibatasi ke Google Drive/Docs, meniru kebijakan v1. Alasannya bukan
     * kerapian: surat dinas yang lampirannya menunjuk ke inang sembarangan
     * membuat penandatangan mengeklik tautan tak dikenal atas nama jabatannya.
     */
    public const ALLOWED_ATTACHMENT_HOSTS = ['drive.google.com', 'docs.google.com'];

    protected $table = 'persuratans';

    protected $fillable = [
        'user_id', 'letter_type', 'letter_date', 'recipient_address',
        'subject', 'final_approver_id', 'collaborators', 'attachments',
    ];

    protected function casts(): array
    {
        return [
            'letter_date' => 'date',
            'collaborators' => 'array',
            'attachments' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    public function finalApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'final_approver_id');
    }

    public function verifications(): HasMany
    {
        return $this->hasMany(SuratVerification::class)->orderBy('order');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(SuratRevision::class)->orderByDesc('created_at');
    }

    public function events(): HasMany
    {
        return $this->hasMany(SuratEvent::class)->orderBy('created_at');
    }

    /** Tahap verifikasi berikutnya yang belum dijawab, atau null bila habis. */
    public function verifikasiBerikutnya(): ?SuratVerification
    {
        return $this->verifications()->where('status', 'Menunggu')->orderBy('order')->first();
    }

    /** Tahap milik seorang verifikator yang masih menunggu jawabannya. */
    public function tahapMilik(int $userId): ?SuratVerification
    {
        return $this->verifications()
            ->where('user_id', $userId)
            ->where('status', 'Menunggu')
            ->orderBy('order')
            ->first();
    }

    /** Surat yang sudah selesai tidak boleh berpindah tahap lagi. */
    public function sudahSelesai(): bool
    {
        return in_array($this->status, ['Disetujui', 'Ditolak'], true);
    }

    /** Catat satu langkah ke jejak audit. */
    public function catat(string $jenis, ?int $aktor, array $meta = []): void
    {
        $this->events()->create([
            'actor_user_id' => $aktor,
            'event_type' => $jenis,
            'meta' => $meta,
        ]);
    }
}
