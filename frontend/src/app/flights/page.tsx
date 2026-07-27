'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Flight } from '@/types';
import SkyParticles from '@/components/effects/SkyParticles';
import {
  AirlineLogo, splitPlace, shortTime, statusTheme, gateLabel,
} from '@/components/flights/shared';
import {
  Plane, PlaneTakeoff, PlaneLanding, Search, RefreshCw, Clock,
  MapPin, DoorOpen, SearchX, Radio, Map as MapIcon,
} from 'lucide-react';

type TypeFilter = 'all' | 'departure' | 'arrival';

const FMT_CLOCK = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } as const;
const FMT_DATE = { timeZone: 'Asia/Makassar', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const;

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [airlineFilter, setAirlineFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [now, setNow] = useState<Date | null>(null);

  const loadFlights = async () => {
    setLoading(true);
    const res = await fetchApi<{ flights: Flight[] }>('/flights');
    const data: any = res.data;
    const list = Array.isArray(data) ? data : data?.flights;
    if (Array.isArray(list)) setFlights(list);
    setLoading(false);
  };

  useEffect(() => {
    loadFlights();
    // Papan FIDS menyegarkan diri tiap menit agar status tetap mutakhir.
    const sync = setInterval(loadFlights, 60_000);
    return () => clearInterval(sync);
  }, []);

  // Jam dipasang setelah mount supaya tidak bentrok dengan hasil render server.
  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const airlines = useMemo(
    () => Array.from(new Set(flights.map((f) => f.airline))).sort(),
    [flights],
  );

  const filtered = useMemo(() => flights.filter((f) => {
    if (typeFilter !== 'all' && f.flight_type !== typeFilter) return false;
    if (airlineFilter !== 'all' && f.airline !== airlineFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        f.flight_number.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q) ||
        f.origin.toLowerCase().includes(q) ||
        f.destination.toLowerCase().includes(q)
      );
    }
    return true;
  }), [flights, typeFilter, airlineFilter, search]);

  const stats = useMemo(() => ({
    total: flights.length,
    departure: flights.filter((f) => f.flight_type === 'departure').length,
    arrival: flights.filter((f) => f.flight_type === 'arrival').length,
    attention: flights.filter((f) => f.status === 'delayed' || f.status === 'cancelled').length,
  }), [flights]);

  const clock = now ? new Intl.DateTimeFormat('id-ID', FMT_CLOCK).format(now) : '--:--:--';
  const today = now ? new Intl.DateTimeFormat('id-ID', FMT_DATE).format(now) : ' ';

  return (
    <div className="bg-slate-50 pb-16">
      {/* ---------------------------------------------------------------- */}
      {/*  Hero — langit bergradien dengan partikel penerbangan             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-blue-700 to-sky-500">
        <SkyParticles tone="sky" />

        {/* kilau lembut di sudut kanan atas */}
        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-24">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/95 text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-full ring-1 ring-white/25">
                <Radio className="w-3.5 h-3.5" />
                Flight Information Display System
              </span>

              <h1 className="mt-4 text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.05]">
                Informasi Jadwal
                <br />
                <span className="text-sky-200">Penerbangan</span>
              </h1>

              <p className="mt-3 text-[14px] text-blue-100/90 max-w-lg leading-relaxed">
                Status keberangkatan dan kedatangan Bandara APT Pranoto Samarinda,
                diperbarui otomatis setiap menit.
              </p>
            </motion.div>

            {/* Kartu jam WITA */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
              className="flex-shrink-0 bg-white/12 backdrop-blur-md rounded-2xl ring-1 ring-white/25 p-5 min-w-[16rem]"
            >
              <div className="flex items-center gap-2 text-blue-100 text-[11px] font-semibold uppercase tracking-wider">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
                </span>
                Waktu Setempat · WITA
              </div>

              <p className="mt-2 text-4xl font-black text-white tabular-nums tracking-tight">{clock}</p>
              <p className="mt-1 text-[12px] text-blue-100/80">{today}</p>

              <button
                onClick={loadFlights}
                disabled={loading}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-70 text-[13px] font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Menyegarkan…' : 'Segarkan Data'}
              </button>

              <Link
                href="/peta-rute"
                className="mt-2 w-full flex items-center justify-center gap-2 bg-white/12 border border-white/25 text-white hover:bg-white/20 text-[13px] font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                <MapIcon className="w-4 h-4" />
                Peta Rute
              </Link>
            </motion.div>
          </div>

          {/* Ringkasan angka */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: 'easeOut' }}
            className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <HeroStat icon={Plane} label="Total Penerbangan" value={stats.total} />
            <HeroStat icon={PlaneTakeoff} label="Keberangkatan" value={stats.departure} />
            <HeroStat icon={PlaneLanding} label="Kedatangan" value={stats.arrival} />
            <HeroStat icon={Clock} label="Perlu Perhatian" value={stats.attention} warn={stats.attention > 0} />
          </motion.div>
        </div>

        {/* lengkungan pemisah ke area terang */}
        <svg
          className="absolute bottom-0 left-0 w-full h-12 text-slate-50"
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 48h1440V16C1200 40 960 48 720 48S240 40 0 16Z" fill="currentColor" />
        </svg>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/*  Panel filter — mengambang di atas batas hero                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 -mt-12">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 ring-1 ring-slate-200/70 p-4 flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nomor penerbangan, maskapai, atau kota…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl ring-1 ring-slate-200 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {([
                { key: 'all', label: 'Semua', icon: Plane },
                { key: 'departure', label: 'Berangkat', icon: PlaneTakeoff },
                { key: 'arrival', label: 'Datang', icon: PlaneLanding },
              ] as const).map((opt) => {
                const active = typeFilter === opt.key;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setTypeFilter(opt.key)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                      active ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="fids-type-pill"
                        className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm shadow-blue-600/30"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <select
              value={airlineFilter}
              onChange={(e) => setAirlineFilter(e.target.value)}
              className="bg-slate-50 text-slate-700 text-[13px] font-semibold ring-1 ring-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua Maskapai</option>
              {airlines.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Daftar penerbangan                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">
            {typeFilter === 'departure' ? 'Keberangkatan'
              : typeFilter === 'arrival' ? 'Kedatangan'
              : 'Semua Penerbangan'}
          </h2>
          <span className="text-[12px] text-slate-400 font-medium tabular-nums">
            {loading ? 'memuat…' : `${filtered.length} penerbangan`}
          </span>
        </div>

        {/* judul kolom, hanya pada layar lebar */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-3">Penerbangan</div>
          <div className="col-span-4">Rute</div>
          <div className="col-span-2">Jadwal WITA</div>
          <div className="col-span-1">Gate / Bagasi</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasFlights={flights.length > 0} />
        ) : (
          <motion.div
            key={`${typeFilter}-${airlineFilter}`}
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="space-y-2.5"
          >
            {filtered.map((f) => <FlightRow key={f.id} flight={f} />)}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bagian-bagian kecil                                                */
/* ------------------------------------------------------------------ */

function HeroStat({
  icon: Icon, label, value, warn = false,
}: {
  icon: React.ElementType; label: string; value: number; warn?: boolean;
}) {
  return (
    <div className="bg-white/12 backdrop-blur-md rounded-2xl ring-1 ring-white/20 px-4 py-3.5 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${warn ? 'bg-amber-400/25 text-amber-200' : 'bg-white/15 text-sky-100'}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-white leading-none tabular-nums">{value}</p>
        <p className="text-[11px] text-blue-100/80 font-medium mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function FlightRow({ flight: f }: { flight: Flight }) {
  const departing = f.flight_type === 'departure';
  const from = splitPlace(f.origin);
  const to = splitPlace(f.destination);
  const st = statusTheme(f.status);

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 30 } },
      }}
      className="group relative bg-white rounded-2xl ring-1 ring-slate-200/70 overflow-hidden transition-all hover:ring-blue-300 hover:shadow-lg hover:shadow-blue-900/5 focus-within:ring-2 focus-within:ring-blue-500"
    >
      {/* Seluruh kartu menjadi tautan ke halaman detail. Dibuat sebagai lapisan
          absolut agar tidak membungkus grid di dalamnya — tata letaknya tetap
          persis seperti semula. */}
      <Link
        href={`/flights/${f.id}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none"
        aria-label={`Detail penerbangan ${f.flight_number} ${from.code} ke ${to.code}`}
      />
      {/* pita aksen sesuai arah penerbangan */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${departing ? 'bg-blue-500' : 'bg-sky-400'}`} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pl-5 pr-4 py-4">
        {/* identitas */}
        <div className="lg:col-span-3 flex items-center gap-3">
          <AirlineLogo airline={f.airline} logo={f.airline_logo} size={42} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-black text-slate-900 text-[15px] leading-none">{f.flight_number}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${departing ? 'bg-blue-50 text-blue-600' : 'bg-sky-50 text-sky-600'}`}>
                {departing ? 'DEP' : 'ARR'}
              </span>
            </div>
            <p className="text-[12px] text-slate-500 mt-1 truncate">{f.airline}</p>
          </div>
        </div>

        {/* rute */}
        <div className="lg:col-span-4 flex items-center gap-3">
          <div className="text-left">
            <p className="text-[17px] font-black text-slate-900 leading-none">{from.code}</p>
            <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[7rem]">{from.city}</p>
          </div>

          <div className="flex-1 flex items-center min-w-[3.5rem]">
            <span className="flex-1 border-t-2 border-dashed border-slate-200" />
            <Plane className="w-4 h-4 text-blue-500 rotate-45 mx-1 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
            <span className="flex-1 border-t-2 border-dashed border-slate-200" />
          </div>

          <div className="text-right">
            <p className="text-[17px] font-black text-slate-900 leading-none">{to.code}</p>
            <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[7rem] ml-auto">{to.city}</p>
          </div>
        </div>

        {/* jadwal */}
        <div className="lg:col-span-2 flex items-center gap-4 lg:gap-0 lg:block">
          <div>
            <p className="text-[18px] font-black text-slate-900 leading-none tabular-nums">
              {shortTime(f.scheduled_time)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Terjadwal</p>
          </div>
          {f.estimated_time && (
            <div className="lg:mt-2">
              <p className={`text-[13px] font-bold tabular-nums ${st.text}`}>{shortTime(f.estimated_time)}</p>
              <p className="text-[11px] text-slate-400">Estimasi</p>
            </div>
          )}
        </div>

        {/* gate / ban bagasi, konter check-in, terminal */}
        <div className="lg:col-span-1 flex items-center gap-4 lg:gap-0 lg:block">
          {(() => {
            const g = gateLabel(f);
            return (
              <div
                className={`flex items-center gap-1.5 ${g.assigned ? 'text-slate-700' : 'text-slate-400'}`}
                title={`${g.label}: ${g.value}`}
              >
                <DoorOpen className="w-3.5 h-3.5 text-slate-400 lg:hidden" />
                <span className={g.assigned ? 'text-[15px] font-black' : 'text-[11.5px] font-semibold'}>
                  {g.assigned ? g.value : 'Belum ditentukan'}
                </span>
              </div>
            );
          })()}

          {f.flight_type === 'departure' && !!f.checkin_counters?.length && (
            <p className="text-[11px] text-slate-500 lg:mt-1">
              Konter {f.checkin_counters.join(', ')}
            </p>
          )}

          <p className="text-[11px] text-slate-400 lg:mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {f.terminal || '—'}
          </p>
        </div>

        {/* status */}
        <div className="lg:col-span-2 flex lg:justify-end">
          <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-full ${st.badge}`}>
            <span className="relative flex w-1.5 h-1.5">
              {st.pulse && (
                <span className={`absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${st.dot}`} />
              )}
              <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${st.dot}`} />
            </span>
            {st.label}
          </span>
        </div>
      </div>

      {f.remarks && (
        <p className="pl-5 pr-4 pb-3 -mt-1 text-[11.5px] text-slate-500 italic">{f.remarks}</p>
      )}
    </motion.article>
  );
}

function RowSkeleton() {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-[42px] h-[42px] rounded-xl bg-slate-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 bg-slate-200 rounded" />
          <div className="h-2.5 w-40 bg-slate-100 rounded" />
        </div>
        <div className="hidden sm:block h-3 w-24 bg-slate-100 rounded" />
        <div className="h-6 w-24 bg-slate-100 rounded-full" />
      </div>
    </div>
  );
}

function EmptyState({ hasFlights }: { hasFlights: boolean }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
        {hasFlights
          ? <SearchX className="w-6 h-6 text-slate-400" />
          : <Plane className="w-6 h-6 text-slate-400" />}
      </div>
      <p className="mt-4 text-[15px] font-bold text-slate-800">
        {hasFlights ? 'Tidak ada penerbangan yang cocok' : 'Belum ada jadwal penerbangan'}
      </p>
      <p className="mt-1 text-[13px] text-slate-500 max-w-sm mx-auto">
        {hasFlights
          ? 'Coba ubah kata kunci pencarian atau longgarkan filter maskapai.'
          : 'Data FIDS belum tersedia saat ini. Silakan segarkan beberapa saat lagi.'}
      </p>
    </div>
  );
}
