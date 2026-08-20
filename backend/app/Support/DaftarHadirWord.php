<?php

namespace App\Support;

use App\Models\Meeting;
use PhpOffice\PhpWord\Element\Section;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\SimpleType\TblWidth;
use PhpOffice\PhpWord\Style\Language;

/**
 * Daftar hadir rapat sebagai dokumen Word (.docx).
 *
 * KENAPA ADA, PADAHAL SUDAH ADA PDF. Keduanya menjawab kebutuhan yang berbeda
 * dan tidak saling menggantikan:
 *
 *  - **PDF** adalah cetakan final. Tata letaknya terkunci, dan itu justru
 *    sifat yang diinginkan pada dokumen yang ditandatangani.
 *  - **Word** adalah bahan mentah. Petugas kerap harus menempelkan daftar
 *    hadir ke dalam notulen, menambahkan peserta yang hadir tetapi tidak
 *    sempat memindai QR, membetulkan ejaan nama, atau menyisipkan kop surat
 *    dinas versi terbarunya. Selama itu tidak mungkin, berkasnya diketik ulang
 *    dari nol — dan salinan ketikan ulang itulah yang beredar, bukan datanya.
 *
 * TANDA TANGAN IKUT DISEMATKAN sebagai gambar di dalam selnya, bukan
 * dilampirkan terpisah. Daftar hadir tanpa goresan tanda tangan hanyalah
 * daftar nama, dan dokumen yang harus ditempeli gambar satu per satu setelah
 * diunduh tidak menghemat pekerjaan siapa pun.
 *
 * GAMBARNYA DIKIRIM SEBAGAI BITA MENTAH, bukan lintasan berkas. Berkas tanda
 * tangan ada di cakram PRIVAT; membuka lintasannya untuk pustaka pihak ketiga
 * berarti menyerahkan jalan baca ke direktori itu. PHPWord mengenali muatan
 * biner sebagai `SOURCE_STRING` dan menyalinnya lewat GD — lihat
 * `Element\Image::setSourceType()`.
 */
class DaftarHadirWord
{
    /* Warna dan ukuran, disamakan dengan cetakan PDF (`views/pdf/`). */
    private const BIRU_TUA = '0B1E5B';

    private const GARIS = 'CBD5E1';

    private const KEPALA_TABEL = 'EFF6FF';

    private const ABU = '64748B';

    /** Lebar kolom tanda tangan, dalam twip (1 cm ≈ 567 twip). */
    private const LEBAR_TTD = 2000;

    /**
     * Rakit dokumennya.
     *
     * `$peserta` sudah berbentuk siap-cetak dari controller — bentuk yang sama
     * dengan yang diberikan ke templat PDF, supaya kedua cetakan mustahil
     * berselisih isi. Bedanya satu: di sini `signature` berisi BITA PNG mentah,
     * bukan data URI, karena itulah yang dikenali PHPWord.
     */
    public static function rakit(Meeting $rapat, iterable $peserta): PhpWord
    {
        $word = new PhpWord;
        $word->getSettings()->setThemeFontLang(new Language(Language::EN_US));
        $word->setDefaultFontName('Arial');
        $word->setDefaultFontSize(10);

        $section = $word->addSection([
            'marginTop' => 1000,
            'marginBottom' => 1000,
            'marginLeft' => 1000,
            'marginRight' => 1000,
        ]);

        self::kop($section);
        self::judul($section, $rapat);
        self::keterangan($word, $section, $rapat);
        self::daftar($word, $section, $peserta);
        self::tandaTangan($section);
        self::kaki($section);

        return $word;
    }

    /* ---------------------------------------------------------------- */

