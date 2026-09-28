'use client';

/**
 * Kartu Permohonan Informasi Publik di beranda PWA.
 *
 * Sebelumnya beranda hanya punya petak "PPID" kecil di Layanan Populer, dan
 * warga tidak tahu bahwa mereka BERHAK meminta informasi, berapa lama PPID
 * wajib menjawab, atau bahwa tiketnya bisa dilacak. Kartu ini menjawab tiga
 * hal itu sekaligus, dan memberi jalan pintas melacak tiket tanpa membuka
 * formulirnya dulu.
 *
 * TIDAK ADA angka atau langkah yang ditulis di sini:
 *  - tenggat dari SOP_PROSEDUR (lib/ppidData.ts, berprovenans portal v1),
 *  - nama langkah dari formulir itu sendiri (LANGKAH),
 *  - perkiraan tanggal dari hitungan hari kerja WITA yang sama dengan server.
 * Mengubah salah satunya di sumbernya otomatis mengubah kartu ini.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Plane, Scale, ScrollText, Search, Ticket } from 'lucide-react';
import { SOP_PROSEDUR } from '@/lib/ppidData';
import { LANGKAH } from '@/app/ppid/pengajuan-informasi/bagianFormulir';
import { HARI_KERJA_JAWABAN, fmtTanggal, hariIniWita, tambahHariKerja } from '@/app/ppid/pengajuan-informasi/aturan';
import { PintasanTiketSaya } from '@/app/ppid/pengajuan-informasi/TiketSaya';

const sop = (slug: string) => SOP_PROSEDUR.find((p) => p.slug === slug);

/** Format nomor tiket yang diterbitkan InformationRequestController. */
const POLA_TIKET = /^PIP-\d{8}-[A-Z0-9]{4,12}$/;

