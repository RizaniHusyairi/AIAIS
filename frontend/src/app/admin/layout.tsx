'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { getToken, getUser, logout, AdminUser } from '@/lib/adminApi';
import { API_BASE_URL } from '@/lib/api';
import { APP_VERSION, VERSION_LABEL, IS_PRERELEASE, RELEASE_CHANNEL } from '@/lib/version';
import {
  LayoutDashboard, Plane, Newspaper, Megaphone, Building2, Store, FileText, MessageSquareWarning,
  LogOut, ExternalLink, ShieldCheck, Menu, X, Radar, ChevronRight, ImageIcon, ScrollText,
} from 'lucide-react';

const NAV: { section: string; items: { name: string; href: string; icon: any }[] }[] = [
  {
    section: 'Ringkasan',
    items: [{ name: 'Dasbor', href: '/admin/dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'Operasional',
    items: [{ name: 'Penerbangan (FIDS)', href: '/admin/flights', icon: Plane }],
  },
  {
    section: 'Konten Publik',
    items: [
      { name: 'Berita & Artikel', href: '/admin/news', icon: Newspaper },
      { name: 'Pengumuman', href: '/admin/announcements', icon: Megaphone },
      { name: 'Dokumen', href: '/admin/documents', icon: FileText },
    ],
  },
  {
    section: 'Layanan Bandara',
    items: [
      { name: 'Fasilitas', href: '/admin/facilities', icon: Building2 },
      { name: 'Tenant & Resto', href: '/admin/tenants', icon: Store },
    ],
  },
  {
    section: 'Interaksi Publik',
    items: [
      { name: 'Pengaduan', href: '/admin/complaints', icon: MessageSquareWarning },
      { name: 'Permohonan Informasi', href: '/admin/information-requests', icon: ScrollText },
    ],
  },
  {
    section: 'Pengaturan',
    items: [{ name: 'Tampilan & Latar', href: '/admin/appearance', icon: ImageIcon }],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [clock, setClock] = useState('--:--:--');
  /** Versi yang dilaporkan backend; dipakai mendeteksi selisih dengan frontend. */
  const [backendVersion, setBackendVersion] = useState<string | null>(null);

  /* auth guard */
  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    if (!getToken()) {
      router.replace('/admin/login');
      return;
    }
    setUser(getUser());
    setReady(true);
  }, [isLogin, pathname, router]);

  /* cockpit clock */
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Makassar' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => setNavOpen(false), [pathname]);

  // Sekali saat mount: tanyakan versi ke backend untuk dibandingkan.
  // Gagal diam-diam — ini informasi pelengkap, bukan fungsi utama panel.
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/version`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const v = json?.data?.version;
        if (alive && typeof v === 'string') setBackendVersion(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const doLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  if (isLogin) return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#050a16] flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center"
        >
          <Plane className="w-7 h-7 text-cyan-300 rotate-45" />
        </motion.div>
        <p className="text-slate-400 text-[12.5px]">Memverifikasi sesi...</p>
      </div>
    );
  }

  const currentTitle =
    NAV.flatMap((g) => g.items).find((i) => pathname.startsWith(i.href))?.name ?? 'Panel Manajemen';

  const Sidebar = (
    <div className="h-full flex flex-col bg-[#08111f] border-r border-white/8">
      {/* brand */}
      <div className="px-5 py-5 border-b border-white/8">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <Plane className="w-5 h-5 text-white rotate-45" />
          </span>
          <div className="min-w-0">
            <p className="font-black text-white text-[13.5px] leading-none tracking-tight">AIAIS Panel</p>
            <p className="text-[10px] text-cyan-300/80 mt-1 tracking-wide">APT PRANOTO</p>
          </div>
        </Link>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-600">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors ${
                      active ? 'text-cyan-200' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-nav-active"
                        className="absolute inset-0 rounded-xl bg-cyan-500/12 border border-cyan-400/30"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}
                    <Icon className="relative w-[17px] h-[17px] flex-shrink-0" />
                    <span className="relative truncate">{item.name}</span>
                    {active && <ChevronRight className="relative w-3.5 h-3.5 ml-auto text-cyan-400" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* footer */}
      <div className="px-3 py-4 border-t border-white/8 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[12px] text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
        >
          <span>Buka Portal Publik</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        <div className="rounded-xl bg-[#0d1730] border border-white/8 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-300">
            <motion.span
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            />
            SERVER TERHUBUNG
          </div>
          <p className="text-[9.5px] text-slate-500 mt-1">
            AIAIS {VERSION_LABEL} · Laravel API
          </p>

          {/* Lencana kanal, hanya untuk build pra-rilis. */}
          {IS_PRERELEASE && (
            <span className="inline-block mt-1.5 text-[8.5px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/25">
              {RELEASE_CHANNEL}
            </span>
          )}

          {/* Pendeteksi selisih versi: kalau backend dan frontend menyebut
              angka berbeda, salah satunya lupa di-build/di-cache ulang.
              Ditampilkan alih-alih mengandalkan kedisiplinan. */}
          {backendVersion && backendVersion !== APP_VERSION && (
            <p className="mt-1.5 text-[9px] leading-snug text-amber-300 border-t border-amber-400/20 pt-1.5">
              Backend v{backendVersion} ≠ frontend {VERSION_LABEL}. Jalankan{' '}
              <span className="font-mono">config:cache</span> / build ulang.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050a16] text-slate-100 flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:block w-[248px] flex-shrink-0 sticky top-0 h-screen">{Sidebar}</aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {navOpen && (
          <div className="lg:hidden fixed inset-0 z-[90] flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -270 }}
              animate={{ x: 0 }}
              exit={{ x: -270 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative w-[262px] h-full"
            >
              {Sidebar}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-40 bg-[#08111f]/90 backdrop-blur-xl border-b border-white/8">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button
              onClick={() => setNavOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">Panel Manajemen</p>
              <h2 className="text-[14.5px] font-bold text-white truncate">{currentTitle}</h2>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-white/5 border border-white/8 px-3 py-1.5 rounded-lg">
                <Radar className="w-3.5 h-3.5 text-cyan-400" /> {clock} WITA
              </span>

              <div className="hidden sm:block text-right">
                <p className="text-[12px] font-bold text-white leading-none truncate max-w-[150px]">{user?.name ?? 'Administrator'}</p>
                <p className="text-[10px] text-cyan-300/80 mt-1 flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3 h-3" /> {user?.role ?? 'admin'}
                </p>
              </div>

              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-[13px] font-black text-white flex-shrink-0">
                {(user?.name ?? 'A').charAt(0).toUpperCase()}
              </span>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={doLogout}
                className="w-9 h-9 rounded-xl bg-rose-500/12 border border-rose-500/30 text-rose-300 hover:bg-rose-500/22 flex items-center justify-center transition-colors cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </header>

        {/* content */}
        <main className="flex-1 p-4 sm:p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
