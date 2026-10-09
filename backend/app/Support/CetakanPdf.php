<?php

namespace App\Support;

use Barryvdh\DomPDF\PDF;
use Dompdf\Canvas;
use Dompdf\FontMetrics;
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

    /**
     * Bubuhkan "Halaman X / Y" di pojok kanan kaki setiap halaman.
     *
     * WAJIB dipanggil sebelum `download()` pada setiap cetakan yang memakai
     * `pdf._layout`. Penomoran dulu memakai `counter(page) " / "
     * counter(pages)` di CSS, dan DomPDF tidak pernah mengisi `counter(pages)`
     * — setiap cetakan resmi tertulis "Halaman 1 / 0". Jumlah halaman baru
     * diketahui SESUDAH dokumen selesai ditata, jadi nomornya digambar pada
     * kanvas setelah `render()`, bukan ditulis di templat.
     *
     * `page_script` dengan closure, bukan `page_text` dengan `{PAGE_COUNT}`:
     * teksnya rata kanan, dan lebarnya baru dapat diukur setelah angkanya
     * diketahui — "9 / 9" lebih sempit daripada "10 / 12".
     *
     * Koordinatnya diturunkan dari `pdf._layout`: margin halaman 40px kiri-
     * kanan dan 70px bawah, kaki `bottom: -50px` setinggi 40px berpadding 6px.
     * Ubah keduanya bersamaan.
     */
    public static function bubuhkanNomorHalaman(PDF $pdf): PDF
    {
        $pdf->render();

        $pdf->getDomPDF()->getCanvas()->page_script(
            function (int $halaman, int $jumlah, Canvas $kanvas, FontMetrics $metrik) {
                $teks = "Halaman {$halaman} / {$jumlah}";
                $huruf = $metrik->getFont('DejaVu Sans');
                $ukuran = 8 * self::PX_KE_PT;
                $lebar = $metrik->getTextWidth($teks, $huruf, $ukuran);

                $x = $kanvas->get_width() - 40 * self::PX_KE_PT - $lebar;
                $y = $kanvas->get_height() - 59 * self::PX_KE_PT;

                // #64748b, sama dengan teks kaki di sebelah kirinya.
                $kanvas->text($x, $y, $teks, $huruf, $ukuran, [0.392, 0.455, 0.545]);
            }
        );

        return $pdf;
    }

    /** DomPDF menata pada 96 dpi; kanvasnya bersatuan poin (72 per inci). */
    private const PX_KE_PT = 0.75;

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
