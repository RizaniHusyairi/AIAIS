<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Peserta OJT (praktik kerja lapangan) di bandara.
 *
 * BUKAN pengajuan layanan melainkan REKAM PESERTA. Perbedaannya menentukan
 * bentuknya: tidak ada keputusan setuju/tolak, melainkan perjalanan dari
 * mendaftar → berjalan → selesai, yang berujung pada nilai dan sertifikat.
 *
 * Data pribadinya jauh lebih dalam daripada modul pengajuan mana pun — nomor
 * identitas, tempat dan tanggal lahir, alamat, foto, dan pindaian kartu
 * identitas. Karena itu SELURUH berkasnya di cakram privat, dan lintasannya
 * tidak pernah ikut respons.
 */
class OjtStudent extends Model
{
    /** Tahapan yang dilalui peserta. */
    public const STATUSES = ['Mendaftar', 'Berjalan', 'Selesai', 'Batal'];

    public const DISK = 'local';

    /** Kolom berkas; dipakai bersama oleh unduhan dan penghapusan. */
    public const FILE_FIELDS = ['identity_card_path', 'photo_path', 'final_certificate_path'];

    protected $table = 'ojt_students';

    protected $fillable = [
        'user_id', 'name', 'id_number', 'birth_place', 'birth_date', 'address',
        'institution', 'major', 'duration', 'start_date', 'end_date',
        'supervisors', 'work_units', 'phone_number',
    ];

    protected $hidden = self::FILE_FIELDS;

    protected $appends = ['available_files', 'is_finalized'];

    /**
     * Sudah difinalisasi?
     *
     * Penandanya adalah keberadaan sertifikat bertanda tangan — bukan kolom
     * bendera tersendiri. Sertifikat yang sudah terbit ITULAH yang membuat
     * nilainya tidak boleh berubah lagi, jadi keduanya memang satu hal yang
     * sama dan tidak boleh bisa saling bertentangan.
     */
    public function getIsFinalizedAttribute(): bool
    {
        return filled($this->attributes['final_certificate_path'] ?? null);
    }

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'start_date' => 'date',
            'end_date' => 'date',
            'supervisors' => 'array',
            'work_units' => 'array',
            'grades' => 'array',
            'average_score' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Berkas mana saja yang sudah ada; lintasannya tetap tidak dibagikan. */
    public function getAvailableFilesAttribute(): array
    {
        return array_values(array_filter(
            self::FILE_FIELDS,
            fn ($kolom) => filled($this->attributes[$kolom] ?? null),
        ));
    }

    /**
     * Hitung ulang rata-rata, predikat, dan huruf dari daftar nilai.
     *
     * Dihitung SERVER, tidak pernah diterima dari pengirim — sama seperti load
     * factor pada Posko Nataru. Nilai akhir peserta OJT masuk ke sertifikat
     * resmi; menerima rata-rata kiriman berarti mempercayai perhitungan yang
     * tidak dapat diperiksa.
     *
     * @param  array<int, array{component?: string, score?: mixed}>  $nilai
     */
    public static function hitungNilai(array $nilai): array
    {
        $angka = array_values(array_filter(
            array_map(fn ($n) => is_numeric($n['score'] ?? null) ? (float) $n['score'] : null, $nilai),
            fn ($n) => $n !== null,
        ));

        if ($angka === []) {
            return ['average_score' => null, 'predicate' => null, 'letter_grade' => null];
        }

        $rata = round(array_sum($angka) / count($angka), 2);

        return [
            'average_score' => $rata,
            'predicate' => match (true) {
                $rata >= 90 => 'Sangat Baik',
                $rata >= 80 => 'Baik',
                $rata >= 70 => 'Cukup',
                $rata >= 60 => 'Kurang',
                default => 'Sangat Kurang',
            },
            'letter_grade' => match (true) {
                $rata >= 90 => 'A',
                $rata >= 80 => 'B',
                $rata >= 70 => 'C',
                $rata >= 60 => 'D',
                default => 'E',
            },
        ];
    }

    public function hapusBerkas(): void
    {
        foreach (self::FILE_FIELDS as $kolom) {
            $lintasan = $this->attributes[$kolom] ?? null;

            if ($lintasan && Storage::disk(self::DISK)->exists($lintasan)) {
                Storage::disk(self::DISK)->delete($lintasan);
            }
        }
    }
}
