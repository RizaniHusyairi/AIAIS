<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

/**
 * Pengajuan slot penerbangan charter.
 *
 * BUKAN varian dari `Submission`: yang diajukan di sini bukan berkas dan
 * uraian, melainkan sebuah RENCANA PENERBANGAN — registrasi pesawat, bandara
 * asal dan tujuan, serta jadwal berangkat dan tiba. Memaksakannya ke bentuk
 * pengajuan umum akan menyembunyikan justru bagian yang perlu diperiksa
 * petugas.
 *
 * Satu-satunya tabel pengajuan v1 yang memakai penghapusan lunak, dan itu
 * dipertahankan: slot yang sudah pernah diberikan adalah jejak operasional
 * yang tidak boleh hilang dari catatan.
 */
class Slot extends Model
{
    use SoftDeletes;

    public const STATUSES = ['Diajukan', 'Disetujui', 'Ditolak', 'Revisi Diperlukan'];

    public const STAFF_STATUSES = ['Disetujui', 'Ditolak', 'Revisi Diperlukan'];

    public const FLIGHT_TYPES = ['penumpang', 'kargo', 'lainnya'];

    public const DISK = 'local';

    protected $fillable = [
        'user_id', 'aircraft_registration', 'aircraft_type',
        'departure_schedule', 'arrival_schedule', 'origin_airport',
        'destination_airport', 'flight_type', 'flight_more', 'documents',
    ];

    protected $hidden = ['documents'];

    protected $appends = ['document_count'];

    protected function casts(): array
    {
        return [
            'documents' => 'array',
            'departure_schedule' => 'datetime',
            'arrival_schedule' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getDocumentCountAttribute(): int
    {
        return count($this->documents ?? []);
    }

    public function hapusBerkas(): void
    {
        foreach ($this->documents ?? [] as $lintasan) {
            if (Storage::disk(self::DISK)->exists($lintasan)) {
                Storage::disk(self::DISK)->delete($lintasan);
            }
        }
    }
}
