<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Nilai seorang juri atas seorang peserta.
 *
 * Satu baris per pasangan (juri, peserta) — dijamin indeks unik pada migrasi,
 * karena papan juri menyimpan otomatis tiap kali slidernya digeser.
 */
class KaraokeScore extends Model
{
    /**
     * Kriteria penilaian berikut bobotnya, dalam persen. Jumlahnya harus 100.
     *
     * INI SUMBER KEBENARANNYA. Cerminannya di sisi frontend ada di
     * `frontend/src/lib/karaokeKriteria.ts`; bila keduanya menyimpang, angka
     * yang tampil di layar juri bukan angka yang tersimpan di sini.
     */
    public const CRITERIA = [
        'teknik_vokal' => 35,
        'ketepatan_irama' => 20,
        'penjiwaan' => 25,
        'penampilan_panggung' => 15,
        'kesan_keseluruhan' => 5,
    ];

    /** Rentang nilai tiap kriteria. Nol bukan nilai yang sah — lihat migrasinya. */
    public const NILAI_MIN = 1;
    public const NILAI_MAKS = 100;

    /** Nama kolom kriteria saja, tanpa bobotnya. */
    public const KRITERIA_KOLOM = [
        'teknik_vokal',
        'ketepatan_irama',
        'penjiwaan',
        'penampilan_panggung',
        'kesan_keseluruhan',
    ];

    protected $fillable = [
        'karaoke_judge_id',
        'karaoke_contestant_id',
        ...self::KRITERIA_KOLOM,
    ];

    /*
     * Kedua aksesor di bawah aman di-`$appends`: keduanya hanya membaca kolom
     * baris ini sendiri dan tidak menjalankan kueri apa pun. Berbeda dari
     * jumlah anak pada `Meeting`, yang sengaja TIDAK dijadikan aksesor.
     */
    protected $appends = ['weighted_total', 'is_complete'];

    protected function casts(): array
    {
        return array_fill_keys(self::KRITERIA_KOLOM, 'integer');
    }

    public function judge(): BelongsTo
    {
        return $this->belongsTo(KaraokeJudge::class, 'karaoke_judge_id');
    }

    public function contestant(): BelongsTo
    {
        return $this->belongsTo(KaraokeContestant::class, 'karaoke_contestant_id');
    }

    /**
     * Subtotal berbobot juri ini: Σ(nilai × bobot) ÷ 100.
     *
     * Kriteria yang belum dinilai dihitung nol, bukan dilewati — itu membuat
     * peserta yang baru dinilai separuh tampak lebih rendah daripada yang
     * sudah utuh, dan itu memang yang diinginkan: peringkat sementara tidak
     * boleh menjanjikan lebih daripada nilai yang sudah benar-benar masuk.
     * Penanda `is_complete` yang memberi tahu juri mana yang belum selesai.
     */
    public function getWeightedTotalAttribute(): float
    {
        $total = 0.0;

        foreach (self::CRITERIA as $kolom => $bobot) {
            $total += ((int) ($this->{$kolom} ?? 0)) * $bobot / 100;
        }

        return round($total, 2);
    }

    /** Benar bila kelima kriteria sudah terisi. */
    public function getIsCompleteAttribute(): bool
    {
        foreach (self::KRITERIA_KOLOM as $kolom) {
            if ($this->{$kolom} === null) {
                return false;
            }
        }

        return true;
    }
}
