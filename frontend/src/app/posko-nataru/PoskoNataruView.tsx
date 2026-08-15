'use client';

/**
 * Papan pantau Posko Nataru — satu layar penuh, tanpa gulir.
 *
 * Dirancang untuk monitor terminal yang menyala berjam-jam tanpa ada yang
 * menyentuhnya. Tiga akibatnya pada kode di bawah:
 *
 *   - tinggi dikunci ke `100svh` dan seluruh isi memakai grid yang boleh
 *     menyusut (`min-h-0`), bukan tumpukan yang meluber lalu digulir;
 *   - ukuran huruf memakai `clamp()` terhadap lebar layar, supaya papan yang
 *     sama terbaca di monitor 55 inci maupun di laptop petugas;
 *   - datanya menyegarkan diri tiap menit tanpa memuat ulang halaman.
 *
 * Seluruh angka berasal dari `/nataru/summary`. Yang dihitung di sini hanya
 * turunan waktu — hari keberapa posko berjalan dan porsi tiap arah — bukan
 * angka baru. Bila periodenya belum ada, papan menyatakannya apa adanya;
 * tidak ada angka contoh yang ditayangkan ke publik.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import {
  PlaneTakeoff, PlaneLanding, Users, Package, Briefcase, Gauge, CalendarRange,
  Building2, Radar, CalendarClock,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { angka } from '@/lib/airTraffic';
import type { NataruSummary } from '@/types';

/** Selang penyegaran. Papan ini ditinggal menyala; semenit sudah memadai. */
const REFRESH_MS = 60_000;

const hariPenuh = (v: string) =>
  new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const hariPendek = (v: string) =>
  new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

/** Selisih hari kalender, mengabaikan jam — papan ini berpikir per tanggal. */
function selisihHari(a: Date, b: Date) {
  const nol = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((nol(a) - nol(b)) / 86_400_000);
}

/* ================================================================
   Pencacah beranimasi
   ================================================================ */
