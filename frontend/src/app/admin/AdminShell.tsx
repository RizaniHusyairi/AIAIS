'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { getUser, muatSesi, logout } from '@/lib/adminApi';
import { setAdminTheme, useAdminTheme } from '@/components/admin/theme';
import { LogoApt, LambangApt } from '@/components/admin/LogoApt';
import type { AdminUser, UserRole } from '@/types';
import { API_BASE_URL } from '@/lib/api';
import { APP_VERSION, VERSION_LABEL, IS_PRERELEASE, RELEASE_CHANNEL } from '@/lib/version';
import InstagramGlyph from '@/components/icons/InstagramGlyph';
import LonengNotifikasi from '@/components/admin/LonengNotifikasi';
import {
  LayoutDashboard, Newspaper, Megaphone, Building2, Store, FileText, MessageSquareWarning,
  LogOut, ExternalLink, ShieldCheck, Menu, Radar, ChevronRight, ImageIcon, ScrollText, Scale, Landmark,
  Search, SearchX, Sun, Moon,
  CalendarClock, DoorOpen, Radio, Globe, ClipboardList, Users, UserCircle, UserRound, HelpCircle, MapPin, BarChart3, Gauge, MessageSquare, CalendarRange, Wallet, School, BadgeCheck, Gavel, HardHat, PartyPopper,
  PlaneTakeoff, Clock3, GraduationCap, Boxes, Wrench, Mail, CalendarCheck,
  PackageSearch, Bell,
} from 'lucide-react';

/**
 * Menu panel.
 *
 * `roles` membatasi siapa yang melihat sebuah butir. Tanpa `roles`, butir itu
 * tampil bagi semua yang boleh masuk panel (admin dan staff). Penyaringan ini
 * murni soal kerapian tampilan — penjaga sesungguhnya ada di middleware
 * backend, dan mengetik URL-nya langsung tetap dijawab 403.
 */