    /** Kop instansi, sama bunyinya dengan `views/pdf/_layout.blade.php`. */
    private static function kop(Section $section): void
    {
        $section->addText(
            'BANDAR UDARA APT PRANOTO SAMARINDA',
            ['bold' => true, 'size' => 13, 'color' => self::BIRU_TUA],
            ['spaceAfter' => 0]
        );
        $section->addText(
            'Jalan Poros Samarinda – Bontang KM. 22, Sungai Siring, Samarinda Utara, Kalimantan Timur',
            ['size' => 8, 'color' => self::ABU],
            ['spaceAfter' => 120]
        );

        /*
         * Garis tebal pemisah kop.
         *
         * PHPWord tidak punya elemen "garis"; sebuah paragraf kosong bergaris
         * bawah tebal adalah cara yang bertahan saat dokumennya disunting
         * petugas. Ditulis lewat `addText('')`, BUKAN `addTextBreak(0, null, …)`
         * — gaya fon `null` di sana dipakai sebagai indeks larik oleh
         * `PhpWord\Style`, dan PHP 8.3 memperingatkannya sebagai perilaku usang.
         */
        $section->addText('', ['size' => 2], [
            'borderBottomSize' => 12,
            'borderBottomColor' => self::BIRU_TUA,
            'spaceAfter' => 240,
        ]);
    }

    private static function judul(Section $section, Meeting $rapat): void
    {
        $section->addText(
            'DAFTAR HADIR RAPAT',
            ['bold' => true, 'size' => 15, 'color' => self::BIRU_TUA],
            ['alignment' => Jc::CENTER, 'spaceAfter' => 40]
        );
        $section->addText(
            $rapat->title,
            ['size' => 11, 'color' => '475569'],
            ['alignment' => Jc::CENTER, 'spaceAfter' => 240]
        );
    }

    /** Tabel keterangan rapat: hari/tanggal, waktu, tempat, penyelenggara. */
    private static function keterangan(PhpWord $word, Section $section, Meeting $rapat): void
    {
        $word->addTableStyle('keterangan', [
            'borderSize' => 6,
            'borderColor' => self::GARIS,
            'cellMargin' => 80,
            'width' => 100 * 50,
            'unit' => TblWidth::PERCENT,
        ]);

        $tabel = $section->addTable('keterangan');
        $label = ['bold' => true, 'size' => 10];
        $isi = ['size' => 10];
        $selLabel = ['bgColor' => self::KEPALA_TABEL, 'valign' => 'center'];

        $tabel->addRow();
        $tabel->addCell(2200, $selLabel)->addText('Hari / Tanggal', $label);
        $tabel->addCell(4000)->addText(CetakanPdf::tanggal($rapat->date, 'l, d F Y'), $isi);
        $tabel->addCell(1600, $selLabel)->addText('Waktu', $label);
        $tabel->addCell(2200)->addText(
            $rapat->start_time ? substr($rapat->start_time, 0, 5).' WITA' : '—',
            $isi
        );

        $tabel->addRow();
        $tabel->addCell(2200, $selLabel)->addText('Tempat', $label);
        $tabel->addCell(4000)->addText($rapat->location, $isi);
        $tabel->addCell(1600, $selLabel)->addText('Penyelenggara', $label);
        $sel = $tabel->addCell(2200);
        $sel->addText($rapat->organizer, $isi);

        if ($rapat->organizer_nip) {
            $sel->addText('NIP '.$rapat->organizer_nip, ['size' => 8, 'color' => self::ABU]);
        }

        $section->addTextBreak(1);
    }

