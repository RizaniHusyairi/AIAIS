'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Newspaper, LayoutGrid, User, ChevronLeft, Share2 } from 'lucide-react';

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
/*  Bottom tab navigation                                              */
/* ------------------------------------------------------------------ */
const TABS = [
  { href: '/app', label: 'Beranda', icon: Home },
  { href: '/app/berita', label: 'Berita', icon: Newspaper },
  { href: '/app/layanan', label: 'Layanan', icon: LayoutGrid },
  { href: '/app/profil', label: 'Profil', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-2 pt-1.5"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.href === '/app' ? pathname === '/app' : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="relative flex flex-col items-center gap-1 py-1.5 px-3 flex-1"
            >
              <motion.div whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-1">
                <div className="relative">
                  {active && (
                    <motion.span
                      layoutId="tab-glow"
                      className="absolute -inset-2 rounded-2xl bg-blue-50"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={`relative w-[22px] h-[22px] transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}
                    strokeWidth={active ? 2.4 : 2}
                  />
                </div>
                <span className={`text-[10.5px] font-semibold transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                  {t.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
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
