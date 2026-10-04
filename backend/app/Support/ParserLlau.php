<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Pembaca berkas rekapitulasi LLAU bulanan (format Ditjen Hubud).
 *
 * Bentuk berkas yang diandalkan, diamati pada enam berkas April–September
 * 2026 — dan sengaja dicocokkan lewat JUDUL KOLOM, bukan nomor baris:
 *
 *  - Lembar `SHEET`. Di atas tabel ada TAHUN dan BULAN (kolom A label,
 *    kolom C nilai).
 *  - Baris judul kolom berawal "No" di kolom A, dengan sub-judul satu baris di
 *    bawahnya; data mulai baris sesudahnya. Kolom A–AA tetap: tanggal
 *    terjadwal/aktual, jam terjadwal/aktual, penyebab selisih, asal, tujuan,
 *    operator, ICAO, kegiatan, tipe rute, keterangan, nomor penerbangan,
 *    registrasi, tipe pesawat, kursi, A/D, penumpang (3), transit (3),
 *    bagasi, kargo, pos.
 *  - Data berakhir di baris berlabel JUMLAH/TOTAL — labelnya berganti tiap
 *    bulan ("TOTAL JUMLAH", "JUMLAH REKAPITULASI DATA LLAU"), jadi yang dicari
 *    kata kuncinya. Nilai di baris itu dipakai sebagai pembanding.
 *
 * Segala sesuatu SETELAH baris jumlah — tempat, tanggal, nama, dan NIP
 * penanda tangan — tidak dibaca sama sekali. NIP adalah data pribadi.
 *
 * Masalah dipisah dua tingkat: GALAT membatalkan seluruh unggahan (tanggal
 * tak terbaca, arah selain A/D, tanggal di luar bulan laporan) karena angka
 * agregatnya pasti salah; PERINGATAN hanya dilaporkan (kategori kosong, kode
 * ICAO bukan kode) karena angka totalnya tetap benar.
 */
class ParserLlau
{
    public const LEMBAR_UTAMA = 'SHEET';

    public const LEMBAR_MASKAPAI = 'Daftar Data Airlines';

    private const BULAN = [
        'JANUARI' => 1, 'JANUARY' => 1, 'FEBRUARI' => 2, 'FEBRUARY' => 2,
        'MARET' => 3, 'MARCH' => 3, 'APRIL' => 4, 'MEI' => 5, 'MAY' => 5,
        'JUNI' => 6, 'JUNE' => 6, 'JULI' => 7, 'JULY' => 7,
        'AGUSTUS' => 8, 'AUGUST' => 8, 'SEPTEMBER' => 9,
        'OKTOBER' => 10, 'OCTOBER' => 10, 'NOVEMBER' => 11, 'NOPEMBER' => 11,
        'DESEMBER' => 12, 'DECEMBER' => 12,
    ];

    /**
     * Kolom angka yang dijumlahkan Excel di baris JUMLAH, beserta medan
     * tujuannya dan label untuk pesan selisih.
     */
    public const KOLOM_ANGKA = [
        'S' => ['pax_adult', 'Penumpang dewasa'],
        'T' => ['pax_child', 'Penumpang anak'],
        'U' => ['pax_infant', 'Penumpang bayi'],
        'V' => ['transit_adult', 'Transit dewasa'],
        'W' => ['transit_child', 'Transit anak'],
        'X' => ['transit_infant', 'Transit bayi'],
        'Y' => ['baggage_kg', 'Bagasi (kg)'],
        'Z' => ['cargo_kg', 'Kargo (kg)'],
        'AA' => ['mail_kg', 'Pos (kg)'],
    ];

    /** Judul kolom yang wajib ada — penanda bahwa ini memang berkas LLAU. */
    private const JUDUL_WAJIB = [
        'B' => 'TANGGAL', 'G' => 'RUTE', 'I' => 'OPERATOR', 'R' => 'PERGERAKAN',
        'S' => 'PENUMPANG', 'Y' => 'BAGASI', 'Z' => 'KARGO',
    ];

    /** @var array<string, array<int, int>> jenis masalah → nomor baris */
    private array $galat = [];

    /** @var array<string, array<int, int>> */
    private array $peringatan = [];

