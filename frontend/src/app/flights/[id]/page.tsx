'use client';

/**
 * Detail satu penerbangan untuk portal desktop.
 *
 * Sebelumnya `/flights` hanya berupa daftar tanpa halaman detail sama sekali;
 * halaman ini menjadi pasangan desktop dari `/app/penerbangan/[id]` dan
 * memakai komponen bersama yang sama.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Flight } from '@/types';
import SkyParticles from '@/components/effects/SkyParticles';
import FlightMap from '@/components/map/FlightMap';
import SimulationNotice from '@/components/map/SimulationNotice';
import { simulateAt, phaseLabel } from '@/lib/flightSim';
import {
  AirlineLogo, splitPlace, shortTime, statusTheme, gateLabel,
  fmtFlightDate, relativeUpdated,
} from '@/components/flights/shared';
import {
  Plane, ArrowLeft, MapPin, Clock, DoorOpen, Luggage, ClipboardList,
  TriangleAlert, Phone, Mail, RefreshCw, Map as MapIcon, SearchX, Ruler,
} from 'lucide-react';

export default function FlightDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const loadFlights = async () => {
    const res = await fetchApi<{ flights: Flight[] } | Flight[]>('/flights');
    const raw = res.data;
    const list = Array.isArray(raw) ? raw : raw?.flights;
    if (Array.isArray(list)) setFlights(list);
    setLoading(false);
  };

  useEffect(() => {
    loadFlights();
    const sync = setInterval(loadFlights, 60_000);
    return () => clearInterval(sync);
  }, []);

  // Dipasang setelah mount agar tidak bentrok dengan hasil render server.
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const flight = useMemo(() => flights.find((f) => String(f.id) === id) ?? null, [flights, id]);

  /* Simulasi dan labelnya dihitung bersama supaya `nowMs` tidak perlu
     dibaca ulang saat render (React melarang fungsi tak murni di sana). */
  const { sim, simText } = useMemo(() => {
    if (!flight || nowMs === null) return { sim: null, simText: '' };
    const s = simulateAt(flight, nowMs);
    return { sim: s, simText: s ? phaseLabel(s, nowMs) : '' };
  }, [flight, nowMs]);

  /* ---------------- Belum ditemukan ---------------- */
  if (!loading && !flight) {
    return (
      <div className="bg-slate-50 min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">Penerbangan tidak ditemukan</h1>
          <p className="mt-2 text-[13.5px] text-slate-500 leading-relaxed">
            Jadwal penerbangan hanya memuat hari berjalan, sehingga tautan lama bisa menjadi
            tidak berlaku setelah pergantian hari.
          </p>
          <Link
            href="/flights"
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Jadwal
          </Link>
        </div>
      </div>
    );
  }

  if (!flight) {
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
          <p className="text-slate-500 text-[13px]">Memuat detail penerbangan...</p>
        </div>
      </div>
    );
  }

  const from = splitPlace(flight.origin);
  const to = splitPlace(flight.destination);
  const theme = statusTheme(flight.status);
  const gate = gateLabel(flight);
  const isArrival = flight.flight_type === 'arrival';
  const disrupted = flight.status === 'delayed' || flight.status === 'cancelled';
  const counters = flight.checkin_counters ?? [];

  return (
    <div className="bg-slate-50">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-blue-700 to-sky-500">
        <SkyParticles tone="sky" density="low" />
        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-20">
          <Link
            href="/flights"
            className="inline-flex items-center gap-2 text-blue-100 hover:text-white text-[13px] font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Semua Penerbangan
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-8"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <AirlineLogo airline={flight.airline} logo={flight.airline_logo} size={52} />
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                    {flight.flight_number}
                  </h1>
                  <p className="mt-1.5 text-[14px] text-blue-100/90 truncate">{flight.airline}</p>
                </div>
                <span className={`ml-2 text-[12px] font-bold px-3.5 py-1.5 rounded-full ${theme.badge}`}>
                  {theme.label}
                </span>
              </div>

              {/* rute */}
              <div className="mt-7 flex items-center gap-5">
                <div className="min-w-0">
                  <p className="text-4xl font-black text-white leading-none">{from.code}</p>
                  <p className="mt-1.5 text-[13px] text-blue-100/90 truncate max-w-[12rem]">{from.city}</p>
                  {flight.origin_city && (
                    <p className="text-[11px] text-blue-200/70 truncate max-w-[12rem]">{flight.origin_city}</p>
                  )}
                </div>

                <div className="flex items-center flex-1 max-w-[14rem]">
                  <span className="flex-1 border-t-2 border-dashed border-white/30" />
                  <Plane className="w-5 h-5 text-cyan-200 rotate-45 mx-2 flex-shrink-0" />
                  <span className="flex-1 border-t-2 border-dashed border-white/30" />
                </div>

                <div className="min-w-0">
                  <p className="text-4xl font-black text-white leading-none">{to.code}</p>
                  <p className="mt-1.5 text-[13px] text-blue-100/90 truncate max-w-[12rem]">{to.city}</p>
                  {flight.destination_city && (
                    <p className="text-[11px] text-blue-200/70 truncate max-w-[12rem]">{flight.destination_city}</p>
                  )}
                </div>
              </div>
            </div>

            {/* kartu jadwal */}
            <div className="flex-shrink-0 bg-white/12 backdrop-blur-md rounded-2xl ring-1 ring-white/25 p-5 min-w-[16rem]">
              {flight.flight_date && (
                <p className="text-[11px] text-blue-100/80 font-semibold">{fmtFlightDate(flight.flight_date)}</p>
              )}
              <p className="mt-1.5 text-[11px] text-blue-100 font-semibold uppercase tracking-wider">
                {isArrival ? 'Jadwal Tiba' : 'Jadwal Berangkat'}
              </p>
              <p className="mt-1 text-4xl font-black text-white tabular-nums tracking-tight">
                {shortTime(flight.scheduled_time)}
                <span className="ml-1.5 text-[13px] font-semibold text-blue-200">WITA</span>
              </p>

              <div className="mt-4 pt-3.5 border-t border-white/20 grid grid-cols-2 gap-3 text-white">
                <div>
                  <p className="text-[10.5px] text-blue-200">{gate.label}</p>
                  <p className={`font-bold ${gate.assigned ? 'text-[15px]' : 'text-[12px] text-blue-200/70'}`}>
                    {gate.value}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] text-blue-200">Perkiraan</p>
                  <p className={`font-bold ${flight.estimated_time || !disrupted ? 'text-[15px]' : 'text-[12px] text-blue-200/70'}`}>
                    {flight.estimated_time
                      ? shortTime(flight.estimated_time)
                      : disrupted
                        ? 'Belum diumumkan'
                        : 'Sesuai jadwal'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ ISI ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ---- Peta rute ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-7 bg-white rounded-3xl shadow-lg shadow-slate-300/30 border border-slate-100 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 pt-4 pb-3">
              <MapIcon className="w-4 h-4 text-blue-600" />
              <h2 className="text-[15px] font-black text-slate-900 flex-1">Rute Penerbangan</h2>
              {sim && (
                <span className="flex items-center gap-1.5 text-[11.5px] text-slate-500 tabular-nums">
                  <Ruler className="w-3.5 h-3.5" /> {Math.round(sim.distanceKm)} km
                </span>
              )}
            </div>

            {sim ? (
              <>
                <FlightMap flights={[flight]} mode="single" height="380px" />
                <div className="p-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-900">{simText}</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-500 tabular-nums">
                      Perkiraan lama penerbangan ±{Math.floor(sim.durationMin / 60)} jam{' '}
                      {sim.durationMin % 60} menit
                    </p>
                  </div>
                  <SimulationNotice />
                </div>
              </>
            ) : (
              <div className="px-5 pb-5">
                <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <MapIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-slate-500 leading-relaxed">
                    Peta rute belum tersedia untuk bandara ini — koordinatnya belum terdata pada
                    sistem.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* ---- Panel informasi ---- */}
          <div className="lg:col-span-5 space-y-4">
            {flight.delay_reason && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <TriangleAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-amber-900">Alasan Keterlambatan</p>
                  <p className="mt-0.5 text-[12px] text-amber-800 leading-relaxed">{flight.delay_reason}</p>
                </div>
              </div>
            )}

            {flight.note && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <ClipboardList className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-blue-900">Catatan Petugas</p>
                  <p className="mt-0.5 text-[12px] text-blue-800 leading-relaxed">{flight.note}</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-lg shadow-slate-300/25 border border-slate-100 p-5">
              <h2 className="text-[15px] font-black text-slate-900">Informasi Operasional</h2>

              <dl className="mt-4 space-y-3.5">
                {!isArrival && (
                  <Row icon={DoorOpen} label="Konter Check-in" value={counters.length ? counters.join(', ') : 'Belum ditentukan'} muted={!counters.length} />
                )}
                {/* Untuk kedatangan, `gateLabel` juga menghasilkan "Ban Bagasi",
                    jadi cukup satu baris agar tidak tampil ganda. */}
                <Row
                  icon={isArrival ? Luggage : DoorOpen}
                  label={gate.label}
                  value={gate.value}
                  muted={!gate.assigned}
                />
                <Row icon={Plane} label="Tipe Pesawat" value={flight.aircraft_type || 'Tidak tersedia'} muted={!flight.aircraft_type} />
                <Row icon={MapPin} label="Terminal" value={flight.terminal || 'Terminal Utama'} />
                <Row icon={ClipboardList} label="Keterangan FIDS" value={flight.remarks || 'Tidak ada'} muted={!flight.remarks} />
              </dl>

              {flight.is_extra && (
                <p className="mt-4 text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Penerbangan tambahan di luar jadwal reguler.
                </p>
              )}

              {flight.updated_at && (
                <p className="mt-4 pt-3.5 border-t border-dashed border-slate-200 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <RefreshCw className="w-3 h-3" /> Status diperbarui {relativeUpdated(flight.updated_at)}
                </p>
              )}
            </div>

            {(flight.airline_phone || flight.airline_email) && (
              <div className="bg-white rounded-3xl shadow-lg shadow-slate-300/25 border border-slate-100 p-5">
                <h2 className="text-[15px] font-black text-slate-900">Kontak {flight.airline}</h2>
                <div className="mt-4 space-y-2.5">
                  {flight.airline_phone && (
                    <a
                      href={`tel:${flight.airline_phone.replace(/[^\d+]/g, '')}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-colors group"
                    >
                      <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10.5px] text-slate-400">Telepon</p>
                        <p className="text-[13.5px] font-bold text-slate-900 truncate">{flight.airline_phone}</p>
                      </div>
                    </a>
                  )}
                  {flight.airline_email && (
                    <a
                      href={`mailto:${flight.airline_email}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors"
                    >
                      <span className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10.5px] text-slate-400">Email</p>
                        <p className="text-[13.5px] font-bold text-slate-900 truncate">{flight.airline_email}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}

            <Link
              href="/peta-rute"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13.5px] py-3.5 rounded-2xl shadow-lg shadow-blue-600/25 transition-colors"
            >
              <MapIcon className="w-4 h-4" /> Lihat Semua Rute Hari Ini
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({
  icon: Icon, label, value, muted = false,
}: {
  icon: typeof Clock; label: string; value: string; muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </span>
      <dt className="text-[12px] text-slate-500 flex-1">{label}</dt>
      <dd className={`text-[13.5px] font-bold text-right ${muted ? 'text-slate-400' : 'text-slate-900'}`}>
        {value}
      </dd>
    </div>
  );
}
