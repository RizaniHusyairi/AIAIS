<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Satu peserta yang menandatangani daftar hadir.
 *
 * Berkas tanda tangan disimpan di cakram PRIVAT. v1 menaruhnya di cakram
 * publik, sehingga gambar tanda tangan berikut nama penandatangannya dapat
 * dibuka siapa pun yang menebak lintasannya — kelas cacat yang sama sudah
 * ditemukan pada dokumen bertanda tangan Extend Advance.
 *
 * Kolom `signature` menyimpan LINTASAN berkasnya, bukan gambarnya. Nama
 * kolomnya diwarisi v1 dan dipertahankan.
 */
class Attendance extends Model
{
    public const DISK = 'local';

    protected $fillable = ['meeting_id', 'name', 'gender', 'department', 'represents', 'phone'];

    /** Kode jenis kelamin yang diterima → labelnya pada cetakan. */
    public const GENDERS = ['L' => 'Laki-laki', 'P' => 'Perempuan'];

    /**
     * Lintasan tanda tangan tidak pernah keluar dari API. `phone_normalized`
     * hanya penanda pembanding untuk indeks unik — yang dibaca petugas tetap
     * `phone`, apa adanya seperti diketik peserta.
     */
    protected $hidden = ['signature', 'phone_normalized'];

    protected $appends = ['has_signature'];

    /** Jumlah angka yang masuk akal untuk nomor telepon (E.164 paling panjang 15). */
    public const NOMOR_MIN = 8;

    public const NOMOR_MAKS = 15;

    protected static function booted(): void
    {
        /*
         * Diisi saat baris dibuat, dari jalur mana pun ia dibuat — supaya
         * indeks unik `(meeting_id, phone_normalized)` menjaga setiap pintu
         * masuk, bukan hanya formulir publik.
         *
         * Hanya saat `creating`: baris lama yang sengaja dibiarkan NULL oleh
         * migrasinya (nomor ganda peninggalan) tidak boleh terisi diam-diam
         * ketika kelak disentuh, lalu ditolak indeksnya.
         */
        static::creating(function (Attendance $peserta) {
            $peserta->phone_normalized = self::normalkanNomor($peserta->phone);
        });
    }

    /**
     * Bentuk pembanding sebuah nomor HP.
     *
     * Hanya angkanya yang dipakai, lalu awalan negara `62` disamakan dengan
     * `0`: "0812-3456-7890", "081234567890", dan "+62 812 3456 7890" ditulis
     * orang yang sama. Nomor lokal Indonesia selalu diawali `0`, jadi tidak
     * ada nomor sah yang tertukar karena aturan ini.
     *
     * NULL bila tidak ada angka sama sekali. Migrasi
     * `add_phone_normalized_to_attendances` menyimpan salinan aturan ini.
     */
    public static function normalkanNomor(?string $nomor): ?string
    {
        $angka = preg_replace('/\D/', '', (string) $nomor);

        if ($angka === '') {
            return null;
        }

        if (str_starts_with($angka, '62')) {
            $angka = '0'.substr($angka, 2);
        }

        return substr($angka, 0, 20);
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function getHasSignatureAttribute(): bool
    {
        return filled($this->attributes['signature'] ?? null);
    }

    public function hapusBerkas(): void
    {
        $lintasan = $this->attributes['signature'] ?? null;

        if ($lintasan && Storage::disk(self::DISK)->exists($lintasan)) {
            Storage::disk(self::DISK)->delete($lintasan);
        }
    }
}