    /** @var array<int, string> galat tingkat berkas (bukan per baris) */
    private array $galatBerkas = [];

    /** @var array<int, string> */
    private array $peringatanBerkas = [];

    /**
     * @return array{
     *   period: ?string,
     *   rows: array<int, array<string, mixed>>,
     *   errors: array<int, string>,
     *   warnings: array<int, string>,
     *   excel_totals: ?array<string, int>,
     *   computed_totals: array<string, int>,
     *   mismatches: array<int, array{column: string, label: string, excel: int, computed: int}>,
     * }
     */
    public static function baca(string $lintasan): array
    {
        return (new self)->jalankan($lintasan);
    }

    private function jalankan(string $lintasan): array
    {
        $xlsx = new PembacaXlsx($lintasan);

        $namaUtama = $this->cariLembar($xlsx->namaLembar(), self::LEMBAR_UTAMA);
        if ($namaUtama === null) {
            throw new RuntimeException('Lembar "'.self::LEMBAR_UTAMA.'" tidak ada. Pastikan berkas yang diunggah adalah rekapitulasi LLAU.');
        }

        $merek = [];
        $namaMaskapai = $this->cariLembar($xlsx->namaLembar(), self::LEMBAR_MASKAPAI);
        if ($namaMaskapai !== null) {
            $merek = $this->bacaMerek($xlsx->baris($namaMaskapai));
        }

        $baris = $xlsx->baris($namaUtama);
        [$barisJudul, $tahun, $bulan] = $this->bacaKepala($baris);

        $rows = [];
        $kaki = null;

        foreach ($baris as $nomor => $sel) {
            if ($nomor <= $barisJudul + 1) {
                continue;
            }

            $a = strtoupper($sel['A'] ?? '');

            // Baris jumlah menutup tabel. Apa pun di bawahnya — termasuk nama
            // dan NIP penanda tangan — tidak dibaca.
            if (str_contains($a, 'JUMLAH') || str_contains($a, 'TOTAL')) {
                $kaki = $sel;
                break;
            }

            // Baris data dikenali dari tanggal dan arah, bukan dari nomor urut:
            // nomor urut kadang lompat atau kosong, datanya tetap sah.
            if (! isset($sel['B']) && ! isset($sel['R'])) {
                continue;
            }

            $hasil = $this->bacaBaris($nomor, $sel, $merek);
            if ($hasil !== null) {
                $rows[] = $hasil;
            }
        }

        $periode = $this->tetapkanPeriode($tahun, $bulan, $rows);

        if ($periode !== null) {
            foreach ($rows as $r) {
                if (substr($r['flight_date'], 0, 7) !== $periode) {
                    $this->catat($this->galat, 'Tanggal penerbangan di luar bulan laporan', $r['row_number']);
                }
            }
        }

        if ($rows === []) {
            $this->galatBerkas[] = 'Tidak ada satu pun baris penerbangan yang terbaca.';
        }

        $hitung = [];
        foreach (self::KOLOM_ANGKA as $kolom => [$medan]) {
            $hitung[$kolom] = array_sum(array_column($rows, $medan));
        }

        [$totalExcel, $selisih] = $this->bandingkan($kaki, $hitung);

        return [
            'period' => $periode,
            'rows' => $rows,
            'errors' => [...$this->galatBerkas, ...$this->ringkas($this->galat)],
            'warnings' => [...$this->peringatanBerkas, ...$this->ringkas($this->peringatan)],
            'excel_totals' => $totalExcel,
            'computed_totals' => $hitung,
            'mismatches' => $selisih,
        ];
    }

    /** @param array<int, string> $daftar */
    private function cariLembar(array $daftar, string $nama): ?string
    {
        foreach ($daftar as $n) {
            if (strcasecmp(trim($n), $nama) === 0) {
                return $n;
            }
        }

        return null;
    }

