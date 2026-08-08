'use client';

/**
 * Regulasi — Surat Keputusan & Surat Edaran.
 *
 * Satu tampilan untuk dua halaman: keduanya di v1 memakai view Blade yang
 * sama (`landing-menu/regulasi/index.blade.php`) dan hanya berbeda pada
 * `$type`, jadi memisahkannya di sini hanya akan menduplikasi markup yang
 * harus dijaga tetap seragam.
 *
 * Yang dibawa dari v1: judul, nomor surat, tanggal terbit, tautan berkas,
 * penyaringan sisi klien, dan pesan "dokumen tidak ditemukan". Yang berubah:
 * bahasa visualnya mengikuti portal v2 (hero gradien langit, ringkasan
 * angka, baris dokumen bergaya boarding pass) dan pencarian ikut menyaring
 * nomor surat maupun tahun terbit.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import type { Letter } from '@/types';
import SkyParticles from '@/components/effects/SkyParticles';
import {
  Scale, FileText, Search, CalendarDays, ExternalLink, ArrowRight, Plane,
  Landmark, Gavel, Headphones, Hash,
} from 'lucide-react';

/* ================================================================
   Lengkung lintasan dekoratif — selaras dengan halaman unduhan
   ================================================================ */
function FlightArc({ className = '', d = 'M-20 170 Q 380 50 1020 130' }: { className?: string; d?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 1000 220" preserveAspectRatio="none" fill="none" aria-hidden="true">
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
   Keterangan tiap jenis surat
   ================================================================ */

export type LetterType = 'keputusan' | 'edaran';

const META: Record<LetterType, {
  label: string;
  href: string;
  accent: string;
  icon: typeof Gavel;
  lead: string;
  penjelasan: string;
}> = {
  keputusan: {
    label: 'Surat Keputusan',
    href: '/regulasi/surat-keputusan',
    accent: '#2563eb',
    icon: Gavel,
    lead:
      'Keputusan resmi Kepala Kantor UPBU Kelas I Aji Pangeran Tumenggung Pranoto yang menetapkan kebijakan, penunjukan, dan penetapan di lingkungan bandara.',
    penjelasan:
      'Surat Keputusan bersifat menetapkan: berlaku sejak tanggal ditetapkan dan mengikat pihak yang disebut di dalamnya.',
  },
  edaran: {
    label: 'Surat Edaran',
    href: '/regulasi/surat-edaran',
    accent: '#0891b2',
    icon: Landmark,
    lead:
      'Edaran resmi pengelola Bandar Udara APT Pranoto Samarinda yang memuat pemberitahuan, imbauan, dan petunjuk pelaksanaan kegiatan operasional bandara.',
    penjelasan:
      'Surat Edaran bersifat memberitahukan: memuat penjelasan atau petunjuk atas ketentuan yang sudah ada, bukan aturan baru.',
  },
};

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/** Tanggal terbit dalam bahasa Indonesia; v1 memakai `translatedFormat`. */
function formatTanggal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

const tahunDari = (iso?: string): string => String(iso ?? '').slice(0, 4);

/* ================================================================ */

export default function RegulasiSuratView({ type }: { type: LetterType }) {
  const meta = META[type];
  const Icon = meta.icon;

  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tahun, setTahun] = useState('all');

  useEffect(() => {
    let batal = false;

    fetchApi<Letter[]>(`/letters?type=${type}`).then((res) => {
      if (batal) return;
      setLetters(res.success && Array.isArray(res.data) ? res.data : []);
      // Penyaring dikosongkan bersama datangnya data, bukan di awal efek:
      // seandainya Next memakai ulang komponen ini saat berpindah jenis
      // surat, tahun pilihan lama bisa tidak ada pada daftar yang baru.
      setQ('');
      setTahun('all');
      setLoading(false);
    });

    // Kedua halaman memakai komponen yang sama, jadi Next tidak melepasnya
    // saat berpindah tab — tanpa penanda ini, balasan permintaan lama bisa
    // mendarat setelah yang baru dan menampilkan jenis surat yang keliru.
    return () => { batal = true; };
  }, [type]);

  const daftarTahun = useMemo(
    () => Array.from(new Set(letters.map((l) => tahunDari(l.issue_date)).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [letters],
  );

  const terlihat = useMemo(() => {
    const s = q.toLowerCase().trim();
    return letters.filter((l) => {
      const byTahun = tahun === 'all' || tahunDari(l.issue_date) === tahun;
      const byQ = !s || [l.title, l.number, formatTanggal(l.issue_date)].some((v) => String(v ?? '').toLowerCase().includes(s));
      return byTahun && byQ;
    });
  }, [letters, q, tahun]);

  const rentang = useMemo(() => {
    if (daftarTahun.length === 0) return '—';
    const urut = [...daftarTahun].sort();
    return urut[0] === urut[urut.length - 1] ? urut[0] : `${urut[0]} – ${urut[urut.length - 1]}`;
  }, [daftarTahun]);

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
            <Scale className="w-14 h-14 text-cyan-200/80 drop-shadow-2xl" strokeWidth={1.2} />
          </motion.div>
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-16 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Icon className="w-3.5 h-3.5" /> Regulasi Bandara
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
              {meta.label.split(' ')[0]}
              <br />
              <span className="text-cyan-300">{meta.label.split(' ').slice(1).join(' ')}</span>
            </h1>

            <p className="mt-4 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">{meta.lead}</p>

            {/* pindah jenis surat */}
            <div className="mt-6 inline-flex gap-1.5 bg-white/10 backdrop-blur border border-white/20 p-1.5 rounded-full">
              {(Object.keys(META) as LetterType[]).map((t) => {
                const on = t === type;
                const TIcon = META[t].icon;
                return (
                  <Link
                    key={t}
                    href={META[t].href}
                    aria-current={on ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[12.5px] font-bold transition-colors ${
                      on ? 'bg-white text-blue-700 shadow-lg' : 'text-blue-100 hover:bg-white/15'
                    }`}
                  >
                    <TIcon className="w-4 h-4" /> {META[t].label}
                  </Link>
                );
              })}
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
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: `Total ${meta.label}`, value: String(letters.length), icon: FileText, color: meta.accent },
            { label: 'Rentang Tahun', value: rentang, icon: CalendarDays, color: '#7c3aed' },
            { label: 'Tahun Terbit', value: `${daftarTahun.length} tahun`, icon: Landmark, color: '#059669' },
          ].map((s) => {
            const SIcon = s.icon;
            return (
              <motion.div key={s.label} variants={rise} whileHover={{ y: -5 }} className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-5">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}14` }}>
                  <SIcon className="w-5 h-5" style={{ color: s.color }} />
                </span>
                <p className="text-[22px] font-black text-slate-900 leading-none mt-3 tabular-nums">{s.value}</p>
                <p className="text-[11.5px] text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ DAFTAR SURAT ============ */}
      <section id="dokumen" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14 scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <FileText className="w-3.5 h-3.5" /> Daftar Dokumen
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">{meta.label} Bandar Udara APT Pranoto</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">{meta.penjelasan}</p>
        </motion.div>

        {/* penyaring tahun + pencarian */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between"
        >
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[{ value: 'all', label: 'Semua Tahun' }, ...daftarTahun.map((t) => ({ value: t, label: t }))].map((t) => {
              const on = tahun === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTahun(t.value)}
                  className={`relative flex-shrink-0 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    on ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="letter-year-filter"
                      className="absolute inset-0 rounded-xl"
                      style={{ backgroundColor: meta.accent }}
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    />
                  )}
                  <span className="relative whitespace-nowrap tabular-nums">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative lg:w-72 flex-shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul atau nomor surat..."
              aria-label={`Cari ${meta.label}`}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </motion.div>

        {/* daftar */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <motion.div
              animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
            >
              <Plane className="w-7 h-7 text-white rotate-45" />
            </motion.div>
            <p className="text-slate-500 text-[13px]">Memuat daftar surat...</p>
          </div>
        ) : terlihat.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-[13.5px] font-medium">
              {letters.length === 0
                ? `Saat ini belum ada ${meta.label} yang tersedia.`
                : 'Maaf, dokumen yang Anda cari tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <motion.ul key={`${type}-${tahun}-${q}`} variants={container} initial="hidden" animate="show" className="mt-6 space-y-4">
            <AnimatePresence initial={false}>
              {terlihat.map((letter) => (
                <motion.li
                  key={letter.id}
                  variants={rise}
                  layout
                  exit={{ opacity: 0, y: -8 }}
                  className="group relative bg-white rounded-2xl ring-1 ring-slate-200/70 overflow-hidden transition-shadow hover:shadow-xl hover:shadow-slate-300/40"
                >
                  <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: meta.accent }} />

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pl-6 pr-5 py-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${meta.accent}14` }}
                    >
                      <FileText className="w-5 h-5" style={{ color: meta.accent }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14.5px] font-black text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                        {letter.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.accent }} />
                          <span className="font-semibold text-slate-600">Nomor: {letter.number}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                          {formatTanggal(letter.issue_date)}
                        </span>
                      </div>
                    </div>

                    {letter.file_url && (
                      <a
                        href={letter.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 text-white font-bold text-[12px] px-4 py-2.5 rounded-full shadow-md transition-transform active:scale-95 flex-shrink-0"
                        style={{ backgroundColor: meta.accent }}
                      >
                        Lihat Dokumen <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <span className="block h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: meta.accent }} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
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
              <h3 className="text-white font-black text-[19px]">Tidak Menemukan Surat yang Dicari?</h3>
              <p className="mt-1.5 text-blue-100/85 text-[13px] leading-relaxed">
                Surat yang belum tayang di sini dapat diminta melalui permohonan informasi publik —
                permohonan Anda ditindaklanjuti PPID bandara dengan nomor tiket.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center flex-shrink-0">
              <Link
                href="/ppid/regulasi"
                className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors"
              >
                Regulasi PPID
              </Link>
              <Link
                href="/ppid/pengajuan-informasi"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors"
              >
                Ajukan Permohonan <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