type NavItem = { name: string; href: string; icon: any; roles?: UserRole[] };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Ringkasan',
    items: [{ name: 'Dasbor', href: '/admin/dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'Operasional',
    items: [
      { name: 'Lalu Lintas Udara', href: '/admin/air-traffic', icon: BarChart3 },
      { name: 'Posko Nataru', href: '/admin/nataru', icon: CalendarRange },
      { name: 'Kinerja Keuangan', href: '/admin/keuangan', icon: Wallet },
    ],
  },
  {
    section: 'Konten Publik',
    items: [
      { name: 'Berita & Artikel', href: '/admin/news', icon: Newspaper },
      { name: 'Pengumuman', href: '/admin/announcements', icon: Megaphone },
      { name: 'Slide Informasi', href: '/admin/info-slides', icon: ImageIcon },
      { name: 'Dokumen', href: '/admin/documents', icon: FileText },
      { name: 'Regulasi', href: '/admin/regulasi', icon: Scale },
      { name: 'Pejabat Bandara', href: '/admin/pejabat', icon: UserRound },
      { name: 'Tautan Terkait', href: '/admin/external-links', icon: Globe },
      { name: 'Instagram', href: '/admin/instagram', icon: InstagramGlyph },
      { name: 'Perayaan', href: '/admin/perayaan', icon: PartyPopper },
    ],
  },
  {
    // Empat halaman isi PPID; dipisah dari Konten Publik karena keempatnya
    // tunduk pada kewajiban UU 14/2008, bukan sekadar materi promosi.
    section: 'Informasi Publik (PPID)',
    items: [
      { name: 'Profil PPID', href: '/admin/profil-ppid', icon: ShieldCheck },
      { name: 'Regulasi PPID', href: '/admin/ppid-regulations', icon: Landmark },
      { name: 'Informasi Berkala', href: '/admin/periodic-documents', icon: CalendarClock },
      { name: 'Informasi Setiap Saat', href: '/admin/evergreen-information', icon: DoorOpen },
      { name: 'Informasi Serta-Merta', href: '/admin/immediate-information', icon: Radio },
      { name: 'Standar Pelayanan', href: '/admin/service-standards', icon: ClipboardList },
    ],
  },
  {
    section: 'Layanan Bandara',
    items: [
      { name: 'Fasilitas', href: '/admin/facilities', icon: Building2 },
      { name: 'Tenant & Resto', href: '/admin/tenants', icon: Store },
      { name: 'Layanan Pengajuan', href: '/admin/services', icon: ClipboardList },
      { name: 'Kunjungan Lapangan', href: '/admin/fieldtrips', icon: School },
      // Enam jenis pengajuan berbagi satu halaman; jenisnya ada di lintasan.
      { name: 'Pengajuan Tenant', href: '/admin/pengajuan/tenant', icon: Store },
      { name: 'Pengajuan Sewa', href: '/admin/pengajuan/sewa', icon: Building2 },
      { name: 'Perizinan Usaha', href: '/admin/pengajuan/perizinan-usaha', icon: BadgeCheck },
      { name: 'Pengiklanan', href: '/admin/pengajuan/pengiklanan', icon: Megaphone },
      { name: 'Beauty Contest', href: '/admin/pengajuan/beauty-contest', icon: Gavel },
      { name: 'Izin Kerja', href: '/admin/pengajuan/izin-kerja', icon: HardHat },
      { name: 'Slot Charter', href: '/admin/slots', icon: PlaneTakeoff },
      { name: 'Extend Advance', href: '/admin/extend-advance', icon: Clock3 },
      { name: 'Peserta OJT', href: '/admin/ojt', icon: GraduationCap },
      { name: 'FAQ', href: '/admin/faqs', icon: HelpCircle },
      { name: 'Wisata', href: '/admin/tourisms', icon: MapPin },
    ],
  },
  {
    // Aplikasi internal pegawai — bukan layanan publik.
    section: 'Internal',
    items: [
      { name: 'Inventaris Aset', href: '/admin/inventaris', icon: Boxes },
            { name: 'Persuratan', href: '/admin/persuratan', icon: Mail },
      { name: 'Absensi Rapat', href: '/admin/rapat', icon: CalendarCheck },
      { name: 'Suku Cadang', href: '/admin/spare-parts', icon: Wrench },
    ],
  },
  {
    section: 'Interaksi Publik',
    items: [
      // Satu halaman, dua tab: percakapan chat dan pengaduan resmi.
      { name: 'Helpdesk', href: '/admin/complaints', icon: MessageSquareWarning },
      // Satu halaman, dua tab: laporan kehilangan dari warga dan catatan
      // barang temuan di terminal. Digabung karena penanganannya bolak-balik
      // antara keduanya.
      { name: 'Lapor Kehilangan', href: '/admin/lapor-hilang', icon: PackageSearch },
      // Hanya admin: berkas syaratnya memuat scan KTP pemohon, dan rutenya
      // di backend memang dijaga `role:admin`.
      { name: 'Permohonan Informasi', href: '/admin/information-requests', icon: ScrollText, roles: ['admin'] },
    ],
  },
  {
    section: 'Pengaturan',
    items: [
      { name: 'Tampilan & Latar', href: '/admin/appearance', icon: ImageIcon },
      // Angka ringkas beranda. Di seksi Pengaturan bersama "Tampilan & Latar"
      // karena keduanya menyunting tampilan halaman depan, bukan isi
      // kedinasan — dan blok "Tentang" yang memuat angka-angka ini memang
      // disunting di halaman sebelahnya.
      { name: 'Angka Bandara', href: '/admin/angka-bandara', icon: Gauge },
      // Kotak masuk kiriman warga: seluruh riwayat notifikasi, tersaring per
      // jenis, ditambah sakelar push dan lonceng. Terjangkau juga lewat
      // dropdown lonceng, tetapi tetap didaftarkan di sini — dropdown itu hanya
      // memuat tiga puluh yang terbaru, dan selama loncengnya kosong tidak ada
      // apa pun yang menuntun ke riwayat maupun ke sakelar pushnya.
      { name: 'Notifikasi', href: '/admin/notifikasi', icon: Bell },
      // Sebelahnya, dan sengaja tidak digabung: yang ini menyetel KANALNYA —
      // gateway dan nomor piket — bukan membaca kabarnya. Terbuka bagi staf
      // karena piket harian memang dipegang staf; kunci gatewaynya sendiri
      // hanya dapat disimpan admin — rutenya di backend pun dijaga `role:admin`.
      { name: 'WhatsApp', href: '/admin/whatsapp', icon: MessageSquare },
      // Manajemen akun hanya untuk admin; rutenya di backend pun `role:admin`.
      { name: 'Pengguna', href: '/admin/users', icon: Users, roles: ['admin'] },
      // Profil sendiri terbuka bagi semua yang boleh masuk panel — mengganti
      // kata sandi tidak boleh bergantung pada ketersediaan admin.
      { name: 'Profil Saya', href: '/admin/profil', icon: UserCircle },
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useAdminTheme();
  /**
   * Halaman yang boleh dibuka TANPA sesi.
   *
   * Bukan hanya `/admin/login`: penerima tautan reset kata sandi justru datang
   * dalam keadaan tidak dapat masuk, dan melemparnya ke halaman masuk membuat
   * tautannya mustahil dipakai.
   */
  const isPublik = ['/admin/login', '/admin/lupa-sandi', '/admin/reset-sandi'].includes(pathname);

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [clock, setClock] = useState('--:--:--');
  /**
   * Penyaring menu.
   *
   * Panel ini punya lebih dari tiga puluh butir menu dalam delapan seksi —
   * terlalu banyak untuk dipindai mata petugas yang jarang membukanya.
   * Mengetik beberapa huruf lebih cepat daripada menggulir.
   */
  const [menuQuery, setMenuQuery] = useState('');
  /** Versi yang dilaporkan backend; dipakai mendeteksi selisih dengan frontend. */
  const [backendVersion, setBackendVersion] = useState<string | null>(null);

  /* auth guard
   *
   * Sesi divalidasi ke backend, bukan sekadar diperiksa keberadaannya di
   * peramban. Sebelumnya cukup ada nilai di `localStorage` — sesuatu yang bisa
   * diketik siapa saja lewat konsol — dan seluruh kerangka panel beserta
   * daftar menunya tetap tampil sampai permintaan data pertama kebetulan
   * gagal. Kini panel tidak dirender sebelum backend mengakui sesinya.
   *
   * Identitas dari cache ditampilkan lebih dulu supaya tidak berkedip, tetapi
   * yang menentukan boleh-tidaknya masuk hanyalah jawaban backend. */
  useEffect(() => {
    if (isPublik) {
      setReady(true);
      return;
    }

    let batal = false;
    setUser(getUser());

    muatSesi().then((sesi) => {
      if (batal) return;

      if (!sesi) {
        router.replace('/admin/login');
        return;
      }

      setUser(sesi);
      setReady(true);
    });

    return () => { batal = true; };
  }, [isPublik, pathname, router]);

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

  // Halaman masuk/reset ikut bertema, jadi skripnya tetap harus ada.
  if (isPublik) return <>{children}</>;

  if (!ready) {
    return (
      <div className="adm-sky min-h-screen flex flex-col items-center justify-center gap-5">
        
        <LogoApt className="h-11 w-auto" />

        <div className="relative w-52 h-14">
          <motion.span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] flex items-center justify-center"
            animate={{ x: [0, 160, 0], y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
          >
            <LambangApt className="w-7 h-7" />
          </motion.span>
          <div className="absolute inset-x-0 bottom-0 h-[3px] rounded-full adm-runway" />
        </div>
        <p className="text-[var(--adm-muted)] text-[12.5px]">Memverifikasi sesi...</p>
      </div>
    );
  }

  /**
   * Menu yang boleh dilihat peran ini.
   *
   * Seksi yang seluruh butirnya tersaring ikut hilang, supaya tidak ada judul
   * kelompok menggantung tanpa isi.
   */
  const q = menuQuery.trim().toLowerCase();
  const navTersaring = NAV
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (i) =>
          (!i.roles || (user && i.roles.includes(user.role))) &&
          // Nama seksi ikut dicocokkan supaya mengetik "ppid" memunculkan
          // seluruh isinya, bukan hanya butir yang kebetulan bernama sama.
          (!q || i.name.toLowerCase().includes(q) || group.section.toLowerCase().includes(q)),
      ),
    }))
    .filter((group) => group.items.length > 0);

  // Judul diambil dari NAV penuh, bukan yang tersaring: bila seseorang membuka
  // URL di luar kewenangannya, judulnya tetap benar sementara isinya ditolak
  // backend — lebih jelas daripada "Panel Manajemen" yang menyesatkan.
  const currentTitle =
    NAV.flatMap((g) => g.items).find((i) => pathname.startsWith(i.href))?.name ?? 'Panel Manajemen';

  const Sidebar = (
    <div className="relative h-full flex flex-col bg-[var(--adm-panel)] backdrop-blur-xl border-r border-[var(--adm-line)] overflow-hidden">
      {/* pendar ufuk di puncak sidebar — menegaskan tema langit */}
      <span className="pointer-events-none absolute -top-24 -left-16 w-64 h-64 rounded-full bg-[var(--adm-glow-a)] blur-[90px]" />

      {/* brand */}
      <div className="relative px-5 py-5 border-b border-[var(--adm-line)]">
        {/* Logo resmi berdiri sendiri sebagai identitas; "Panel Manajemen"
            di bawahnya sekadar keterangan sistem, bukan jenama tandingan. */}
        <Link href="/admin/dashboard" className="group block">
          <motion.span
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="block origin-left"
          >
            <LogoApt className="h-10 w-auto max-w-full" />
          </motion.span>
          <p className="mt-2.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--adm-muted)]">
            Panel Manajemen
          </p>
        </Link>

        {/* penyaring menu */}
        <div className="relative mt-4 group">
          <Search className="w-3.5 h-3.5 text-[var(--adm-dim)] group-focus-within:text-[var(--adm-accent)] transition-colors absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
            placeholder="Cari menu..."
            aria-label="Cari menu panel"
            className="w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl pl-9 pr-3 py-2 text-[11.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-[var(--adm-accent-line)] focus:ring-2 focus:ring-[var(--adm-accent-ring)] transition-all"
          />
        </div>
      </div>

      {/* nav */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navTersaring.map((group) => (
          <div key={group.section}>
            <p className="px-3 mb-1.5 flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--adm-dim)]">
              <span className="truncate">{group.section}</span>
              <span className="flex-1 h-px adm-runway opacity-25" />
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors ${
                      active
                        ? 'text-[var(--adm-accent)]'
                        : 'text-[var(--adm-muted)] hover:text-[var(--adm-fg)] hover:bg-[var(--adm-hover)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-nav-active"
                        className="absolute inset-0 rounded-xl bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)]"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}
                    {/* marka landasan di tepi kiri butir aktif */}
                    {active && (
                      <motion.span
                        layoutId="admin-nav-marker"
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-[var(--adm-btn-from)] to-[var(--adm-btn-to)]"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}
                    <Icon className="relative w-[17px] h-[17px] flex-shrink-0" />
                    <span className="relative truncate">{item.name}</span>
                    {active && <ChevronRight className="relative w-3.5 h-3.5 ml-auto" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* menu tidak ditemukan — jangan biarkan daftar kosong tanpa keterangan */}
        {navTersaring.length === 0 && (
          <div className="px-3 py-10 flex flex-col items-center gap-2 text-center">
            <SearchX className="w-7 h-7 text-[var(--adm-dim)]" />
            <p className="text-[11.5px] text-[var(--adm-muted)] font-semibold">Menu tidak ditemukan</p>
            <button
              onClick={() => setMenuQuery('')}
              className="text-[11px] text-[var(--adm-accent)] hover:brightness-110 font-semibold cursor-pointer"
            >
              Tampilkan semua menu
            </button>
          </div>
        )}
      </nav>

      {/* footer */}
      <div className="relative px-3 py-4 border-t border-[var(--adm-line)] space-y-2">
        <Link
          href="/"
          target="_blank"
          className="group flex items-center justify-between px-3 py-2.5 rounded-xl text-[12px] text-[var(--adm-muted)] hover:text-[var(--adm-accent)] hover:bg-[var(--adm-hover)] transition-colors"
        >
          <span>Buka Portal Publik</span>
          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>

        <div className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--adm-ok)]">
            <span className="adm-beacon w-1.5 h-1.5 rounded-full bg-current" />
            SERVER TERHUBUNG
          </div>
          <p className="text-[9.5px] text-[var(--adm-dim)] mt-1">
            AIAIS {VERSION_LABEL} · Laravel API
          </p>

          {/* Lencana kanal, hanya untuk build pra-rilis. */}
          {IS_PRERELEASE && (
            <span className="inline-block mt-1.5 text-[8.5px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-[var(--adm-warn-soft)] text-[var(--adm-warn)] border border-[var(--adm-warn-line)]">
              {RELEASE_CHANNEL}
            </span>
          )}

          {/* Pendeteksi selisih versi: kalau backend dan frontend menyebut
              angka berbeda, salah satunya lupa di-build/di-cache ulang.
              Ditampilkan alih-alih mengandalkan kedisiplinan. */}
          {backendVersion && backendVersion !== APP_VERSION && (
            <p className="mt-1.5 text-[9px] leading-snug text-[var(--adm-warn)] border-t border-[var(--adm-warn-line)] pt-1.5">
              Backend v{backendVersion} ≠ frontend {VERSION_LABEL}. Jalankan{' '}
              <span className="font-mono">config:cache</span> / build ulang.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="adm-sky min-h-screen flex">
      

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
              className="absolute inset-0 bg-[var(--adm-scrim)] backdrop-blur-sm"
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
        <header className="sticky top-0 z-40 bg-[var(--adm-panel)] backdrop-blur-xl border-b border-[var(--adm-line)]">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button
              onClick={() => setNavOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg hover:bg-[var(--adm-hover)] flex items-center justify-center text-[var(--adm-body)] cursor-pointer"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Judul halaman aktif, dianimasikan per rute supaya perpindahan
                halaman terasa sebagai perpindahan, bukan kedipan. */}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--adm-dim)] font-bold">Panel Manajemen</p>
              <AnimatePresence mode="wait">
                <motion.h2
                  key={currentTitle}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="text-[14.5px] font-bold text-[var(--adm-fg)] truncate"
                >
                  {currentTitle}
                </motion.h2>
              </AnimatePresence>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden md:flex items-center gap-1.5 text-[11px] text-[var(--adm-ok)] font-bold bg-[var(--adm-ok-soft)] border border-[var(--adm-ok-line)] px-3 py-1.5 rounded-lg">
                <span className="adm-beacon w-1.5 h-1.5 rounded-full bg-current" /> ON DUTY
              </span>

              <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--adm-body)] font-mono bg-[var(--adm-inset)] border border-[var(--adm-line)] px-3 py-1.5 rounded-lg tabular-nums">
                <Radar className="w-3.5 h-3.5 text-[var(--adm-accent)]" /> {clock} WITA
              </span>

              <LonengNotifikasi />

              {/* Tukar tema. Ikonnya menunjukkan tema yang AKAN dipilih,
                  bukan yang sedang aktif — itu yang dicari orang saat
                  tangannya sudah bergerak ke tombol. */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.92, rotate: -20 }}
                onClick={() => setAdminTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] text-[var(--adm-muted)] hover:text-[var(--adm-accent)] hover:border-[var(--adm-accent-line)] flex items-center justify-center transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'}
                aria-label={theme === 'dark' ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </motion.button>

              <div className="hidden sm:block text-right">
                <p className="text-[12px] font-bold text-[var(--adm-fg)] leading-none truncate max-w-[150px]">{user?.name ?? 'Administrator'}</p>
                <p className="text-[10px] text-[var(--adm-accent)] mt-1 flex items-center gap-1 justify-end font-semibold">
                  <ShieldCheck className="w-3 h-3" /> {user?.role ?? 'admin'}
                </p>
              </div>

              <Link
                href="/admin/profil"
                title="Profil saya"
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] flex items-center justify-center text-[13px] font-black text-white flex-shrink-0 ring-2 ring-transparent hover:ring-[var(--adm-accent-ring)] transition-all"
              >
                {(user?.name ?? 'A').charAt(0).toUpperCase()}
              </Link>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.92 }}
                onClick={doLogout}
                className="w-9 h-9 rounded-xl bg-[var(--adm-danger-soft)] border border-[var(--adm-danger-line)] text-[var(--adm-danger)] hover:brightness-105 flex items-center justify-center transition-all cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* garis marka tipis di kaki bilah atas */}
          <span className="block h-px adm-runway opacity-30" />
        </header>

        {/* content
            Kunci `pathname` membuat isi halaman masuk dengan gerakan yang sama
            di seluruh modul, tanpa tiap halaman perlu mengurusnya sendiri. */}
        <main className="flex-1 p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
