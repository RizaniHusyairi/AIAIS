'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Flight } from '@/types';
import {
  Search, ChevronDown, Phone, Menu, X, Moon, Plane, Home, Building2, Users,
  Newspaper, MessageSquareWarning, Info, UserRound, MapPin, Clock,
  CloudSun, Globe, ArrowRight, PlaneTakeoff, ShieldCheck,
  FileText, ClipboardList, Scale, FolderOpen, TrendingUp, CircleHelp,
  Megaphone, Store, ExternalLink, LayoutGrid,
  BarChart3, CalendarRange, PackageSearch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RELATED_LINKS } from '@/lib/relatedLinks';
import { usesOwnChrome } from '@/lib/layoutChrome';

/* ------------------------------------------------------------------ */
/*  Definisi menu                                                      */
/*                                                                     */
/*  Strukturnya mengikuti navbar aptpairport.id (v1.0.0) apa adanya —   */
/*  sumbernya app/Providers/ViewServiceProvider.php pada repositori     */
/*  situs lama, termasuk menu Layanan dan Tautan Terkait yang di sana   */
/*  dibangun dari basis data.                                          */
/*                                                                     */
/*  Sebagian halaman belum ada di AIAIS. Item seperti itu ditandai      */
/*  `soon: true`: tetap tampil supaya susunan menu sama persis dengan   */
/*  v1, tetapi tidak dapat diklik dan diberi label "Segera" — lebih     */
/*  jujur daripada tautan yang berujung 404.                           */
/*                                                                     */
/*  Satu-satunya tambahan di luar v1 adalah "Peta Rute" di bawah menu   */
/*  Informasi.                                                         */
/* ------------------------------------------------------------------ */

type MenuNode = {
  name: string;
  /** Kosong berarti halamannya belum tersedia (lihat `soon`). */
  href?: string;
  icon: LucideIcon;
  desc?: string;
  /** Tautan ke luar portal; dibuka di tab baru. */
  external?: boolean;
  /** Halaman belum ada di AIAIS — tampil tetapi tidak dapat diklik. */
  soon?: boolean;
  /** Tingkat ketiga, mengikuti submenu bersarang milik v1. */
  children?: MenuNode[];
};

type MenuItem = { name: string; href: string; icon: LucideIcon; children?: MenuNode[] };

