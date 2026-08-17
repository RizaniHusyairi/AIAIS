'use client';

/**
 * Profil Bandara — padanan PWA untuk `/profile`.
 *
 * DUA KEKELIRUAN SEKALIGUS DIPERBAIKI DI SINI. Rute `/app/profil` dulu memuat
 * layar akun yang seluruhnya maket, sementara `proxy.ts` mengalihkan `/profile`
 * — halaman profil kelembagaan bandara: sejarah, visi-misi, tugas dan fungsi —
 * ke rute ini. Pengunjung ponsel yang mencari profil bandara mendarat pada
 * daftar menu akun palsu. Akun kini punya rutenya sendiri di `/app/akun`, dan
 * rute ini memuat apa yang memang dijanjikan namanya.
 *
 * Isinya dibaca dari `lib/airportProfile.ts` — sumber yang sama dengan halaman
 * desktop, seluruhnya kutipan dari dokumen resmi beserta dasar hukumnya.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ORG_NAME, HEAD_OFFICIAL, OFFICIALS, VISI, MISI, SEJARAH, TIMELINE,
  STATUS_BLU, TUGAS, FUNGSI, ROUTES, CONTACT, MAPS_URL,
} from '@/lib/airportProfile';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import {
  Plane, ChevronDown, MapPin, Phone, Mail, Clock, Users, Landmark,
  ScrollText, Target, History, ArrowRight, Navigation,
} from 'lucide-react';

/** Satu bagian yang dapat dilipat. Layar ponsel tidak sanggup menampung
 *  seluruh kutipan PM 20/2024 sekaligus tanpa mengubur bagian lainnya. */
