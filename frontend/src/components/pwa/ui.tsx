'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Share2, Search, Inbox, LoaderCircle } from 'lucide-react';
import { TABS_PWA, tabAktif } from './nav';

/* ------------------------------------------------------------------ */
/*  Jarak aman di sisi atas layar                                      */
/* ------------------------------------------------------------------ */
/**
 * Menyisakan ruang untuk status bar milik sistem operasi.
 *
 * Sebelumnya komponen ini menggambar tiruan status bar iOS (jam 9:41,
 * ikon sinyal/Wi-Fi/baterai statis) agar tangkapan layar demo terlihat
 * seperti aplikasi native. Di perangkat sungguhan hasilnya justru
 * bertumpuk dengan status bar asli dan menampilkan jam yang keliru,
 * jadi kini hanya menyisakan safe-area inset:
 *
 *  - Browser biasa  -> inset 0, tidak memakan ruang sama sekali.
 *  - PWA ter-install -> setinggi notch/kamera, agar konten tidak tertutup.
 */
export function StatusBar() {
  return <div aria-hidden className="w-full" style={{ height: 'env(safe-area-inset-top)' }} />;
}

/* ------------------------------------------------------------------ */
/*  Screen header (back button + title + optional action)             */
/* ------------------------------------------------------------------ */
export function AppHeader({
  title,
  back = true,
  action,
  className = '',
  tone = 'dark',
}: {
  title: string;
  back?: boolean;
  action?: React.ReactNode;
  className?: string;
  /** `light` dipakai saat header berada di atas latar berwarna pekat. */
  tone?: 'dark' | 'light';
}) {
  const router = useRouter();
  const light = tone === 'light';
  return (
    <div className={`flex items-center gap-3 px-4 h-14 ${className}`}>
      {back && (
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => router.back()}
          className={`w-9 h-9 -ml-1 rounded-full flex items-center justify-center ${
            light ? 'text-white hover:bg-white/15 active:bg-white/15' : 'text-slate-700 hover:bg-slate-100 active:bg-slate-100'
          }`}
          aria-label="Kembali"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
      )}
      <h1 className={`flex-1 text-[17px] font-bold truncate ${light ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h1>
      {action}
    </div>
  );
}

export function ShareButton({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const light = tone === 'light';
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      className={`w-9 h-9 rounded-full flex items-center justify-center ${
        light ? 'text-white hover:bg-white/15' : 'text-blue-600 hover:bg-blue-50'
      }`}
      aria-label="Bagikan"
    >
      <Share2 className="w-5 h-5" />
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Segmented control (pill tabs)                                      */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId = 'seg',
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  layoutId?: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              active ? 'text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-blue-600"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigasi utama — dua bentuk, satu daftar                           */
/*                                                                     */
/*  Ponsel  : bilah bawah lima slot, Pusat Bantuan terangkat di tengah.*/
/*  Tablet  : rail kiri, Pusat Bantuan jadi pil terisi di puncaknya.   */
/*                                                                     */
/*  Keduanya membaca `TABS_PWA` dari `./nav`, jadi menambah tujuan     */
/*  cukup satu suntingan.                                              */
/* ------------------------------------------------------------------ */

/** Warna tunggal untuk tujuan yang ditonjolkan; dipakai bilah bawah & rail. */
const KILAU_UTAMA = 'bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg shadow-blue-600/35';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="md:hidden flex-shrink-0 relative bg-white/92 backdrop-blur-xl border-t border-slate-100 px-1 pt-1.5"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-end justify-around">
        {TABS_PWA.map((t) => {
          const aktif = tabAktif(t.href, pathname);
          const Icon = t.icon;

          /* ---- slot tengah yang ditonjolkan ---- */
          if (t.utama) {
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={aktif ? 'page' : undefined}
                className="flex-1 flex flex-col items-center gap-1 min-w-0"
              >
                <motion.span
                  whileTap={{ scale: 0.88 }}
                  className={`-mt-7 w-14 h-14 rounded-full ring-4 ring-white flex items-center justify-center ${KILAU_UTAMA}`}
                >
                  <Icon className="w-[26px] h-[26px] text-white" strokeWidth={2.2} />
                </motion.span>
                <span className={`text-[10.5px] font-bold ${aktif ? 'text-blue-700' : 'text-blue-600'}`}>
                  {t.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={aktif ? 'page' : undefined}
              /* min-h 44px: ambang target sentuh, bukan angka selera. */
              className="relative flex-1 min-w-0 flex flex-col items-center justify-end gap-1 min-h-[44px] py-1.5 px-1"
            >
              <motion.span whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-1">
                <span className="relative">
                  {aktif && (
                    <motion.span
                      layoutId="tab-glow"
                      className="absolute -inset-2 rounded-2xl bg-blue-50"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={`relative w-[22px] h-[22px] transition-colors ${aktif ? 'text-blue-600' : 'text-slate-400'}`}
                    strokeWidth={aktif ? 2.4 : 2}
                  />
                </span>
                <span className={`text-[10.5px] font-semibold transition-colors ${aktif ? 'text-blue-600' : 'text-slate-400'}`}>
                  {t.label}
                </span>
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Rail navigasi tablet.
 *
 * Menggantikan bilah bawah mulai `md`. Pada layar selebar itu bilah bawah
 * memaksa ibu jari menyeberangi seluruh tinggi layar untuk berpindah tujuan,
 * sementara sisi kiri justru ruang yang menganggur.
 */
export function SideRail() {
  const pathname = usePathname();
  const utama = TABS_PWA.find((t) => t.utama);
  const sisanya = TABS_PWA.filter((t) => !t.utama);

  return (
    <nav
      aria-label="Navigasi utama"
      className="hidden md:flex flex-shrink-0 w-[92px] flex-col items-center gap-1 bg-white border-r border-slate-100 py-4"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
    >
      <Link href="/app" className="mb-3" aria-label="Beranda aplikasi">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="APT Pranoto" className="w-10 h-10 rounded-xl" />
      </Link>

      {utama && (
        <>
          <Link
            href={utama.href}
            aria-current={tabAktif(utama.href, pathname) ? 'page' : undefined}
            className={`w-16 rounded-2xl py-2.5 flex flex-col items-center gap-1 text-white transition-transform active:scale-95 ${KILAU_UTAMA}`}
          >
            <utama.icon className="w-[22px] h-[22px]" strokeWidth={2.2} />
            <span className="text-[10.5px] font-bold">{utama.label}</span>
          </Link>
          <span className="my-2 w-8 h-px bg-slate-200" aria-hidden="true" />
        </>
      )}

      {sisanya.map((t) => {
        const aktif = tabAktif(t.href, pathname);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={aktif ? 'page' : undefined}
            className={`relative w-16 rounded-2xl py-2.5 flex flex-col items-center gap-1 transition-colors ${
              aktif ? 'bg-blue-50' : 'hover:bg-slate-50'
            }`}
          >
            {aktif && (
              <motion.span
                layoutId="rail-mark"
                /* -10px, bukan -14px: selokan rail tepat 14px, dan menempatkan
                   penandanya di angka itu membuatnya menempel pada tepi layar
                   sampai terlihat separuh terpotong. */
                className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-1 h-7 rounded-full bg-blue-600"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <Icon
              className={`w-[22px] h-[22px] transition-colors ${aktif ? 'text-blue-600' : 'text-slate-400'}`}
              strokeWidth={aktif ? 2.4 : 2}
            />
            <span className={`text-[10.5px] font-semibold ${aktif ? 'text-blue-600' : 'text-slate-400'}`}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Keadaan layar: memuat, kosong, pencarian                           */
/*                                                                     */
/*  Ketiganya berulang di hampir setiap layar berdata. Ditulis sekali  */
/*  di sini supaya "sedang memuat" dan "tidak ada isinya" terlihat     */
/*  sama di seluruh aplikasi — dua keadaan yang paling sering dibiarkan*/
/*  berbeda-beda dan membuat aplikasi terasa tambal sulam.             */
/* ------------------------------------------------------------------ */

export function Memuat({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-14 text-slate-400">
      <LoaderCircle className="w-6 h-6 animate-spin" />
      <p className="text-[12.5px] font-semibold">{label}</p>
    </div>
  );
}

export function LayarKosong({
  judul,
  pesan,
  icon: Icon = Inbox,
  aksi,
}: {
  judul: string;
  pesan?: string;
  icon?: React.ElementType;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 px-8 text-center">
      <span className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-7 h-7 text-slate-400" />
      </span>
      <p className="mt-1 text-[14px] font-bold text-slate-700">{judul}</p>
      {pesan && <p className="text-[12.5px] text-slate-500 leading-relaxed">{pesan}</p>}
      {aksi && <div className="mt-3">{aksi}</div>}
    </div>
  );
}

export function KotakCari({
  value,
  onChange,
  placeholder = 'Cari…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-slate-100 rounded-2xl pl-11 pr-4 py-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                     */
/* ------------------------------------------------------------------ */
export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const listItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 30 } },
};

export const MItem = motion.div;
