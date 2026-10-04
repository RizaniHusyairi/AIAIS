<?php

namespace App\Support;

use Carbon\Carbon;
use RuntimeException;
use ZipArchive;

/**
 * Penyusun berkas "LAPORAN LLAU BULAN …" — lampiran surat laporan BLU.
 *
 * Bentuknya meniru laporan yang selama ini disusun tangan (contoh April–
 * Agustus 2026 di `docs/LLAU EXPORT`), dalam dua varian:
 *
 *  - biasa: penumpang transit DIJUMLAHKAN ke dewasa/anak/bayi;
 *  - transit: penumpang transit di kolom tersendiri (Q–V), kolom bagasi,
 *    kargo, dan pos bergeser ke W–AB.
 *
 * Gaya sel, lebar kolom, tinggi baris, latar kepala tabel, format angka, dan
 * pengaturan cetak TIDAK ditulis di kode ini: semuanya diambil dari kerangka
 * di `resources/llau/{varian}` yang diekstrak dari laporan Juli 2026. Kerangka
 * itu sengaja tanpa data penerbangan dan tanpa nama/NIP penanda tangan.
 *
 * Dari laporan tangan yang TIDAK ditiru: sorotan warna pada tabel TUJUAN
 * (posisinya berubah-ubah tiap bulan dan meluber ke luar tabel — coretan
 * kerja, bukan format) dan angka/teks yang tertinggal di kolom keterangan
 * akibat penyisipan baris. Daftar keterangan bandara ditulis utuh sekali.
 *
 * Rumus ditulis sama dengan laporan tangan (SUM, SUMIF, SUMPRODUCT) beserta
 * nilai hasilnya, sehingga berkas tetap benar bila dibuka tanpa dihitung
 * ulang dan tetap hidup bila petugas menyunting angkanya.
 */
