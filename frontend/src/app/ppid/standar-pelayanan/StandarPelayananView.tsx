'use client';

/**
 * Standar Pelayanan — dokumen dan survei kepuasan masyarakat.
 *
 * Daftar dokumennya diambil dari API (`/service-standards`) supaya petugas
 * dapat menyuntingnya sendiri; teks pengantar dan ajakan SKM tetap di
 * `lib/serviceStandardData.ts` karena ditulis untuk v2, bukan data.
 *
 * Dokumen yang belum terbit TETAP ditampilkan, dengan penanda "belum
 * tersedia". Keberadaan ketiga jenis dokumen ini wajib diumumkan menurut
 * UU 25/2009 — menyembunyikan yang belum terbit membuat pengunjung mengira
 * dokumennya tidak pernah ada, dan memasang tombol yang berujung 404 (seperti
 * v1) lebih buruk lagi.
 *
 * Hero-nya memakai pola yang sama persis dengan `/ppid` dan `/ppid/sop` —
 * gradien, partikel, busur rute, tipografi judul, dan lengkungan pemisah yang
 * identik — supaya ketiga halaman PPID terbaca sebagai satu rangkaian.
 *
 * Nuansa penerbangan pada halaman ini ada di bagian isinya: nomor kelompok
 * bergaya bilah papan jadwal, dan baris dokumen bertakik perforasi seperti
 * tiket.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import {
  SP_PENGANTAR, SP_DASAR_HUKUM, formatTanggal,
  type ServiceDoc, type ServiceDocGroup,
} from '@/lib/serviceStandardData';
import type { SkmKey } from '@/lib/settingsShared';
import { slugify } from '@/lib/ppidGroups';
import { fetchApi } from '@/lib/api';
import type { ServiceStandard as ServiceStandardData } from '@/types';
import {
  ClipboardList, ChevronDown, ExternalLink, Download, FileText, Scale,
  Star, Info, ShieldCheck, ArrowRight, CalendarDays, Hash, FileClock,
} from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

/* ================================================================
   Satu baris dokumen
   ================================================================ */

