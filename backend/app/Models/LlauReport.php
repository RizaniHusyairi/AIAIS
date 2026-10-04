<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu berkas rekapitulasi LLAU bulanan yang sudah diterapkan.
 *
 * `period` selalu tanggal 1 bulan laporannya dan unik — satu bulan, satu
 * laporan. Berkas aslinya di cakram privat (`local`), tidak pernah publik:
 * kakinya memuat nama dan NIP koordinator.
 */
class LlauReport extends Model
{
    public const DISK = 'local';

    public const DIR = 'llau';

    protected $fillable = [
        'period', 'file_path', 'original_name', 'flight_count',
        'excel_totals', 'warnings', 'mismatch_ignored', 'uploaded_by',
    ];

    protected $casts = [
        'period' => 'date',
        'flight_count' => 'integer',
        'excel_totals' => 'array',
        'warnings' => 'array',
        'mismatch_ignored' => 'boolean',
    ];

    public function flights(): HasMany
    {
        return $this->hasMany(LlauFlight::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
