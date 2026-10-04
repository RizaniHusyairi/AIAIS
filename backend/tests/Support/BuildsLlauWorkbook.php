<?php

namespace Tests\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use ZipArchive;

/**
 * Berkas LLAU tiruan untuk tes, disusun berbentuk sama dengan templat Ditjen
 * Hubud: kepala TAHUN/BULAN, judul kolom dua baris, data, baris JUMLAH, lalu
 * penanda tangan.
 *
 * Berkas asli di `docs/LLAU REKAP` sengaja tidak dipakai sebagai fixture —
 * kakinya memuat nama dan NIP koordinator, dan fixture ikut repositori.
 */
trait BuildsLlauWorkbook
{
    protected function createLlauSchema(): void
    {
        Schema::dropIfExists('llau_flights');
        Schema::dropIfExists('llau_reports');
        Schema::dropIfExists('air_traffic_logs');

        // `air_traffic_logs` tidak dibuat migrasi mana pun di repo ini.
        Schema::create('air_traffic_logs', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            foreach (['aircraft', 'passenger', 'baggage', 'cargo'] as $k) {
                $table->unsignedInteger("{$k}_arrival")->default(0);
                $table->unsignedInteger("{$k}_departure")->default(0);
            }
            $table->timestamps();
        });

        (require base_path('database/migrations/2026_10_04_000100_create_llau_tables.php'))->up();
    }

    /**
     * Satu baris penerbangan: [tgl, jamJadwal, jamAktual, penyebab, asal, tujuan,
     * operator, icao, kegiatan, noPenerbangan, tipe, kursi, arah, dewasa, anak,
     * bayi, transitDewasa, bagasi, kargo].
     */
    protected function penerbangan(array $ganti = []): array
    {
        return array_merge([
            'tgl' => '02-09-2026', 'jadwal' => '10:00:00', 'aktual' => '10:05:00', 'sebab' => '-',
            'asal' => 'AAP', 'tujuan' => 'CGK', 'operator' => 'PT. Batik Air Indonesia', 'icao' => 'BTK',
            'kegiatan' => 'BERJADWAL', 'no' => 'ID6677', 'tipe' => 'A320', 'kursi' => 156, 'arah' => 'D',
            'dewasa' => 100, 'anak' => 2, 'bayi' => 1, 'transit' => 0, 'bagasi' => 500, 'kargo' => 50,
        ], $ganti);
    }

    /**
     * Tulis berkas .xlsx; kembalikan lintasannya.
     *
     * @param  array<int, array<string, mixed>>  $baris
     * @param  array<string, int>|null  $jumlah  ganti nilai baris JUMLAH (kolom → nilai)
     */
    protected function buatLlau(array $baris, string $bulan = 'SEPTEMBER', ?array $jumlah = null, bool $templatRusak = false): string
    {
        $sel = [];
        $sel[6] = ['A' => 'TAHUN', 'C' => 2026, 'G' => 'BANDAR UDARA'];
        $sel[7] = ['A' => 'BULAN', 'C' => $bulan];
        $sel[10] = [
            'A' => 'No', 'B' => 'TANGGAL PENERBANGAN', 'D' => 'WAKTU PENERBANGAN', 'G' => $templatRusak ? 'ASAL' : 'RUTE PENERBANGAN',
            'I' => 'OPERATOR PENERBANGAN', 'K' => 'Kegiatan Penerbangan', 'R' => 'Pergerakan Penerbangan',
            'S' => 'Data Penumpang', 'V' => 'Data Penumpang Transit', 'Y' => 'Bagasi (Kg)', 'Z' => 'Kargo (Kg)', 'AA' => 'Pos (Kg)',
        ];
        $sel[11] = ['B' => 'Terjadwal (LT)', 'C' => 'Aktual (LT)', 'S' => 'Dewasa', 'T' => 'Anak', 'U' => 'Bayi'];

        $r = 12;
        $total = array_fill_keys(['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA'], 0);
        foreach ($baris as $i => $b) {
            $sel[$r] = [
                'A' => $i + 1, 'B' => $b['tgl'], 'C' => $b['tgl'], 'D' => $b['jadwal'], 'E' => $b['aktual'],
                'F' => $b['sebab'], 'G' => $b['asal'], 'H' => $b['tujuan'], 'I' => $b['operator'], 'J' => $b['icao'],
                'K' => $b['kegiatan'], 'L' => 'DOMESTIK', 'N' => $b['no'], 'O' => $b['reg'] ?? 'PK-XXX', 'P' => $b['tipe'],
                'Q' => $b['kursi'], 'R' => $b['arah'], 'S' => $b['dewasa'], 'T' => $b['anak'], 'U' => $b['bayi'],
                'V' => $b['transit'], 'W' => 0, 'X' => 0, 'Y' => $b['bagasi'], 'Z' => $b['kargo'], 'AA' => 0,
            ];
            foreach ($total as $k => $_) {
                $total[$k] += (int) $sel[$r][$k];
            }
            $r++;
        }

        $sel[$r + 1] = ['A' => 'JUMLAH'] + array_merge($total, $jumlah ?? []);
        $sel[$r + 3] = ['S' => 'Koord. Pengevaluasi dan Pelaporan'];
        $sel[$r + 6] = ['S' => 'NAMA PENANDA TANGAN'];
        $sel[$r + 7] = ['S' => 'NIP. 19000101 200001 1 001'];

        $daftar = [
            3 => ['B' => 'ID', 'C' => 'Nama Operator', 'D' => 'Nama Brand', 'E' => 'IATA Code', 'F' => "ICAO\nCode"],
            4 => ['B' => 1, 'C' => 'PT. Batik Air Indonesia', 'D' => 'Batik Air', 'E' => 'ID', 'F' => 'BTK'],
            5 => ['B' => 2, 'C' => 'PT. Citilink Indonesia', 'D' => 'Citilink', 'E' => 'QG', 'F' => 'CTV'],
        ];

        $lintasan = tempnam(sys_get_temp_dir(), 'llau').'.xlsx';
        $zip = new ZipArchive;
        $zip->open($lintasan, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="SHEET" sheetId="1" r:id="rId1"/><sheet name="Daftar Data Airlines" sheetId="2" r:id="rId2"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="worksheet" Target="worksheets/sheet2.xml"/></Relationships>');
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->xmlLembar($sel));
        $zip->addFromString('xl/worksheets/sheet2.xml', $this->xmlLembar($daftar));
        $zip->close();

        return $lintasan;
    }

    private function xmlLembar(array $sel): string
    {
        $xml = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
        ksort($sel);
        foreach ($sel as $r => $kolom) {
            $xml .= "<row r=\"{$r}\">";
            foreach ($kolom as $c => $v) {
                $xml .= is_int($v)
                    ? "<c r=\"{$c}{$r}\"><v>{$v}</v></c>"
                    : "<c r=\"{$c}{$r}\" t=\"inlineStr\"><is><t>".htmlspecialchars((string) $v, ENT_XML1).'</t></is></c>';
            }
            $xml .= '</row>';
        }

        return $xml.'</sheetData></worksheet>';
    }
}
