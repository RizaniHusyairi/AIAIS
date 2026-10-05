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

    /**
     * Disk berkas warisan v1.
     *
     * v2 mengambil alih basis data v1 di tempat, dan v1 menyimpan berkas OJT
     * ke disk `public`-nya sendiri (`public/uploads/ojt_docs/...`) — di v2
     * itulah disk `legacy`. Tanpa disk ini, KTP, foto, dan sertifikat peserta
     * lama terbaca "tidak ditemukan" di server produksi, padahal berkasnya ada.
     */
    public const DISK_V1 = 'legacy';

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

        // Skala mengikuti v1 (`Staff_User\OjtStudentController::updateGrades`)
        // apa adanya: empat jenjang, tanpa E. Predikat ini tercetak di
        // sertifikat, dan peserta lama sudah menerima sertifikat dengan skala
        // tersebut — skala yang berbeda membuat dua angkatan tidak sebanding.
        return [
            'average_score' => $rata,
            'predicate' => match (true) {
                $rata >= 90 => 'Sangat Memuaskan',
                $rata >= 80 => 'Baik',
                $rata >= 70 => 'Cukup',
                default => 'Kurang',
            },
            'letter_grade' => match (true) {
                $rata >= 90 => 'A',
                $rata >= 80 => 'B',
                $rata >= 70 => 'C',
                default => 'D',
            },
        ];
    }

    /**
     * Disk yang benar-benar memegang berkas ini, atau null bila tidak ada.
     *
     * Dibedakan lewat keberadaan berkasnya, bukan awalan lintasan — alasan
     * yang sama dengan `ResolvesFileUrl`.
     */
    public static function diskUntuk(?string $lintasan): ?string
    {
        if (blank($lintasan)) {
            return null;
        }

        foreach ([self::DISK, self::DISK_V1] as $disk) {
            if (Storage::disk($disk)->exists($lintasan)) {
                return $disk;
            }
        }

        return null;
    }

    /** Hapus satu berkas, di disk mana pun ia tersimpan. */
    public static function hapusSatu(?string $lintasan): void
    {
        $disk = self::diskUntuk($lintasan);

        if ($disk !== null) {
            Storage::disk($disk)->delete($lintasan);
        }
    }

    public function hapusBerkas(): void
    {
        foreach (self::FILE_FIELDS as $kolom) {
            self::hapusSatu($this->attributes[$kolom] ?? null);
        }
    }
}
