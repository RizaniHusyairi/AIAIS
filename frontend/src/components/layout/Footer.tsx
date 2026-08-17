'use client';

/**
 * Footer portal publik.
 *
 * Isinya dibangun dari sumber yang sudah ada, bukan ditulis ulang:
 *   - Kontak, jam operasi, dan tautan peta  → `CONTACT` / `MAPS_URL`
 *     di `lib/airportProfile.ts` (provenans: aptpairport.id produksi).
 *   - Akun media sosial                     → lima akun resmi dari footer v1.
 *   - Ringkasan jadwal & statistik kunjungan → `lib/visitors.ts`, yang
 *     menyimpan hasilnya di cache karena footer tampil di setiap halaman.
 *
 * Catatan ikon: lucide-react versi ini TIDAK lagi mengekspor ikon merek
 * (Instagram, Facebook, Youtube, Twitter). Lambang sosial di bawah karena itu
 * berupa SVG sebaris — jangan menggantinya dengan impor dari lucide, build
 * akan gagal.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { INSTAGRAM_PATH } from '@/components/icons/InstagramGlyph';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import SkyParticles from '@/components/effects/SkyParticles';
import { FlightArc } from '@/components/ppid/PpidHero';
import { VERSION_LABEL } from '@/lib/version';
import { CONTACT, MAPS_URL } from '@/lib/airportProfile';
import { RELATED_LINKS } from '@/lib/relatedLinks';
import { useVisitorStats, useFlightSummary } from '@/lib/visitors';
import { usesOwnChrome } from '@/lib/layoutChrome';
import { splitPlace, shortTime } from '@/lib/place';
import {
  MapPin, Phone, Mail, Clock, ExternalLink, PlaneTakeoff, PlaneLanding,
  Users, Eye, Radio, ArrowRight, Navigation,
} from 'lucide-react';

/* ================================================================
   Varian gerak — sama dengan halaman publik lain
   ================================================================ */
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/* ================================================================
   Lambang media sosial (SVG sebaris — lihat catatan di kepala berkas)
   ================================================================ */
type Brand = { name: string; href: string; hover: string; path: string };

const SOCIALS: Brand[] = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/aptpranotoairport',
    hover: 'hover:bg-pink-600',
    // Jalurnya satu sumber di components/icons/InstagramGlyph.
    path: INSTAGRAM_PATH,
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/share/1EyVSyu6Un/',
    hover: 'hover:bg-blue-600',
    path: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z',
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@aptpranotoairport',
    hover: 'hover:bg-red-600',
    path: 'M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.08 0 12 0 12s0 3.92.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z',
  },
  {
    name: 'X',
    href: 'https://x.com/aptp_airport',
    hover: 'hover:bg-slate-900',
    path: 'M18.9 2.25h3.37l-7.37 8.42 8.67 11.08h-6.79l-5.32-6.95-6.08 6.95H2l7.88-9-8.32-10.5h6.96l4.81 6.36 5.57-6.36Zm-1.18 17.5h1.87L7.1 4.14H5.09l12.63 15.61Z',
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@aptpranotoairport',
    hover: 'hover:bg-cyan-500',
    path: 'M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06v-3.1a5.66 5.66 0 0 0-.77-.05A5.66 5.66 0 1 0 15.54 15.4V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z',
  },
];

/* ================================================================
   Daftar tautan
   ================================================================ */
type LinkItem = { name: string; href: string; external?: boolean };

const INFORMASI: LinkItem[] = [
  { name: 'Profil Bandara', href: '/profile' },
  { name: 'Sejarah', href: '/profile#sejarah' },
  { name: 'Manajemen & Pejabat', href: '/profile#pejabat' },
  { name: 'Berita & Pengumuman', href: '/news' },
  { name: 'Pariwisata Terdekat', href: '/tourism' },
  { name: 'Jadwal Penerbangan', href: '/flights' },
];

