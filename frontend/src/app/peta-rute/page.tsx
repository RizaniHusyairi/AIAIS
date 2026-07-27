'use client';

/**
 * Papan peta rute — seluruh penerbangan hari ini pada satu peta.
 *
 * Dirancang untuk dua pemakaian:
 *   - Halaman biasa di portal (dengan navbar & footer).
 *   - Layar display terminal lewat `?kiosk=1`: overlay layar penuh yang
 *     menutupi chrome portal, karena App Router hanya mengizinkan satu root
 *     layout dan `layout.tsx` selalu merender Navbar/Footer.
 *
 * Parameter debug `?t=HH:MM` mengunci jam simulasi, supaya fase "en route"
 * bisa diuji kapan saja tanpa menunggu jadwal nyata.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Flight } from '@/types';
import FlightMap from '@/components/map/FlightMap';
import SimulationNotice from '@/components/map/SimulationNotice';
import { simulateAt, phaseLabel, todayWita, witaEpoch } from '@/lib/flightSim';
import {
  AirlineLogo, splitPlace, shortTime, statusTheme, fmtFlightDate,
} from '@/components/flights/shared';
import {
  Plane, PlaneTakeoff, PlaneLanding, X, Maximize2, ArrowLeft, Radio, MapPinOff,
} from 'lucide-react';

/** Batas keras agar papan tidak kewalahan bila umpan FIDS membesar. */
const MAX_FLIGHTS = 60;

/**
 * `useSearchParams` pada halaman statis wajib berada di dalam batas Suspense,
 * kalau tidak build produksi gagal (missing-suspense-with-csr-bailout).
 * Isinya dipisah supaya batas itu bisa dipasang di komponen halaman.
 */
export default function PetaRutePage() {
  return (
    <Suspense fallback={<PetaRuteSkeleton />}>
      <PetaRuteContent />
    </Suspense>
  );
}

function PetaRuteSkeleton() {
  return (
    <div className="bg-slate-50 min-h-[70vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
        >
          <Plane className="w-7 h-7 text-white rotate-45" />
        </motion.div>
        <p className="text-slate-500 text-[13px]">Memuat peta rute...</p>
      </div>
    </div>
  );
}

