'use client';

/**
 * Informasi Serta Merta — maklumat yang menyangkut hajat hidup orang banyak.
 *
 * Isi berasal dari `lib/publicInfoData.ts`; lihat provenans di sana, termasuk
 * alasan sebagian keterangan berakhir dengan "...".
 *
 * Nuansa penerbangan — dan kali ini bukan sekadar hiasan: dalam dunia
 * penerbangan, maklumat mendesak yang wajib segera diketahui disebut NOTAM
 * (Notice to Air Missions). "Informasi serta merta" adalah padanan publiknya
 * secara persis, jadi tiap maklumat dirender sebagai kartu bergaya NOTAM —
 * nomor seri, pita peringatan, dan kepala kartu monospasi.
 *
 * Pencarian dipertahankan dari v1 (di sana skrip inline `keyup`), tetapi
 * dijalankan React dan mengumumkan jumlah hasil lewat `aria-live`.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import { useSetting } from '@/lib/settings';
import { SERTA_MERTA_PENGANTAR } from '@/lib/publicInfoData';
import { slugify } from '@/lib/ppidGroups';
import { fetchApi } from '@/lib/api';
import type { ImmediateInformation } from '@/types';
import {
  Search, SearchX, ExternalLink, TriangleAlert, Radio, Megaphone, ArrowRight, Info,
} from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

/** Nomor seri bergaya NOTAM: A0001/26, A0002/26, … */
function serial(index: number): string {
  return `A${String(index + 1).padStart(4, '0')}/26`;
}

export default function InformasiSertaMertaView() {
  const heroBg = useSetting('bg_ppid');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ImmediateInformation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let batal = false;

    fetchApi<ImmediateInformation[]>('/immediate-information').then((res) => {
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });

    return () => { batal = true; };
  }, []);

  /** Bentuk yang dipakai kartu; `slug` dulu ditulis tangan di data statis. */
  const maklumat = useMemo(
    () => items.map((it) => ({
      slug: `${slugify(it.uraian)}-${it.id}`,
      uraian: it.uraian,
      keterangan: it.keterangan,
      url: it.link_url,
    })),
    [items],
  );

  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    // Indeks asli dipertahankan supaya nomor seri tidak berubah saat disaring.
    const withIndex = maklumat.map((it, i) => ({ ...it, index: i }));
    if (!s) return withIndex;
    return withIndex.filter(
      (it) => it.uraian.toLowerCase().includes(s) || it.keterangan.toLowerCase().includes(s),
    );
  }, [q, maklumat]);

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Informasi"
        accent="Serta Merta"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead={SERTA_MERTA_PENGANTAR}
        bg={heroBg}
      />

      {/* Penjelasan istilah + pencarian */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <motion.div variants={rise} className="lg:col-span-7 flex items-start gap-4 bg-gradient-to-br from-amber-50 to-white ring-1 ring-amber-100 rounded-2xl p-5">
            <span className="w-10 h-10 rounded-xl bg-white ring-1 ring-amber-100 flex items-center justify-center flex-shrink-0">
              <Radio className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Setara NOTAM bagi publik
              </p>
              <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">
                Di dunia penerbangan, maklumat mendesak disebarkan sebagai <strong>NOTAM</strong>.
                Halaman ini adalah padanannya bagi masyarakat umum: pemberitahuan yang wajib
                diumumkan segera karena menyangkut keselamatan dan ketertiban bersama.
              </p>
            </div>
          </motion.div>

          <motion.div variants={rise} className="lg:col-span-5 flex items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari maklumat…"
                aria-label="Cari informasi serta merta"
                className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl ring-1 ring-slate-200 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Daftar maklumat */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={container}>
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Maklumat
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Pemberitahuan Serta Merta
          </motion.h2>
          <motion.p variants={rise} className="mt-2 text-[13.5px] text-slate-500 max-w-2xl leading-relaxed" aria-live="polite">
            {loading
              ? 'Memuat maklumat...'
              : q.trim()
                ? `${hasil.length} dari ${maklumat.length} maklumat cocok dengan pencarian.`
                : `${maklumat.length} maklumat, urut dari yang terbaru. Ketuk kartu untuk membaca selengkapnya.`}
          </motion.p>
        </motion.div>

        {hasil.length === 0 ? (
          <div className="mt-8 bg-white rounded-2xl ring-1 ring-slate-200/70 py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <SearchX className="w-6 h-6 text-slate-400" />
            </div>
            <p className="mt-4 text-[15px] font-bold text-slate-800">Maklumat tidak ditemukan</p>
            <p className="mt-1 text-[13px] text-slate-500">Coba kata kunci yang lain.</p>
          </div>
        ) : (
          <motion.ul
            key={q}
            variants={container}
            initial="hidden"
            animate="show"
            className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {hasil.map((it) => (
                <motion.li
                  key={it.slug}
                  variants={rise}
                  layout
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col h-full bg-white rounded-2xl ring-1 ring-slate-200/70 overflow-hidden transition-shadow hover:shadow-xl hover:shadow-amber-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {/* Kepala kartu bergaya NOTAM */}
                    <div className="flex items-center gap-2.5 bg-[#0b1e5b] px-4 py-2.5">
                      <TriangleAlert className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                      <span className="font-mono text-[11px] font-bold text-amber-200 tracking-wider tabular-nums">
                        {serial(it.index)}
                      </span>
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-blue-200/70">
                        Serta Merta
                      </span>
                    </div>

                    {/* pita peringatan bergaris miring */}
                    <span
                      className="h-1.5 w-full"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(45deg, #f59e0b 0 8px, #fbbf24 8px 16px)',
                      }}
                      aria-hidden="true"
                    />

                    <div className="flex-1 px-5 py-4">
                      <h3 className="text-[14.5px] font-black text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                        {it.uraian}
                      </h3>
                      <p className="mt-2 text-[12.5px] text-slate-600 leading-relaxed">
                        {it.keterangan}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-dashed border-slate-200 bg-slate-50/70">
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-blue-600">
                        Lihat Detail
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </a>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        {/* Keterangan jujur soal sumber teks */}
        <div className="mt-6 flex items-start gap-4 bg-blue-50/60 ring-1 ring-blue-100 rounded-2xl px-5 py-4">
          <span className="w-9 h-9 rounded-xl bg-white ring-1 ring-blue-100 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-blue-600" />
          </span>
          <p className="text-[12.5px] text-slate-600 leading-relaxed">
            Teks pada kartu adalah ringkasan. Uraian selengkapnya, termasuk gambar dan
            infografisnya, terbit pada kanal resmi bandara dan terbuka lewat tautan
            &ldquo;Lihat Detail&rdquo; di tiap kartu.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-sky-200" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Melihat Sesuatu yang Membahayakan?</h2>
              <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-xl">
                Laporkan segera kepada petugas bandara, atau sampaikan melalui kanal pengaduan
                resmi.
              </p>
            </div>
          </div>

          <Link href="/complaints" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors self-start">
            Sampaikan Laporan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