    /** Tabel peserta beserta gambar tanda tangannya. */
    private static function daftar(PhpWord $word, Section $section, iterable $peserta): void
    {
        $daftar = is_array($peserta) ? $peserta : iterator_to_array($peserta);

        if ($daftar === []) {
            $section->addText(
                'Belum ada peserta yang mengisi daftar hadir.',
                ['italic' => true, 'color' => self::ABU],
                ['alignment' => Jc::CENTER, 'spaceAfter' => 240]
            );

            return;
        }

        $word->addTableStyle('peserta', [
            'borderSize' => 6,
            'borderColor' => self::GARIS,
            'cellMargin' => 80,
            'width' => 100 * 50,
            'unit' => TblWidth::PERCENT,
        ]);

        $tabel = $section->addTable('peserta');
        $kepala = ['bold' => true, 'size' => 9, 'color' => self::BIRU_TUA];
        $selKepala = ['bgColor' => self::KEPALA_TABEL, 'valign' => 'center'];
        $isi = ['size' => 9];
        $tengah = ['alignment' => Jc::CENTER];

        $tabel->addRow(400, ['tblHeader' => true]);
        $tabel->addCell(600, $selKepala)->addText('NO', $kepala, $tengah);
        $tabel->addCell(2800, $selKepala)->addText('NAMA', $kepala);
        $tabel->addCell(2600, $selKepala)->addText('UNIT KERJA / INSTANSI', $kepala);
        $tabel->addCell(1600, $selKepala)->addText('TELEPON', $kepala);
        $tabel->addCell(1600, $selKepala)->addText('WAKTU HADIR', $kepala);
        $tabel->addCell(self::LEBAR_TTD, $selKepala)->addText('TANDA TANGAN', $kepala, $tengah);

        foreach ($daftar as $i => $p) {
            $tabel->addRow(700);
            $tabel->addCell(600, ['valign' => 'center'])->addText((string) ($i + 1), $isi, $tengah);
            $tabel->addCell(2800, ['valign' => 'center'])->addText($p['name'], $isi);
            $tabel->addCell(2600, ['valign' => 'center'])->addText($p['department'], $isi);
            $tabel->addCell(1600, ['valign' => 'center'])->addText($p['phone'] ?: '—', $isi);
            $tabel->addCell(1600, ['valign' => 'center'])->addText($p['waktu'], $isi);

            $sel = $tabel->addCell(self::LEBAR_TTD, ['valign' => 'center']);

            if (! empty($p['signature'])) {
                /*
                 * Tinggi dipatok, lebar dibiarkan mengikuti rasionya. Kanvas
                 * tanda tangan di ponsel lebarnya bergantung layar, jadi
                 * memaksa keduanya akan menggepengkan sebagian goresan.
                 */
                $sel->addImage($p['signature'], [
                    'height' => 34,
                    'alignment' => Jc::CENTER,
                ]);
            } else {
                // Barisnya tetap tercetak. Peserta tanpa tanda tangan hadir,
                // hanya tidak tertandatangani — dan petugas harus melihatnya.
                $sel->addText('belum bertanda tangan', ['size' => 7, 'color' => '94A3B8'], $tengah);
            }
        }

        $section->addTextBreak(1);
        $section->addText(
            'Jumlah peserta yang tercatat hadir: '.count($daftar).' orang.',
            ['size' => 9, 'color' => self::ABU]
        );
    }

    /**
     * Blok "Mengetahui".
     *
     * Isinya dari `config('pejabat.penanda_tangan')`, sumber yang sama dengan
     * cetakan PDF — pejabatnya berganti di satu tempat saja. Tanpa garis tepi,
     * dengan alasan yang sama seperti pada `views/pdf/_ttd.blade.php`.
     */
    private static function tandaTangan(Section $section): void
    {
        $ttd = config('pejabat.penanda_tangan');

        $tabel = $section->addTable(['cellMargin' => 80, 'width' => 100 * 50, 'unit' => TblWidth::PERCENT]);
        $tabel->addRow();
        $tabel->addCell(5500);

        $sel = $tabel->addCell(4500);
        $tengah = ['alignment' => Jc::CENTER, 'spaceAfter' => 0];

        $sel->addText($ttd['label'], ['size' => 10], $tengah);
        $sel->addText($ttd['jabatan'], ['size' => 10], ['alignment' => Jc::CENTER, 'spaceAfter' => 60]);

        // Ruang tanda tangan basah. Tiga baris kosong, bukan satu sel bertinggi
        // tetap: petugas yang menyunting dokumennya bisa menambah atau
        // mengurangi barisnya sesuai ukuran cap dinas yang dipakai.
        $sel->addTextBreak(3);

        $sel->addText($ttd['nama'], ['size' => 10, 'bold' => true], $tengah);

        if ($ttd['nip']) {
            $sel->addText('NIP. '.$ttd['nip'], ['size' => 10], $tengah);
        }
    }

    /** Provenans cetakan, sama maksudnya dengan kaki halaman PDF. */
    private static function kaki(Section $section): void
    {
        $kaki = $section->addFooter();
        $kaki->addPreserveText(
            'Halaman {PAGE} / {NUMPAGES} · Portal Bandara APT Pranoto · Dicetak '
                .CetakanPdf::dicetakPada(),
            ['size' => 7, 'color' => self::ABU],
            ['alignment' => Jc::CENTER]
        );
    }
}