    /**
     * Temukan baris judul, TAHUN, dan BULAN.
     *
     * @return array{0: int, 1: ?int, 2: ?int}
     */
    private function bacaKepala(array $baris): array
    {
        $tahun = $bulan = null;

        foreach ($baris as $nomor => $sel) {
            $a = strtoupper($sel['A'] ?? '');

            if ($a === 'TAHUN' && isset($sel['C']) && preg_match('/^(\d{4})/', $sel['C'], $m)) {
                $tahun = (int) $m[1];
            }

            if ($a === 'BULAN' && isset($sel['C'])) {
                $bulan = $this->angkaBulan($sel['C']);
            }

            if ($a === 'NO') {
                foreach (self::JUDUL_WAJIB as $kolom => $kata) {
                    if (! str_contains(strtoupper($sel[$kolom] ?? ''), $kata)) {
                        throw new RuntimeException(
                            "Susunan kolom tidak dikenali: kolom {$kolom} seharusnya berjudul \"{$kata}…\". "
                            .'Gunakan templat LLAU yang belum diubah susunan kolomnya.'
                        );
                    }
                }

                return [$nomor, $tahun, $bulan];
            }
        }

        throw new RuntimeException('Baris judul kolom (berawal "No") tidak ditemukan. Pastikan berkas yang diunggah adalah rekapitulasi LLAU.');
    }

    private function angkaBulan(string $nilai): ?int
    {
        $v = strtoupper(trim($nilai));

        if (isset(self::BULAN[$v])) {
            return self::BULAN[$v];
        }

        // Sel bulan yang diketik sebagai tanggal tersimpan sebagai nomor seri.
        if (is_numeric($v) && (float) $v > 59) {
            return (int) $this->dariSeri((float) $v)->format('n');
        }

        return null;
    }

    /**
     * Periode laporan: dari kepala berkas, dicocokkan dengan tanggal datanya.
     */
    private function tetapkanPeriode(?int $tahun, ?int $bulan, array $rows): ?string
    {
        if ($tahun !== null && $bulan !== null) {
            return sprintf('%04d-%02d', $tahun, $bulan);
        }

        // Kepala tidak lengkap: pakai bulan yang paling banyak muncul di data,
        // dan katakan terus terang bahwa itu tebakan dari data.
        if ($rows === []) {
            $this->galatBerkas[] = 'TAHUN dan BULAN di kepala berkas tidak terbaca.';

            return null;
        }

        $hitung = array_count_values(array_map(fn ($r) => substr($r['flight_date'], 0, 7), $rows));
        arsort($hitung);
        $periode = (string) array_key_first($hitung);
        $this->peringatanBerkas[] = "TAHUN/BULAN di kepala berkas tidak terbaca; periode {$periode} diambil dari tanggal penerbangan.";

        return $periode;
    }

    /**
     * Peta kode ICAO dan nama operator → nama merek, dari lembar daftar maskapai.
     *
     * @return array<string, string>
     */
    private function bacaMerek(array $baris): array
    {
        $kolom = null;
        $peta = [];

        foreach ($baris as $sel) {
            if ($kolom === null) {
                $cari = fn (string $kata) => array_key_first(array_filter($sel, fn ($v) => str_contains(strtoupper($v), $kata)));
                $k = ['nama' => $cari('NAMA OPERATOR'), 'merek' => $cari('BRAND'), 'icao' => $cari('ICAO')];
                if (! in_array(null, $k, true)) {
                    $kolom = $k;
                }

                continue;
            }

            $merek = trim($sel[$kolom['merek']] ?? '');
            if ($merek === '') {
                continue;
            }

            $icao = strtoupper(trim($sel[$kolom['icao']] ?? ''));
            if (preg_match('/^[A-Z]{3}$/', $icao)) {
                $peta['icao:'.$icao] = $merek;
            }
            if (isset($sel[$kolom['nama']])) {
                $peta['nama:'.$this->kunciNama($sel[$kolom['nama']])] = $merek;
            }
        }

        return $peta;
    }

    private function kunciNama(string $nama): string
    {
        return preg_replace('/[^A-Z0-9]/', '', strtoupper($nama));
    }