function DocRow({ doc }: { doc: ServiceDoc }) {
  const tersedia = !!doc.url;

  return (
    <motion.li
      variants={rise}
      className="relative bg-white rounded-2xl ring-1 ring-slate-200/70 overflow-hidden"
    >
      {/* pita aksen: biru bila berkas siap, abu bila belum */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${tersedia ? 'bg-blue-500' : 'bg-slate-300'}`} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pl-5 pr-4 py-4">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-black text-slate-900 leading-snug">{doc.title}</h4>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
            {doc.number && (
              <span className="inline-flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {doc.number}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatTanggal(doc.published)}
            </span>
          </div>

          <p className="mt-2 text-[12.5px] text-slate-600 leading-relaxed">{doc.description}</p>
        </div>

        {/* takik perforasi */}
        <span className="hidden sm:block self-stretch border-l-2 border-dashed border-slate-200 relative">
          <span className="absolute -top-[18px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
          <span className="absolute -bottom-[18px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
        </span>

        <div className="flex-shrink-0">
          {tersedia ? (
            <a
              href={doc.url!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12.5px] px-4 py-2.5 rounded-full shadow-lg shadow-blue-600/25 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Lihat Dokumen
            </a>
          ) : (
            /* Berkasnya belum terbit. Sengaja BUKAN tombol yang dinonaktifkan
               tanpa penjelasan, dan sama sekali bukan tautan — pada v1 tombol
               di posisi ini menunjuk ke Google Drive yang mengembalikan 404. */
            <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-500 font-semibold text-[12px] px-4 py-2.5 rounded-full ring-1 ring-slate-200">
              <FileClock className="w-3.5 h-3.5" />
              Belum tersedia
            </span>
          )}
        </div>
      </div>
    </motion.li>
  );
}

/* ================================================================
   Satu kelompok (akordeon)
   ================================================================ */

function GroupPanel({
  group,
  index,
  open,
  onToggle,
}: {
  group: ServiceDocGroup;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const headingId = `grup-${group.slug}`;
  const panelId = `panel-${group.slug}`;
  const siap = group.docs.filter((d) => !!d.url).length;

  return (
    <motion.div
      variants={rise}
      className={`bg-white rounded-3xl ring-1 transition-shadow ${
        open ? 'ring-blue-300 shadow-lg shadow-blue-900/5' : 'ring-slate-200/70'
      }`}
    >
      <h3 id={headingId}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center gap-4 text-left px-5 sm:px-6 py-5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-3xl"
        >
          {/* nomor kelompok bergaya bilah papan */}
          <span className="w-11 h-11 rounded-xl bg-[#0b1e5b] text-white font-black text-[15px] flex items-center justify-center flex-shrink-0 relative overflow-hidden tabular-nums">
            <span className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
            {String(index + 1).padStart(2, '0')}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-black text-slate-900 leading-snug">
              {group.title}
            </span>
            <span className="block mt-0.5 text-[12.5px] text-slate-500 leading-relaxed">
              {group.lead}
            </span>
          </span>

          <span className="hidden sm:inline-flex flex-shrink-0 items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 tabular-nums">
            {group.docs.length} dokumen
            {siap === 0 && <span className="text-slate-400">· belum terbit</span>}
          </span>

          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            key="isi"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30, opacity: { duration: 0.18 } }}
            className="overflow-hidden"
          >
            <motion.ul
              variants={container}
              initial="hidden"
              animate="show"
              className="px-5 sm:px-6 pb-6 pt-1 space-y-3 border-t border-dashed border-slate-200 mt-1"
            >
              {group.docs.map((d) => <DocRow key={d.slug} doc={d} />)}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================
   Halaman
   ================================================================ */

/**
 * Kalimat pengantar tiap kelompok, dikunci pada NAMA jenis di basis data.
 *
 * Kalimatnya ditulis untuk v2 dan tidak ada padanannya di tabel warisan v1,
 * jadi tetap tinggal di kode. Jenis yang belum punya entri tampil tanpa
 * pengantar, bukan gagal.
 */
const GROUP_LEAD: Record<string, string> = {
  'Standar Pelayanan': 'Tolok ukur yang dipakai menilai penyelenggaraan pelayanan bandara.',
  'Maklumat Pelayanan': 'Pernyataan kesanggupan bandara menyelenggarakan pelayanan sesuai standar.',
  'Survei Kepuasan Masyarakat': 'Hasil pengukuran kepuasan pengguna jasa sebagai bahan evaluasi.',
};

export default function StandarPelayananView({ skm }: { skm: Record<SkmKey, string> }) {
  // Blok SKM datang sebagai prop dari Server Component, BUKAN lewat
  // `useSetting` — lihat alasannya di ../page.tsx.
  const skmAktif = skm.skm_is_active !== '0';

  const [items, setItems] = useState<ServiceStandardData[]>([]);
  const [loading, setLoading] = useState(true);

  // null berarti "pengguna belum menyentuh akordeon", sehingga kelompok
  // pertama terbuka sendiri. Disimpan begitu, bukan disetel lewat efek —
  // menyetel keadaan dari dalam efek memicu render berantai.
  const [terbuka, setTerbuka] = useState<string[] | null>(null);

  useEffect(() => {
    let batal = false;

    fetchApi<ServiceStandardData[]>('/service-standards').then((res) => {
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });

    return () => { batal = true; };
  }, []);

  /** Kelompokkan per jenis, mempertahankan urutan alur dari backend. */
  const groups = useMemo<ServiceDocGroup[]>(() => {
    const out: ServiceDocGroup[] = [];

    for (const s of items) {
      let g = out.find((x) => x.title === s.type);

      if (!g) {
        g = { slug: slugify(s.type), title: s.type, lead: GROUP_LEAD[s.type] ?? '', docs: [] };
        out.push(g);
      }

      g.docs.push({
        slug: `${g.slug}-${s.id}`,
        title: s.title,
        number: s.document_number ?? undefined,
        description: s.description ?? '',
        published: s.published_date,
        url: s.document_url,
      });
    }

    return out;
  }, [items]);

  const total = items.length;
  const tersedia = items.filter((s) => s.has_document).length;

  /** Kelompok pertama terbuka sampai pengguna mengubahnya sendiri. */
  const bawaan = groups[0] ? [groups[0].slug] : [];
  const terbukaKini = terbuka ?? bawaan;

  const toggle = (slug: string) =>
    setTerbuka((now) => {
      const dasar = now ?? bawaan;

      return dasar.includes(slug) ? dasar.filter((s) => s !== slug) : [...dasar, slug];
    });

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Standar"
        accent="Pelayanan"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead={SP_PENGANTAR}
      />

      {/* ============================================================ */}
      {/*  SURVEI KEPUASAN MASYARAKAT                                  */}
      {/* ============================================================ */}
      {/* Petugas dapat menonaktifkan ajakan ini dari panel — mis. saat periode
          surveinya ditutup Kemenhub dan tautannya sementara tidak melayani. */}
      {skmAktif && (
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.2 }}
          className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl shadow-xl shadow-orange-900/15"
        >
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 px-6 sm:px-8 py-7">
            <div className="w-14 h-14 rounded-2xl bg-white/25 ring-1 ring-white/40 flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">{skm.skm_title}</h2>
              <p className="mt-1.5 text-[13.5px] text-amber-50/95 leading-relaxed max-w-2xl">{skm.skm_text}</p>
            </div>

            <a
              href={skm.skm_url}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-orange-600 hover:bg-amber-50 font-bold text-[13.5px] px-5 py-3.5 rounded-full shadow-lg shadow-orange-900/20 transition-colors"
            >
              {skm.skm_label}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      </section>
      )}

      {/* ============================================================ */}
      {/*  DASAR HUKUM                                                 */}
      {/* ============================================================ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            { icon: Scale, title: 'Dasar Hukum', text: SP_DASAR_HUKUM, tone: 'blue' as const },
            { icon: ClipboardList, title: 'Dokumen Terdaftar', text: `${total} dokumen dalam ${groups.length} kelompok`, tone: 'teal' as const },
            {
              icon: FileClock,
              title: 'Berkas Dapat Diunduh',
              text: tersedia === 0
                ? 'Belum ada berkas yang diterbitkan'
                : `${tersedia} dari ${total} berkas tersedia`,
              tone: 'amber' as const,
            },
          ].map((c) => {
            const Icon = c.icon;
            const tone =
              c.tone === 'blue' ? 'from-blue-50 to-white ring-blue-100 text-blue-600'
              : c.tone === 'teal' ? 'from-teal-50 to-white ring-teal-100 text-teal-600'
              : 'from-amber-50 to-white ring-amber-100 text-amber-600';
            return (
              <motion.div key={c.title} variants={rise} whileHover={{ y: -4 }} className={`bg-gradient-to-br ${tone} ring-1 rounded-2xl p-5`}>
                <Icon className="w-5 h-5" />
                <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{c.title}</p>
                <p className="mt-1 text-[13.5px] font-bold text-slate-800 leading-snug">{c.text}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  DOKUMEN                                                     */}
      {/* ============================================================ */}
      <section id="dokumen" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Dokumen
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Standar, Maklumat & Hasil Survei
          </motion.h2>
          <motion.p variants={rise} className="mt-2 text-[13.5px] text-slate-500 max-w-2xl leading-relaxed">
            Klik salah satu kelompok untuk melihat daftar dokumennya.
          </motion.p>

          <motion.div variants={container} className="mt-8 space-y-4">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="h-[84px] rounded-3xl bg-white ring-1 ring-slate-200/70 animate-pulse" />
              ))
            ) : groups.length === 0 ? (
              <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 px-6 py-10 text-center">
                <p className="text-[13.5px] font-bold text-slate-700">Belum ada dokumen yang terdaftar.</p>
                <p className="mt-1 text-[12.5px] text-slate-500">
                  Daftar standar pelayanan sedang dimutakhirkan.
                </p>
              </div>
            ) : (
              groups.map((g, i) => (
                <GroupPanel
                  key={g.slug}
                  group={g}
                  index={i}
                  open={terbukaKini.includes(g.slug)}
                  onToggle={() => toggle(g.slug)}
                />
              ))
            )}
          </motion.div>

          {/* Keterangan jujur soal ketersediaan berkas */}
          {tersedia < total && (
            <motion.div
              variants={rise}
              className="mt-6 flex items-start gap-4 bg-blue-50/60 ring-1 ring-blue-100 rounded-2xl px-5 py-4"
            >
              <span className="w-9 h-9 rounded-xl bg-white ring-1 ring-blue-100 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-blue-600" />
              </span>
              <p className="text-[12.5px] text-slate-600 leading-relaxed">
                Sebagian berkas dokumen belum diterbitkan, sehingga tombol unduhnya belum aktif.
                Judul, nomor, dan tanggal terbitnya tetap ditampilkan agar keberadaan dokumen itu
                dapat diketahui publik. Untuk memperoleh salinannya, silakan ajukan permohonan
                melalui{' '}
                <Link href="/ppid/sop" className="font-bold text-blue-700 hover:underline">
                  prosedur permohonan informasi publik
                </Link>.
              </p>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  AJAKAN                                                      */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pelayanan Belum Sesuai Standar?
            </h2>
            <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-xl">
              Sampaikan pengaduan Anda, atau ajukan permohonan salinan dokumen melalui PPID.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors"
            >
              Sampaikan Pengaduan
            </Link>
            <Link
              href="/ppid/sop"
              className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white hover:bg-white/20 font-bold text-[13.5px] px-5 py-3 rounded-full transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              SOP PPID
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
