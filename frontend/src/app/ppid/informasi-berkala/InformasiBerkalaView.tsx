'use client';

/**
 * Informasi Berkala — dokumen yang wajib diumumkan rutin tanpa permintaan.
 *
 * Isi berasal dari `lib/publicInfoData.ts`; lihat provenans di sana.
 * Hero dan akordeon memakai komponen bersama `components/ppid/*`.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import DocAccordion from '@/components/ppid/DocAccordion';
import {
  BERKALA_PENGANTAR, INFO_BERKALA, hitungDokumen,
} from '@/lib/publicInfoData';
import { CalendarClock, FolderOpen, FileText, Info, ArrowRight } from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export default function InformasiBerkalaView() {
  const total = hitungDokumen(INFO_BERKALA);

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Informasi"
        accent="Berkala"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead={BERKALA_PENGANTAR}
      />

      {/* Ringkasan angka */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: CalendarClock, label: 'Sifat Publikasi', value: 'Teratur & rutin', tone: 'from-blue-50 to-white ring-blue-100 text-blue-600' },
            { icon: FolderOpen, label: 'Kategori', value: `${INFO_BERKALA.length} kategori`, tone: 'from-teal-50 to-white ring-teal-100 text-teal-600' },
            { icon: FileText, label: 'Dokumen', value: `${total} dokumen`, tone: 'from-amber-50 to-white ring-amber-100 text-amber-600' },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <motion.div key={c.label} variants={rise} whileHover={{ y: -4 }} className={`bg-gradient-to-br ${c.tone} ring-1 rounded-2xl p-5`}>
                <Icon className="w-5 h-5" />
                <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{c.label}</p>
                <p className="mt-1 text-[15px] font-black text-slate-800 leading-snug">{c.value}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Dokumen */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Dokumen
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Daftar Informasi Berkala
          </motion.h2>
          <motion.p variants={rise} className="mt-2 text-[13.5px] text-slate-500 max-w-2xl leading-relaxed">
            Klik salah satu kategori untuk melihat dokumennya. Seluruh berkas dibuka di tab baru.
          </motion.p>

          <div className="mt-8">
            <DocAccordion groups={INFO_BERKALA} />
          </div>
        </motion.div>
      </section>

      {/* Tautan silang */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-sky-200" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Mencari Dokumen Lain?</h2>
              <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-xl">
                Dokumen yang tidak diumumkan berkala dapat diminta melalui prosedur permohonan
                informasi publik.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/ppid/informasi-setiap-saat" className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white hover:bg-white/20 font-bold text-[13.5px] px-5 py-3 rounded-full transition-colors">
              Informasi Setiap Saat
            </Link>
            <Link href="/ppid/sop" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors">
              SOP Permohonan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