export default function KartuPermohonanInformasi() {
  const router = useRouter();
  const [tiket, setTiket] = useState('');
  const [galat, setGalat] = useState<string | null>(null);

  const permohonan = sop('permohonan');
  const keberatan = sop('keberatan');
  const perkiraan = useMemo(() => tambahHariKerja(hariIniWita(), HARI_KERJA_JAWABAN), []);

  const lacak = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tiket.trim().toUpperCase();
    if (!POLA_TIKET.test(t)) {
      setGalat('Format nomor tiket: PIP-YYYYMMDD-XXXX');
      return;
    }
    router.push(`/app/ppid/permohonan?tiket=${encodeURIComponent(t)}`);
  };

  return (
    <section
      aria-labelledby="judul-permohonan-informasi"
      className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-white shadow-[0_16px_34px_-22px_rgba(11,30,91,0.55)] ring-1 ring-slate-200/70 md:mx-5"
    >
      {/* ---------- Kepala boarding pass ---------- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#2563eb] px-4 pb-4 pt-4 text-white">
        <motion.span
          className="pointer-events-none absolute -right-3 top-2 text-white/10"
          animate={{ x: [0, 6, 0], y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <Plane className="h-24 w-24 -rotate-12" />
        </motion.span>

        <div className="relative flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-sky-200 ring-1 ring-white/15">
            <ScrollText className="h-3 w-3" aria-hidden="true" /> UU 14/2008
          </span>
          <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-sky-200">PPID · AAP</span>
        </div>

        <h2 id="judul-permohonan-informasi" className="relative mt-2.5 text-[17px] font-black leading-tight">
          Permohonan Informasi Publik
        </h2>
        <p className="relative mt-1 text-[11.5px] leading-relaxed text-blue-100/90">
          Setiap orang berhak meminta informasi publik bandara — tanpa akun, cukup scan KTP.
        </p>

        {/* rute: Anda → PPID */}
        <div className="relative mt-3.5 flex items-center gap-2.5" aria-hidden="true">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-blue-200/80">Dari</p>
            <p className="text-[14px] font-black">ANDA</p>
          </div>
          <div className="flex flex-1 items-center gap-1 text-sky-300">
            <span className="flex-1 border-t border-dashed border-sky-300/50" />
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}>
              <Plane className="h-4 w-4" />
            </motion.span>
            <span className="flex-1 border-t border-dashed border-sky-300/50" />
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.18em] text-blue-200/80">Ke</p>
            <p className="text-[14px] font-black">PPID</p>
          </div>
        </div>
      </div>

      {/* takik perforasi */}
      <div className="relative h-0" aria-hidden="true">
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
        <span className="absolute inset-x-5 top-0 border-t-2 border-dashed border-slate-200" />
      </div>

      <div className="p-4">
        {/* ---------- Tiga langkah ---------- */}
        <ol className="grid grid-cols-3 gap-1.5" aria-label="Langkah pengajuan">
          {LANGKAH.map((l, i) => (
            <li key={l.nama} className="relative rounded-2xl bg-[#f3f8ff] px-2 py-2.5 text-center">
              <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                {i + 1}
              </span>
              <span className="mt-1.5 block text-[10.5px] font-bold leading-tight text-slate-800">{l.nama}</span>
              <span className="mt-0.5 block text-[9.5px] leading-tight text-slate-500">{l.ket}</span>
            </li>
          ))}
        </ol>

        {/* ---------- Tenggat resmi ---------- */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {permohonan && (
            <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <Clock className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <p className="mt-1.5 text-[15px] font-black leading-none text-slate-900">{permohonan.headline}</p>
              <p className="mt-1 text-[10px] leading-snug text-slate-600">{permohonan.headlineLabel}</p>
            </div>
          )}
          {keberatan && (
            <div className="rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-100">
              <Scale className="h-4 w-4 text-violet-600" aria-hidden="true" />
              <p className="mt-1.5 text-[15px] font-black leading-none text-slate-900">{keberatan.headline}</p>
              <p className="mt-1 text-[10px] leading-snug text-slate-600">Tanggapan atas keberatan</p>
            </div>
          )}
        </div>

        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-[11px] leading-snug text-slate-700 ring-1 ring-amber-200/70">
          <Clock className="h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            Diajukan hari ini, dijawab paling lambat <b className="text-slate-900">{fmtTanggal(perkiraan)}</b>
          </span>
        </p>

        {/* ---------- Aksi ---------- */}
        <Link
          href="/app/ppid/permohonan"
          className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-[13px] font-bold text-white shadow-lg shadow-blue-600/25 transition-colors active:bg-blue-700"
        >
          Ajukan Permohonan <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        {/* ---------- Lacak kilat ---------- */}
        <form onSubmit={lacak} className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <label htmlFor="lacak-kilat" className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
            <Ticket className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" /> Sudah punya tiket? Lacak statusnya
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="lacak-kilat"
              value={tiket}
              onChange={(e) => { setTiket(e.target.value.toUpperCase()); setGalat(null); }}
              placeholder="PIP-20260928-XXXX"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={galat ? true : undefined}
              aria-describedby={galat ? 'lacak-kilat-galat' : undefined}
              className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2.5 font-mono text-[12px] tracking-wider text-slate-800 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:ring-rose-300"
            />
            <button
              type="submit"
              disabled={!tiket.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0b1e5b] text-white transition-opacity disabled:opacity-40"
              aria-label="Lacak tiket"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          {galat && (
            <p id="lacak-kilat-galat" className="mt-1.5 text-[10.5px] font-semibold text-rose-600">{galat}</p>
          )}
        </form>

        {/* Tiket yang pernah diajukan dari perangkat ini — tanpa permintaan
            jaringan di beranda; statusnya dimuat di layar tujuan. */}
        <PintasanTiketSaya href={(t) => `/app/ppid/permohonan?tiket=${encodeURIComponent(t)}`} />

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
          <Link href="/app/ppid/setiap-saat" className="font-semibold text-slate-500 active:text-slate-800">
            Cek informasi yang sudah terbuka
          </Link>
          <Link href="/app/ppid/sop" className="inline-flex items-center gap-0.5 font-bold text-blue-600">
            SOP PPID <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