const LAYANAN: LinkItem[] = [
  { name: 'Standar Pelayanan', href: '/ppid/standar-pelayanan' },
  { name: 'Regulasi & Surat Keputusan', href: '/regulasi/surat-keputusan' },
  { name: 'PPID & Informasi Publik', href: '/ppid' },
  { name: 'Pusat Bantuan & Pengaduan', href: '/complaints' },
  { name: 'Pusat Unduhan', href: '/downloads' },
  { name: 'FAQ', href: '/faq' },
];

/**
 * Dibangkitkan dari `lib/relatedLinks.ts`, sumber yang sama dengan navbar dan
 * halaman /tautan-terkait. Sebelumnya URL-nya ditulis ulang di sini dan sudah
 * mulai menyimpang dari yang tayang di portal.
 */
const TAUTAN: LinkItem[] = [
  ...RELATED_LINKS.map((l) => ({ name: l.name, href: l.url, external: true })),
  { name: 'Semua Tautan Terkait', href: '/tautan-terkait' },
];

/* ================================================================
   Bagian kecil
   ================================================================ */

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300">{children}</h4>
  );
}

function FooterLink({ item }: { item: LinkItem }) {
  const cls =
    'group/l inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors';

  const isi = (
    <>
      <span className="w-0 group-hover/l:w-2.5 h-px bg-cyan-400 transition-all duration-300" />
      {item.name}
      {item.external && <ExternalLink className="w-3 h-3 opacity-60" />}
    </>
  );

  return (
    <li>
      {item.external ? (
        <a href={item.href} target="_blank" rel="noreferrer" className={cls}>{isi}</a>
      ) : (
        <Link href={item.href} className={cls}>{isi}</Link>
      )}
    </li>
  );
}

/**
 * Angka yang menghitung naik saat terlihat.
 *
 * Pola rAF-nya sama dengan `StatCard` pada perangkat admin, tetapi disalin ke
 * sini dengan sengaja: komponen itu bertema panel admin (`bg-[#0d1730]`,
 * lencana, `riseIn`) dan bukan bagian dari perkakas halaman publik.
 */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(value)) return;

    let raf = 0;
    const start = performance.now();
    const dur = 900;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{shown.toLocaleString('id-ID')}</>;
}

/** Jam WITA berjalan. */
function ClockWita() {
  // Dirender hanya setelah mount: jam server dan jam peramban tidak pernah
  // sama persis, dan menyamakannya saat hidrasi akan memicu peringatan React.
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tampilkan = () =>
      setNow(
        new Date().toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );

    tampilkan();
    const t = setInterval(tampilkan, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="font-black text-white tabular-nums text-[15px]">
      {now ?? '--:--:--'} <span className="text-[11px] font-bold text-cyan-300">WITA</span>
    </span>
  );
}

/* ================================================================ */

