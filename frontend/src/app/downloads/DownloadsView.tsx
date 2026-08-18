'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { DocumentItem } from '@/types';
import SkyParticles from '@/components/effects/SkyParticles';
import {
  Download, FileText, FileSpreadsheet, FileImage, File as FileIcon, Search, Plane,
  ArrowRight, Sparkles, Layers, HardDriveDownload, BookOpen, Scale, ClipboardList,
  Headphones, ShieldCheck,
} from 'lucide-react';

/* ================================================================
   Lengkung lintasan dekoratif — selaras dengan halaman tenant
   ================================================================ */
function FlightArc({ className = '', d = 'M-20 170 Q 380 50 1020 130' }: { className?: string; d?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 1000 220" preserveAspectRatio="none" fill="none">
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 9"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/* ================================================================
   Pemetaan kategori & jenis berkas
   ================================================================ */

const CAT_META: Record<string, { color: string; bg: string; icon: any }> = {
  'Panduan Penumpang': { color: '#2563eb', bg: '#eff6ff', icon: BookOpen },
  'Regulasi': { color: '#7c3aed', bg: '#f5f3ff', icon: Scale },
  'Formulir': { color: '#059669', bg: '#ecfdf5', icon: ClipboardList },
  'Tarif': { color: '#d97706', bg: '#fffbeb', icon: Scale },
};

const FALLBACK_META = { color: '#0891b2', bg: '#ecfeff', icon: FileText };

function catMeta(category: string) {
  return CAT_META[category] ?? FALLBACK_META;
}

/** Ikon menurut ekstensi berkas, agar jenis dokumen langsung terbaca. */
function fileIcon(type: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('xls') || t.includes('csv')) return FileSpreadsheet;
  if (t.includes('jpg') || t.includes('png') || t.includes('image')) return FileImage;
  if (t.includes('pdf') || t.includes('doc')) return FileText;
  return FileIcon;
}

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/* ================================================================ */

export default function DownloadsView() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    fetchApi<DocumentItem[]>('/documents').then((res) => {
      if (res.success && Array.isArray(res.data)) setDocs(res.data);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(docs.map((d) => d.category))).sort(),
    [docs],
  );

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return docs.filter((d) => {
      const byCat = cat === 'all' || d.category === cat;
      const byQ = !q || [d.title, d.category, d.file_type].some((v) => String(v ?? '').toLowerCase().includes(s));
      return byCat && byQ;
    });
  }, [docs, cat, q]);

  const counts = useMemo(() => ({
    total: docs.length,
    categories: new Set(docs.map((d) => d.category)).size,
    downloads: docs.reduce((sum, d) => sum + (Number(d.download_count) || 0), 0),
    formats: new Set(docs.map((d) => d.file_type)).size,
  }), [docs]);

  return (
    <div className="bg-slate-50 overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[420px] flex items-center overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#1e40af]">
        <SkyParticles tone="sky" />

        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-cyan-300/15 blur-3xl pointer-events-none" />
        <FlightArc className="absolute inset-x-0 top-1/3 w-full h-48 text-white/20" />

        <motion.div
          initial={{ x: -80, y: 34, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-[16%] top-[24%] hidden md:block"
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <FileText className="w-14 h-14 text-cyan-200/80 drop-shadow-2xl" strokeWidth={1.2} />
          </motion.div>
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-16 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Download className="w-3.5 h-3.5" /> Pusat Dokumen Resmi
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Pusat Unduhan
              <br />
              <span className="text-cyan-300">Dokumen &amp; Formulir</span>
            </h1>

            <p className="mt-4 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">
              Regulasi penerbangan, formulir permohonan pas bandara, tarif layanan, serta panduan
              hak dan keselamatan penumpang Bandara APT Pranoto Samarinda.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#dokumen" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                <Search className="w-4 h-4" /> Telusuri Dokumen
              </Link>
              <Link href="/complaints" className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors">
                Ajukan Pertanyaan <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* garis landasan */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 flex gap-2 px-4 opacity-70">
          {Array.from({ length: 26 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.08 }}
              className="flex-1 bg-cyan-300 rounded-full"
            />
          ))}
        </div>
      </section>

      {/* ============ RINGKASAN ANGKA ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Dokumen', value: counts.total, icon: FileText, color: '#2563eb' },
            { label: 'Kategori', value: counts.categories, icon: Layers, color: '#7c3aed' },
            { label: 'Total Unduhan', value: counts.downloads, icon: HardDriveDownload, color: '#059669' },
            { label: 'Format Berkas', value: counts.formats, icon: ShieldCheck, color: '#0891b2' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} variants={rise} whileHover={{ y: -5 }} className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-5">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}14` }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </span>
                <p className="text-[24px] font-black text-slate-900 leading-none mt-3 tabular-nums">{s.value.toLocaleString('id-ID')}</p>
                <p className="text-[11.5px] text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ DAFTAR DOKUMEN ============ */}
      <section id="dokumen" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14 scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <FileText className="w-3.5 h-3.5" /> Daftar Dokumen
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Unduh Berkas yang Anda Butuhkan</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">
            Seluruh berkas di bawah ini merupakan dokumen resmi yang diterbitkan pengelola bandara.
          </p>
        </motion.div>

        {/* filter + pencarian */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between"
        >
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[{ value: 'all', label: 'Semua', color: '#2563eb', icon: Sparkles },
              ...categories.map((c) => ({ value: c, label: c, color: catMeta(c).color, icon: catMeta(c).icon })),
            ].map((c) => {
              const Icon = c.icon;
              const on = cat === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCat(c.value)}
                  className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    on ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="doc-filter"
                      className="absolute inset-0 rounded-xl"
                      style={{ backgroundColor: c.color }}
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    />
                  )}
                  <Icon className="relative w-4 h-4" />
                  <span className="relative whitespace-nowrap">{c.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative lg:w-64 flex-shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari dokumen..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </motion.div>

        {/* kisi kartu */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <motion.div
              animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
            >
              <Plane className="w-7 h-7 text-white rotate-45" />
            </motion.div>
            <p className="text-slate-500 text-[13px]">Memuat daftar dokumen...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-[13.5px] font-medium">
              {docs.length === 0
                ? 'Belum ada dokumen yang dipublikasikan.'
                : 'Tidak ada dokumen yang cocok dengan pencarian Anda.'}
            </p>
          </div>
        ) : (
          <motion.div key={cat + q} variants={container} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((doc) => {
              const meta = catMeta(doc.category);
              const Icon = fileIcon(doc.file_type);
              return (
                <motion.article
                  key={doc.id}
                  variants={rise}
                  whileHover={{ y: -7 }}
                  className="group relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 transition-shadow flex flex-col"
                >
                  {/* kepala kartu */}
                  <div className="relative h-28 overflow-hidden flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                    <Icon
                      className="w-14 h-14 transition-transform duration-500 group-hover:scale-110"
                      style={{ color: meta.color, opacity: 0.4 }}
                      strokeWidth={1.4}
                    />
                    <span
                      className="absolute top-3 left-3 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow"
                      style={{ backgroundColor: meta.color }}
                    >
                      {doc.category}
                    </span>
                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm tabular-nums">
                      {doc.file_type} · {doc.file_size}
                    </span>
                    <Plane className="absolute -bottom-3 -right-2 w-14 h-14 text-white/50 rotate-[25deg]" />
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-black text-slate-900 text-[15.5px] leading-snug group-hover:text-blue-700 transition-colors">
                      {doc.title}
                    </h3>

                    <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-dashed border-slate-200">
                      <span className="flex items-center gap-1.5 text-[11.5px] text-slate-500 tabular-nums">
                        <HardDriveDownload className="w-3.5 h-3.5" style={{ color: meta.color }} />
                        {Number(doc.download_count || 0).toLocaleString('id-ID')}× diunduh
                      </span>

                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-white font-bold text-[12px] px-3.5 py-2 rounded-full shadow-md transition-transform active:scale-95"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh
                      </a>
                    </div>
                  </div>

                  <span className="block h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: meta.color }} />
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* ============ BANTUAN ============ */}
      <section className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-14 overflow-hidden">
        <SkyParticles tone="sky" density="low" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-white/[0.07] backdrop-blur border border-white/15 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
          >
            <span className="w-16 h-16 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-8 h-8 text-cyan-300" />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-black text-[19px]">Tidak Menemukan Dokumen yang Dicari?</h3>
              <p className="mt-1.5 text-blue-100/85 text-[13px] leading-relaxed">
                Sampaikan permintaan dokumen atau pertanyaan Anda melalui kanal pengaduan resmi —
                petugas kami akan menindaklanjuti dengan nomor tiket.
              </p>
            </div>
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              Ajukan Permintaan <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
