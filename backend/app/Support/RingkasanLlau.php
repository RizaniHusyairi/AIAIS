<?php

namespace App\Support;

use App\Models\LlauFlight;
use Illuminate\Support\Facades\DB;

/**
 * Agregat LLAU dari baris penerbangan.
 *
 * Menerima larik baris berbentuk sama dengan keluaran `ParserLlau` — dan
 * bentuk itu pula yang dikembalikan kueri `llau_flights` — sehingga pratinjau
 * unggahan di panel admin dan dasbor publik dihitung oleh SATU kode yang
 * sama. Kalau keduanya dihitung terpisah, angka di pratinjau dan angka yang
 * tayang suatu saat pasti berbeda.
 *
 * Definisi yang dipakai:
 *  - Penumpang = dewasa + anak + bayi + transit, seperti baris TOTAL Excel.
 *  - Tepat waktu = aktual paling lambat 15 menit dari jadwal, dihitung hanya
 *    pada kegiatan BERJADWAL. Penerbangan carter dan bukan niaga tidak punya
 *    jadwal yang dijanjikan kepada penumpang, jadi tidak adil diukur dengannya.
 *  - Keterisian kursi = (dewasa + anak, termasuk transit) ÷ kapasitas kursi,
 *    juga hanya BERJADWAL; bayi dipangku, tidak menempati kursi.
 */
class RingkasanLlau
{
    /** Kode ujung rute yang berarti penerbangan lokal di sekitar bandara. */
    private const LOKAL = ['AAP', 'LOCAL', 'LOCAL AREA', 'LOKAL'];

    public static function penumpang(array $r): int
    {
        return $r['pax_adult'] + $r['pax_child'] + $r['pax_infant']
            + $r['transit_adult'] + $r['transit_child'] + $r['transit_infant'];
    }

    /** Bandara di ujung lain rute, dilihat dari APT Pranoto. */
    public static function ujungRute(array $r): string
    {
        $kode = strtoupper(trim($r['direction'] === 'A' ? $r['origin'] : $r['destination']));

        return in_array($kode, self::LOKAL, true) ? 'LOKAL' : $kode;
    }

    /** Kunci pengelompokan operator: ICAO bila ada, merek bila tidak. */
    private static function kunciOperator(array $r): string
    {
        return $r['operator_icao'] ?: 'N:'.strtoupper($r['operator_brand'] ?: $r['operator_name']);
    }

    /** Ringkasan inti satu periode — kartu angka utama. */
    public static function ringkas(array $rows): array
    {
        $nol = ['arrival' => 0, 'departure' => 0, 'total' => 0];
        $hasil = ['flights' => $nol, 'passengers' => $nol, 'baggage' => $nol, 'cargo' => $nol, 'mail' => $nol];
        $transit = 0;
        $hari = $rute = $operator = [];
        $diukur = $tepat = $menitTerlambat = $terlambat = 0;
        $kursi = $terisi = 0;

        foreach ($rows as $r) {
            $k = $r['direction'] === 'A' ? 'arrival' : 'departure';
            $nilai = [
                'flights' => 1,
                'passengers' => self::penumpang($r),
                'baggage' => $r['baggage_kg'],
                'cargo' => $r['cargo_kg'],
                'mail' => $r['mail_kg'],
            ];
            foreach ($nilai as $medan => $n) {
                $hasil[$medan][$k] += $n;
                $hasil[$medan]['total'] += $n;
            }

            $transit += $r['transit_adult'] + $r['transit_child'] + $r['transit_infant'];
            $hari[$r['flight_date']] = true;
            $ujung = self::ujungRute($r);
            if ($ujung !== 'LOKAL' && $ujung !== 'ZZZZ' && $ujung !== '-') {
                $rute[$ujung] = true;
            }
            $operator[self::kunciOperator($r)] = true;

            if ($r['flight_category'] === LlauFlight::OTP_CATEGORY) {
                if ($r['delay_minutes'] !== null) {
                    $diukur++;
                    if ((int) $r['delay_minutes'] <= LlauFlight::ON_TIME_MINUTES) {
                        $tepat++;
                    } else {
                        $terlambat++;
                        $menitTerlambat += (int) $r['delay_minutes'];
                    }
                }
                if ((int) $r['seat_capacity'] > 0) {
                    $kursi += (int) $r['seat_capacity'];
                    $terisi += $r['pax_adult'] + $r['pax_child'] + $r['transit_adult'] + $r['transit_child'];
                }
            }
        }

        return $hasil + [
            'transit' => $transit,
            'days' => count($hari),
            'routes' => count($rute),
            'operators' => count($operator),
            'otp' => [
                'measured' => $diukur,
                'on_time' => $tepat,
                'late' => $terlambat,
                'rate' => $diukur > 0 ? round($tepat / $diukur * 100, 1) : null,
                'average_late_minutes' => $terlambat > 0 ? (int) round($menitTerlambat / $terlambat) : null,
            ],
            'load_factor' => $kursi > 0 ? round($terisi / $kursi * 100, 1) : null,
        ];
    }

