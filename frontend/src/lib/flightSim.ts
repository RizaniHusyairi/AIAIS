/**
 * Simulasi posisi pesawat dari jadwal FIDS.
 *
 * ⚠️  INI BUKAN PELACAKAN. FIDS Bandara APT Pranoto tidak mengirim posisi,
 * ketinggian, maupun data ADS-B — hanya jam jadwal dan status teks. Posisi di
 * sini adalah TURUNAN dari jadwal + status + perkiraan durasi, jadi selalu
 * berupa perkiraan.
 *
 * Prinsip yang dipegang di seluruh berkas ini:
 *
 *   1. STATUS SELALU MENGALAHKAN JAM. Bila FIDS bilang penerbangan belum
 *      berangkat, pesawat diam di bandara asal berapa pun jam dinding
 *      menunjukkan. Jam tidak berhak membantah petugas.
 *   2. BILA DATA TIDAK MENDUKUNG, JANGAN MENGGERAKKAN. Delay tanpa waktu
 *      revisi dan penerbangan batal mengembalikan `progress: null` —
 *      pemanggil tidak boleh menggambar pesawat bergerak.
 *
 * Modul ini murni (tanpa DOM, tanpa jaringan) supaya bisa diuji lewat skrip
 * Node biasa.
 */

import type { Flight } from '@/types';
import type { AirportGeo } from '@/lib/airports';
import type { LatLon } from '@/lib/geo';
import { airportFromPlace, toLatLon } from '@/lib/airports';
import { clamp, distanceKm, headingAt, interpolate } from '@/lib/geo';

/* ------------------------------------------------------------------ */
/*  Asumsi perkiraan durasi                                            */
/*                                                                     */
/*  Angka-angka di bawah ADALAH ASUMSI, bukan data operasional dari    */
/*  maskapai. Semuanya dicantumkan apa adanya kepada pengguna lewat    */
/*  komponen SimulationNotice.                                         */
/* ------------------------------------------------------------------ */

/** Kecepatan jelajah pesawat jet (km/jam). */
export const CRUISE_JET_KMH = 780;
/** Kecepatan jelajah pesawat baling-baling, mis. ATR 72 (km/jam). */
export const CRUISE_TURBOPROP_KMH = 480;
/** Kelonggaran taxi, lepas landas, naik, turun, dan pendekatan (menit). */
export const GROUND_ALLOWANCE_MIN = 25;
/** Durasi blok minimum yang masuk akal (menit). */
export const MIN_BLOCK_MIN = 35;

const TURBOPROP_RE = /atr|dhc|dash|twin otter|propeller|turboprop/i;

/** Perkiraan durasi blok dari jarak dan jenis pesawat, dibulatkan ke 5 menit. */
export function estimateDurationMin(distKm: number, aircraftType?: string | null): number {
  const kmh = TURBOPROP_RE.test(aircraftType ?? '') ? CRUISE_TURBOPROP_KMH : CRUISE_JET_KMH;
  const raw = GROUND_ALLOWANCE_MIN + (distKm / kmh) * 60;
  return Math.max(MIN_BLOCK_MIN, Math.round(raw / 5) * 5);
}

/* ------------------------------------------------------------------ */
/*  Waktu                                                              */
/* ------------------------------------------------------------------ */

/** Tanggal hari ini menurut WITA, format YYYY-MM-DD. */
export function todayWita(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
}

/**
 * Gabungkan tanggal FIDS (YYYY-MM-DD) dan jam ("17:35 WITA") menjadi epoch ms.
 *
 * WITA adalah UTC+8 tetap dan tidak mengenal DST, jadi epoch dihitung
 * aritmetis — lebih terduga daripada bolak-balik lewat `Intl`.
 */
export function witaEpoch(dateISO: string, time: string): number | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO.trim());
  const tm = /(\d{1,2})[:.](\d{2})/.exec(time ?? '');
  if (!dm || !tm) return null;

  const [, y, mo, d] = dm;
  const [, hh, mi] = tm;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh) - 8, Number(mi));
}

/* ------------------------------------------------------------------ */
/*  Hasil simulasi                                                     */
/* ------------------------------------------------------------------ */

export type SimPhase =
  /** Masih di darat di bandara asal. */
  | 'ground'
  /** Sedang dalam perjalanan (perkiraan). */
  | 'enroute'
  /** Sudah tiba menurut FIDS. */
  | 'arrived'
  /** Sengaja tidak diperkirakan — delay tanpa waktu revisi. */
  | 'hold'
  /** Penerbangan dibatalkan. */
  | 'cancelled';