function PetaRuteContent() {
  const search = useSearchParams();
  const kiosk = search.get('kiosk') === '1';
  const timeParam = search.get('t');

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const loadFlights = async () => {
    const res = await fetchApi<{ flights: Flight[] } | Flight[]>('/flights');
    const raw = res.data;
    const list = Array.isArray(raw) ? raw : raw?.flights;
    if (Array.isArray(list)) setFlights(list.slice(0, MAX_FLIGHTS));
    setLoading(false);
  };

  useEffect(() => {
    loadFlights();
    const sync = setInterval(loadFlights, 60_000);
    return () => clearInterval(sync);
  }, []);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /** Jam simulasi: dikunci oleh `?t=HH:MM` bila ada, kalau tidak jam nyata. */
  const simNow = useMemo(() => {
    if (!timeParam) return nowMs ?? undefined;
    const forced = witaEpoch(todayWita(), timeParam);
    return forced ?? nowMs ?? undefined;
  }, [timeParam, nowMs]);

  /* Satu perhitungan untuk semuanya: penerbangan yang koordinatnya dikenali,
     jumlah yang tidak, label fase per penerbangan, dan jumlah yang sedang
     terbang. Penerbangan tanpa koordinat dilaporkan, bukan disembunyikan. */
  const { mapped, unmapped, labels, enroute } = useMemo(() => {
    const t = simNow ?? nowMs;
    if (t == null) {
      return { mapped: [] as Flight[], unmapped: 0, labels: new Map<string, string>(), enroute: 0 };
    }

    const ok: Flight[] = [];
    const text = new Map<string, string>();
    let miss = 0;
    let flying = 0;

    for (const f of flights) {
      const s = simulateAt(f, t);
      if (!s) {
        miss++;
        continue;
      }
      ok.push(f);
      text.set(String(f.id), phaseLabel(s, t));
      if (s.phase === 'enroute') flying++;
    }

    return { mapped: ok, unmapped: miss, labels: text, enroute: flying };
  }, [flights, nowMs, simNow]);

  const dataDate = flights.find((f) => f.flight_date)?.flight_date ?? null;

  const mapEl = (
    <FlightMap
      flights={mapped}
      mode="multi"
      height="100%"
      interactive={!kiosk}
      selectedId={selectedId}
      onSelect={(id) => setSelectedId((cur) => (String(cur) === String(id) ? null : id))}
      nowMs={simNow}
    />
  );

  /* ================= MODE KIOS ================= */
  if (kiosk) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0b1e5b] flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 bg-[#081745] border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/icon-app.svg" alt="" className="w-8 h-8 rounded-lg" />
            <div className="leading-none">
              <p className="font-black text-white text-[15px] tracking-wide">BANDARA APT PRANOTO</p>
              <p className="text-[10px] text-blue-300 tracking-[0.2em] mt-0.5">PETA RUTE PENERBANGAN</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-white">
            <Stat label="Penerbangan" value={mapped.length} />
            <Stat label="Dalam Perjalanan" value={enroute} accent="#22d3ee" />
            {dataDate && (
              <div className="text-right">
                <p className="text-[10px] text-blue-300 uppercase tracking-wider">Tanggal</p>
                <p className="text-[13px] font-bold">{fmtFlightDate(dataDate)}</p>
              </div>
            )}
            <Link
              href="/peta-rute"
              className="text-blue-200 hover:text-white transition-colors"
              aria-label="Keluar dari mode layar penuh"
            >
              <X className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">{mapEl}</div>

        <div className="flex items-center justify-between gap-4 px-6 py-2.5 bg-[#081745] border-t border-white/10 flex-shrink-0">
          <p className="text-[11px] text-blue-200/80">
            Posisi pesawat adalah simulasi dari jam jadwal dan status — bukan pelacakan radar.
            Peta: Natural Earth (domain publik).
          </p>
          {unmapped > 0 && (
            <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5 flex-shrink-0">
              <MapPinOff className="w-3.5 h-3.5" />
              {unmapped} penerbangan tanpa data koordinat bandara
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ================= MODE PORTAL ================= */
  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-blue-700 to-sky-500">
        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16">
          <Link
            href="/flights"
            className="inline-flex items-center gap-2 text-blue-100 hover:text-white text-[13px] font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Jadwal Penerbangan
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex flex-col lg:flex-row lg:items-end justify-between gap-6"
          >
            <div>
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/95 text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-full ring-1 ring-white/25">
                <Radio className="w-3.5 h-3.5" /> Peta Rute
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.05]">
                Rute Penerbangan
                <br />
                <span className="text-sky-200">Hari Ini</span>
              </h1>
              <p className="mt-3 text-[14px] text-blue-100/90 max-w-lg leading-relaxed">
                Seluruh keberangkatan dan kedatangan Bandara APT Pranoto pada satu peta.
                {dataDate && ` ${fmtFlightDate(dataDate)}.`}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="bg-white/12 backdrop-blur-md rounded-2xl ring-1 ring-white/25 px-5 py-4 flex gap-6 text-white">
                <Stat label="Penerbangan" value={mapped.length} />
                <Stat label="Dalam Perjalanan" value={enroute} accent="#a5f3fc" />
              </div>
              <Link
                href="/peta-rute?kiosk=1"
                className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13px] px-4 py-3.5 rounded-2xl transition-colors"
                title="Mode layar penuh untuk display terminal"
              >
                <Maximize2 className="w-4 h-4" /> Layar Penuh
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white rounded-3xl shadow-lg shadow-slate-300/30 border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="h-[520px] flex flex-col items-center justify-center gap-4">
                <motion.div
                  animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
                >
                  <Plane className="w-7 h-7 text-white rotate-45" />
                </motion.div>
                <p className="text-slate-500 text-[13px]">Memuat peta rute...</p>
              </div>
            ) : mapped.length === 0 ? (
              <div className="h-[520px] flex flex-col items-center justify-center gap-3 px-6 text-center">
                <MapPinOff className="w-10 h-10 text-slate-300" />
                <p className="text-[14px] font-bold text-slate-700">Belum ada rute untuk ditampilkan</p>
                <p className="text-[12.5px] text-slate-500 max-w-sm leading-relaxed">
                  Tidak ada penerbangan pada umpan FIDS saat ini, atau koordinat bandaranya belum
                  terdata.
                </p>
              </div>
            ) : (
              <div className="h-[520px]">{mapEl}</div>
            )}

            <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <SimulationNotice />
              {unmapped > 0 && (
                <p className="text-[11.5px] text-amber-700 flex items-center gap-1.5">
                  <MapPinOff className="w-3.5 h-3.5" />
                  {unmapped} penerbangan tidak dipetakan (koordinat bandara belum terdata)
                </p>
              )}
            </div>
          </div>

          {/* Daftar penerbangan yang dapat dipilih */}
          <div className="lg:col-span-4 bg-white rounded-3xl shadow-lg shadow-slate-300/25 border border-slate-100 p-4">
            <h2 className="text-[15px] font-black text-slate-900 px-1">Penerbangan di Peta</h2>
            <p className="mt-1 px-1 text-[11.5px] text-slate-500">
              Pilih satu untuk menyorot rutenya.
            </p>

            <div className="mt-3 space-y-2 max-h-[520px] overflow-y-auto">
              {mapped.map((f) => {
                const place = splitPlace(f.flight_type === 'departure' ? f.destination : f.origin);
                const theme = statusTheme(f.status);
                const active = String(selectedId) === String(f.id);

                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(active ? null : f.id)}
                    className={`w-full text-left flex items-center gap-3 p-2.5 rounded-2xl transition-colors cursor-pointer ${
                      active ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-slate-50'
                    }`}
                  >
                    <AirlineLogo airline={f.airline} logo={f.airline_logo} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {f.flight_type === 'departure' ? (
                          <PlaneTakeoff className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <PlaneLanding className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                        )}
                        <p className="font-bold text-slate-900 text-[13px] truncate">{f.flight_number}</p>
                        <span className="text-[11px] text-slate-400">·</span>
                        <p className="text-[12px] font-bold text-slate-700">{place.code}</p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                        {labels.get(String(f.id)) ?? '—'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12.5px] font-bold text-slate-900 tabular-nums">
                        {shortTime(f.scheduled_time)}
                      </p>
                      <p className={`text-[10px] font-semibold ${theme.text}`}>{theme.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] text-blue-200 uppercase tracking-wider">{label}</p>
      <p className="text-[22px] font-black tabular-nums leading-none mt-0.5" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}
