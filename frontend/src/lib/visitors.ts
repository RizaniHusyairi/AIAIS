'use client';

/**
 * Statistik kunjungan portal, untuk footer.
 *
 * Dua hal yang membedakan modul ini dari pemanggilan `fetchApi` biasa:
 *
 *   1. **Footer tampil di setiap halaman.** Tanpa cache, setiap perpindahan
 *      halaman akan menembak ulang endpoint yang sama. Karena itu hasilnya
 *      disimpan di tingkat modul dengan masa berlaku — pola yang sama dipakai
 *      `lib/settings.ts`, ditambah TTL.
 *   2. **Pencatatan tidak boleh mengganggu tampilan.** Seluruh kegagalan
 *      ditelan diam-diam; angka pengunjung bukan alasan yang sah untuk
 *      merusak halaman yang sedang dibaca orang.
 */

import { useEffect, useState } from 'react';
import { API_BASE_URL, fetchApi } from '@/lib/api';
import { shortTime } from '@/lib/place';
import type { Flight } from '@/types';

export type VisitorStats = {
  total: number;
  today: number;
  online: number;
  /** Tanggal kunjungan terlama (ISO). null bila belum ada kunjungan sama sekali. */
  since: string | null;
};

/* ------------------------------------------------------------------ */
/*  Pencatatan kunjungan                                               */
/* ------------------------------------------------------------------ */

const SESSION_PREFIX = 'aiais_visit:';

/**
 * Catat satu kunjungan halaman.
 *
 * Penanda `sessionStorage` menahan pengiriman ulang untuk lintasan yang sama
 * dalam satu sesi tab. Server juga menolak duplikat dalam 30 menit, jadi ini
 * bukan syarat kebenaran — hanya penghematan permintaan jaringan.
 */
export function recordVisit(path: string): void {
  if (typeof window === 'undefined' || !path) return;

  const key = SESSION_PREFIX + path;

  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // Mode penjelajahan privat dapat melarang sessionStorage. Kunjungannya
    // tetap dikirim — server yang akan menyaring duplikatnya.
  }

  fetch(`${API_BASE_URL}/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ page_url: path }),
    keepalive: true,
    cache: 'no-store',
  }).catch(() => {
    /* portal tetap berjalan meski pencatatan gagal */
  });
}

/* ------------------------------------------------------------------ */
/*  Statistik kunjungan                                                */
/* ------------------------------------------------------------------ */

/** Statistik jarang berubah dalam hitungan detik; satu menit sudah memadai. */
const STATS_TTL_MS = 60_000;

let statsCache: { value: VisitorStats; at: number } | null = null;
let statsInflight: Promise<VisitorStats | null> | null = null;

export async function fetchVisitorStats(): Promise<VisitorStats | null> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return statsCache.value;
  if (statsInflight) return statsInflight;

  statsInflight = fetch(`${API_BASE_URL}/visitor-stats`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const d = json?.data;
      if (!d || typeof d !== 'object') return null;

      const value: VisitorStats = {
        total: Number(d.total) || 0,
        today: Number(d.today) || 0,
        online: Number(d.online) || 0,
        since: typeof d.since === 'string' ? d.since : null,
      };

      statsCache = { value, at: Date.now() };
      return value;
    })
    .catch(() => null)
    .finally(() => {
      statsInflight = null;
    });

  return statsInflight;
}

/** Statistik kunjungan untuk footer; `null` selama memuat atau bila gagal. */
export function useVisitorStats(): VisitorStats | null {
  const [stats, setStats] = useState<VisitorStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetchVisitorStats().then((s) => {
      if (alive) setStats(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return stats;
}

/* ------------------------------------------------------------------ */
/*  Ringkasan penerbangan untuk footer                                 */
/* ------------------------------------------------------------------ */

/**
 * Jadwal berubah lebih cepat daripada statistik, tetapi tidak per detik.
 * Beranda sudah menarik `/flights` sendiri; cache ini mencegah footer
 * menggandakan permintaan itu di setiap halaman.
 */
const FLIGHTS_TTL_MS = 90_000;

let flightsCache: { value: Flight[]; at: number } | null = null;
let flightsInflight: Promise<Flight[]> | null = null;

export async function fetchFlightsCached(): Promise<Flight[]> {
  if (flightsCache && Date.now() - flightsCache.at < FLIGHTS_TTL_MS) return flightsCache.value;
  if (flightsInflight) return flightsInflight;

  flightsInflight = fetchApi<{ flights: Flight[] }>('/flights')
    .then((res) => {
      // Endpoint ini pernah mengirim larik telanjang dan pernah objek berisi
      // `flights` (jalur cadangan FIDS di lib/api.ts) — keduanya diterima.
      const raw: unknown = res.data;
      const list: Flight[] = Array.isArray(raw)
        ? (raw as Flight[])
        : Array.isArray((raw as { flights?: Flight[] })?.flights)
          ? (raw as { flights: Flight[] }).flights
          : [];

      flightsCache = { value: list, at: Date.now() };
      return list;
    })
    .catch(() => [])
    .finally(() => {
      flightsInflight = null;
    });

  return flightsInflight;
}

export type FlightSummary = {
  departures: number;
  arrivals: number;
  /** Penerbangan terjadwal terdekat yang belum berangkat/mendarat. */
  next: Flight | null;
};

/**
 * Ringkasan jadwal hari ini.
 *
 * Disaring ke tanggal hari ini karena umpan FIDS memuat pula jadwal kemarin;
 * menghitung semuanya akan menampilkan angka yang tidak cocok dengan papan
 * jadwal di halaman penerbangan.
 */
export function useFlightSummary(): FlightSummary | null {
  const [summary, setSummary] = useState<FlightSummary | null>(null);

  useEffect(() => {
    let alive = true;

    fetchFlightsCached().then((list) => {
      if (!alive) return;

      const hariIni = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
      const today = list.filter((f) => !f.flight_date || f.flight_date === hariIni);

      // "Berikutnya" hanya bermakna untuk penerbangan yang belum selesai.
      const selesai = new Set(['departed', 'landed', 'cancelled']);
      const berikutnya = today
        .filter((f) => !selesai.has(String(f.status)))
        .sort((a, b) => shortTime(a.scheduled_time).localeCompare(shortTime(b.scheduled_time)))[0] ?? null;

      setSummary({
        departures: today.filter((f) => f.flight_type === 'departure').length,
        arrivals: today.filter((f) => f.flight_type === 'arrival').length,
        next: berikutnya,
      });
    });

    return () => {
      alive = false;
    };
  }, []);

  return summary;
}