    /** Rincian lengkap satu periode untuk dasbor. */
    public static function rinci(array $rows): array
    {
        return [
            'summary' => self::ringkas($rows),
            'daily' => self::harian($rows),
            'routes' => self::rute($rows),
            'operators' => self::operator($rows),
            'categories' => self::hitungPer($rows, fn ($r) => $r['flight_category'] ?: 'Tidak disebutkan'),
            'aircraft_types' => array_slice(self::hitungPer($rows, fn ($r) => $r['aircraft_type'] ? strtoupper($r['aircraft_type']) : 'Tidak disebutkan'), 0, 8),
            'hourly' => self::perJam($rows),
            'delay_causes' => self::penyebab($rows),
        ];
    }

    private static function harian(array $rows): array
    {
        $hari = [];

        foreach ($rows as $r) {
            $t = $r['flight_date'];
            $hari[$t] ??= ['date' => $t, 'flights_arrival' => 0, 'flights_departure' => 0, 'passengers_arrival' => 0, 'passengers_departure' => 0];
            $k = $r['direction'] === 'A' ? 'arrival' : 'departure';
            $hari[$t]["flights_{$k}"]++;
            $hari[$t]["passengers_{$k}"] += self::penumpang($r);
        }

        ksort($hari);

        return array_values($hari);
    }

    private static function rute(array $rows): array
    {
        $rute = [];

        foreach ($rows as $r) {
            $kode = self::ujungRute($r);
            $rute[$kode] ??= ['code' => $kode, 'flights' => 0, 'passengers_arrival' => 0, 'passengers_departure' => 0, 'passengers' => 0, 'cargo' => 0];
            $p = self::penumpang($r);
            $rute[$kode]['flights']++;
            $rute[$kode][$r['direction'] === 'A' ? 'passengers_arrival' : 'passengers_departure'] += $p;
            $rute[$kode]['passengers'] += $p;
            $rute[$kode]['cargo'] += $r['cargo_kg'];
        }

        usort($rute, fn ($a, $b) => [$b['passengers'], $b['flights']] <=> [$a['passengers'], $a['flights']]);

        return $rute;
    }

    private static function operator(array $rows): array
    {
        $grup = [];
        $total = count($rows);

        foreach ($rows as $r) {
            $k = self::kunciOperator($r);
            $grup[$k] ??= ['icao' => $r['operator_icao'], 'names' => [], 'flights' => 0, 'passengers' => 0, 'cargo' => 0];
            $nama = $r['operator_brand'] ?: $r['operator_name'];
            $grup[$k]['names'][$nama] = ($grup[$k]['names'][$nama] ?? 0) + 1;
            $grup[$k]['flights']++;
            $grup[$k]['passengers'] += self::penumpang($r);
            $grup[$k]['cargo'] += $r['cargo_kg'];
        }

        $hasil = array_map(function ($g) use ($total) {
            // Nama yang paling sering ditulis petugas untuk kode yang sama —
            // ejaan operator berganti-ganti antarbaris, kodenya tidak.
            arsort($g['names']);

            return [
                'icao' => $g['icao'],
                'name' => (string) array_key_first($g['names']),
                'flights' => $g['flights'],
                'passengers' => $g['passengers'],
                'cargo' => $g['cargo'],
                'share' => $total > 0 ? round($g['flights'] / $total * 100, 1) : 0,
            ];
        }, array_values($grup));

        usort($hasil, fn ($a, $b) => [$b['flights'], $b['passengers']] <=> [$a['flights'], $a['passengers']]);

        return $hasil;
    }

