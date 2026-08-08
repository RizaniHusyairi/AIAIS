'use client';

/**
 * Bagan struktur organisasi yang dapat ditelusuri.
 *
 * Menggantikan gambar raster `profil/struktur-organisasi.jpg` yang sebelumnya
 * ditampilkan apa adanya. Gambar itu berukuran 1280×901 sehingga tidak
 * terbaca di layar ponsel, isinya tidak dapat dicari, dan tidak ada satu pun
 * teksnya yang terjangkau pembaca layar atau mesin pencari.
 *
 * Datanya ada di `lib/orgStructure.ts` — termasuk provenans dan alasan
 * beberapa salah ketik pada bagan asli sengaja dipertahankan.
 *
 * Interaksi:
 *   - tiap unit dapat dibuka untuk melihat jabatan fungsionalnya;
 *   - pencarian menyaring nama jabatan di seluruh unit sekaligus, membuka
 *     unit yang cocok dan meredupkan yang tidak;
 *   - kartu pejabat membuka dialog riwayat yang sudah ada di halaman profil.
 */

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Network, Search, ChevronDown, Users, Briefcase, ShieldCheck, Building2,
  Store, Radio, X, Info, IdCard,
} from 'lucide-react';
import { OFFICIALS, type Official } from '@/lib/airportProfile';
import {
  ORG_HEAD, ORG_OVERSIGHT, ORG_UNITS, ORG_BUSINESS_UNIT, ALL_ORG_UNITS,
  TOTAL_JABATAN, JABATAN_UNIK, type OrgUnit,
} from '@/lib/orgStructure';

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

/** Ikon per unit — hanya hiasan, tidak menambah makna baru pada bagan. */
const UNIT_ICON: Record<string, typeof Building2> = {
  'dewan-pengawas': ShieldCheck,
  spi: ShieldCheck,
  'keuangan-tata-usaha': Briefcase,
  'teknik-operasi': Radio,
  'keamanan-darurat': ShieldCheck,
  'pelayanan-kerjasama': Users,
  'unit-usaha': Store,
};

const officialBySlug = (slug?: string): Official | undefined =>
  slug ? OFFICIALS.find((o) => o.slug === slug) : undefined;

const cocok = (teks: string, q: string) => teks.toLowerCase().includes(q);

/* ================================================================
   Kartu satu unit
   ================================================================ */