function Cacah({ nilai }: { nilai: number }) {
  const [tampil, setTampil] = useState(nilai);

  useEffect(() => {
    let raf = 0;
    const awal = tampil;
    const mulai = performance.now();

    const tick = (t: number) => {
      const p = Math.min(1, (t - mulai) / 900);
      setTampil(Math.round(awal + (nilai - awal) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Sengaja hanya bergantung pada nilai tujuan: memasukkan `tampil` akan
    // memulai ulang animasinya setiap bingkai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilai]);

  return <>{angka(tampil)}</>;
}

/* ================================================================
   Kartu angka besar
   ================================================================ */
function Kartu({
  label, nilai, satuan, icon: Icon, warna, jeda = 0,
}: {
  label: string; nilai: number; satuan?: string; icon: any; warna: string; jeda?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: jeda, type: 'spring', stiffness: 280, damping: 28 }}
      className="relative overflow-hidden rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur px-[1.1vw] py-[1.1vh] flex flex-col justify-center min-h-0"
    >
      <span
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-25"
        style={{ backgroundColor: warna }}
      />
      <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${warna}, transparent)` }} />

      <div className="relative flex items-center gap-2">
        <Icon className="w-[1.4vw] h-[1.4vw] min-w-4 min-h-4" style={{ color: warna }} />
        <p className="text-[clamp(0.55rem,0.72vw,0.9rem)] uppercase tracking-[0.14em] font-bold text-slate-400 truncate">
          {label}
        </p>
      </div>

      <p className="relative mt-[0.4vh] text-[clamp(1.3rem,2.7vw,3.2rem)] font-black text-white leading-none tabular-nums">
        <Cacah nilai={nilai} />
        {satuan && <span className="ml-1.5 text-[clamp(0.6rem,0.9vw,1.1rem)] font-bold text-slate-400">{satuan}</span>}
      </p>
    </motion.div>
  );
}

/* ================================================================
   Papan
   ================================================================ */
export default function PoskoNataruView({ awal }: { awal: NataruSummary | null }) {
  const [data, setData] = useState<NataruSummary | null>(awal);
  const [jam, setJam] = useState('--:--:--');
  const [segar, setSegar] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const res = await fetchApi<NataruSummary | null>('/nataru/summary');
    if (res.success) {
      setData(res.data ?? null);
      setSegar(new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Makassar' }));
    }
  }, []);

  useEffect(() => {
    const t = setInterval(muat, REFRESH_MS);
    return () => clearInterval(t);
  }, [muat]);

  useEffect(() => {
    const tick = () =>
      setJam(new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Makassar' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const ev = data?.event;
  const t = data?.totals;
  const arah = data?.by_direction;

  /* Kemajuan periode: hari keberapa posko berjalan. */
  const kemajuan = useMemo(() => {
    if (!ev) return null;

    const mulai = new Date(ev.start_date);
    const selesai = new Date(ev.end_date);
    const kini = new Date();

    const totalHari = selisihHari(selesai, mulai) + 1;
    const lewat = selisihHari(kini, mulai) + 1;
    const hariKe = Math.min(Math.max(lewat, 0), totalHari);

    return {
      totalHari,
      hariKe,
      persen: totalHari > 0 ? Math.min(100, Math.max(0, (hariKe / totalHari) * 100)) : 0,
      belumMulai: lewat < 1,
      selesai: lewat > totalHari,
    };
  }, [ev]);

  const harian = useMemo(
    () => (data?.daily ?? []).map((d) => ({ ...d, label: hariPendek(d.date) })),
    [data],
  );

  const labelPuncak = useMemo(() => {
    if (!ev?.peak_date) return null;
    const kunci = String(ev.peak_date).slice(0, 10);
    return harian.find((d) => d.date === kunci)?.label ?? null;
  }, [ev, harian]);

  /* Hari tersibuk sejauh ini — diambil dari kurva, bukan diperkirakan. */
  const tersibuk = useMemo(() => {
    if (harian.length === 0) return null;
    return harian.reduce((a, b) => (b.passengers > a.passengers ? b : a));
  }, [harian]);

  const porsi = (n: number) => (t && t.flights > 0 ? Math.round((n / t.flights) * 100) : 0);

  /* ---------------- layar tunggu ---------------- */
  if (!data || !ev) {
    return (
      <Latar>
        <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-5">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
          >
            <CalendarRange className="w-16 h-16 text-cyan-300/70" />
          </motion.div>
          <h1 className="text-[clamp(1.4rem,3vw,2.8rem)] font-black text-white tracking-tight">
            Belum Ada Posko Nataru yang Berjalan
          </h1>
          <p className="max-w-xl text-[clamp(0.8rem,1.1vw,1.05rem)] text-slate-400 leading-relaxed">
            Papan ini menyala kembali begitu periode Posko Angkutan Udara Natal dan Tahun Baru
            berikutnya dibuka oleh Kantor UPBU Kelas I APT Pranoto.
          </p>
          <span className="mt-2 font-mono text-[clamp(0.7rem,0.95vw,0.95rem)] text-slate-500 tabular-nums">
            {jam} WITA
          </span>
        </div>
      </Latar>
    );
  }

  return (
    <Latar>
      <div className="h-full flex flex-col gap-[1.2vh] p-[1.6vw]">
        {/* ============ kepala ============ */}
        <header className="flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-[1vw] min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-white-apt.svg"
              alt="Bandar Udara APT Pranoto Samarinda"
              className="h-[clamp(1.7rem,3.4vh,3.2rem)] w-auto flex-shrink-0"
            />
            <div className="h-[clamp(1.6rem,3vh,3rem)] w-px bg-white/15 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[clamp(0.85rem,1.5vw,1.8rem)] font-black text-white tracking-tight leading-none truncate">
                POSKO ANGKUTAN UDARA NATAL &amp; TAHUN BARU
              </h1>
              <p className="mt-1 text-[clamp(0.6rem,0.85vw,1rem)] text-cyan-300/90 font-semibold truncate">
                {ev.name} · {hariPenuh(ev.start_date)} – {hariPenuh(ev.end_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-[0.8vw] flex-shrink-0">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-[0.7vw] py-[0.5vh] rounded-lg text-[clamp(0.55rem,0.72vw,0.85rem)] font-black uppercase tracking-wider border ${
                ev.is_active
                  ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30'
                  : 'text-slate-400 bg-white/5 border-white/15'
              }`}
            >
              <motion.span
                animate={ev.is_active ? { opacity: [1, 0.2, 1] } : { opacity: 0.5 }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className={`w-1.5 h-1.5 rounded-full ${ev.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`}
              />
              {ev.is_active ? 'Posko Aktif' : 'Posko Ditutup'}
            </span>

            <span className="inline-flex items-center gap-2 px-[0.8vw] py-[0.5vh] rounded-lg bg-white/5 border border-white/10">
              <Radar className="w-[1vw] h-[1vw] min-w-3 min-h-3 text-cyan-400" />
              <span className="font-mono tabular-nums text-[clamp(0.75rem,1.25vw,1.5rem)] font-bold text-white leading-none">
                {jam}
              </span>
              <span className="text-[clamp(0.5rem,0.6vw,0.7rem)] text-slate-400 font-bold">WITA</span>
            </span>
          </div>
        </header>

        {/* ============ kemajuan periode ============ */}
        {kemajuan && (
          <section className="flex-shrink-0 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur px-[1.2vw] py-[1vh]">
            <div className="flex items-center justify-between gap-4 mb-[0.8vh]">
              <p className="text-[clamp(0.6rem,0.8vw,0.95rem)] font-bold uppercase tracking-[0.14em] text-slate-400">
                {kemajuan.belumMulai
                  ? 'Posko belum dimulai'
                  : kemajuan.selesai
                    ? 'Periode posko telah berakhir'
                    : `Hari ke-${kemajuan.hariKe} dari ${kemajuan.totalHari} hari`}
              </p>
              {ev.peak_date && (
                <p className="flex items-center gap-1.5 text-[clamp(0.55rem,0.75vw,0.9rem)] text-amber-300 font-semibold whitespace-nowrap">
                  <CalendarClock className="w-[0.9vw] h-[0.9vw] min-w-3 min-h-3" />
                  Puncak {hariPenuh(ev.peak_date)}
                </p>
              )}
            </div>

            {/* Landasan sebagai bilah kemajuan: pesawat menandai sejauh mana
                periode sudah berjalan, marka putus-putus jadi latarnya. */}
            <div className="relative">
              <div className="relative h-[1.1vh] min-h-[7px] rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${kemajuan.persen}%` }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                />
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 10px, transparent 10px 24px)',
                  }}
                />
              </div>

              <motion.span
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                initial={{ left: '0%' }}
                animate={{ left: `${kemajuan.persen}%` }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              >
                <PlaneTakeoff className="w-[1.3vw] h-[1.3vw] min-w-4 min-h-4 text-cyan-100 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              </motion.span>
            </div>
          </section>
        )}

        {/* ============ empat angka besar ============ */}
        <section className="grid grid-cols-4 gap-[0.9vw] flex-shrink-0">
          <Kartu label="Penerbangan" nilai={t?.flights ?? 0} icon={PlaneTakeoff} warna="#38bdf8" jeda={0} />
          <Kartu label="Penumpang" nilai={t?.passengers ?? 0} icon={Users} warna="#34d399" jeda={0.06} />
          <Kartu label="Kargo" satuan="kg" nilai={t?.cargo ?? 0} icon={Package} warna="#a78bfa" jeda={0.12} />
          <Kartu label="Bagasi" satuan="kg" nilai={t?.baggage ?? 0} icon={Briefcase} warna="#fbbf24" jeda={0.18} />
        </section>

        {/* ============ kurva + panel kanan ============ */}
        <section className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-[0.9vw]">
          {/* kurva harian */}
          <div className="xl:col-span-2 min-h-0 flex flex-col rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur p-[1vw]">
            <div className="flex items-center justify-between gap-3 flex-shrink-0">
              <h2 className="text-[clamp(0.65rem,0.9vw,1.1rem)] font-black uppercase tracking-[0.12em] text-white">
                Arus Penumpang Harian
              </h2>
              {tersibuk && (
                <p className="text-[clamp(0.55rem,0.75vw,0.9rem)] text-slate-400">
                  Tertinggi{' '}
                  <span className="font-bold text-cyan-300">{tersibuk.label}</span>{' '}
                  <span className="tabular-nums font-bold text-white">{angka(tersibuk.passengers)}</span> pnp
                </p>
              )}
            </div>

            <div className="flex-1 min-h-0 mt-[0.8vh]">
              {harian.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                  <PlaneLanding className="w-8 h-8 text-slate-600" />
                  <p className="text-[clamp(0.7rem,0.9vw,1rem)] text-slate-400 font-semibold">
                    Belum ada catatan penerbangan
                  </p>
                  <p className="text-[clamp(0.6rem,0.75vw,0.85rem)] text-slate-500">
                    Kurva terbentuk sendiri begitu petugas mengirim data pertamanya.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={harian} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gPosko" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0b1428', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(v: any) => [angka(Number(v)), 'Penumpang']}
                    />
                    {labelPuncak && (
                      <ReferenceLine x={labelPuncak} stroke="#fbbf24" strokeDasharray="5 5" strokeWidth={1.5} />
                    )}
                    <Area type="monotone" dataKey="passengers" stroke="#22d3ee" strokeWidth={2.5} fill="url(#gPosko)" animationDuration={1100} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* panel kanan: arah + load factor */}
          <div className="min-h-0 grid grid-rows-3 gap-[0.9vh]">
            {([
              ['arrival', 'Kedatangan', PlaneLanding, '#38bdf8'],
              ['departure', 'Keberangkatan', PlaneTakeoff, '#fb923c'],
            ] as const).map(([kunci, label, Icon, warna]) => {
              const r = arah?.[kunci];
              const p = porsi(r?.flights ?? 0);

              return (
                <div
                  key={kunci}
                  className="min-h-0 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur px-[1vw] py-[0.9vh] flex flex-col justify-center"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[clamp(0.6rem,0.8vw,0.95rem)] font-bold text-white">
                      <Icon className="w-[1.1vw] h-[1.1vw] min-w-3.5 min-h-3.5" style={{ color: warna }} />
                      {label}
                    </span>
                    <span className="text-[clamp(0.6rem,0.8vw,0.95rem)] font-black tabular-nums" style={{ color: warna }}>
                      {p}%
                    </span>
                  </div>

                  <div className="mt-[0.6vh] flex items-baseline gap-2">
                    <span className="text-[clamp(1rem,1.9vw,2.2rem)] font-black text-white leading-none tabular-nums">
                      <Cacah nilai={r?.passengers ?? 0} />
                    </span>
                    <span className="text-[clamp(0.55rem,0.7vw,0.85rem)] text-slate-400 font-semibold">
                      penumpang · {angka(r?.flights ?? 0)} penerbangan
                    </span>
                  </div>

                  <div className="mt-[0.7vh] h-[0.7vh] min-h-[5px] rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: warna }}
                      initial={{ width: 0 }}
                      animate={{ width: `${p}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}

            {/* load factor + maskapai */}
            <div className="min-h-0 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur px-[1vw] py-[0.9vh] grid grid-cols-2 gap-[0.8vw]">
              <div className="flex flex-col justify-center min-w-0">
                <span className="flex items-center gap-1.5 text-[clamp(0.5rem,0.68vw,0.8rem)] uppercase tracking-wider font-bold text-slate-400">
                  <Gauge className="w-[0.9vw] h-[0.9vw] min-w-3 min-h-3 text-emerald-300" /> Load Factor
                </span>
                <span className="mt-[0.4vh] text-[clamp(1rem,1.9vw,2.2rem)] font-black text-white leading-none tabular-nums">
                  {t?.average_load_factor != null ? `${t.average_load_factor}%` : '—'}
                </span>
                {/* Kosong berarti kapasitas kursi belum terisi, bukan pesawat kosong. */}
                <span className="mt-1 text-[clamp(0.45rem,0.6vw,0.72rem)] text-slate-500 leading-tight">
                  {t?.average_load_factor != null ? 'rata-rata keterisian kursi' : 'menunggu data kapasitas kursi'}
                </span>
              </div>

              <div className="flex flex-col justify-center min-w-0 border-l border-white/10 pl-[0.8vw]">
                <span className="flex items-center gap-1.5 text-[clamp(0.5rem,0.68vw,0.8rem)] uppercase tracking-wider font-bold text-slate-400">
                  <Building2 className="w-[0.9vw] h-[0.9vw] min-w-3 min-h-3 text-violet-300" /> Maskapai
                </span>
                <span className="mt-[0.4vh] text-[clamp(1rem,1.9vw,2.2rem)] font-black text-white leading-none tabular-nums">
                  <Cacah nilai={t?.airlines ?? 0} />
                </span>
                <span className="mt-1 text-[clamp(0.45rem,0.6vw,0.72rem)] text-slate-500 leading-tight">
                  terlibat pada periode ini
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ kaki ============ */}
        <footer className="flex-shrink-0 flex items-center justify-between gap-4 text-[clamp(0.5rem,0.68vw,0.8rem)] text-slate-500">
          <p>Kantor Unit Penyelenggara Bandar Udara Kelas I APT Pranoto Samarinda</p>
          <p className="tabular-nums">
            {segar ? `Diperbarui ${segar} WITA` : 'Menyegarkan otomatis tiap menit'}
          </p>
        </footer>
      </div>
    </Latar>
  );
}

/* ================================================================
   Latar langit malam
   ================================================================
   `overflow-hidden` di sini yang menegakkan janji "satu layar": apa pun
   yang meluber terpotong, bukan memunculkan bilah gulir. Karena itu tiap
   bagian di atas memakai `min-h-0` dan ukuran relatif. */
function Latar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 h-[100svh] w-screen overflow-hidden bg-[#050a16] text-slate-100">
      {/* kisi peta navigasi + pendar ufuk */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
        }}
      />
      <div className="absolute -top-40 -left-32 w-[42rem] h-[42rem] rounded-full bg-blue-600/20 blur-[140px]" />
      <div className="absolute -bottom-48 -right-32 w-[46rem] h-[46rem] rounded-full bg-cyan-500/12 blur-[150px]" />

      {/* dua pesawat menyeberang pelan — penanda papan masih hidup */}
      <motion.div
        initial={{ x: '-10vw', y: 0, opacity: 0 }}
        animate={{ x: '105vw', y: -40, opacity: [0, 0.7, 0.7, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[22%] pointer-events-none"
      >
        <PlaneTakeoff className="w-6 h-6 text-cyan-300/40" />
      </motion.div>
      <motion.div
        initial={{ x: '104vw', y: 0, opacity: 0 }}
        animate={{ x: '-10vw', y: 50, opacity: [0, 0.6, 0.6, 0] }}
        transition={{ duration: 42, repeat: Infinity, ease: 'linear', delay: 8 }}
        className="absolute top-[68%] pointer-events-none"
      >
        <PlaneLanding className="w-5 h-5 text-blue-300/35" />
      </motion.div>

      <div className="relative h-full">{children}</div>
    </div>
  );
}