    /** @return array<string, mixed>|null */
    private function bacaBaris(int $nomor, array $sel, array $merek): ?array
    {
        $tglJadwal = $this->tanggal($sel['B'] ?? null);
        if ($tglJadwal === null) {
            $this->catat($this->galat, 'Tanggal penerbangan terjadwal kosong atau tidak terbaca', $nomor);

            return null;
        }
        $tglAktual = $this->tanggal($sel['C'] ?? null) ?? $tglJadwal;

        $arah = strtoupper(trim($sel['R'] ?? ''));
        if (! in_array($arah, ['A', 'D'], true)) {
            $this->catat($this->galat, 'Kolom pergerakan bukan A atau D', $nomor);

            return null;
        }

        $jamJadwal = $this->menit($sel['D'] ?? null);
        $jamAktual = $this->menit($sel['E'] ?? null);
        $jadwal = $jamJadwal !== null ? $tglJadwal->addMinutes($jamJadwal) : null;
        $aktual = $jamAktual !== null ? $tglAktual->addMinutes($jamAktual) : null;

        if ($jadwal === null || $aktual === null) {
            $this->catat($this->peringatan, 'Jam terjadwal/aktual kosong (tidak dihitung dalam ketepatan waktu)', $nomor);
        }

        $kategori = $this->teks($sel['K'] ?? null);
        if ($kategori === null) {
            $this->catat($this->peringatan, 'Kegiatan penerbangan kosong', $nomor);
        }

        $operator = $this->teks($sel['I'] ?? null) ?? '';
        $icao = strtoupper(trim($sel['J'] ?? ''));
        // Penerbangan militer, polisi, dan pribadi sah tanpa kode ICAO; kolomnya
        // berisi "-" atau registrasi. Tidak diperingatkan — peringatan yang
        // muncul setiap bulan hanya mengajari petugas mengabaikan peringatan.
        if (! preg_match('/^[A-Z]{3}$/', $icao)) {
            $icao = null;
        }

        $baris = [
            'row_number' => $nomor,
            'flight_date' => $tglJadwal->toDateString(),
            'scheduled_at' => $jadwal?->format('Y-m-d H:i:s'),
            'actual_at' => $aktual?->format('Y-m-d H:i:s'),
            'delay_minutes' => ($jadwal && $aktual) ? (int) round(($aktual->getTimestamp() - $jadwal->getTimestamp()) / 60) : null,
            'delay_category' => $this->teks($sel['F'] ?? null),
            'origin' => strtoupper($this->teks($sel['G'] ?? null) ?? '-'),
            'destination' => strtoupper($this->teks($sel['H'] ?? null) ?? '-'),
            'operator_name' => mb_substr($operator, 0, 150),
            'operator_icao' => $icao,
            'operator_brand' => $this->merek($operator, $icao, $merek),
            'flight_category' => $kategori,
            'route_type' => $this->teks($sel['L'] ?? null),
            'remarks' => ($m = $this->teks($sel['M'] ?? null)) !== null ? mb_substr($m, 0, 255) : null,
            'flight_number' => $this->teks($sel['N'] ?? null),
            'registration' => $this->teks($sel['O'] ?? null),
            // Huruf asli dipertahankan: laporan bulanan menyalinnya apa adanya.
            'aircraft_type' => $this->teks($sel['P'] ?? null),
            'seat_capacity' => is_numeric($sel['Q'] ?? null) ? (int) $sel['Q'] : null,
            'direction' => $arah,
        ];

        foreach (self::KOLOM_ANGKA as $kolom => [$medan, $label]) {
            $baris[$medan] = $this->bilangan($sel[$kolom] ?? null, $nomor, $label);
        }

        return $baris;
    }

    private function merek(string $operator, ?string $icao, array $peta): string
    {
        if ($icao !== null && isset($peta['icao:'.$icao])) {
            return $peta['icao:'.$icao];
        }

        if (isset($peta['nama:'.$this->kunciNama($operator)])) {
            return $peta['nama:'.$this->kunciNama($operator)];
        }

        // Tanpa padanan di daftar: buang bentuk badan usaha supaya "PT. X, Tbk"
        // dan "PT X TBK" tampil sebagai satu nama.
        $bersih = preg_replace(['/^\s*PT\.?\s+/i', '/,?\s*TBK\.?\s*$/i'], '', $operator);

        return trim($bersih) !== '' ? trim($bersih) : ($icao ?? 'Tidak diketahui');
    }