const MENU: MenuItem[] = [
  { name: 'Beranda', href: '/', icon: Home },

  {
    name: 'Informasi Publik',
    href: '/profile',
    icon: Info,
    children: [
      { name: 'Profil Bandara', href: '/profile', icon: Info, desc: 'Sejarah, visi-misi, dan tata kelola UPBU APT Pranoto' },
      { name: 'Struktur Organisasi', href: '/profile#struktur', icon: Users, desc: 'Bagan organisasi Kantor UPBU Kelas I' },
      { name: 'Pejabat Bandara', href: '/profile#pejabat', icon: UserRound, desc: 'Struktur pimpinan Kantor UPBU Kelas I APT Pranoto' },
      { name: 'Fasilitas Bandara', href: '/facilities', icon: Building2, desc: 'Ruang tunggu, musala, kesehatan, dan fasilitas umum' },
      { name: 'Statistik Lalu Lintas', href: '/statistik', icon: BarChart3, desc: 'Pergerakan pesawat, penumpang, bagasi, dan kargo per periode' },
    ],
  },

  {
    name: 'PPID',
    href: '/ppid',
    icon: ShieldCheck,
    children: [
      { name: 'Profil PPID BLU', href: '/ppid', icon: Info, desc: 'Profil Pejabat Pengelola Informasi dan Dokumentasi' },
      { name: 'SOP PPID', href: '/ppid/sop', icon: FileText, desc: 'Prosedur operasional standar layanan informasi' },
      { name: 'Standar Pelayanan', href: '/ppid/standar-pelayanan', icon: ClipboardList, desc: 'Standar & maklumat pelayanan serta survei kepuasan masyarakat' },
      { name: 'Pengajuan Informasi Publik', href: '/ppid/pengajuan-informasi', icon: MessageSquareWarning, desc: 'Formulir permohonan informasi publik' },
      { name: 'Regulasi PPID', href: '/ppid/regulasi', icon: Scale, desc: 'Dasar hukum penyelenggaraan PPID' },
      {
        // Tingkat ketiga, sama seperti pada v1.
        name: 'Layanan Informasi',
        icon: FolderOpen,
        desc: 'Laporan dan klasifikasi informasi publik',
        children: [
          { name: 'Laporan Layanan Informasi', href: '/ppid/laporan-layanan-informasi', icon: FileText },
          { name: 'Informasi Berkala', href: '/ppid/informasi-berkala', icon: FileText },
          { name: 'Informasi Serta Merta', href: '/ppid/informasi-serta-merta', icon: FileText },
          { name: 'Informasi Setiap Saat', href: '/ppid/informasi-setiap-saat', icon: FileText },
        ],
      },
    ],
  },

  {
    name: 'Informasi',
    href: '/flights',
    icon: Plane,
    children: [
      { name: 'Jadwal Penerbangan', href: '/flights', icon: Plane, desc: 'Status keberangkatan & kedatangan real-time' },
      { name: 'Peta Rute', href: '/peta-rute', icon: MapPin, desc: 'Rute penerbangan hari ini pada satu peta' },
      { name: 'Berita', href: '/news', icon: Newspaper, desc: 'Kabar terbaru & pengumuman resmi operasional' },
      { name: 'Kinerja Keuangan', href: '/keuangan', icon: TrendingUp, desc: 'Pemasukan dan anggaran Badan Layanan Umum' },
      { name: 'Papan Posko Nataru', href: '/posko-nataru', icon: CalendarRange, desc: 'Perkembangan arus penumpang selama Posko Natal & Tahun Baru' },
      { name: 'FAQ', href: '/faq', icon: CircleHelp, desc: 'Pertanyaan yang sering diajukan' },
    ],
  },

  {
    name: 'Regulasi',
    href: '/regulasi/surat-keputusan',
    icon: Scale,
    children: [
      { name: 'Surat Keputusan', href: '/regulasi/surat-keputusan', icon: FileText, desc: 'Keputusan resmi Kepala Kantor UPBU' },
      { name: 'Surat Edaran', href: '/regulasi/surat-edaran', icon: FileText, desc: 'Edaran resmi operasional bandara' },
    ],
  },

  {
    // Induknya kini `/layanan`, bukan `/complaints`: menu ini punya halaman
    // daftar sendiri, dan sembilan layanan pengajuan v1 sudah tayang di sini.
    name: 'Layanan',
    href: '/layanan',
    icon: Building2,
    children: [
      { name: 'PAS', href: 'https://pas.aptpairport.id/website/layanan/pas_orang.html', icon: UserRound, desc: 'Pas bandara untuk orang', external: true },
      { name: 'TIM', href: 'https://pas.aptpairport.id/website/layanan/tim.html', icon: ShieldCheck, desc: 'Tanda Izin Mengemudi sisi udara', external: true },
      { name: 'Keuangan dan Penagihan', href: 'https://sikeren.aptpairport.id', icon: TrendingUp, desc: 'Sistem keuangan dan penagihan', external: true },
      // Pusat Bantuan naik ke menu sejak tombol utama navbar dialihkan ke
      // Portal Aplikasi. Tanpa entri ini, kanal pengaduan hanya tersisa di
      // footer — terlalu dalam untuk sesuatu yang sifatnya mendesak.
      { name: 'Pusat Bantuan', href: '/complaints', icon: MessageSquareWarning, desc: 'Pengaduan, pertanyaan, dan chat petugas' },
      // Menunjuk ke tab Pusat Bantuan, bukan rute sendiri: `/complaints` sudah
      // punya pemetaan ke layar PWA, dan rute baru yang lupa didaftarkan di
      // `proxy.ts` tidak akan pernah terbuka dari ponsel.
      { name: 'Lapor Kehilangan Barang', href: '/complaints?mode=hilang', icon: PackageSearch, desc: 'Laporkan barang yang tertinggal di area bandara' },
      { name: 'Beauty Contest', href: '/layanan/beauty-contest', icon: Building2, desc: 'Seleksi mitra usaha bandara' },
      { name: 'Extend Advance', href: '/layanan/extend-advance', icon: ClipboardList, desc: 'Perpanjangan uang muka' },
      { name: 'Field Trip', href: '/layanan/field-trip', icon: Users, desc: 'Kunjungan edukasi ke area bandara' },
      { name: 'Pengajuan Informasi Publik', href: '/ppid/pengajuan-informasi', icon: MessageSquareWarning, desc: 'Permohonan informasi publik' },
      { name: 'Pengiklanan', href: '/layanan/pengiklanan', icon: Megaphone, desc: 'Pemasangan iklan di area bandara' },
      { name: 'Perijinan Usaha', href: '/layanan/perijinan-usaha', icon: ClipboardList, desc: 'Izin kegiatan usaha di bandara' },
      { name: 'Sertifikat OJT', href: '/layanan/sertifikat-ojt', icon: FileText, desc: 'Sertifikat on-the-job training' },
      { name: 'Sewa', href: '/layanan/sewa', icon: Building2, desc: 'Sewa ruang dan lahan bandara' },
      { name: 'Slot Charter', href: '/layanan/slot-charter', icon: Plane, desc: 'Pengajuan slot penerbangan charter' },
      { name: 'Tenant', href: '/layanan/tenant', icon: Store, desc: 'Pendaftaran tenant komersial' },
    ],
  },

  {
    // Induknya kini halaman `/tautan-terkait`, bukan `/profile`.
    //
    // Empat tautan di bawah dibangkitkan dari `lib/relatedLinks.ts` — sumber
    // yang sama dengan halaman dan footer. Sebelumnya URL-nya ditulis ulang
    // di tiga tempat, dan URL SIPPN di sini sudah menyimpang dari yang tayang
    // (beranda nasional, bukan halaman instansi bandara ini).
    name: 'Tautan Terkait',
    href: '/tautan-terkait',
    icon: Globe,
    children: [
      ...RELATED_LINKS.map((l) => ({
        name: l.name,
        href: l.url,
        icon: l.slug === 'lapor' ? MessageSquareWarning : l.slug === 'e-kinerja' ? TrendingUp : Globe,
        desc: l.description,
        external: true,
      })),
      { name: 'Semua Tautan Terkait', href: '/tautan-terkait', icon: FolderOpen, desc: 'Daftar lengkap tautan instansi terkait' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Satu entri di dalam dropdown                                       */
/*                                                                     */
/*  Menangani empat bentuk yang ada pada menu v1: tautan biasa, tautan  */
/*  ke luar portal, item yang halamannya belum tersedia, dan kelompok   */
/*  bersarang (tingkat ketiga). Gaya visualnya dipertahankan persis     */
/*  seperti sebelumnya — yang bertambah hanya kemampuan menampilkan     */
/*  ketiga bentuk selain tautan biasa.                                 */
/* ------------------------------------------------------------------ */
function DropdownEntry({ node, nested = false }: { node: MenuNode; nested?: boolean }) {
  const Icon = node.icon;

  const body = (
    <>
      <span className="w-9 h-9 rounded-lg bg-blue-50 group-hover/i:bg-blue-600 flex items-center justify-center flex-shrink-0 transition-colors">
        <Icon className="w-4 h-4 text-blue-600 group-hover/i:text-white transition-colors" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-slate-900 group-hover/i:text-blue-700 transition-colors">
          {node.name}
        </span>
        {node.desc && (
          <span className="block text-[11.5px] text-slate-500 leading-snug mt-0.5">{node.desc}</span>
        )}
      </span>
    </>
  );

  // Tingkat ketiga: judul kelompok + daftar menjorok, tetap di dalam kartu
  // yang sama supaya tidak perlu panel melayang baru.
  if (node.children?.length) {
    return (
      <div className="mt-1 pt-1 border-t border-dashed border-slate-200">
        <div className="flex items-center gap-2 px-2.5 pt-2 pb-1">
          <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            {node.name}
          </span>
        </div>
        <div className="pl-3 border-l-2 border-dashed border-blue-100 ml-3.5">
          {node.children.map((sub) => (
            <DropdownEntry key={sub.name} node={sub} nested />
          ))}
        </div>
      </div>
    );
  }

  // Halaman belum ada: tampil tetapi tidak dapat diklik.
  if (node.soon || !node.href) {
    return (
      <div
        className={`flex items-start gap-3 rounded-xl cursor-default ${nested ? 'p-2' : 'p-2.5'}`}
        aria-disabled="true"
      >
        <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-slate-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-slate-400">{node.name}</span>
          {node.desc && (
            <span className="block text-[11.5px] text-slate-400/80 leading-snug mt-0.5">{node.desc}</span>
          )}
        </span>
        <span className="flex-shrink-0 mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
          Segera
        </span>
      </div>
    );
  }

  const cls = `group/i flex items-start gap-3 rounded-xl hover:bg-blue-50 transition-colors ${nested ? 'p-2' : 'p-2.5'}`;

  if (node.external) {
    return (
      <a href={node.href} target="_blank" rel="noreferrer" className={cls}>
        {body}
        <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover/i:text-blue-600 flex-shrink-0 mt-2 transition-colors" />
      </a>
    );
  }

  return (
    <Link href={node.href} className={cls}>
      {body}
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover/i:text-blue-600 flex-shrink-0 mt-2 opacity-0 group-hover/i:opacity-100 -translate-x-1 group-hover/i:translate-x-0 transition-all" />
    </Link>
  );
}

/** Padanan `DropdownEntry` untuk drawer mobile; gaya mengikuti daftar yang ada. */
function MobileEntry({ node, nested = false }: { node: MenuNode; nested?: boolean }) {
  const Icon = node.icon;
  const pad = nested ? 'px-2 py-2' : 'px-2 py-2.5';

  if (node.children?.length) {
    return (
      <div className="pt-1.5">
        <div className="flex items-center gap-2 px-2 pb-1">
          <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {node.name}
          </span>
        </div>
        <div className="pl-3 border-l-2 border-dashed border-slate-200 ml-2">
          {node.children.map((sub) => (
            <MobileEntry key={sub.name} node={sub} nested />
          ))}
        </div>
      </div>
    );
  }

  if (node.soon || !node.href) {
    return (
      <div className={`flex items-start gap-2.5 rounded-lg ${pad}`} aria-disabled="true">
        <Icon className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold text-slate-400">{node.name}</span>
          {node.desc && (
            <span className="block text-[11px] text-slate-400/80 leading-snug">{node.desc}</span>
          )}
        </span>
        <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 mt-0.5">
          Segera
        </span>
      </div>
    );
  }

  const inner = (
    <>
      <Icon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-slate-800">{node.name}</span>
        {node.desc && <span className="block text-[11px] text-slate-500 leading-snug">{node.desc}</span>}
      </span>
    </>
  );

  const cls = `flex items-start gap-2.5 rounded-lg hover:bg-blue-50 transition-colors ${pad}`;

  return node.external ? (
    <a href={node.href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
      <ExternalLink className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-1" />
    </a>
  ) : (
    <Link href={node.href} className={cls}>
      {inner}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileSub, setMobileSub] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [clock, setClock] = useState('--:--');
  const [nextFlight, setNextFlight] = useState<Flight | null>(null);

  /* live WITA clock */
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar' }));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  /* shrink on scroll */
  useEffect(() => {
    // Strip info (36px) dan penyusutan bilah utama (82→66px) sama-sama berada
    // di dalam header `sticky`, jadi keduanya ikut arus dokumen: begitu
    // mengecil, seluruh isi halaman naik 52px dan peramban mengoreksi scrollY
    // sebesar itu juga (scroll anchoring).
    //
    // Karena itu jarak kedua ambang WAJIB lebih lebar dari 52px. Kalau tidak,
    // koreksi tadi melempar scrollY balik ke seberang ambang, keadaan berbalik,
    // tata letak bergeser lagi — navbar berkedip naik-turun tanpa henti tepat
    // ketika pengguna menggeser sedikit dari puncak halaman.
    const AMBANG_CIUT = 160; // turun melewati ini → strip disembunyikan
    const AMBANG_MEKAR = 60; // naik melewati ini → strip tampil kembali

    const onScroll = () =>
      setScrolled((prev) => {
        const y = window.scrollY;
        if (y > AMBANG_CIUT) return true;
        if (y < AMBANG_MEKAR) return false;
        return prev; // zona mati: pertahankan keadaan sekarang
      });
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* next departure for the info strip */
  useEffect(() => {
    fetchApi<{ flights: Flight[] }>('/flights').then((res) => {
      const raw: any = res.data;
      const list: Flight[] = Array.isArray(raw) ? raw : raw?.flights ?? [];
      const dep = list.find((f) => f.flight_type === 'departure');
      if (dep) setNextFlight(dep);
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
    setSearchOpen(false);
  }, [pathname]);

  // Rute yang membawa chrome-nya sendiri (PWA, panel admin, Portal Aplikasi).
  if (usesOwnChrome(pathname)) return null;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50">
      {/* ============ TOP INFO STRIP ============ */}
      <AnimatePresence initial={false}>
        {!scrolled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden bg-[#0b1e5b] text-white"
          >
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[11.5px]">
              {/* left: airport identity + live flight */}
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex items-center gap-1.5 font-semibold flex-shrink-0">
                  <span className="bg-white/15 border border-white/20 px-1.5 py-0.5 rounded font-black tracking-wider">AAP</span>
                  <span className="hidden sm:inline text-blue-100">Bandar Udara APT Pranoto Samarinda</span>
                </span>

                {nextFlight && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hidden lg:flex items-center gap-1.5 text-blue-100 min-w-0"
                  >
                    <span className="w-px h-3.5 bg-white/20" />
                    <PlaneTakeoff className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
                    <span className="truncate">
                      Berikutnya <b className="text-white">{nextFlight.flight_number}</b> ke{' '}
                      <b className="text-white">{nextFlight.destination}</b> · {nextFlight.scheduled_time}
                    </span>
                  </motion.span>
                )}
              </div>

              {/* right: utilities */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="hidden md:flex items-center gap-1.5 text-blue-100">
                  <CloudSun className="w-3.5 h-3.5 text-amber-300" /> 26°C Berawan
                </span>
                <span className="flex items-center gap-1.5 text-blue-100 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-cyan-300" /> {clock} WITA
                </span>
                {/* Nomor resmi sesuai aptpairport.id (sebelumnya placeholder 0541-123456). */}
                <a href="tel:+62811551944" className="hidden sm:flex items-center gap-1.5 text-blue-100 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5" /> +62 811 551 944
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MAIN BAR ============ */}
      <div
        className={`relative bg-white/95 backdrop-blur-xl transition-shadow ${
          scrolled ? 'shadow-lg shadow-slate-300/30' : 'shadow-sm'
        }`}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div
            className={`flex items-center justify-between gap-4 transition-all duration-300 ease-out ${
              scrolled ? 'h-[66px]' : 'h-[82px]'
            }`}
          >
            {/* ---- logo ---- */}
            <Link href="/" className="flex items-center flex-shrink-0 group">
              <img
                src="/logo-apt.svg"
                alt="Bandar Udara APT Pranoto Samarinda"
                className={`w-auto object-contain transition-all duration-300 ease-out group-hover:scale-[1.03] ${
                  scrolled ? 'h-9 sm:h-10' : 'h-11 sm:h-14'
                }`}
              />
            </Link>

            {/* ---- desktop nav ---- */}
            <nav className="hidden xl:flex items-center gap-0.5">
              {MENU.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const hasChildren = !!item.children;

                return (
                  <div
                    key={item.name}
                    className="relative"
                    onMouseEnter={() => setOpenMenu(hasChildren ? item.name : null)}
                  >
                    <Link
                      href={item.href}
                      className={`relative flex items-center gap-1.5 px-2.5 2xl:px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-colors ${
                        active ? 'text-blue-700' : 'text-slate-600 hover:text-blue-700'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active-pill"
                          className="absolute inset-0 rounded-xl bg-blue-50"
                          transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                        />
                      )}
                      <Icon className="relative w-4 h-4" />
                      <span className="relative">{item.name}</span>
                      {hasChildren && (
                        <ChevronDown
                          className={`relative w-3.5 h-3.5 transition-transform ${openMenu === item.name ? 'rotate-180' : ''}`}
                        />
                      )}
                      {/* runway underline */}
                      {active && (
                        <motion.span
                          layoutId="nav-active-runway"
                          className="absolute -bottom-0.5 left-2.5 right-2.5 2xl:left-3.5 2xl:right-3.5 h-[2.5px] rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                          transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                        />
                      )}
                    </Link>

                    {/* ---- mega dropdown ---- */}
                    <AnimatePresence>
                      {hasChildren && openMenu === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.99 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[380px]"
                        >
                          <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl shadow-slate-400/25 border border-slate-100">
                            {/* boarding-pass header */}
                            <div className="relative bg-gradient-to-r from-[#0b1e5b] to-[#2563eb] px-4 py-3 overflow-hidden">
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 48" preserveAspectRatio="none">
                                <motion.path
                                  d="M-10 38 Q 130 12 390 30"
                                  fill="none"
                                  stroke="rgba(255,255,255,0.3)"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 6"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.9, ease: 'easeInOut' }}
                                />
                              </svg>
                              <motion.div
                                initial={{ x: -14, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="relative flex items-center gap-2"
                              >
                                <Plane className="w-4 h-4 text-cyan-300 rotate-45" />
                                <p className="text-white font-bold text-[12.5px] tracking-wide">{item.name}</p>
                              </motion.div>
                            </div>

                            {/* perforation */}
                            <div className="relative h-0">
                              <span className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-slate-50" />
                              <span className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-slate-50" />
                            </div>

                            {/* Menu Layanan milik v1 berisi 13 item, jadi daftarnya
                                dibatasi tingginya dan digulung bila perlu. */}
                            <div className="p-2 max-h-[70vh] overflow-y-auto no-scrollbar">
                              {item.children!.map((c, i) => (
                                <motion.div
                                  key={c.name}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.06 + i * 0.05 }}
                                >
                                  <DropdownEntry node={c} />
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            {/* ---- right utilities ---- */}
            <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchOpen((s) => !s)}
                className="w-10 h-10 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Cari informasi"
              >
                {searchOpen ? <X className="w-[18px] h-[18px]" /> : <Search className="w-[18px] h-[18px]" />}
              </motion.button>

              <button className="hidden 2xl:flex items-center gap-1.5 px-3 h-10 rounded-xl text-[12.5px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                <Globe className="w-4 h-4" /> ID <ChevronDown className="w-3 h-3" />
              </button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Mode gelap"
              >
                <Moon className="w-[18px] h-[18px]" />
              </motion.button>

              {/* Entri "Akun" DIPINDAHKAN, bukan dihapus.
                  Pintu akun layanan warga kini berada di Portal Aplikasi
                  bersama pintu petugas — satu halaman untuk kedua kalangan.
                  Tombol di bawah inilah jalannya. */}

              {/* Tombol utama menuju Portal Aplikasi (sistem kedinasan pegawai).
                  Sebelumnya tempat ini ditempati "Kontak Kami"; Pusat Bantuan
                  kini dicapai lewat dropdown Layanan dan footer. */}
              <Link
                href="/aplikasi"
                className="group relative overflow-hidden ml-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] px-5 h-10 rounded-full shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="relative">Portal Aplikasi</span>
                <motion.span
                  className="absolute inset-0 pointer-events-none"
                  initial={false}
                >
                  <Plane className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 opacity-0 group-hover:opacity-100 group-hover:left-[110%] transition-all duration-700 ease-out rotate-45" />
                </motion.span>
              </Link>
            </div>

            {/* ---- mobile toggle ---- */}
            <button
              onClick={() => setMobileOpen((s) => !s)}
              className="xl:hidden w-10 h-10 rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* animated runway strip under the bar */}
        <div className="relative h-[3px] overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600">
          <motion.span
            className="absolute inset-y-0 w-24 bg-white/45"
            animate={{ x: ['-10%', '110%'] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: 'linear' }}
            style={{ filter: 'blur(6px)' }}
          />
        </div>

        {/* ---- search overlay ---- */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-xl"
            >
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    placeholder="Cari jadwal penerbangan, fasilitas, berita..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-[12px] text-slate-400 py-1.5">Pencarian populer:</span>
                  {[
                    { label: 'Jadwal Penerbangan', href: '/flights' },
                    { label: 'Fasilitas Terminal', href: '/facilities' },
                    { label: 'Berita Terbaru', href: '/news' },
                    { label: 'Wisata Terdekat', href: '/tourism' },
                    { label: 'Pusat Bantuan', href: '/complaints' },
                  ].map((s) => (
                    <Link
                      key={s.label}
                      href={s.href}
                      className="text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============ MOBILE DRAWER ============ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            // Ambang `xl`, mengikuti nav desktop (`hidden xl:flex`) dan tombol
            // hamburger (`xl:hidden`). Dengan `lg` drawer ini tersembunyi di
            // 1024–1279px, sementara nav desktop juga belum tampil di sana —
            // tombol menu ada tapi tidak membuka apa pun.
            className="xl:hidden overflow-hidden bg-white border-b border-slate-100 shadow-xl"
          >
            <div className="px-4 py-4 space-y-1 max-h-[75vh] overflow-y-auto">
              {MENU.map((item, i) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const expanded = mobileSub === item.name;

                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {item.children ? (
                      <>
                        <button
                          onClick={() => setMobileSub(expanded ? null : item.name)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer ${
                            active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-[18px] h-[18px]" />
                          <span className="flex-1 text-left">{item.name}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {expanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden pl-4"
                            >
                              <div className="border-l-2 border-dashed border-blue-200 pl-3 py-1 space-y-0.5">
                                {item.children.map((c) => (
                                  <MobileEntry key={c.name} node={c} />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-colors ${
                          active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                        {item.name}
                      </Link>
                    )}
                  </motion.div>
                );
              })}

              {/* mobile info + CTA */}
              <div className="pt-3 mt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-[12px] text-slate-500 px-1">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-600" /> {clock} WITA</span>
                  <span className="flex items-center gap-1.5"><CloudSun className="w-3.5 h-3.5 text-amber-500" /> 26°C</span>
                </div>

                {nextFlight && (
                  <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5 text-[12px] text-slate-700">
                    <PlaneTakeoff className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate">
                      Berikutnya <b>{nextFlight.flight_number}</b> · {nextFlight.scheduled_time}
                    </span>
                  </div>
                )}

                <Link
                  href="/aplikasi"
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold text-[14px] py-3.5 rounded-full shadow-lg shadow-blue-600/25"
                >
                  <LayoutGrid className="w-4 h-4" /> Portal Aplikasi
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