class PenyusunLaporanLlau
{
    private const BULAN = [
        1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    /** Baris data pertama, sama dengan laporan tangan. */
    private const AWAL = 16;

    /**
     * Keterangan kode bandara di kolom C bagian kaki, disalin dari laporan
     * tangan (urutan dipertahankan, entri ganda dibuang).
     */
    public const KETERANGAN = [
        'WALL : BALIKPAPAN,BPN', 'WAQT : BERAU,BEJ', 'WAQL : LONG APUNG,LPU', 'WALJ : DATAH DAWAI,DTD',
        'WAQD : TANJUNG SELOR,TJS', 'WAQM : MALINAU,MLN', 'WAQQ  : TARAKAN,TRK', 'WALW  : MUARA WAHAU,MHU',
        'WIII : SOETTA Jakarta, CGK', 'WAOM: MUARA TEWE,MTW', 'WAQC ; MUARATUA, RTU', 'WAJJ,DJJ, SENTANI',
        'WAGB; HMS; MUARA TEWEH', 'WIHH:HALIM PERDANAKUSUMA:JKT', 'WRBB : BANJARMASIN, BDJ', 'WADD : DENPASAR,DPS',
        'WAHI : YOGYAKARTA BARU.YIA', 'WAAM : MASAMBA, MXB', 'WAAA:UJUNG PANDANG:UPG', 'WAGG : PALANGKARAYA : PKY',
        'WRBC : BATULICIN', 'WAAF ; PALU ; PLW', 'WIOD,TJQ,TANJUNG PANDAN', 'WARA,MLG,MALANG',
        'WAHS; SEMARANG ; SRG', 'WAHH:JOGYAKARTA:JOG',
    ];

    /** Rute dicantumkan pada tabel TUJUAN bila muncul sekurang-kurangnya sekian kali. */
    public const AMBANG_TUJUAN = 3;

    private array $k;

    private bool $transit;

    /** @var array<int, array{ht: ?float, cells: array<string, array{0:int,1:mixed,2:?string}>}> */
    private array $baris = [];

    private array $gabung = [];

    private array $teks = [];

    private array $indeksTeks = [];

    public function __construct(bool $transit)
    {
        $this->transit = $transit;
        $jalur = resource_path('llau/'.($transit ? 'transit' : 'biasa'));
        $json = @file_get_contents("$jalur/kerangka.json");
        if ($json === false) {
            throw new RuntimeException('Kerangka laporan LLAU tidak ditemukan.');
        }
        $this->k = json_decode($json, true) + [
            'styles' => file_get_contents("$jalur/styles.xml"),
            'theme' => file_get_contents("$jalur/theme1.xml"),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows  baris `llau_flights`
     * @param  array{nama?: ?string, nip?: ?string}  $ttd
     * @return string isi berkas .xlsx
     */
    public function susun(array $rows, Carbon $periode, array $ttd = []): string
    {
        $rotasi = RekapLaporanLlau::barisRotasi($rows, $this->transit);
        $bulan = self::BULAN[(int) $periode->month];
        $ganti = [
            '{{Bulan}}' => $bulan,
            '{{BULAN}}' => mb_strtoupper($bulan),
            '{{TAHUN}}' => (string) $periode->year,
            '{{TTD_NAMA}}' => mb_strtoupper(trim((string) ($ttd['nama'] ?? ''))),
            '{{TTD_NIP}}' => 'NIP.'.trim((string) ($ttd['nip'] ?? '')),
        ];

        // ---- Kepala (baris 1–15) apa adanya ----
        foreach ($this->k['kepala'] as $b) {
            $this->pasang($b['r'], $b, $ganti);
        }
        foreach ($this->gabungKepala() as $g) {
            $this->gabung[] = $g;
        }

        // ---- Data: satu blok per tanggal, dipisah satu baris kosong ----
        $r = self::AWAL;
        $nilai = [];
        $hariSebelumnya = null;
        foreach ($rotasi as $i => $rot) {
            if ($hariSebelumnya !== null && $rot['day'] !== $hariSebelumnya) {
                $this->pasang($r++, $this->k['pemisah']);
            }
            $sel = $this->selData($rot, $rot['day'] !== $hariSebelumnya);
            $this->pasang($r, $this->k['data']);
            foreach ($sel as $kol => $v) {
                $this->isi($r, $kol, $v);
            }
            $nilai[] = $sel;
            $hariSebelumnya = $rot['day'];
            $r++;
        }
        $akhir = max(self::AWAL, $r - 1);
        $this->pasang($r++, $this->k['tutup']);

        $kolomAngka = $this->kolomAngka();
        $jumlahKolom = [];
        foreach (array_merge(['H', 'I', 'J'], $kolomAngka) as $kol) {
            $jumlahKolom[$kol] = array_sum(array_map(fn ($s) => (int) ($s[$kol] ?? 0), $nilai));
        }

        // ---- Baris JUMLAH, subtotal, dan tanda tangan ----
        $j = $r;
        foreach ($this->k['kaki'] as $o => $b) {
            $this->pasang($j + $o, $b, $ganti);
        }
        foreach ($jumlahKolom as $kol => $n) {
            $this->rumus($j, $kol, "SUM({$kol}".self::AWAL.":{$kol}{$akhir})", $n);
        }
        $this->kakiSubtotal($j, $jumlahKolom);

        // ---- Tabel ringkasan ----
        $ket = $j + 10;
        $this->pasang($ket, $this->k['t1h1'], $ganti);
        $this->pasang($ket + 1, $this->k['t1h2']);
        $this->gabungJudulTabel($ket, false);
        $r = $ket + 2;

        $operator = self::daftarUnik(array_column($rotasi, 'operator'));
        $r = $this->tabelSumif($r, $operator, 'D', $nilai, 't1item', 't1jumlah', $akhir, 'operator', $rotasi);

        $this->pasang($r++, $this->k['sela1']);
        $this->pasang($r++, $this->k['sela2']);

        $t2 = $r;
        $this->pasang($t2, $this->k['t2h1']);
        $this->pasang($t2 + 1, $this->k['t2h2']);
        $this->gabungJudulTabel($t2, true);
        $tipe = self::daftarUnik(array_map(fn ($x) => (string) $x['aircraft_type'], $rotasi));
        $r = $this->tabelSumif($t2 + 2, $tipe, 'F', $nilai, 't2item', 't2jumlah', $akhir, 'aircraft_type', $rotasi);

        $this->pasang($r++, $this->k['sela3']);
        $this->pasang($r++, $this->k['sela4']);

        $t3 = $r;
        $this->pasang($t3, $this->k['t3h1']);
        $this->pasang($t3 + 1, $this->k['t3h2']);
        $this->gabungJudulTabel($t3, true);
        $r = $this->tabelTujuan($t3 + 2, $rotasi, $nilai, $akhir, $jumlahKolom);

        // ---- Keterangan kode bandara ----
        foreach (self::KETERANGAN as $i => $teks) {
            $baris = $ket + $i;
            if (! isset($this->baris[$baris])) {
                $this->baris[$baris] = ['ht' => 33.0, 'cells' => []];
            }
            $this->baris[$baris]['cells']['C'] = [$this->k['gayaKeterangan'], $teks, null];
        }
        $terakhir = max(array_keys($this->baris));

        return $this->kemas($periode, $terakhir);
    }

    public function namaBerkas(Carbon $periode): string
    {
        return 'LAPORAN LLAU BULAN '.mb_strtoupper(self::BULAN[(int) $periode->month]).' '.$periode->year
            .($this->transit ? ' (transit)' : '').'.xlsx';
    }

    /* ------------------------------------------------------------------ */

    /** Kolom angka setelah J, menurut varian. */
    private function kolomAngka(): array
    {
        return $this->transit
            ? ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB']
            : ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'];
    }

    /** Isi satu baris rotasi, kolom → nilai. */
    private function selData(array $rot, bool $hariBaru): array
    {
        $sel = [
            'B' => $hariBaru ? $rot['day'] : null,
            'C' => $rot['route'],
            'D' => $rot['operator'],
            'E' => (string) $rot['category'],
            'F' => (string) $rot['aircraft_type'],
            'G' => $rot['seats'] === '' || $rot['seats'] === null ? null : (int) $rot['seats'],
            'H' => $rot['arr'], 'I' => $rot['dep'], 'J' => $rot['local'],
            'K' => $rot['pax_arr'][0], 'L' => $rot['pax_arr'][1], 'M' => $rot['pax_arr'][2],
            'N' => $rot['pax_dep'][0], 'O' => $rot['pax_dep'][1], 'P' => $rot['pax_dep'][2],
        ];

        $muatan = [$rot['baggage_arr'], $rot['baggage_dep'], $rot['cargo_arr'], $rot['cargo_dep'], $rot['mail_arr'], $rot['mail_dep']];

        if ($this->transit) {
            [$sel['Q'], $sel['R'], $sel['S']] = $rot['transit_arr'];
            [$sel['T'], $sel['U'], $sel['V']] = $rot['transit_dep'];
            [$sel['W'], $sel['X'], $sel['Y'], $sel['Z'], $sel['AA'], $sel['AB']] = $muatan;
        } else {
            [$sel['Q'], $sel['R'], $sel['S'], $sel['T'], $sel['U'], $sel['V']] = $muatan;
        }

        return $sel;
    }

    /** Subtotal datang/berangkat dan total keseluruhan di bawah baris JUMLAH. */
    private function kakiSubtotal(int $j, array $n): void
    {
        $s = fn (string ...$k) => array_sum(array_map(fn ($x) => $n[$x], $k));
        $j1 = $j + 1;
        $j2 = $j + 2;

        $this->rumus($j1, 'K', "SUM(K{$j}:M{$j})", $s('K', 'L', 'M'));
        $this->rumus($j1, 'N', "SUM(N{$j}:P{$j})", $s('N', 'O', 'P'));
        $this->gabung = array_merge($this->gabung, ["B{$j}:G{$j}", "K{$j1}:M{$j1}", "N{$j1}:P{$j1}"]);

        if ($this->transit) {
            $this->rumus($j1, 'Q', "SUM(Q{$j}:S{$j})", $s('Q', 'R', 'S'));
            $this->rumus($j1, 'T', "SUM(T{$j}:V{$j})", $s('T', 'U', 'V'));
            $this->rumus($j1, 'W', "SUM(W{$j}:X{$j})", $s('W', 'X'));
            $this->rumus($j1, 'Y', "SUM(Y{$j}:Z{$j})", $s('Y', 'Z'));
            $this->rumus($j2, 'K', "SUM(K{$j1}:V{$j1})", $s('K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'));
            array_push($this->gabung, "Q{$j1}:S{$j1}", "T{$j1}:V{$j1}", "W{$j1}:X{$j1}", "Y{$j1}:Z{$j1}", "K{$j2}:V{$j2}",
                'X'.($j + 4).':AC'.($j + 4), 'X'.($j + 5).':AC'.($j + 5), 'X'.($j + 9).':AC'.($j + 9), 'X'.($j + 10).':AC'.($j + 10));
        } else {
            $this->rumus($j1, 'Q', "SUM(Q{$j}:R{$j})", $s('Q', 'R'));
            $this->rumus($j1, 'S', "SUM(S{$j}:T{$j})", $s('S', 'T'));
            $this->rumus($j2, 'K', "SUM(K{$j1}:P{$j1})", $s('K', 'L', 'M', 'N', 'O', 'P'));
            array_push($this->gabung, "Q{$j1}:R{$j1}", "S{$j1}:T{$j1}", "K{$j2}:P{$j2}",
                "Q{$j2}:V{$j2}", 'Q'.($j + 3).':V'.($j + 3), 'Q'.($j + 7).':V'.($j + 7), 'Q'.($j + 8).':V'.($j + 8));
        }
    }

    /**
     * Pemetaan kolom tabel ringkasan → kolom data yang dijumlahkannya.
     *
     * @return array<string, array<int, string>>
     */
    private function petaRingkasan(): array
    {
        return $this->transit
            ? ['G' => ['H'], 'H' => ['I'], 'I' => ['K', 'L', 'M'], 'J' => ['N', 'O', 'P'], 'K' => ['Q', 'R', 'S'], 'L' => ['T', 'U', 'V'],
                'M' => ['W'], 'N' => ['X'], 'O' => ['Y'], 'P' => ['Z'], 'Q' => ['AA'], 'R' => ['AB']]
            : ['G' => ['H'], 'H' => ['I'], 'I' => ['K', 'L', 'M'], 'J' => ['N', 'O', 'P'], 'K' => ['Q'], 'L' => ['R'],
                'M' => ['S'], 'N' => ['T'], 'O' => ['U'], 'P' => ['V']];
    }

    /** Tabel MASKAPAI / TIPE PESAWAT: satu baris per nilai, rumus SUMIF. */
    private function tabelSumif(int $r, array $daftar, string $kolomKunci, array $nilai, string $proto, string $protoJumlah, int $akhir, string $medan, array $rotasi): int
    {
        $awal = $r;
        $rentang = '$'.$kolomKunci.'$'.self::AWAL.':$'.$kolomKunci.'$'.$akhir;
        $peta = $this->petaRingkasan();
        $total = array_fill_keys(array_keys($peta), 0);

        foreach ($daftar as $kunci) {
            $this->pasang($r, $this->k[$proto]);
            $this->isi($r, 'F', $kunci);
            $cocok = array_keys(array_filter($rotasi, fn ($x) => mb_strtoupper((string) $x[$medan]) === mb_strtoupper((string) $kunci)));

            foreach ($peta as $kol => $sumber) {
                $bagian = array_map(fn ($s) => "(SUMIF({$rentang},\$F{$r},{$s}\$".self::AWAL.":{$s}\${$akhir}))", $sumber);
                $n = 0;
                foreach ($cocok as $i) {
                    foreach ($sumber as $s) {
                        $n += (int) ($nilai[$i][$s] ?? 0);
                    }
                }
                $this->rumus($r, $kol, implode(' + ', $bagian), $n);
                $total[$kol] += $n;
            }
            $r++;
        }

        $this->pasang($r, $this->k[$protoJumlah]);
        foreach ($peta as $kol => $_) {
            $this->rumus($r, $kol, "SUM({$kol}{$awal}:{$kol}".($r - 1).')', $total[$kol]);
        }

        return $r + 1;
    }

    /**
     * Tabel TUJUAN: rute tetap per operator, sisanya LAINNYA.
     *
     * Aturan pemilihannya diturunkan dari laporan tangan April–Agustus 2026
     * dan cocok pada kelimanya: rute yang muncul sekurang-kurangnya
     * AMBANG_TUJUAN kali dalam sebulan; di dalam operator diurutkan dari yang
     * terbanyak (seri: abjad); operator diurutkan dari jumlah rotasi rute
     * tercantumnya yang terbanyak (seri: abjad).
     */
    private function tabelTujuan(int $r, array $rotasi, array $nilai, int $akhir, array $jumlahKolom): int
    {
        $hitung = [];
        foreach ($rotasi as $i => $x) {
            $hitung[$x['operator']][$x['route']][] = $i;
        }

        $grup = [];
        foreach ($hitung as $op => $rute) {
            $pilih = array_filter($rute, fn ($idx) => count($idx) >= self::AMBANG_TUJUAN);
            if ($pilih === []) {
                continue;
            }
            uksort($pilih, fn ($a, $b) => [count($pilih[$b]), $a] <=> [count($pilih[$a]), $b]);
            $grup[$op] = $pilih;
        }
        uksort($grup, function ($a, $b) use ($grup) {
            $na = array_sum(array_map('count', $grup[$a]));
            $nb = array_sum(array_map('count', $grup[$b]));

            return [$nb, $a] <=> [$na, $b];
        });

        $peta = $this->petaRingkasan();
        $awal = $r;
        $barisRute = [];
        $terpakai = array_fill_keys(array_keys($peta), 0);
        $total = array_fill_keys(array_keys($peta), 0);
        $A = self::AWAL;

        foreach ($grup as $op => $daftar) {
            $g = $r++;
            $this->pasang($g, $this->k['t3rute']);
            $this->isi($g, 'F', $op);

            foreach ($daftar as $rute => $idx) {
                $this->pasang($r, $this->k['t3rute']);
                $this->isi($r, 'F', $rute);
                foreach ($peta as $kol => $sumber) {
                    $awalS = $sumber[0];
                    $akhirS = end($sumber);
                    $n = 0;
                    foreach ($idx as $i) {
                        foreach ($sumber as $s) {
                            $n += (int) ($nilai[$i][$s] ?? 0);
                        }
                    }
                    $this->rumus($r, $kol, "SUMPRODUCT(({$awalS}\${$A}:{$akhirS}\${$akhir}) * (\$C\${$A}:\$C\${$akhir}=\$F{$r}) * (\$D\${$A}:\$D\${$akhir}=\$F\${$g}))", $n);
                    $terpakai[$kol] += $n;
                }
                $barisRute[] = $r;
                $r++;
            }
        }

        // LAINNYA: seluruh data dikurangi rute yang tercantum.
        $this->pasang($r, $this->k['t3lainnya']);
        foreach ($peta as $kol => $sumber) {
            $semua = '('.implode(' + ', array_map(fn ($s) => "SUM({$s}\${$A}:{$s}\${$akhir})", $sumber)).')';
            $kurang = $barisRute === [] ? '0' : implode(' + ', array_map(fn ($b) => "{$kol}\${$b}", $barisRute));
            $n = array_sum(array_map(fn ($s) => $jumlahKolom[$s] ?? 0, $sumber)) - $terpakai[$kol];
            $this->rumus($r, $kol, "{$semua} - ({$kurang})", $n);
        }
        $lainnya = $r++;

        $this->pasang($r, $this->k['t3jumlah']);
        foreach ($peta as $kol => $sumber) {
            $n = array_sum(array_map(fn ($s) => $jumlahKolom[$s] ?? 0, $sumber));
            $this->rumus($r, $kol, "SUM({$kol}{$awal}:{$kol}{$lainnya})", $n);
        }

        return $r + 1;
    }

    /**
     * Nilai unik untuk tabel SUMIF, TANPA membedakan huruf besar-kecil.
     *
     * SUMIF di Excel tidak peka huruf, jadi "G450" dan "g450" dijumlahkan
     * dalam satu baris — dan laporan tangan memang hanya mencantumkan satu.
     * Bentuk yang ditampilkan adalah yang terkecil menurut urutan ASCII (huruf
     * kapital lebih dulu), lalu daftar diurutkan ASCII seperti laporan tangan
     * ("ec135" setelah "SA315B").
     *
     * @return array<int, string>
     */
    private static function daftarUnik(array $nilai): array
    {
        $grup = [];
        foreach ($nilai as $v) {
            $k = mb_strtoupper((string) $v);
            if (! isset($grup[$k]) || strcmp((string) $v, $grup[$k]) < 0) {
                $grup[$k] = (string) $v;
            }
        }
        $hasil = array_values($grup);
        sort($hasil, SORT_STRING);

        return $hasil;
    }

    private function gabungKepala(): array
    {
        $g = ['B5:V5', 'B6:V6', 'B7:V7', 'B8:V8', 'B9:V9', 'H11:J12', 'B11:B13', 'C11:C13', 'D11:D13', 'E11:E13',
            'F11:F13', 'G11:G13', 'K12:M12', 'N12:P12'];

        return $this->transit
            ? [...$g, 'K11:P11', 'Q11:V11', 'W11:X12', 'Y11:Z12', 'AA11:AB12', 'Q12:S12', 'T12:V12']
            : [...$g, 'K11:P11', 'Q11:R12', 'S11:T12', 'U11:V12'];
    }

    private function gabungJudulTabel(int $r, bool $gabungF): void
    {
        $pasang = $this->transit ? ['G:H', 'I:J', 'K:L', 'M:N', 'O:P', 'Q:R'] : ['G:H', 'I:J', 'K:L', 'M:N', 'O:P'];
        foreach ($pasang as $p) {
            [$a, $b] = explode(':', $p);
            $this->gabung[] = "{$a}{$r}:{$b}{$r}";
        }
        if ($gabungF) {
            $this->gabung[] = "F{$r}:F".($r + 1);
        }
    }

    /* ------------------------------------------------------------------ */

    /** Pasang baris prototipe (gaya + nilai statis) pada nomor baris tertentu. */
    private function pasang(int $r, array $proto, array $ganti = []): void
    {
        $sel = [];
        foreach ($proto['cells'] as [$kol, $gaya, $nilai]) {
            if (is_string($nilai) && $ganti !== []) {
                $nilai = strtr($nilai, $ganti);
            }
            $sel[$kol] = [$gaya, $nilai, null];
        }
        $this->baris[$r] = ['ht' => $proto['ht'] ?? 33.0, 'cells' => $sel];
    }

    private function isi(int $r, string $kol, mixed $nilai): void
    {
        $gaya = $this->baris[$r]['cells'][$kol][0] ?? 1;
        $this->baris[$r]['cells'][$kol] = [$gaya, $nilai, null];
    }

    private function rumus(int $r, string $kol, string $f, int|float $hasil): void
    {
        $gaya = $this->baris[$r]['cells'][$kol][0] ?? 1;
        $this->baris[$r]['cells'][$kol] = [$gaya, $hasil, $f];
    }

    private function idTeks(string $s): int
    {
        if (! isset($this->indeksTeks[$s])) {
            $this->indeksTeks[$s] = count($this->teks);
            $this->teks[] = $s;
        }

        return $this->indeksTeks[$s];
    }

    private static function indeksKolom(string $kol): int
    {
        $n = 0;
        foreach (str_split($kol) as $c) {
            $n = $n * 26 + (ord($c) - 64);
        }

        return $n;
    }

    private static function x(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /** Rakit seluruh bagian menjadi arsip .xlsx. */
    private function kemas(Carbon $periode, int $terakhir): string
    {
        ksort($this->baris);

        $xmlBaris = '';
        $kolomMaks = 1;
        foreach ($this->baris as $r => $b) {
            uksort($b['cells'], fn ($a, $c) => self::indeksKolom($a) <=> self::indeksKolom($c));
            $sel = '';
            foreach ($b['cells'] as $kol => [$gaya, $nilai, $f]) {
                $kolomMaks = max($kolomMaks, self::indeksKolom($kol));
                $ref = "{$kol}{$r}";
                if ($f !== null) {
                    $sel .= "<c r=\"{$ref}\" s=\"{$gaya}\"><f>".self::x($f)."</f><v>{$nilai}</v></c>";
                } elseif ($nilai === null || $nilai === '') {
                    $sel .= "<c r=\"{$ref}\" s=\"{$gaya}\"/>";
                } elseif (is_int($nilai) || is_float($nilai)) {
                    $sel .= "<c r=\"{$ref}\" s=\"{$gaya}\"><v>{$nilai}</v></c>";
                } else {
                    $sel .= "<c r=\"{$ref}\" s=\"{$gaya}\" t=\"s\"><v>".$this->idTeks((string) $nilai).'</v></c>';
                }
            }
            $ht = $b['ht'] ?? 33.0;
            $xmlBaris .= "<row r=\"{$r}\" ht=\"{$ht}\" customHeight=\"1\">{$sel}</row>";
        }

        $hurufMaks = '';
        for ($n = $kolomMaks; $n > 0; $n = intdiv($n - 1, 26)) {
            $hurufMaks = chr(65 + ($n - 1) % 26).$hurufMaks;
        }

        $gabung = array_values(array_unique($this->gabung));
        $lembar = str_replace('{{DIMENSI}}', "A1:{$hurufMaks}{$terakhir}", $this->k['kepalaLembar'])
            .'<sheetData>'.$xmlBaris.'</sheetData>'
            .'<mergeCells count="'.count($gabung).'">'.implode('', array_map(fn ($g) => "<mergeCell ref=\"{$g}\"/>", $gabung)).'</mergeCells>'
            // Pewarnaan baris kosong (latar biru) disalin APA ADANYA dari templat.
            // Rentangnya absolut dan sama di setiap laporan tangan, sehingga
            // bulan yang lebih panjang memang menampilkan kaki tanpa latar.
            // Menyesuaikannya dengan panjang data justru membuat hasil berbeda
            // dari laporan resmi.
            .$this->k['formatBersyarat']
            .$this->k['ekorLembar'];

        $teks = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="'.count($this->teks).'" uniqueCount="'.count($this->teks).'">'
            .implode('', array_map(fn ($s) => '<si><t xml:space="preserve">'.self::x($s).'</t></si>', $this->teks)).'</sst>';

        $nama = mb_strtoupper(self::BULAN[(int) $periode->month]);
        $namaX = self::x($nama);
        $kini = gmdate('Y-m-d\TH:i:s\Z');

        $berkas = [
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            'docProps/app.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>'.$namaX.'</vt:lpstr></vt:vector></TitlesOfParts><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>',
            'docProps/core.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Portal AIAIS</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'.$kini.'</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">'.$kini.'</dcterms:modified></cp:coreProperties>',
            'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr defaultThemeVersion="164011"/><bookViews><workbookView xWindow="-120" yWindow="-120" windowWidth="29040" windowHeight="16440"/></bookViews><sheets><sheet name="'.$namaX.'" sheetId="1" r:id="rId4"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">\''.$namaX.'\'!$A$1:$AB$'.$terakhir.'</definedName></definedNames><calcPr calcId="171027" fullCalcOnLoad="1"/></workbook>',
            'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
            'xl/styles.xml' => $this->k['styles'],
            'xl/theme/theme1.xml' => $this->k['theme'],
            'xl/sharedStrings.xml' => $teks,
            'xl/worksheets/sheet1.xml' => $lembar,
        ];

        $tmp = tempnam(sys_get_temp_dir(), 'llau');
        $zip = new ZipArchive;
        $zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($berkas as $nama => $isi) {
            $zip->addFromString($nama, $isi);
        }
        $zip->close();

        $hasil = file_get_contents($tmp);
        @unlink($tmp);

        return $hasil;
    }
}
