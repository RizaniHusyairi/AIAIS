<?php

namespace App\Support;

/**
 * Baris "rotasi" untuk Laporan LLAU bulanan (surat laporan BLU ke Ditjen Hubud).
 *
 * Lembar sumber LLAU mencatat satu baris per KAKI penerbangan. Laporan
 * bulanan menulis satu baris per ROTASI pesawat: kedatangan dan keberangkatan
 * pesawat yang sama dipasangkan, dikelompokkan per tanggal.
 *
 * Aturan di bawah DITURUNKAN dari lima laporan yang disusun tangan
 * (April–Agustus 2026, `docs/LLAU EXPORT`), lalu dicocokkan baris demi baris
 * dengan hasil algoritma ini. Bila aturan diubah, cocokkan ulang — jangan
 * "merapikan" berdasarkan dugaan.
 *
 *  - Kaki dibaca per tanggal terjadwal, dalam urutan lembar sumber dari
 *    bawah ke atas (lembar sumber ditulis terbaru di atas). Satu baris rotasi
 *    menempati posisi kaki pertamanya.
 *  - Kaki DATANG dipasangkan dengan keberangkatan berikutnya dari registrasi
 *    yang sama, ke tujuan mana pun ("SUB - AAP - YIA").
 *  - Kaki BERANGKAT dipasangkan dengan kedatangan berikutnya dari registrasi
 *    yang sama HANYA bila pesawat kembali dari bandara yang sama dituju
 *    ("AAP - RTU - AAP"); kedatangan dari tempat lain dilewati. Pesawat
 *    perintis yang berangkat ke DTD lalu datang dari LPU dicatat sebagai dua
 *    baris tunggal, persis seperti di laporan tangan.
 *  - Dalam satu pasangan, kaki tetap dalam urutan lembar sumber, BUKAN jam:
 *    dari 14 pasangan yang urutan lembar dan jamnya berbeda, laporan tangan
 *    mengikuti urutan lembar pada semua kasus yang dapat dipastikan.
 *  - Rute ditulis literal: asal–tujuan kaki pertama, lalu tujuan kaki kedua.
 *    Baris sumber yang asal/tujuannya tertukar ikut tertulis apa adanya;
 *    laporan tidak diam-diam memperbaiki data sumbernya.
 */
class RekapLaporanLlau
{
    /**
     * Sebutan operator yang BUKAN sekadar nama badan usaha tanpa "PT.".
     *
     * Diambil dari laporan tangan April–Agustus 2026. Operator lain ditulis
     * dengan aturan umum: nama di lembar sumber, tanpa "PT." dan "Tbk",
     * huruf kapital. Tambahkan baris di sini bila laporan resmi memakai
     * sebutan lain untuk operator baru.
     */
    public const SEBUTAN_OPERATOR = [
        'PTBATIKAIRINDONESIA' => 'BATIK AIR',
        'PTCITILINKINDONESIA' => 'CITILINK',
        'PTWINGSABADI' => 'WINGS AIR',
        'PTWINGSABADIAIRLINES' => 'WINGS AIR',
        'PTSMARTCAKRAWALAAVIATION' => 'SMART AVIATION',
        'PTASIPUDJIASTUTIAVIATION' => 'SUSI AIR',
        'PTINTANANGKASAAIRSERVICE' => 'INTAN ANGKASA',
        'PTJHONLINAIRTRANSPORT' => 'JHONLIN AIR',
        'PTMATTHEWAIRNUSANTARA' => 'MATTHEW AIR',
        'PTPELITAAIRSERVICE' => 'PELITA AIR',
        'PTWHITESKYAVIATION' => 'WHITESKY',
    ];