    /** @return array<int, array{name: string, flights: int}> */
    private static function hitungPer(array $rows, callable $kunci): array
    {
        $hitung = [];
        foreach ($rows as $r) {
            $k = $kunci($r);
            $hitung[$k] = ($hitung[$k] ?? 0) + 1;
        }
        arsort($hitung);

        return array_map(fn ($n, $k) => ['name' => (string) $k, 'flights' => $n], $hitung, array_keys($hitung));
    }

    /** Sebaran jam terjadwal, 24 slot — slot kosong tetap dikirim sebagai nol. */
    private static function perJam(array $rows): array
    {
        $jam = [];
        for ($h = 0; $h < 24; $h++) {
            $jam[$h] = ['hour' => $h, 'arrival' => 0, 'departure' => 0];
        }

        foreach ($rows as $r) {
            if (! $r['scheduled_at']) {
                continue;
            }
            $h = (int) substr($r['scheduled_at'], 11, 2);
            $jam[$h][$r['direction'] === 'A' ? 'arrival' : 'departure']++;
        }

        return array_values($jam);
    }

    /** Penyebab yang dicatat pada penerbangan berjadwal yang terlambat. */
    private static function penyebab(array $rows): array
    {
        $terlambat = array_filter($rows, fn ($r) => $r['flight_category'] === LlauFlight::OTP_CATEGORY
            && $r['delay_minutes'] !== null
            && (int) $r['delay_minutes'] > LlauFlight::ON_TIME_MINUTES);

        return self::hitungPer($terlambat, fn ($r) => $r['delay_category'] ?: 'Tidak disebutkan');
    }

    /**
     * Seri bulanan untuk grafik tren, dihitung di basis data.
     *
     * Satu kueri berkelompok, bukan memuat ribuan baris lalu menjumlahkannya
     * di PHP — tren mencakup seluruh bulan yang pernah diunggah.
     *
     * @return array<int, array<string, mixed>> diurutkan dari periode terlama
     */
    public static function tren(): array
    {
        $pax = 'pax_adult + pax_child + pax_infant + transit_adult + transit_child + transit_infant';
        $batas = LlauFlight::ON_TIME_MINUTES;
        $berjadwal = "flight_category = '".LlauFlight::OTP_CATEGORY."' AND delay_minutes IS NOT NULL";

        return DB::table('llau_flights as f')
            ->join('llau_reports as r', 'r.id', '=', 'f.llau_report_id')
            ->groupBy('r.id', 'r.period')
            ->orderBy('r.period')
            ->selectRaw("r.id as report_id, r.period,
                COUNT(*) as flights,
                SUM(CASE WHEN direction = 'A' THEN 1 ELSE 0 END) as flights_arrival,
                SUM({$pax}) as passengers,
                SUM(CASE WHEN direction = 'A' THEN {$pax} ELSE 0 END) as passengers_arrival,
                SUM(baggage_kg) as baggage,
                SUM(cargo_kg) as cargo,
                SUM(CASE WHEN {$berjadwal} THEN 1 ELSE 0 END) as otp_measured,
                SUM(CASE WHEN {$berjadwal} AND delay_minutes <= {$batas} THEN 1 ELSE 0 END) as otp_on_time")
            ->get()
            ->map(function ($b) {
                $periode = substr((string) $b->period, 0, 7);

                return [
                    'report_id' => (int) $b->report_id,
                    'period' => $periode,
                    'flights' => (int) $b->flights,
                    'flights_arrival' => (int) $b->flights_arrival,
                    'flights_departure' => (int) $b->flights - (int) $b->flights_arrival,
                    'passengers' => (int) $b->passengers,
                    'passengers_arrival' => (int) $b->passengers_arrival,
                    'passengers_departure' => (int) $b->passengers - (int) $b->passengers_arrival,
                    'baggage' => (int) $b->baggage,
                    'cargo' => (int) $b->cargo,
                    'otp_rate' => (int) $b->otp_measured > 0
                        ? round((int) $b->otp_on_time / (int) $b->otp_measured * 100, 1)
                        : null,
                ];
            })
            ->all();
    }
}
