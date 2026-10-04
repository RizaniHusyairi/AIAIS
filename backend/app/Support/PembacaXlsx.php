<?php

namespace App\Support;

use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

/**
 * Pembaca .xlsx seminimal mungkin: nilai sel per lembar, tanpa gaya.
 *
 * Kenapa bukan PhpSpreadsheet: yang dibutuhkan hanya nilai tersimpan dari
 * satu-dua lembar berukuran ratusan baris. Berkas .xlsx adalah arsip ZIP
 * berisi XML, dan membacanya langsung memakai ekstensi `zip` + SimpleXML yang
 * sudah ada — tanpa dependensi berat yang memuat seluruh model gaya dan rumus
 * ke memori.
 *
 * Konsekuensinya: rumus TIDAK dihitung ulang. Yang dibaca adalah nilai hasil
 * hitung terakhir yang disimpan Excel di dalam berkas, dan itu memang yang
 * dilihat petugas saat membuka berkasnya.
 */
class PembacaXlsx
{
    /** Batas ukuran XML satu lembar setelah dibuka — penangkal bom ZIP. */
    private const BATAS_BAIT_LEMBAR = 50 * 1024 * 1024;

    private ZipArchive $zip;

    /** @var array<int, string> */
    private array $teksBersama = [];

    /** @var array<string, string> nama lembar → lintasan XML di dalam arsip */
    private array $lembar = [];

    public function __construct(string $lintasan)
    {
        $this->zip = new ZipArchive;

        if ($this->zip->open($lintasan) !== true) {
            throw new RuntimeException('Berkas bukan Excel .xlsx yang sah.');
        }

        $this->bacaDaftarLembar();
        $this->bacaTeksBersama();
    }

    public function __destruct()
    {
        @$this->zip->close();
    }

    /** @return array<int, string> */
    public function namaLembar(): array
    {
        return array_keys($this->lembar);
    }

    /**
     * Seluruh baris bernilai pada satu lembar.
     *
     * @return array<int, array<string, string>> nomor baris → (huruf kolom → nilai)
     */
    public function baris(string $nama): array
    {
        $lintasan = $this->lembar[$nama] ?? null;

        if ($lintasan === null) {
            throw new RuntimeException("Lembar \"{$nama}\" tidak ditemukan.");
        }

        $info = $this->zip->statName($lintasan);
        if ($info === false || $info['size'] > self::BATAS_BAIT_LEMBAR) {
            throw new RuntimeException('Lembar kerja terlalu besar untuk dibaca.');
        }

        $xml = $this->muatXml($lintasan);
        $hasil = [];

        foreach ($xml->sheetData->row ?? [] as $row) {
            $sel = [];

            foreach ($row->c as $c) {
                $nilai = $this->nilaiSel($c);
                if ($nilai === null || $nilai === '') {
                    continue;
                }
                $sel[preg_replace('/\d+/', '', (string) $c['r'])] = $nilai;
            }

            if ($sel !== []) {
                $hasil[(int) $row['r']] = $sel;
            }
        }

        return $hasil;
    }

    private function nilaiSel(SimpleXMLElement $c): ?string
    {
        $tipe = (string) $c['t'];

        if ($tipe === 'inlineStr') {
            return trim($this->teksRun($c->is));
        }

        if (! isset($c->v)) {
            return null;
        }

        $v = (string) $c->v;

        return match ($tipe) {
            's' => trim($this->teksBersama[(int) $v] ?? ''),
            'b' => $v === '1' ? 'TRUE' : 'FALSE',
            // Sel galat (#REF!, #N/A) diperlakukan kosong, bukan teks galat.
            'e' => null,
            default => trim($v),
        };
    }

    /** Teks sebuah <si>/<is>: bisa satu <t>, bisa beberapa <r><t> berformat. */
    private function teksRun(?SimpleXMLElement $node): string
    {
        if ($node === null) {
            return '';
        }

        $teks = isset($node->t) ? (string) $node->t : '';
        foreach ($node->r as $r) {
            $teks .= (string) $r->t;
        }

        return $teks;
    }

    private function bacaTeksBersama(): void
    {
        if ($this->zip->locateName('xl/sharedStrings.xml') === false) {
            return;
        }

        foreach ($this->muatXml('xl/sharedStrings.xml')->si as $si) {
            $this->teksBersama[] = $this->teksRun($si);
        }
    }

    private function bacaDaftarLembar(): void
    {
        $workbook = $this->muatXml('xl/workbook.xml');
        $rels = $this->muatXml('xl/_rels/workbook.xml.rels');

        $target = [];
        foreach ($rels->Relationship as $rel) {
            $target[(string) $rel['Id']] = ltrim((string) $rel['Target'], '/');
        }

        foreach ($workbook->sheets->sheet as $sheet) {
            // Dicari lewat URI ruang nama, bukan awalan `r:` — awalannya bebas
            // dipilih penulis berkas, URI-nya tidak.
            $rid = (string) $sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')->id;
            $t = $target[$rid] ?? null;
            if ($t === null) {
                continue;
            }
            // Target relatif terhadap xl/, kecuali yang sudah absolut.
            $this->lembar[(string) $sheet['name']] = str_starts_with($t, 'xl/') ? $t : 'xl/'.$t;
        }
    }

    private function muatXml(string $lintasan): SimpleXMLElement
    {
        $isi = $this->zip->getFromName($lintasan);

        if ($isi === false) {
            throw new RuntimeException('Struktur berkas Excel tidak lengkap.');
        }

        // LIBXML_NONET: entitas eksternal tidak pernah diambil dari jaringan.
        $xml = simplexml_load_string($isi, SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);

        if ($xml === false) {
            throw new RuntimeException('Isi berkas Excel rusak.');
        }

        return $xml;
    }
}
