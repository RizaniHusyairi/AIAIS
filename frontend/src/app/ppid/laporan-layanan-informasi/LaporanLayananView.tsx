'use client';

/**
 * Laporan Layanan Informasi — laporan tahunan PPID.
 *
 * Isi berasal dari `lib/publicInfoData.ts`; lihat provenans di sana.
 *
 * Nuansa penerbangan: laporan disusun sebagai linimasa menurun dengan tahun
 * sebagai titik singgah dan garis rute putus-putus yang mengisi seiring
 * gulir — bentuk yang sama dengan alur SOP, karena keduanya sama-sama
 * "rangkaian bertanggal". Kartu tahunnya bergaya bilah papan jadwal.
 *
 * Pencarian dipertahankan dari v1 (di sana berupa skrip inline `keyup`).
 */

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import { LAPORAN_PENGANTAR, LAPORAN_TAHUNAN } from '@/lib/publicInfoData';
import {
  Search, SearchX, ExternalLink, FileText, Plane, CalendarRange, ArrowRight, Info,
} from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export default function LaporanLayananView() {
  const [q, setQ] = useState('');
  const trackRef = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start 80%', 'end 70%'] });
  const planeTop = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const trailScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return LAPORAN_TAHUNAN;
    return LAPORAN_TAHUNAN.filter(
      (r) => r.title.toLowerCase().includes(s) || String(r.year).includes(s),
    );
  }, [q]);

  const rentang = useMemo(() => {
    const years = LAPORAN_TAHUNAN.map((r) => r.year);
    return years.length ? `${Math.min(...years)} – ${Math.max(...years)}` : '—';
  }, []);

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Laporan"
        accent="Layanan Informasi"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead={LAPORAN_PENGANTAR}
      />

      {/* Ringkasan + pencarian */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <motion.div variants={rise} className="lg:col-span-4 bg-gradient-to-br from-blue-50 to-white ring-1 ring-blue-100 rounded-2xl p-5">
            <FileText className="w-5 h-5 text-blue-600" />
            <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Jumlah Laporan</p>
            <p className="mt-1 text-[15px] font-black text-slate-800">{LAPORAN_TAHUNAN.length} laporan tahunan</p>
          </motion.div>

          <motion.div variants={rise} className="lg:col-span-4 bg-gradient-to-br from-teal-50 to-white ring-1 ring-teal-100 rounded-2xl p-5">
            <CalendarRange className="w-5 h-5 text-teal-600" />
            <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Tahun Terbit</p>
            <p className="mt-1 text-[15px] font-black text-slate-800 tabular-nums">{rentang}</p>
          </motion.div>

          <motion.div variants={rise} className="lg:col-span-4 flex items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari judul atau tahun laporan…"
                aria-label="Cari laporan layanan informasi"
                className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl ring-1 ring-slate-200 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Linimasa laporan */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Arsip
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Laporan Tahunan PPID
          </motion.h2>
          <motion.p variants={rise} className="mt-2 text-[13.5px] text-slate-500 max-w-2xl leading-relaxed" aria-live="polite">
            {q.trim()
              ? `${hasil.length} dari ${LAPORAN_TAHUNAN.length} laporan cocok dengan pencarian.`
              : 'Urut dari laporan terbaru. Seluruh berkas dibuka di tab baru.'}
          </motion.p>

          {hasil.length === 0 ? (
            <motion.div variants={rise} className="mt-8 bg-white rounded-2xl ring-1 ring-slate-200/70 py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <SearchX className="w-6 h-6 text-slate-400" />
              </div>
              <p className="mt-4 text-[15px] font-bold text-slate-800">Laporan tidak ditemukan</p>
              <p className="mt-1 text-[13px] text-slate-500">Coba kata kunci atau tahun yang lain.</p>
            </motion.div>
          ) : (
            <ol ref={trackRef} className="relative mt-8 space-y-4 pl-14 sm:pl-16">
              {/* rute dasar */}
              <span className="absolute left-[23px] sm:left-[27px] top-3 bottom-3 border-l-2 border-dashed border-slate-200" aria-hidden="true" />
              {/* jejak yang sudah dilewati */}
              <motion.span
                style={{ scaleY: reduceMotion ? 1 : trailScale, transformOrigin: 'top' }}
                className="absolute left-[23px] sm:left-[27px] top-3 bottom-3 border-l-2 border-blue-500/70"
                aria-hidden="true"
              />
              {!reduceMotion && (
                <motion.span
                  style={{ top: planeTop }}
                  className="absolute left-[13px] sm:left-[17px] -mt-3 w-5 h-5 rounded-full bg-blue-600 shadow-lg shadow-blue-600/40 flex items-center justify-center z-10"
                  aria-hidden="true"
                >
                  <Plane className="w-3 h-3 text-white rotate-[135deg]" />
                </motion.span>
              )}

              {hasil.map((r) => (
                <motion.li
                  key={r.slug}
                  variants={rise}
                  className="relative bg-white rounded-2xl ring-1 ring-slate-200/70 overflow-hidden transition-shadow hover:shadow-lg hover:shadow-blue-900/5"
                >
                  {/* bilah tahun bergaya papan jadwal */}
                  <span className="absolute -left-14 sm:-left-16 top-4 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#0b1e5b] text-white flex items-center justify-center overflow-hidden shadow-sm">
                    <span className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
                    <span className="text-[13px] sm:text-[15px] font-black tabular-nums">{r.year}</span>
                  </span>

                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pl-5 pr-4 py-5">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14.5px] font-black text-slate-900 leading-snug">{r.title}</h3>
                      <p className="mt-1 text-[11.5px] text-slate-500">Tahun terbit {r.year}</p>
                    </div>

                    <span className="hidden sm:block self-stretch border-l-2 border-dashed border-slate-200 relative">
                      <span className="absolute -top-[22px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
                      <span className="absolute -bottom-[22px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
                    </span>

                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12.5px] px-4 py-2.5 rounded-full shadow-lg shadow-blue-600/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      Lihat Dokumen
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </motion.div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-sky-200" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Laporan Tahun Lain</h2>
              <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-xl">
                Laporan yang belum terbit di sini dapat diminta melalui prosedur permohonan
                informasi publik.
              </p>
            </div>
          </div>

          <Link href="/ppid/sop" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors self-start">
            SOP Permohonan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
