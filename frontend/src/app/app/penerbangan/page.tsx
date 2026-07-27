'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Flight } from '@/types';
import SkyParticles from '@/components/effects/SkyParticles';
import { StatusBar, AppHeader, ShareButton, Segmented, listContainer, listItem } from '@/components/pwa/ui';
import {
  AirlineLogo, splitPlace, shortTime, statusTheme, gateLabel, fmtFlightDate,
} from '@/components/flights/shared';
import {
  Plane, PlaneTakeoff, PlaneLanding, Calendar, ChevronRight, DoorOpen, SearchX,
  Luggage, ClipboardList,
} from 'lucide-react';

const FMT_CLOCK = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false } as const;

export default function PenerbanganScreen() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [tab, setTab] = useState<'departure' | 'arrival'>('departure');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    fetchApi<{ flights: Flight[] }>('/flights').then((res) => {
      const data: any = res.data;
      const list = Array.isArray(data) ? data : data?.flights;
      if (Array.isArray(list)) setFlights(list);
    });
  }, []);

  // Jam dipasang setelah mount supaya tidak bentrok dengan hasil render server.
  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  /* Daftar apa adanya dari API. Bila kosong, tampilkan keadaan kosong —
     jangan diisi data contoh yang tampak seperti jadwal sungguhan. */
  const rows = useMemo(() => flights.filter((f) => f.flight_type === tab), [flights, tab]);

  const clock = now ? new Intl.DateTimeFormat('id-ID', FMT_CLOCK).format(now) : '--:--';

  /** Tanggal yang dicakup data FIDS saat ini (bila dikirim). */
  const dataDate = flights.find((f) => f.flight_date)?.flight_date ?? null;

  return (
    <div className="min-h-full bg-slate-50">
      {/* ---------------------------------------------------------------- */}
      {/*  Hero langit dengan partikel penerbangan                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-blue-700 to-sky-500">
        <SkyParticles tone="sky" density="low" />

        <div className="relative">
          <StatusBar />
          <AppHeader tone="light" title="Informasi Penerbangan" action={<ShareButton tone="light" />} />

          <div className="px-4 pb-6 pt-1">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/80">
                  Bandara APT Pranoto
                </p>
                <p className="mt-1 text-[26px] font-black text-white leading-none">
                  {rows.length} <span className="text-[15px] font-bold text-blue-100/90">penerbangan</span>
                </p>
                <p className="mt-1.5 text-[12px] text-blue-100/80">
                  {tab === 'departure' ? 'Keberangkatan hari ini' : 'Kedatangan hari ini'}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-blue-100/80">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </span>
                  WITA
                </div>
                <p className="text-[28px] font-black text-white leading-none tabular-nums mt-0.5">{clock}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Kontrol — menempel di bawah hero                                 */}
      {/* ---------------------------------------------------------------- */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-4 py-3 space-y-3">
        <Segmented
          layoutId="fids-tab"
          value={tab}
          onChange={(v) => setTab(v)}
          options={[
            { value: 'departure', label: 'Keberangkatan', icon: <PlaneTakeoff className="w-3.5 h-3.5" /> },
            { value: 'arrival', label: 'Kedatangan', icon: <PlaneLanding className="w-3.5 h-3.5" /> },
          ]}
        />

        {/* Tanggal yang benar-benar dicakup data. FIDS bandara hanya
            menerbitkan jadwal hari berjalan, jadi tidak ada pilihan hari lain.
            Sebelumnya di sini ada tiga tombol tanggal yang dipatok mati dan
            tidak memfilter apa pun. */}
        {dataDate && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl font-semibold">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {fmtFlightDate(dataDate)}
            </span>
            <span className="text-[11px] text-slate-400">Jadwal hari ini</span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Daftar penerbangan                                               */}
      {/* ---------------------------------------------------------------- */}
      {rows.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <SearchX className="w-6 h-6 text-slate-400" />
          </div>
          <p className="mt-4 text-[15px] font-bold text-slate-800">Belum ada jadwal</p>
          <p className="mt-1 text-[13px] text-slate-500">
            Jadwal {tab === 'departure' ? 'keberangkatan' : 'kedatangan'} belum tersedia.
          </p>
        </div>
      ) : (
        <motion.div
          key={tab}
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="p-4 space-y-3"
        >
          {rows.map((f) => (
            <motion.div key={f.id} variants={listItem}>
              <FlightCard flight={f} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kartu penerbangan bergaya boarding pass                            */
/* ------------------------------------------------------------------ */

function FlightCard({ flight: f }: { flight: Flight }) {
  const departing = f.flight_type === 'departure';
  const from = splitPlace(f.origin);
  const to = splitPlace(f.destination);
  const st = statusTheme(f.status);

  return (
    <Link
      href={`/app/penerbangan/${f.id}`}
      className="block relative bg-white rounded-2xl overflow-hidden shadow-sm shadow-slate-200/60 ring-1 ring-slate-100 active:scale-[0.985] transition-transform"
    >
      {/* pita aksen sesuai arah penerbangan */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${departing ? 'bg-blue-500' : 'bg-sky-400'}`} />

      <div className="pl-4 pr-3.5 py-3.5">
        {/* baris identitas */}
        <div className="flex items-center gap-3">
          <AirlineLogo airline={f.airline} logo={f.airline_logo} size={40} />
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-[14.5px] leading-none">{f.flight_number}</p>
            <p className="text-[11px] text-slate-500 truncate mt-1">{f.airline}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full ${st.badge}`}>
            <span className="relative flex w-1.5 h-1.5">
              {st.pulse && (
                <span className={`absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${st.dot}`} />
              )}
              <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${st.dot}`} />
            </span>
            {st.label}
          </span>
        </div>

        {/* rute */}
        <div className="flex items-center gap-2.5 mt-3.5">
          <div>
            <p className="text-[19px] font-black text-slate-900 leading-none">{from.code}</p>
            <p className="text-[10.5px] text-slate-500 truncate max-w-[5.5rem] mt-1">{from.city}</p>
          </div>

          <div className="flex-1 flex items-center">
            <span className="flex-1 border-t-2 border-dashed border-slate-200" />
            <Plane className="w-3.5 h-3.5 text-blue-500 rotate-45 mx-1" />
            <span className="flex-1 border-t-2 border-dashed border-slate-200" />
          </div>

          <div className="text-right">
            <p className="text-[19px] font-black text-slate-900 leading-none">{to.code}</p>
            <p className="text-[10.5px] text-slate-500 truncate max-w-[5.5rem] mt-1 ml-auto">{to.city}</p>
          </div>
        </div>
      </div>

      {/* kaki kartu: jam, gate, terminal */}
      <div className="flex items-center gap-4 border-t border-dashed border-slate-200 bg-slate-50/70 pl-4 pr-3 py-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-black text-slate-900 tabular-nums">{shortTime(f.scheduled_time)}</span>
          <span className="text-[10px] text-slate-400 font-medium">WITA</span>
        </div>

        {f.estimated_time && (
          <span className={`text-[11px] font-bold tabular-nums ${st.text}`}>
            est. {shortTime(f.estimated_time)}
          </span>
        )}

        {/* Gate (keberangkatan) atau ban bagasi (kedatangan). Bila FIDS belum
            menetapkannya, katakan apa adanya — jangan tampilkan nomor karangan. */}
        {(() => {
          const g = gateLabel(f);
          return (
            <span
              className={`flex items-center gap-1 text-[11px] font-medium ${
                g.assigned ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {f.flight_type === 'arrival' ? (
                <Luggage className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
              )}
              {g.assigned ? g.value : `${g.label} —`}
            </span>
          );
        })()}

        {f.flight_type === 'departure' && !!f.checkin_counters?.length && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
            Konter {f.checkin_counters.join(', ')}
          </span>
        )}

        <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
      </div>
    </Link>
  );
}
