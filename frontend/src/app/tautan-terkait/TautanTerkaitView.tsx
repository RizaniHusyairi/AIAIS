'use client';

/**
 * Tautan Terkait — portal resmi pemerintah di luar aptpairport.id.
 *
 * Menu ini sebelumnya ditandai "Segera" di navbar dan tidak dapat diklik,
 * padahal keempat tautannya sudah lama tayang di dropdown dan footer. Halaman
 * ini memberi mereka tempat yang semestinya, lengkap dengan keterangan apa
 * gunanya masing-masing — sesuatu yang tidak muat di menu.
 *
 * Datanya di `lib/relatedLinks.ts`, sumber tunggal bersama navbar dan footer.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import {
  RELATED_LINK_GROUPS, TAUTAN_PENGANTAR, TOTAL_RELATED_LINKS,
} from '@/lib/relatedLinks';
import { hostOf } from '@/lib/url';
import {
  Globe, ExternalLink, ShieldCheck, Users, ArrowRight, Info, MessageSquareWarning,
} from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

/** Ikon per kelompok — hiasan, tidak menambah makna baru pada datanya. */
const GROUP_META: Record<string, { icon: typeof Globe; accent: string; tint: string }> = {
  'pelayanan-publik': { icon: MessageSquareWarning, accent: '#2563eb', tint: 'bg-blue-50' },
  'aplikasi-pegawai': { icon: Users, accent: '#7c3aed', tint: 'bg-violet-50' },
};

export default function TautanTerkaitView() {
  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Tautan"
        accent="Terkait"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead={TAUTAN_PENGANTAR}
        showBack={false}
      />

      {/* ============ RINGKASAN ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {[
            { icon: Globe, label: 'Total Tautan', value: `${TOTAL_RELATED_LINKS} portal`, tone: 'from-blue-50 to-white ring-blue-100 text-blue-600' },
            { icon: ShieldCheck, label: 'Kelompok', value: `${RELATED_LINK_GROUPS.length} kelompok`, tone: 'from-violet-50 to-white ring-violet-100 text-violet-600' },
            { icon: Info, label: 'Pengelola', value: 'Kementerian PANRB & Perhubungan', tone: 'from-teal-50 to-white ring-teal-100 text-teal-600' },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.label}
                variants={rise}
                whileHover={{ y: -4 }}
                className={`bg-gradient-to-br ${c.tone} ring-1 rounded-2xl p-5`}
              >
                <Icon className="w-5 h-5" />
                <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{c.label}</p>
                <p className="mt-1 text-[15px] font-black text-slate-800 leading-snug">{c.value}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ DAFTAR TAUTAN ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14 space-y-12">
        {RELATED_LINK_GROUPS.map((group) => {
          const meta = GROUP_META[group.slug] ?? { icon: Globe, accent: '#0891b2', tint: 'bg-cyan-50' };
          const Icon = meta.icon;

          return (
            <motion.div
              key={group.slug}
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <motion.div variants={rise} className="flex items-start gap-3">
                <span className={`w-11 h-11 rounded-2xl ${meta.tint} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" style={{ color: meta.accent }} />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{group.title}</h2>
                  <p className="mt-1 text-[13.5px] text-slate-500 leading-relaxed max-w-2xl">{group.lead}</p>
                </div>
              </motion.div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {group.links.map((l) => (
                  <motion.a
                    key={l.slug}
                    variants={rise}
                    whileHover={{ y: -5 }}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative overflow-hidden bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 transition-shadow p-5 flex items-start gap-4"
                  >
                    <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: meta.accent }} />

                    <span
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${meta.accent}14` }}
                    >
                      <Globe className="w-5 h-5" style={{ color: meta.accent }} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                          {l.name}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </span>

                      <span className="block mt-1 text-[12.5px] text-slate-500 leading-relaxed">
                        {l.description}
                      </span>

                      {/* Host ditampilkan supaya tujuan tautan terbaca sebelum
                          diklik — halaman ini melempar pengunjung keluar portal. */}
                      <span className="block mt-2 text-[11px] font-mono text-slate-400 truncate">
                        {hostOf(l.url)}
                      </span>
                    </span>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* ============ PENUTUP ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-sky-200" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Ada keluhan atau pertanyaan?</h2>
              <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-xl">
                Portal di atas dikelola instansi lain. Untuk hal yang berkaitan langsung dengan
                Bandara APT Pranoto, kanal kami menjawab lebih cepat.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/ppid"
              className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white hover:bg-white/20 font-bold text-[13.5px] px-5 py-3 rounded-full transition-colors"
            >
              Informasi Publik
            </Link>
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors"
            >
              Pusat Bantuan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