function UnitCard({
  unit,
  query,
  open,
  onToggle,
  onOpenOfficial,
  compact = false,
}: {
  unit: OrgUnit;
  query: string;
  open: boolean;
  onToggle: () => void;
  onOpenOfficial: (o: Official) => void;
  compact?: boolean;
}) {
  const Icon = UNIT_ICON[unit.slug] ?? Building2;
  const pejabat = officialBySlug(unit.officialSlug);

  const hasil = query ? unit.jabatan.filter((j) => cocok(j, query)) : unit.jabatan;

  // Saat mencari, unit tanpa kecocokan tetap ditampilkan tetapi diredupkan —
  // menghilangkannya akan membuat bagan tampak berubah bentuk.
  const redup = query.length > 0 && hasil.length === 0 && !cocok(unit.name, query);

  return (
    <motion.div
      variants={rise}
      animate={{ opacity: redup ? 0.35 : 1 }}
      className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-lg hover:shadow-slate-300/40 ${
        unit.dashed ? 'border-dashed border-slate-300' : 'border-slate-200'
      }`}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: unit.accent }} />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`jabatan-${unit.slug}`}
        className="w-full text-left px-4 pt-4 pb-3.5 flex items-start gap-3 cursor-pointer"
      >
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${unit.accent}14` }}
        >
          <Icon className="w-5 h-5" style={{ color: unit.accent }} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-black text-slate-900 leading-snug">
            {compact ? unit.shortName : unit.name}
          </span>

          {/* Dewan Pengawas dan Unit Usaha memang tidak berpejabat pada bagan. */}
          {pejabat ? (
            <span className="block mt-0.5 text-[11.5px] text-slate-500 truncate">{pejabat.name}</span>
          ) : (
            <span className="block mt-0.5 text-[11.5px] text-slate-400 italic">
              Tidak tercantum pejabat pada bagan
            </span>
          )}

          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${unit.accent}14`, color: unit.accent }}
            >
              {unit.jabatan.length} jabatan
            </span>

            {unit.dashed && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Garis koordinasi
              </span>
            )}

            {query && hasil.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {hasil.length} cocok
              </span>
            )}
          </span>
        </span>

        <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex-shrink-0 mt-1">
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`jabatan-${unit.slug}`}
            role="region"
            aria-label={`Jabatan pada ${unit.name}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {pejabat && (
                <button
                  type="button"
                  onClick={() => onOpenOfficial(pejabat)}
                  className="w-full flex items-center gap-3 bg-slate-50 hover:bg-blue-50 rounded-xl p-2.5 transition-colors cursor-pointer text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- aset statis lokal */}
                  <img
                    src={pejabat.photo}
                    alt={pejabat.name}
                    loading="lazy"
                    className="w-11 h-11 rounded-lg object-cover object-top flex-shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-slate-900 truncate">{pejabat.name}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{pejabat.shortTitle}</span>
                    {/* Golongan dan NIP diambil dari bagan; keduanya memang
                        tercantum di sana dan tidak ada di data pejabat. */}
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-slate-400">
                      {unit.golongan && <span>{unit.golongan}</span>}
                      {unit.nip && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <IdCard className="w-3 h-3" /> {unit.nip}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )}

              {unit.jabatan.length === 0 ? (
                <p className="text-[11.5px] text-slate-400 leading-relaxed">
                  Bagan tidak mencantumkan jabatan di bawah unit ini.
                </p>
              ) : (
                <>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Jabatan Fungsional
                  </p>
                  <ul className="space-y-1.5">
                    {unit.jabatan.map((j) => {
                      const sorot = query.length > 0 && cocok(j, query);
                      return (
                        <li
                          key={j}
                          className={`flex items-start gap-2 text-[12px] leading-snug rounded-lg px-2 py-1.5 transition-colors ${
                            sorot ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-slate-600'
                          }`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: sorot ? '#d97706' : unit.accent }}
                          />
                          {j}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================ */

export default function OrgChart({ onOpenOfficial }: { onOpenOfficial: (o: Official) => void }) {
  const [query, setQuery] = useState('');
  const [dibuka, setDibuka] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();
  const kepala = officialBySlug(ORG_HEAD.slug);

  /**
   * Unit terbuka bila dibuka manual ATAU sedang cocok dengan pencarian.
   * Diturunkan saat render, bukan lewat efek, supaya hasil pencarian tidak
   * pernah tertinggal satu render di belakang kata yang diketik.
   */
  const terbuka = (u: OrgUnit) =>
    dibuka.has(u.slug) || (q.length > 0 && u.jabatan.some((j) => cocok(j, q)));

  const toggle = (slug: string) =>
    setDibuka((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  // Tanpa useMemo: hitungannya hanya beberapa ratus perbandingan string atas
  // data statis, dan memoisasi manual di sini justru membuat React Compiler
  // melewatkan optimasi seluruh komponen.
  const totalCocok = q
    ? ORG_HEAD.jabatan.filter((j) => cocok(j, q)).length +
      ALL_ORG_UNITS.reduce((n, u) => n + u.jabatan.filter((j) => cocok(j, q)).length, 0)
    : 0;

  const semuaTerbuka = dibuka.size >= ALL_ORG_UNITS.length;

  return (
    <div className="space-y-6">
      {/* ---------- kepala bagian ---------- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Network className="w-5 h-5 text-blue-600" />
          </span>
          <div>
            <h2 className="text-[17px] font-black text-slate-900">Struktur Organisasi</h2>
            <p className="text-[11.5px] text-slate-500">
              {ALL_ORG_UNITS.length + 1} unit kerja · {TOTAL_JABATAN} jabatan · {JABATAN_UNIK} nomenklatur berbeda
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari jabatan, mis. arsiparis..."
              aria-label="Cari jabatan pada struktur organisasi"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Bersihkan pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDibuka(semuaTerbuka ? new Set() : new Set(ALL_ORG_UNITS.map((u) => u.slug)))}
            className="text-[12px] font-bold text-blue-600 hover:bg-blue-50 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            {semuaTerbuka ? 'Tutup semua' : 'Buka semua'}
          </button>
        </div>
      </div>

      {q && (
        <p className="text-[12px] text-slate-500">
          {totalCocok > 0
            ? <>Ditemukan <span className="font-bold text-slate-800">{totalCocok}</span> jabatan yang cocok dengan &ldquo;{query.trim()}&rdquo;.</>
            : <>Tidak ada jabatan yang cocok dengan &ldquo;{query.trim()}&rdquo;.</>}
        </p>
      )}

      {/* ---------- puncak: kepala kantor ---------- */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start"
      >
        <motion.div variants={rise} className="lg:col-span-2 order-2 lg:order-1">
          <div className="relative rounded-2xl bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] p-5 text-white overflow-hidden">
            <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-cyan-300/15 blur-2xl pointer-events-none" />

            <p className="relative text-[10.5px] font-bold uppercase tracking-[0.16em] text-cyan-200">
              Pimpinan Tertinggi
            </p>

            <button
              type="button"
              onClick={() => kepala && onOpenOfficial(kepala)}
              className="relative mt-3 w-full flex items-center gap-4 text-left cursor-pointer group/k"
            >
              {kepala && (
                /* eslint-disable-next-line @next/next/no-img-element -- aset statis lokal */
                <img
                  src={kepala.photo}
                  alt={kepala.name}
                  className="w-16 h-16 rounded-xl object-cover object-top ring-2 ring-white/25 flex-shrink-0"
                />
              )}
              <span className="min-w-0">
                <span className="block text-[15px] font-black leading-snug group-hover/k:text-cyan-200 transition-colors">
                  {kepala?.name}
                </span>
                <span className="block text-[12px] text-blue-100/85 mt-0.5">{ORG_HEAD.unit}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-blue-200/70">
                  <span>{ORG_HEAD.golongan}</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <IdCard className="w-3 h-3" /> {ORG_HEAD.nip}
                  </span>
                </span>
              </span>
            </button>

            {/* Jabatan yang pada bagan menggantung langsung di garis Kepala Kantor. */}
            <div className="relative mt-4 pt-4 border-t border-white/15">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-blue-200/70">
                Jabatan di bawah Kepala Kantor
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {ORG_HEAD.jabatan.map((j) => (
                  <li
                    key={j}
                    className={`text-[11.5px] px-2.5 py-1 rounded-full border ${
                      q && cocok(j, q)
                        ? 'bg-amber-300 text-amber-950 border-amber-300 font-bold'
                        : 'bg-white/10 border-white/15 text-blue-50'
                    }`}
                  >
                    {j}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* unit pengawasan — garis putus-putus */}
        <motion.div variants={rise} className="order-1 lg:order-2 space-y-3">
          {ORG_OVERSIGHT.map((u) => (
            <UnitCard
              key={u.slug}
              unit={u}
              query={q}
              open={terbuka(u)}
              onToggle={() => toggle(u.slug)}
              onOpenOfficial={onOpenOfficial}
              compact
            />
          ))}
        </motion.div>
      </motion.div>

      {/* ---------- penghubung ke unit pelaksana ---------- */}
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className="w-px h-6 bg-slate-200" />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          Unit Pelaksana
        </span>
        <span className="w-px h-6 bg-slate-200" />
      </div>

      {/* ---------- unit pelaksana ---------- */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start"
      >
        {ORG_UNITS.map((u) => (
          <div key={u.slug} className="space-y-3">
            <UnitCard
              unit={u}
              query={q}
              open={terbuka(u)}
              onToggle={() => toggle(u.slug)}
              onOpenOfficial={onOpenOfficial}
            />

            {/* Unit Usaha digambar menggantung di bawah Seksi Pelayanan dan
                Kerjasama pada bagan aslinya, jadi ditempatkan bersarang. */}
            {u.slug === 'pelayanan-kerjasama' && (
              <div className="pl-4 border-l-2 border-dashed border-slate-200">
                <UnitCard
                  unit={ORG_BUSINESS_UNIT}
                  query={q}
                  open={terbuka(ORG_BUSINESS_UNIT)}
                  onToggle={() => toggle(ORG_BUSINESS_UNIT.slug)}
                  onOpenOfficial={onOpenOfficial}
                />
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* ---------- keterangan ---------- */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex gap-3">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-[11.5px] text-slate-500 leading-relaxed">
          <p>
            Susunan unit dan daftar jabatan ditranskrip dari bagan resmi bandara; dasar
            pembentukannya adalah Peraturan Menteri Perhubungan RI Nomor PM 20 Tahun 2024.
            Garis putus-putus menandai hubungan koordinasi, bukan garis komando langsung.
          </p>
          <p>
            Nama dan nomenklatur jabatan pejabat mengikuti data pejabat terkini pada halaman ini;
            bila berbeda dengan bagan arsip, yang berlaku adalah data pejabat.
            Tanda <span className="font-mono">*)</span> pada beberapa jabatan disalin apa adanya —
            bagan aslinya tidak memuat keterangan untuk tanda tersebut.
          </p>
        </div>
      </div>
    </div>
  );
}
