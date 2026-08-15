<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Nilai bersama seluruh cetakan PDF.
 *
 * Dikumpulkan di satu tempat karena kekeliruannya sudah terjadi sekali:
 * kaki cetakan menulis "WITA" sementara `APP_TIMEZONE` adalah UTC, sehingga
 * jam pada dokumen resmi meleset delapan jam. Kesalahan seperti itu tidak
 * terlihat di layar mana pun — ia hanya muncul pada kertas yang sudah beredar.
 */
class CetakanPdf
{
    /** Zona waktu bandara. `APP_TIMEZONE` tetap UTC agar penyimpanan seragam. */
    public const ZONA = 'Asia/Makassar';

    public const LABEL_ZONA = 'WITA';

    /** Waktu cetak, benar-benar dalam zona yang tertulis di kakinya. */
    public static function dicetakPada(): string
    {
        return Carbon::now(self::ZONA)->translatedFormat('d F Y H:i').' '.self::LABEL_ZONA;
    }

    /**
     * Cap waktu tersimpan, ditampilkan dalam zona bandara.
     *
     * WAJIB dipakai untuk setiap kolom `created_at`/`updated_at` yang tercetak.
     * Tanpa ini kolom waktunya keluar sebagai UTC sementara kaki halaman
     * menulis WITA — dan itu sudah terjadi: satu cetakan logbook menampilkan
     * perpindahan status pukul 03:23 pada dokumen yang kakinya bertanggal
     * 11:22, seolah statusnya berubah delapan jam sebelum dicetak.
     */
    public static function waktu(?Carbon $waktu): string
    {
        return $waktu?->copy()->setTimezone(self::ZONA)->translatedFormat('d M Y H:i') ?? '—';
    }

    /** Tanggal tanpa jam. Kolom bertipe DATE tidak perlu digeser zonanya. */
    public static function tanggal(?Carbon $tanggal, string $format = 'd M Y'): string
    {
        return $tanggal?->translatedFormat($format) ?? '—';
    }
}