export default function Footer() {
  const pathname = usePathname();
  const stats = useVisitorStats();
  const flights = useFlightSummary();

  // Footer publik disembunyikan pada rute yang membawa chrome-nya sendiri.
  if (usesOwnChrome(pathname)) return null;

  const berikutnya = flights?.next ?? null;
  const tujuanBerikutnya = berikutnya
    ? splitPlace(berikutnya.flight_type === 'departure' ? berikutnya.destination : berikutnya.origin)
    : null;

  return (
    <footer className="relative bg-[#091124] text-slate-300 text-xs overflow-hidden">
      {/* lengkungan pemisah dari area terang di atasnya */}
      <svg
        className="block w-full h-10 text-slate-50"
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 0h1440v32C1200 8 960 0 720 0S240 8 0 32Z" fill="currentColor" />
      </svg>

      <SkyParticles tone="sky" density="low" />
      <FlightArc className="absolute inset-x-0 top-16 h-40 text-white/10" d="M-20 190 Q 420 40 1020 120" />

      {/* ============ BILAH STATUS OPERASIONAL ============ */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-white/[0.06] border border-white/12 backdrop-blur px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8"
        >
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-300/25 flex items-center justify-center">
              <Clock className="w-5 h-5 text-cyan-300" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Waktu Bandara</p>
              <ClockWita />
            </div>
          </div>

          <span className="hidden lg:block w-px h-10 bg-white/12" />

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 flex-1">
            <div className="flex items-center gap-2.5">
              <PlaneTakeoff className="w-4 h-4 text-sky-300 flex-shrink-0" />
              <p className="text-slate-400">
                Keberangkatan hari ini{' '}
                <span className="font-black text-white tabular-nums">{flights?.departures ?? '—'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <PlaneLanding className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <p className="text-slate-400">
                Kedatangan hari ini{' '}
                <span className="font-black text-white tabular-nums">{flights?.arrivals ?? '—'}</span>
              </p>
            </div>

            {/* Hanya ditampilkan bila FIDS benar-benar punya penerbangan
                berikutnya — di luar jam operasi barisnya memang tidak ada. */}
            {berikutnya && tujuanBerikutnya && (
              <div className="flex items-center gap-2.5 min-w-0">
                <Navigation className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <p className="text-slate-400 truncate">
                  Berikutnya{' '}
                  <span className="font-black text-white">{berikutnya.flight_number}</span>{' '}
                  <span className="text-slate-500">→</span>{' '}
                  <span className="font-semibold text-slate-200">{tujuanBerikutnya.code}</span>{' '}
                  <span className="font-black text-white tabular-nums">{shortTime(berikutnya.scheduled_time)}</span>
                </p>
              </div>
            )}
          </div>

          <Link
            href="/flights"
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[12.5px] px-4 py-2.5 rounded-full transition-colors flex-shrink-0"
          >
            Papan Jadwal <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>

      {/* ============ KISI UTAMA ============ */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative max-w-[1400px] mx-auto px-4 sm:px-6 pt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10"
      >
        {/* merek + sosial */}
        <motion.div variants={rise} className="lg:col-span-4 space-y-4">
          <img src="/logo-apt.svg" alt="Bandar Udara APT Pranoto Samarinda" className="h-16 w-auto" />

          <p className="text-slate-400 leading-relaxed max-w-sm">
            Bandar Udara APT Pranoto Samarinda siap melayani dengan aman, nyaman, dan profesional.
            Gerbang utama udara Ibu Kota Kalimantan Timur &amp; Penyangga IKN.
          </p>

          <div className="pt-1">
            <ColumnTitle>Ikuti Kami</ColumnTitle>
            <div className="flex items-center gap-2.5 mt-3">
              {SOCIALS.map((s) => (
                <motion.a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  title={s.name}
                  aria-label={s.name}
                  whileHover={{ y: -3 }}
                  className={`w-9 h-9 rounded-full bg-white/6 border border-white/10 text-slate-300 hover:text-white ${s.hover} flex items-center justify-center transition-colors`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </motion.a>
              ))}
            </div>
          </div>
        </motion.div>

        {/* kontak */}
        <motion.div variants={rise} className="lg:col-span-3 space-y-3">
          <ColumnTitle>Hubungi Kami</ColumnTitle>

          <ul className="space-y-3 text-slate-400">
            <li className="flex gap-2.5">
              <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{CONTACT.address}</span>
            </li>
            <li className="flex gap-2.5">
              <Phone className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <a href={`tel:${CONTACT.phoneHref}`} className="hover:text-cyan-400 transition-colors">
                {CONTACT.phone}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <a href={`mailto:${CONTACT.email}`} className="hover:text-cyan-400 transition-colors break-all">
                {CONTACT.email}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>
                Jam operasi bandara
                <span className="block font-semibold text-slate-200">{CONTACT.operationalHours}</span>
              </span>
            </li>
          </ul>

          <a
            href={MAPS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white/8 border border-white/15 hover:bg-white/15 text-white font-bold text-[12px] px-4 py-2.5 rounded-full transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" /> Buka di Peta
          </a>
        </motion.div>

        {/* informasi */}
        <motion.div variants={rise} className="lg:col-span-2 space-y-3">
          <ColumnTitle>Informasi</ColumnTitle>
          <ul className="space-y-2">
            {INFORMASI.map((l) => <FooterLink key={l.name} item={l} />)}
          </ul>
        </motion.div>

        {/* layanan */}
        <motion.div variants={rise} className="lg:col-span-2 space-y-3">
          <ColumnTitle>Layanan Publik</ColumnTitle>
          <ul className="space-y-2">
            {LAYANAN.map((l) => <FooterLink key={l.name} item={l} />)}
          </ul>
        </motion.div>

        {/* tautan terkait */}
        <motion.div variants={rise} className="lg:col-span-1 space-y-3">
          <ColumnTitle>Tautan</ColumnTitle>
          <ul className="space-y-2">
            {TAUTAN.map((l) => <FooterLink key={l.name} item={l} />)}
          </ul>
        </motion.div>
      </motion.div>

      {/* ============ STATISTIK KUNJUNGAN ============ */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 mt-12">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="rounded-2xl bg-white/[0.04] border border-white/10 px-6 py-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <ColumnTitle>Statistik Kunjungan</ColumnTitle>
              <p className="mt-1.5 text-slate-500 text-[11.5px]">
                {/* Angka ini dihitung dari kunjungan sungguhan. Keterangan
                    tanggal mulai ada supaya angka yang masih kecil terbaca
                    sebagai awal penghitungan, bukan sebagai kerusakan. */}
                {stats?.since
                  ? `Dihitung sejak ${new Date(`${stats.since}T00:00:00`).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}`
                  : 'Penghitungan kunjungan baru dimulai'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Kunjungan', value: stats?.total, icon: Users, accent: '#22d3ee' },
              { label: 'Kunjungan Hari Ini', value: stats?.today, icon: Eye, accent: '#38bdf8' },
              { label: 'Sedang Online', value: stats?.online, icon: Radio, accent: '#34d399', live: true },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  variants={rise}
                  whileHover={{ y: -4 }}
                  className="relative overflow-hidden rounded-2xl bg-[#0d1730] border border-white/8 p-5"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: `linear-gradient(90deg, ${s.accent}, transparent)` }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {s.label}
                      </p>
                      <p className="mt-1.5 text-[26px] font-black text-white leading-none tabular-nums">
                        {/* Belum ada data ≠ nol. Selama statistik gagal
                            diambil, tampilkan garis, bukan angka. */}
                        {typeof s.value === 'number' ? <CountUp value={s.value} /> : '—'}
                      </p>
                    </div>

                    <span
                      className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${s.accent}1a`, border: `1px solid ${s.accent}40` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: s.accent }} />
                      {s.live && typeof s.value === 'number' && s.value > 0 && (
                        <motion.span
                          animate={{ opacity: [1, 0.25, 1] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d1730]"
                        />
                      )}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ============ LOGO INSTITUSI ============ */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 mt-6">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-6 py-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 text-center sm:text-left">
            Di Bawah Naungan
          </p>

          <div className="flex items-center gap-6 sm:gap-8">
            <img
              src="/logo-kemenhub.png"
              alt="Kementerian Perhubungan Republik Indonesia"
              title="Kementerian Perhubungan Republik Indonesia"
              className="h-14 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />

            <span className="w-px h-12 bg-white/15" />

            <img
              src="/logo-blu-speed.png"
              alt="BLU Speed"
              title="Badan Layanan Umum — BLU Speed"
              className="h-14 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      </div>

      {/* ============ LAMPU LANDASAN ============ */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 mt-10">
        <div className="h-1.5 flex gap-2 opacity-60">
          {Array.from({ length: 26 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.08 }}
              className="flex-1 bg-cyan-300 rounded-full"
            />
          ))}
        </div>
      </div>

      {/* ============ BILAH BAWAH ============ */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 pt-8 mt-8 pb-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-slate-500 gap-4">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Kantor UPBU Kelas I A.P.T Pranoto Samarinda. Hak cipta dilindungi.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {/* Menunjuk portal v1; AIAIS belum punya halaman kebijakan privasi
              sendiri. Ganti ke tautan internal begitu halamannya tersedia. */}
          <a
            href="https://aptpairport.id/kebijakan-privasi"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-400 transition-colors"
          >
            Kebijakan Privasi
          </a>
          <span className="font-mono text-[11px]">AIAIS Portal {VERSION_LABEL}</span>
        </div>
      </div>
    </footer>
  );
}