    public static function sebutanOperator(string $nama): string
    {
        $kunci = preg_replace('/[^A-Z0-9]/', '', strtoupper($nama));

        if (isset(self::SEBUTAN_OPERATOR[$kunci])) {
            return self::SEBUTAN_OPERATOR[$kunci];
        }

        $bersih = preg_replace(['/^\s*PT\.?\s+/i', '/,?\s*TBK\.?\s*$/i'], '', $nama);

        return strtoupper(trim(preg_replace('/\s+/', ' ', $bersih)));
    }

    /**
     * @param  bool  $pisahTransit  true untuk laporan "(transit)": penumpang
     *                              transit di kolom tersendiri. false: transit
     *                              dijumlahkan ke dewasa/anak/bayi.
     * @return array<int, array<string, mixed>>
     */
    public static function barisRotasi(array $rows, bool $pisahTransit = false): array
    {
        $perHari = [];
        foreach ($rows as $r) {
            $perHari[$r['flight_date']][] = $r;
        }
        ksort($perHari);

        $hasil = [];
        foreach ($perHari as $tanggal => $kaki) {
            usort($kaki, fn ($a, $b) => $b['row_number'] <=> $a['row_number']);
            $kaki = array_values($kaki);
            $pakai = [];

            foreach ($kaki as $i => $k) {
                if (isset($pakai[$i])) {
                    continue;
                }
                $pakai[$i] = true;
                $pasangan = null;

                if ($k['registration']) {
                    for ($j = $i + 1; $j < count($kaki); $j++) {
                        $l = $kaki[$j];
                        if (isset($pakai[$j]) || $l['registration'] !== $k['registration'] || $l['direction'] === $k['direction']) {
                            continue;
                        }
                        if ($k['direction'] === 'D' && $l['origin'] !== $k['destination']) {
                            continue;
                        }
                        $pasangan = $l;
                        $pakai[$j] = true;
                        break;
                    }
                }

                $hasil[] = self::bentukBaris((int) substr($tanggal, 8, 2), $k, $pasangan, $pisahTransit);
            }
        }

        return $hasil;
    }

    private static function bentukBaris(int $hari, array $k1, ?array $k2, bool $pisahTransit): array
    {
        $a = $k1['direction'] === 'A' ? $k1 : ($k2 && $k2['direction'] === 'A' ? $k2 : null);
        $d = $k1['direction'] === 'D' ? $k1 : ($k2 && $k2['direction'] === 'D' ? $k2 : null);

        $rute = "{$k1['origin']} - {$k1['destination']}".($k2 ? " - {$k2['destination']}" : '');

        $pax = function (?array $k) use ($pisahTransit) {
            if (! $k) {
                return [0, 0, 0];
            }

            return $pisahTransit
                ? [$k['pax_adult'], $k['pax_child'], $k['pax_infant']]
                : [$k['pax_adult'] + $k['transit_adult'], $k['pax_child'] + $k['transit_child'], $k['pax_infant'] + $k['transit_infant']];
        };
        $transit = fn (?array $k) => $k ? [$k['transit_adult'], $k['transit_child'], $k['transit_infant']] : [0, 0, 0];

        return [
            'day' => $hari,
            'route' => $rute,
            'operator' => self::sebutanOperator($k1['operator_name']),
            'category' => $k1['flight_category'] ?? '',
            'aircraft_type' => $k1['aircraft_type'] ?? '',
            'seats' => $k1['seat_capacity'] ?? '',
            'arr' => $a ? 1 : 0,
            'dep' => $d ? 1 : 0,
            'local' => 0,
            'pax_arr' => $pax($a),
            'pax_dep' => $pax($d),
            'transit_arr' => $transit($a),
            'transit_dep' => $transit($d),
            'baggage_arr' => $a['baggage_kg'] ?? 0,
            'baggage_dep' => $d['baggage_kg'] ?? 0,
            'cargo_arr' => $a['cargo_kg'] ?? 0,
            'cargo_dep' => $d['cargo_kg'] ?? 0,
            'mail_arr' => $a['mail_kg'] ?? 0,
            'mail_dep' => $d['mail_kg'] ?? 0,
        ];
    }
}
