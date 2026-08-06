'use client';

/**
 * Regulasi PPID — dasar hukum keterbukaan informasi publik.
 *
 * Isi berasal dari `lib/publicInfoData.ts`; lihat provenans di sana.
 * Bentuknya sama dengan Informasi Berkala dan Setiap Saat (kategori berisi
 * dokumen), jadi memakai `DocAccordion` yang sama.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import DocAccordion from '@/components/ppid/DocAccordion';
import { REGULASI_PENGANTAR, REGULASI_PPID, hitungDokumen } from '@/lib/publicInfoData';
import { Scale, Landmark, Gavel, ArrowRight, Info } from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export default function RegulasiPpidView() {
  const total = hitungDokumen(REGULASI_PPID);

  /** Rentang tahun peraturan tertua sampai terbaru. */
  const tahun = REGULASI_PPID.flatMap((g) => g.docs.map((d) => Number((d.published ?? '').slice(0, 4))))
    .filter((n) => Number.isFinite(n) && n > 0);
  const rentang = tahun.length ? `${Math.min(...tahun)} – ${Math.max(...tahun)}` : '—';

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Regulasi"
        accent="PPID"
        subtitle="Keterbukaan Informasi Publik"
        lead={REGULASI_PENGANTAR}
      />

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Scale, label: 'Dasar Hukum Utama', value: 'UU 14/2008', tone: 'from-blue-50 to-white ring-blue-100 text-blue-600' },
            { icon: Landmark, label: 'Kelompok Peraturan', value: `${REGULASI_PPID.length} kelompok`, tone: 'from-teal-50 to-white ring-teal-100 text-teal-600' },
            { icon: Gavel, label: 'Dokumen', value: `${total} peraturan · ${rentang}`, tone: 'from-amber-50 to-white ring-amber-100 text-amber-600' },
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

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Peraturan
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Dasar Hukum Penyelenggaraan PPID
          </motion.h2>
          <motion.p variants={rise} className="mt-2 text-[13.5px] text-slate-500 max-w-2xl leading-relaxed">
            Klik salah satu kelompok untuk melihat peraturannya. Seluruh dokumen dibuka di tab baru.
          </motion.p>

          <div className="mt-8">
            <DocAccordion groups={REGULASI_PPID} />
          </div>
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
              <h2 className="text-2xl font-black text-white tracking-tight">Ingin Menggunakan Hak Ini?</h2>
              <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-xl">
                Peraturan di atas menjamin hak Anda atas informasi publik. Ajukan permohonannya
                lewat formulir resmi PPID bandara.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/ppid/sop" className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white hover:bg-white/20 font-bold text-[13.5px] px-5 py-3 rounded-full transition-colors">
              Lihat SOP
            </Link>
            <Link href="/ppid/pengajuan-informasi" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors">
              Ajukan Permohonan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