    /** Teks sel; "-" dan kosong dianggap tidak ada. */
    private function teks(?string $v): ?string
    {
        $v = trim((string) $v);

        if ($v === '' || $v === '-') {
            return null;
        }

        return preg_replace('/\s+/', ' ', $v);
    }

    private function bilangan(?string $v, int $nomor, string $label): int
    {
        $v = trim((string) $v);

        if ($v === '' || $v === '-') {
            return 0;
        }

        $v = str_replace(',', '.', $v);

        if (! is_numeric($v) || (float) $v < 0) {
            $this->catat($this->galat, "{$label} bukan angka atau bernilai negatif", $nomor);

            return 0;
        }

        return (int) round((float) $v);
    }

    /** Tanggal dari teks DD-MM-YYYY (bentuk templat) atau nomor seri Excel. */
    private function tanggal(?string $v): ?CarbonImmutable
    {
        $v = trim((string) $v);

        if (preg_match('#^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$#', $v, $m)) {
            if (! checkdate((int) $m[2], (int) $m[1], (int) $m[3])) {
                return null;
            }

            return CarbonImmutable::create((int) $m[3], (int) $m[2], (int) $m[1], 0, 0, 0, 'UTC');
        }

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $v, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return CarbonImmutable::create((int) $m[1], (int) $m[2], (int) $m[3], 0, 0, 0, 'UTC');
        }

        if (is_numeric($v) && (float) $v > 59) {
            return $this->dariSeri((float) $v)->startOfDay();
        }

        return null;
    }

    /** Menit sejak tengah malam dari "HH:MM[:SS]" atau pecahan hari Excel. */
    private function menit(?string $v): ?int
    {
        $v = trim((string) $v);

        if (preg_match('/^(\d{1,2})[:.](\d{2})/', $v, $m) && (int) $m[1] < 24 && (int) $m[2] < 60) {
            return (int) $m[1] * 60 + (int) $m[2];
        }

        if (is_numeric($v) && (float) $v >= 0) {
            $pecahan = fmod((float) $v, 1.0);

            return (int) round($pecahan * 1440) % 1440;
        }

        return null;
    }

    /** Nomor seri tanggal Excel (sistem 1900) → tanggal. */
    private function dariSeri(float $seri): CarbonImmutable
    {
        return CarbonImmutable::create(1899, 12, 30, 0, 0, 0, 'UTC')->addDays((int) floor($seri));
    }

    private function catat(array &$wadah, string $jenis, int $nomor): void
    {
        $wadah[$jenis][] = $nomor;
    }

    /**
     * Gabungkan masalah sejenis menjadi satu kalimat.
     *
     * Enam ratus baris dengan masalah yang sama dilaporkan sebagai satu pesan
     * bernomor-baris contoh, bukan enam ratus pesan.
     *
     * @return array<int, string>
     */
    private function ringkas(array $wadah): array
    {
        $pesan = [];

        foreach ($wadah as $jenis => $nomor) {
            $contoh = implode(', ', array_slice($nomor, 0, 8)).(count($nomor) > 8 ? ', …' : '');
            $pesan[] = sprintf('%s — %d baris (baris %s).', $jenis, count($nomor), $contoh);
        }

        return $pesan;
    }

    /**
     * Bandingkan hasil hitung dengan baris JUMLAH berkas.
     *
     * @return array{0: ?array<string, int>, 1: array<int, array<string, mixed>>}
     */
    private function bandingkan(?array $kaki, array $hitung): array
    {
        if ($kaki === null) {
            $this->peringatanBerkas[] = 'Baris JUMLAH tidak ditemukan; total tidak dapat dicocokkan dengan Excel.';

            return [null, []];
        }

        $excel = [];
        $selisih = [];

        foreach (self::KOLOM_ANGKA as $kolom => [, $label]) {
            if (! isset($kaki[$kolom]) || ! is_numeric($kaki[$kolom])) {
                continue;
            }

            $excel[$kolom] = (int) round((float) $kaki[$kolom]);

            if ($excel[$kolom] !== $hitung[$kolom]) {
                $selisih[] = [
                    'column' => $kolom,
                    'label' => $label,
                    'excel' => $excel[$kolom],
                    'computed' => $hitung[$kolom],
                ];
            }
        }

        return [$excel, $selisih];
    }
}