function Lipatan({
  judul,
  icon: Icon,
  warna,
  latar,
  anak,
  awalTerbuka = false,
}: {
  judul: string;
  icon: React.ElementType;
  warna: string;
  latar: string;
  anak: React.ReactNode;
  awalTerbuka?: boolean;
}) {
  const [buka, setBuka] = useState(awalTerbuka);

  return (
    <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-expanded={buka}
        className="w-full flex items-center gap-3.5 p-4 text-left min-h-[44px]"
      >
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: latar }}
        >
          <Icon className="w-5 h-5" style={{ color: warna }} strokeWidth={2.1} />
        </span>
        <span className="flex-1 font-bold text-slate-900 text-[14px]">{judul}</span>
        <ChevronDown
          className={`w-5 h-5 text-slate-300 transition-transform ${buka ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {buka && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 -mt-1">{anak}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProfilScreen() {
  return (
    <div className="min-h-full bg-slate-50">
      {/* ===== kepala ===== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#2563eb] text-white rounded-b-[2rem]">
        <StatusBar />
        <AppHeader title="Profil Bandara" tone="light" />

        <div className="px-5 pb-7">
          <p className="text-blue-200 text-[12px]">Bandar Udara</p>
          <h2 className="text-[22px] font-black leading-tight mt-0.5">
            Aji Pangeran Tumenggung Pranoto
          </h2>
          <p className="text-blue-100/80 text-[12px] mt-1">{ORG_NAME}</p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/10 backdrop-blur px-3.5 py-2.5">
              <p className="text-[10px] text-blue-200 uppercase tracking-[0.12em]">Rute Reguler</p>
              <p className="text-[17px] font-black mt-0.5">{ROUTES.reguler.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur px-3.5 py-2.5">
              <p className="text-[10px] text-blue-200 uppercase tracking-[0.12em]">Rute Perintis</p>
              <p className="text-[17px] font-black mt-0.5">{ROUTES.perintis.length}</p>
            </div>
          </div>
        </div>

        <Plane className="absolute -bottom-4 -right-5 w-32 h-32 text-white/10 -rotate-12" aria-hidden="true" />
      </div>

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-2xl p-4 space-y-3"
      >
        {/* ---- pimpinan ---- */}
        <motion.div variants={listItem}>
          <Link
            href="/profile#pejabat"
            className="flex items-center gap-3.5 bg-white rounded-2xl p-4 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
          >
            <span className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-amber-600" strokeWidth={2.1} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {HEAD_OFFICIAL.shortTitle}
              </p>
              <p className="font-bold text-slate-900 text-[14px] leading-snug truncate">
                {HEAD_OFFICIAL.name}
              </p>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {OFFICIALS.length} pejabat struktural
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </Link>
        </motion.div>

        {/* ---- visi & misi ---- */}
        <motion.div variants={listItem}>
          <Lipatan judul="Visi & Misi" icon={Target} warna="#2563eb" latar="#eff6ff" awalTerbuka anak={
            <div className="space-y-3">
              <p className="text-[12px] text-slate-500 leading-relaxed">{VISI.pembuka}</p>
              <blockquote className="rounded-xl bg-blue-50 ring-1 ring-blue-100 p-3.5 text-[12.5px] text-blue-900 leading-relaxed font-medium">
                “{VISI.pernyataan}”
              </blockquote>
              <ul className="space-y-2">
                {MISI.map((m) => (
                  <li key={m.label} className="flex gap-2.5 text-[12.5px] text-slate-600 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-[10.5px] font-bold flex items-center justify-center mt-px">
                      {m.label}
                    </span>
                    {m.text}
                  </li>
                ))}
              </ul>
            </div>
          } />
        </motion.div>

        {/* ---- sejarah ---- */}
        <motion.div variants={listItem}>
          <Lipatan judul="Sejarah" icon={History} warna="#7c3aed" latar="#f5f3ff" anak={
            <div className="space-y-3">
              {SEJARAH.map((p, i) => (
                <p key={i} className="text-[12.5px] text-slate-600 leading-relaxed">{p}</p>
              ))}

              <ol className="mt-1 space-y-3 border-l-2 border-dashed border-slate-200 pl-4">
                {TIMELINE.map((t) => (
                  <li key={t.year} className="relative">
                    <span className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-violet-500 ring-4 ring-white" />
                    <p className="text-[11px] font-bold text-violet-600">{t.year}</p>
                    <p className="text-[13px] font-bold text-slate-900 leading-snug">{t.title}</p>
                    <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">{t.desc}</p>
                  </li>
                ))}
              </ol>
            </div>
          } />
        </motion.div>

        {/* ---- status BLU ---- */}
        <motion.div variants={listItem}>
          <Lipatan judul="Status Badan Layanan Umum" icon={Landmark} warna="#059669" latar="#ecfdf5" anak={
            <div className="space-y-2.5">
              <p className="text-[12.5px] text-slate-600 leading-relaxed">{STATUS_BLU.text}</p>
              <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                Dasar: {STATUS_BLU.dasar}
              </p>
            </div>
          } />
        </motion.div>

        {/* ---- tugas & fungsi ---- */}
        <motion.div variants={listItem}>
          <Lipatan judul="Tugas & Fungsi" icon={ScrollText} warna="#0891b2" latar="#ecfeff" anak={
            <div className="space-y-3">
              <p className="text-[12.5px] text-slate-600 leading-relaxed">{TUGAS.text}</p>
              <p className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 rounded-lg px-3 py-2">
                Dasar: {TUGAS.dasar}
              </p>
              <ul className="space-y-2">
                {FUNGSI.map((f) => (
                  <li key={f.label} className="flex gap-2.5 text-[12.5px] text-slate-600 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-[10.5px] font-bold flex items-center justify-center mt-px">
                      {f.label}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          } />
        </motion.div>

        {/* ---- kontak ---- */}
        <motion.div variants={listItem} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 overflow-hidden">
          <div className="p-4 flex items-start gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-rose-600" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-[14px]">Alamat</p>
              <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">{CONTACT.address}</p>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 p-4 flex items-start gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-emerald-600" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-[14px]">Jam Operasi</p>
              <p className="text-[12px] text-slate-500 mt-0.5">{CONTACT.operationalHours}</p>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 grid grid-cols-2 divide-x divide-slate-100">
            <a
              href={`tel:${CONTACT.phoneHref}`}
              className="flex items-center justify-center gap-1.5 py-3.5 text-[12.5px] font-bold text-blue-600 active:bg-blue-50 transition-colors"
            >
              <Phone className="w-4 h-4" /> Telepon
            </a>
            <a
              href={`mailto:${CONTACT.email}`}
              className="flex items-center justify-center gap-1.5 py-3.5 text-[12.5px] font-bold text-blue-600 active:bg-blue-50 transition-colors"
            >
              <Mail className="w-4 h-4" /> Surel
            </a>
          </div>

          <a
            href={MAPS_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 border-t border-slate-100 py-3.5 text-[12.5px] font-bold text-blue-600 active:bg-blue-50 transition-colors"
          >
            <Navigation className="w-4 h-4" /> Buka di Peta
          </a>
        </motion.div>

        {/* Bagan struktur organisasi sengaja tidak ditiru di sini: bentuknya
            bagan lebar bertingkat yang tidak terbaca di layar ponsel, dan
            halaman desktopnya sudah responsif. */}
        <motion.div variants={listItem}>
          <Link
            href="/profile#struktur"
            className="flex items-center gap-3.5 bg-white rounded-2xl p-4 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
          >
            <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-slate-500" strokeWidth={2.1} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-[14px]">Struktur Organisasi</p>
              <p className="text-[11.5px] text-slate-500">Bagan lengkap Kantor UPBU Kelas I</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