export type SimState = {
  phase: SimPhase;
  /** `null` berarti posisi SENGAJA tidak diperkirakan. */
  progress: number | null;
  position: LatLon | null;
  headingDeg: number;
  from: AirportGeo;
  to: AirportGeo;
  /** Perkiraan epoch berangkat & tiba (ms). */
  depAt: number;
  arrAt: number;
  distanceKm: number;
  durationMin: number;
  /** Sisa waktu menuju tujuan (menit), `null` bila tidak diperkirakan. */
  remainingMin: number | null;
  /**
   * Selalu `true`. Ada di dalam tipe supaya setiap tampilan yang memakai
   * `SimState` sulit lupa memasang label "simulasi".
   */
  simulated: true;
};

/** Batas atas progres saat en route: jangan pernah mengklaim sudah mendarat. */
const MAX_ENROUTE_PROGRESS = 0.985;

/**
 * Hitung keadaan simulasi sebuah penerbangan pada waktu `nowMs`.
 *
 * Mengembalikan `null` bila koordinat salah satu bandara tidak dikenali —
 * pemanggil harus menekan peta, bukan menebak posisi.
 */
export function simulateAt(flight: Flight, nowMs: number): SimState | null {
  const from = airportFromPlace(flight.origin);
  const to = airportFromPlace(flight.destination);
  if (!from || !to) return null;

  const a = toLatLon(from);
  const b = toLatLon(to);
  const dist = distanceKm(a, b);
  const durationMin = estimateDurationMin(dist, flight.aircraft_type);
  const durMs = durationMin * 60_000;

  // Pakai waktu revisi petugas bila ada; kalau tidak, jadwal semula.
  const anchorTime = flight.estimated_time || flight.scheduled_time;
  const anchor = witaEpoch(flight.flight_date || todayWita(), anchorTime);

  // ── Asimetri kedatangan vs keberangkatan ───────────────────────────
  // Keberangkatan: `scheduled_time` = jam BERANGKAT dari AAP.
  // Kedatangan   : `scheduled_time` = jam TIBA di AAP, jadi jam berangkat
  //                harus dimundurkan sebesar durasi.
  const isDeparture = flight.flight_type === 'departure';
  const depAt = anchor === null ? NaN : isDeparture ? anchor : anchor - durMs;
  const arrAt = anchor === null ? NaN : isDeparture ? anchor + durMs : anchor;

  const base = {
    from,
    to,
    depAt,
    arrAt,
    distanceKm: dist,
    durationMin,
    simulated: true as const,
  };

  const atOrigin = (phase: SimPhase): SimState => ({
    ...base,
    phase,
    progress: phase === 'hold' || phase === 'cancelled' ? null : 0,
    position: phase === 'cancelled' ? null : a,
    headingDeg: headingAt(a, b, 0),
    remainingMin: null,
  });

  // Dibatalkan: tidak ada pesawat sama sekali.
  if (flight.status === 'cancelled') {
    return { ...atOrigin('cancelled'), position: null };
  }

  // Delay tanpa waktu revisi: FIDS tidak memberi dasar apa pun untuk
  // memperkirakan posisi, jadi jangan digerakkan.
  if (flight.status === 'delayed' && !flight.estimated_time) {
    return atOrigin('hold');
  }

  // Jadwal tidak terbaca — perlakukan seperti masih di darat.
  if (anchor === null || Number.isNaN(depAt)) {
    return atOrigin('ground');
  }

  // Sudah mendarat menurut FIDS.
  if (flight.status === 'landed') {
    return {
      ...base,
      phase: 'arrived',
      progress: 1,
      position: b,
      headingDeg: headingAt(a, b, 1),
      remainingMin: 0,
    };
  }

  // Belum berangkat menurut FIDS — status mengalahkan jam.
  if (flight.status !== 'departed' && flight.status !== 'delayed') {
    return atOrigin('ground');
  }

  // En route. Dibatasi di bawah 1 agar tidak pernah mengklaim pendaratan
  // yang tidak pernah dikonfirmasi FIDS.
  const span = arrAt - depAt;
  const raw = span > 0 ? (nowMs - depAt) / span : 0;
  const progress = clamp(raw, 0, MAX_ENROUTE_PROGRESS);

  return {
    ...base,
    phase: 'enroute',
    progress,
    position: interpolate(a, b, progress),
    headingDeg: headingAt(a, b, progress),
    remainingMin: Math.max(0, Math.round((arrAt - nowMs) / 60_000)),
  };
}

/** Ringkasan sebaris untuk ditampilkan di bawah peta. */
export function phaseLabel(s: SimState, nowMs: number): string {
  switch (s.phase) {
    case 'cancelled':
      return 'Penerbangan dibatalkan';
    case 'hold':
      return 'Delay — waktu baru belum diumumkan, posisi tidak diperkirakan';
    case 'arrived':
      return 'Sudah mendarat di tujuan';
    case 'ground':
      return 'Masih di bandara asal';
    case 'enroute':
      return nowMs > s.arrAt
        ? 'Perkiraan sudah tiba di tujuan'
        : `Perkiraan sisa ±${s.remainingMin} menit`;
  }
}
