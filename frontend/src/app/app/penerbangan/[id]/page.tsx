'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Flight } from '@/types';
import { StatusBar, AppHeader, ShareButton } from '@/components/pwa/ui';
import {
  AirlineLogo, splitPlace, statusTheme, shortTime, fmtFlightDate, relativeUpdated,
} from '@/components/flights/shared';
import FlightMap from '@/components/map/FlightMap';
import SimulationNotice from '@/components/map/SimulationNotice';
import { simulateAt, phaseLabel } from '@/lib/flightSim';
import {
  Plane, Bookmark, Luggage, DoorOpen, Info, TriangleAlert, Phone, Mail,
  ClipboardList, RefreshCw, Map as MapIcon, SearchX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export default function DetailPenerbanganScreen() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  /** Dipasang setelah mount agar tidak bentrok dengan hasil render server. */
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    fetchApi<{ flights: Flight[] } | Flight[]>('/flights').then((res) => {
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.flights;
      if (Array.isArray(list)) setFlights(list);
      setLoading(false);
    });
  }, []);

  // Hanya untuk teks ringkasan di bawah peta; peta menganimasikan dirinya sendiri.
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* Hanya penerbangan yang benar-benar ada di umpan. Jangan pernah jatuh ke
     penerbangan lain atau ke data karangan — tautan kedaluwarsa yang
     menampilkan penerbangan asing sebagai milik pengguna jauh lebih
     menyesatkan daripada halaman "tidak ditemukan". */
  const flight = flights.find((f) => String(f.id) === id) ?? null;

  if (!flight) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="sticky top-0 z-20 bg-gradient-to-b from-blue-50 to-slate-50">
          <StatusBar />
          <AppHeader title="Detail Penerbangan" />
        </div>

        <div className="px-6 py-16 flex flex-col items-center text-center">
          {loading ? (
            <>
              <motion.div
                animate={{ x: [-12, 12, -12], y: [3, -3, 3] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
              >
                <Plane className="w-7 h-7 text-white rotate-45" />
              </motion.div>
              <p className="mt-4 text-slate-500 text-[13px]">Memuat detail penerbangan...</p>
            </>
          ) : (
            <>
              <SearchX className="w-12 h-12 text-slate-300" />
              <p className="mt-4 text-[16px] font-bold text-slate-800">Penerbangan tidak ditemukan</p>
              <p className="mt-1.5 text-[12.5px] text-slate-500 leading-relaxed max-w-xs">
                Jadwal hanya memuat hari berjalan, sehingga tautan lama menjadi tidak berlaku
                setelah pergantian hari.
              </p>
              <Link
                href="/app/penerbangan"
                className="mt-6 inline-flex items-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-semibold text-[13px] px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/25"
              >
                Lihat Jadwal Penerbangan
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const from = splitPlace(flight.origin);
  const to = splitPlace(flight.destination);
  const theme = statusTheme(flight.status);
  const isArrival = flight.flight_type === 'arrival';
  /** Penerbangan yang tidak berjalan normal — jadwalnya tidak bisa diklaim tepat. */
  const disrupted = flight.status === 'delayed' || flight.status === 'cancelled';

  const counters = flight.checkin_counters ?? [];

  /* Peta rute. `null` berarti koordinat bandara tidak dikenali — dalam hal itu
     peta ditekan sepenuhnya, bukan menampilkan posisi tebakan.
     Label dihitung bersamaan agar `Date.now()` tidak dipanggil saat render. */
  const sim = nowMs === null ? null : simulateAt(flight, nowMs);
  const simText = sim && nowMs !== null ? phaseLabel(sim, nowMs) : '';

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-gradient-to-b from-blue-50 to-slate-50">
        <StatusBar />
        <AppHeader title="Detail Penerbangan" action={<ShareButton />} />
      </div>

      <div className="p-4 space-y-4">
        {/* Main ticket card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="bg-white rounded-3xl shadow-lg shadow-slate-200/70 overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AirlineLogo airline={flight.airline} logo={flight.airline_logo} code={flight.airline_code} color={flight.airline_color} size={44} />
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-[17px] leading-none">{flight.flight_number}</p>
                  <p className="text-[12px] text-slate-500 mt-1 truncate">{flight.airline}</p>
                </div>
              </div>
              <span className={`flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full ${theme.badge}`}>
                {theme.label}
              </span>
            </div>

            {/* Route */}
            <div className="flex items-center justify-between mt-6">
              <div className="min-w-0 max-w-[38%]">
                <p className="text-[26px] font-black text-slate-900 leading-none">{from.code}</p>
                <p className="text-[12px] text-slate-500 mt-1 truncate">{from.city}</p>
                {flight.origin_city && (
                  <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">{flight.origin_city}</p>
                )}
              </div>
              <div className="flex-1 flex items-center px-2">
                <div className="flex-1 border-t-2 border-dashed border-slate-200" />
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center mx-1 flex-shrink-0">
                  <Plane className="w-4 h-4 text-blue-600 rotate-45" />
                </div>
                <div className="flex-1 border-t-2 border-dashed border-slate-200" />
              </div>
              <div className="text-right min-w-0 max-w-[38%]">
                <p className="text-[26px] font-black text-slate-900 leading-none">{to.code}</p>
                <p className="text-[12px] text-slate-500 mt-1 truncate">{to.city}</p>
                {flight.destination_city && (
                  <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">{flight.destination_city}</p>
                )}
              </div>
            </div>
          </div>

          {/* perforation */}
          <div className="relative">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50" />
            <div className="border-t-2 border-dashed border-slate-100 mx-5" />
          </div>

          <div className="p-5 pt-4">
            {flight.flight_date && (
              <p className="text-center text-[12px] text-slate-500 font-medium">
                {fmtFlightDate(flight.flight_date)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-y-4 mt-4">
              <Detail
                label={isArrival ? 'Jadwal Tiba' : 'Jadwal Berangkat'}
                value={shortTime(flight.scheduled_time)}
                sub={flight.terminal || undefined}
              />
              {/* FIDS tidak mengirim waktu estimasi tersendiri. Untuk
                  penerbangan delay/batal jangan tulis "Sesuai jadwal" —
                  itu bertentangan dengan statusnya sendiri. */}
              <Detail
                label="Perkiraan"
                value={
                  flight.estimated_time
                    ? shortTime(flight.estimated_time)
                    : disrupted
                      ? 'Belum diumumkan'
                      : 'Sesuai jadwal'
                }
                sub={flight.estimated_time ? 'diperbarui petugas' : undefined}
                valueClass={flight.estimated_time || !disrupted ? 'text-slate-900' : 'text-slate-400 text-[13px]'}
                align="right"
              />
              <Detail
                label={isArrival ? 'Conveyor' : 'Gate'}
                value={
                  isArrival
                    ? flight.baggage_belt != null ? String(flight.baggage_belt) : 'Belum ditentukan'
                    : flight.gate || 'Belum ditentukan'
                }
                valueClass={
                  (isArrival ? flight.baggage_belt != null : !!flight.gate)
                    ? 'text-slate-900'
                    : 'text-slate-400 text-[13px]'
                }
              />
              <Detail label="Status" value={theme.label} valueClass={theme.text} align="right" />
            </div>
          </div>
        </motion.div>

        {/* ===== PETA RUTE ===== */}
        {sim ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-3xl shadow-sm shadow-slate-200/70 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
              <MapIcon className="w-4 h-4 text-blue-600" />
              <h3 className="text-[13.5px] font-bold text-slate-900 flex-1">Rute Penerbangan</h3>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {Math.round(sim.distanceKm)} km
              </span>
            </div>

            <FlightMap flights={[flight]} mode="single" height="220px" interactive={false} />

            <div className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-slate-700">{simText}</p>
                <p className="text-[11px] text-slate-400 tabular-nums flex-shrink-0">
                  ±{Math.floor(sim.durationMin / 60)}j {sim.durationMin % 60}m
                </p>
              </div>
              <SimulationNotice />
            </div>
          </motion.div>
        ) : nowMs !== null ? (
          <div className="flex items-start gap-2.5 bg-slate-100 rounded-2xl p-3.5">
            <MapIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-slate-500 leading-relaxed">
              Peta rute belum tersedia untuk bandara ini — koordinatnya belum terdata.
            </p>
          </div>
        ) : null}

        {/* Alasan keterlambatan — hanya bila petugas mengisinya */}
        {flight.delay_reason && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
            <TriangleAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-amber-900">Alasan Keterlambatan</p>
              <p className="text-[11.5px] text-amber-800 leading-relaxed mt-0.5">{flight.delay_reason}</p>
            </div>
          </div>
        )}

        {/* Catatan petugas FIDS */}
        {flight.note && (
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
            <ClipboardList className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-blue-900">Catatan Petugas</p>
              <p className="text-[11.5px] text-blue-800 leading-relaxed mt-0.5">{flight.note}</p>
            </div>
          </div>
        )}

        {/* Save button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setSaved((s) => !s)}
          className={`w-full flex items-center justify-center gap-2 font-semibold text-[14px] py-4 rounded-2xl shadow-lg transition-colors ${
            saved ? 'bg-emerald-600 text-white shadow-emerald-600/25' : 'bg-blue-600 text-white shadow-blue-600/25'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
          {saved ? 'Penerbangan Disimpan' : 'Simpan Penerbangan'}
        </motion.button>

        {/* Informasi operasional — hanya field yang benar-benar dikirim FIDS */}
        <div>
          <h3 className="text-[14px] font-bold text-slate-900 mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" /> Informasi Operasional
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {!isArrival && (
              <InfoTile
                icon={DoorOpen}
                label="Konter Check-in"
                value={counters.length ? counters.join(', ') : 'Belum ditentukan'}
                muted={!counters.length}
              />
            )}
            {isArrival && (
              <InfoTile
                icon={Luggage}
                label="Conveyor"
                value={flight.baggage_belt != null ? String(flight.baggage_belt) : 'Belum ditentukan'}
                muted={flight.baggage_belt == null}
              />
            )}
            <InfoTile
              icon={Plane}
              label="Tipe Pesawat"
              value={flight.aircraft_type || 'Tidak tersedia'}
              muted={!flight.aircraft_type}
            />
            <InfoTile icon={Info} label="Terminal" value={flight.terminal || 'Terminal Utama'} />
            <InfoTile
              icon={ClipboardList}
              label="Keterangan FIDS"
              value={flight.remarks || 'Tidak ada'}
              muted={!flight.remarks}
            />
          </div>

          {flight.is_extra && (
            <p className="mt-2.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Penerbangan tambahan di luar jadwal reguler.
            </p>
          )}
        </div>

        {/* Kontak maskapai — berguna saat penerbangan bermasalah */}
        {(flight.airline_phone || flight.airline_email) && (
          <div>
            <h3 className="text-[14px] font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-blue-600" /> Kontak {flight.airline}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 overflow-hidden">
              {flight.airline_phone && (
                <a
                  href={`tel:${flight.airline_phone.replace(/[^\d+]/g, '')}`}
                  className="flex items-center gap-3 p-3.5 active:bg-slate-50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] text-slate-400">Telepon</p>
                    <p className="text-[13px] font-bold text-slate-900 truncate">{flight.airline_phone}</p>
                  </div>
                </a>
              )}
              {flight.airline_email && (
                <a
                  href={`mailto:${flight.airline_email}`}
                  className="flex items-center gap-3 p-3.5 border-t border-dashed border-slate-200 active:bg-slate-50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] text-slate-400">Email</p>
                    <p className="text-[13px] font-bold text-slate-900 truncate">{flight.airline_email}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}

        {flight.updated_at && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <RefreshCw className="w-3 h-3" /> Status diperbarui {relativeUpdated(flight.updated_at)}
          </p>
        )}
      </div>
    </div>
  );
}

function Detail({
  label, value, sub, align = 'left', valueClass = 'text-slate-900',
}: {
  label: string; value: string; sub?: string; align?: 'left' | 'right'; valueClass?: string;
}) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className={`text-[16px] font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function InfoTile({
  icon: Icon, label, value, muted = false,
}: {
  icon: LucideIcon; label: string; value: string; muted?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] text-slate-400">{label}</p>
        <p className={`text-[13px] font-bold truncate ${muted ? 'text-slate-400' : 'text-slate-900'}`}>{value}</p>
      </div>
    </div>
  );
}
