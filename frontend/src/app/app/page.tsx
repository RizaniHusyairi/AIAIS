'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import {
  Flight, NewsItem, Announcement, Facility, InstagramPost, Tenant, AirTrafficStats,
} from '@/types';
import { StatusBar, Segmented, listContainer, listItem } from '@/components/pwa/ui';
import {
  AirlineLogo, splitPlace, statusInfo, labelStatus, gateLabel, counterLabel,
} from '@/components/flights/shared';
import { TOURISM_SPOTS, TOURISM_CAT_META } from '@/lib/tourismData';
import { facilityCatMeta, facilityIcon } from '@/lib/facilityMeta';
import { CATEGORY_STYLES } from '@/lib/newsData';
import GambarBerita from '@/components/GambarBerita';
import { CONTACT, MAPS_URL, OFFICIALS, ORG_NAME, ROUTES } from '@/lib/airportProfile';
import { angka } from '@/lib/airTraffic';
import {
  Plane, ArrowRight, Building2, Car, LayoutGrid, LifeBuoy, Palmtree, MapPin, ChevronRight,
  Megaphone, Clock, Newspaper, Phone, Navigation, TriangleAlert, Info,
  DoorOpen, Luggage, ClipboardList, Users, Package, Boxes, ExternalLink,
  Search, ShieldCheck, Download, MessageCircle, FileWarning, PackageSearch,
} from 'lucide-react';
// lucide-react membuang seluruh ikon merek; lambang Instagram digambar sendiri.
import InstagramGlyph from '@/components/icons/InstagramGlyph';
import { useTeks } from '@/lib/kamus';

/* Enam pintasan. "Peta Bandara" diganti "Pusat Bantuan": layar peta memuat
   denah karangan dan sudah dihapus, sementara bantuan justru yang paling
   dicari saat ada masalah. "Parkir" pun tidak lagi menunjuk transportasi —
   keduanya dulu mengantar ke layar yang sama dan membuat satu pintasan
   terbuang percuma. */
const QUICK = [
  { label: 'Penerbangan', icon: Plane, color: '#1d4ed8', bg: '#e5f2ff', href: '/app/penerbangan' },
  { label: 'Pusat Bantuan', icon: LifeBuoy, color: '#0369a1', bg: '#e3faf7', href: '/app/bantuan' },
  { label: 'Fasilitas', icon: Building2, color: '#4f46e5', bg: '#ebefff', href: '/app/fasilitas' },
  { label: 'Transportasi', icon: Car, color: '#c26c00', bg: '#fff3e1', href: '/app/transportasi' },
  { label: 'Layanan', icon: LayoutGrid, color: '#2563eb', bg: '#e7f3ff', href: '/app/layanan' },
  { label: 'Wisata', icon: Palmtree, color: '#0d9488', bg: '#e2f8f5', href: '/app/wisata' },
];

const SEARCH_DESTINATIONS = [
  ...QUICK,
  { label: 'PPID', icon: ShieldCheck, href: '/app/ppid' },
  { label: 'Pusat Unduhan', icon: Download, href: '/app/unduhan' },
  { label: 'Berita', icon: Newspaper, href: '/app/berita' },
  { label: 'Profil Bandara', icon: Building2, href: '/app/profil' },
];

/** Lima destinasi terdekat untuk carousel wisata di beranda. */
const NEARBY = TOURISM_SPOTS.slice().sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);

/** Gaya banner pengumuman menurut tingkat prioritas. */
const PRIORITY_META: Record<Announcement['priority'], { label: string; color: string; bg: string; icon: typeof Megaphone }> = {
  urgent: { label: 'Mendesak', color: '#dc2626', bg: '#fef2f2', icon: TriangleAlert },
  high: { label: 'Penting', color: '#ea580c', bg: '#fff7ed', icon: TriangleAlert },
  medium: { label: 'Informasi', color: '#2563eb', bg: '#eff6ff', icon: Info },
  low: { label: 'Umum', color: '#0d9488', bg: '#f0fdfa', icon: Info },
};

const PRIORITY_ORDER: Announcement['priority'][] = ['urgent', 'high', 'medium', 'low'];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/** "2025-09-01" → "1 Sep 2025". Dipakai pada label periode statistik. */
const fmtDateShort = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/**
 * Empat angka lalu lintas udara pada seksi "APT Pranoto dalam Angka".
 *
 * BERSUMBER `GET /air-traffic`, BUKAN ANGKA TETAP. Beranda desktop memasang
 * lima klaim bulat di berkasnya sendiri — "1.250.000+ penumpang/tahun",
 * "120+ penerbangan/hari", "98% tingkat kepuasan penumpang" — yang tidak
 * berasal dari data mana pun di portal ini dan tidak berubah meski catatan
 * lalu lintasnya bertambah. Menyalinnya ke sini berarti menyalin klaim tanpa
 * sumber ke satu layar lagi.
 *
 * Yang ditampilkan di sini angka yang benar-benar dicatat petugas, lengkap
 * dengan periodenya, sehingga pembaca tahu persis apa yang sedang dihitung.
 */
const ANGKA_TRAFIK = [
  { kunci: 'passenger' as const, label: 'Penumpang', icon: Users },
  { kunci: 'aircraft' as const, label: 'Pergerakan Pesawat', icon: Plane },
  { kunci: 'baggage' as const, label: 'Bagasi (kg)', icon: Luggage },
  { kunci: 'cargo' as const, label: 'Kargo (kg)', icon: Package },
];

export default function BerandaScreen() {
  const kamus = useTeks();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [igPosts, setIgPosts] = useState<InstagramPost[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [trafik, setTrafik] = useState<AirTrafficStats | null>(null);
  const [tab, setTab] = useState<'departure' | 'arrival'>('departure');
  const [cari, setCari] = useState('');
  const [pejabat, setPejabat] = useState(0);
  const [clock, setClock] = useState('');
  const heroBg = useSetting('bg_app_home');

  useEffect(() => {
    fetchApi<Flight[] | { flights: Flight[] }>('/flights').then((res) => {
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.flights;
      if (Array.isArray(list)) setFlights(list);
    });
    fetchApi<NewsItem[]>('/news').then((res) => {
      if (res.success && Array.isArray(res.data)) setNews(res.data);
    });
    fetchApi<Announcement[]>('/announcements').then((res) => {
      if (res.success && Array.isArray(res.data)) setAnnouncements(res.data);
    });
    fetchApi<Facility[]>('/facilities').then((res) => {
      if (res.success && Array.isArray(res.data)) setFacilities(res.data);
    });
    /* Gagal diam-diam, seperti pada beranda desktop: tiap seksi di bawah
       memang tidak dirender bila datanya kosong, jadi beranda tidak perlu
       membedakan "belum diisi" dari "sedang gagal". */
    fetchApi<InstagramPost[]>('/instagram-posts').then((res) => {
      if (res.success && Array.isArray(res.data)) setIgPosts(res.data);
    });
    fetchApi<Tenant[]>('/tenants').then((res) => {
      if (res.success && Array.isArray(res.data)) setTenants(res.data);
    });
    fetchApi<AirTrafficStats>('/air-traffic').then((res) => {
      if (res.success && res.data) setTrafik(res.data);
    });
  }, []);

  /* Pejabat berganti sendiri tiap 6 detik — irama yang sama dengan carousel
     pejabat di beranda desktop. */
  useEffect(() => {
    if (OFFICIALS.length < 2) return;
    const t = setInterval(() => setPejabat((p) => (p + 1) % OFFICIALS.length), 6000);
    return () => clearInterval(t);
  }, []);

  /* Jam WITA sungguhan — bandara berada di zona Asia/Makassar. */
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar',
        }),
      );
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);

  /* Tiga penerbangan teratas apa adanya dari API — tanpa pengisi data contoh. */
  const rows = flights.filter((f) => f.flight_type === tab).slice(0, 3);

  const notices = announcements
    .filter((a) => a.is_active)
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
    .slice(0, 3);

  const topFacilities = facilities.filter((f) => f.is_operational).slice(0, 6);
  const latestNews = news.slice(0, 3);
  const igTampil = igPosts.filter((p) => p.image_url).slice(0, 6);
  const moda = tenants.filter((t) => t.category === 'transportation').slice(0, 4);
  const tokoh = OFFICIALS[pejabat];
  const hasilCari = cari.trim()
    ? SEARCH_DESTINATIONS.filter((tujuan) => tujuan.label.toLowerCase().includes(cari.trim().toLowerCase()))
    : [];

  return (
    <div className="pb-8 bg-[#f2f7ff] min-h-full">
      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden rounded-b-[1.75rem] text-white">
        <img
          src={heroBg}
          alt="Bandara APT Pranoto"
          className="absolute inset-0 w-full h-full object-cover object-[66%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1e5b]/95 via-[#123a8f]/70 to-[#0b1e5b]/20" />

        <div className="relative">
          <StatusBar />

          {/* top bar.
              Tombol hamburger DIHAPUS: ia tidak pernah membuka apa pun —
              `<button>` tanpa `onClick` yang hanya terlihat seperti menu. */}
          <div className="flex items-center px-5 pt-2 h-12">
            <div className="flex items-center gap-2">
              <img src="/icon-192.png" alt="" className="w-9 h-9 rounded-xl ring-1 ring-white/20" />
              <div className="leading-none">
                <p className="font-black text-[13px] tracking-wide">APT PRANOTO</p>
                <p className="mt-1 text-[9px] text-blue-100 tracking-[0.2em]">SAMARINDA</p>
              </div>
            </div>
          </div>

          {/* welcome */}
          <div className="px-5 pt-6 pb-16 md:pb-12">
            <p className="text-white text-[27px] leading-tight font-black">Selamat datang</p>
            <h1 className="text-[21px] leading-tight font-bold mt-1">
              Bandar Udara APT Pranoto
            </h1>
            <p className="mt-2 text-blue-100 text-[12px]">Samarinda <span aria-hidden="true">·</span> WITA</p>
            <span className="mt-4 block h-0.5 w-9 rounded-full bg-cyan-300" aria-hidden="true" />
            <p className="mt-4 text-blue-50/90 text-[12.5px] leading-relaxed max-w-[15rem]">
              Perjalanan lebih mudah dimulai dari sini.
            </p>
          </div>
        </div>
      </div>

      {/* Pencarian langsung menuju layar yang memang tersedia di PWA. */}
      <div className="relative z-20 mx-4 -mt-7 md:mx-5">
        <label className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-white shadow-[0_12px_28px_-16px_rgba(15,23,42,0.42)] ring-1 ring-blue-100/70">
          <Search className="w-5 h-5 text-[#0b1e5b] flex-shrink-0" aria-hidden="true" />
          <span className="sr-only">Cari informasi bandara</span>
          <input
            value={cari}
            onChange={(event) => setCari(event.target.value)}
            placeholder="Cari informasi bandara"
            className="w-full min-w-0 bg-transparent text-[14px] text-slate-900 placeholder:text-slate-400 outline-none"
          />
        </label>
        {cari.trim() && (
          <div className="absolute top-full mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-100">
            {hasilCari.length > 0 ? hasilCari.map((tujuan) => {
              const Icon = tujuan.icon;
              return (
                <Link key={tujuan.href} href={tujuan.href} className="flex min-h-11 items-center gap-3 px-4 text-[13px] font-semibold text-slate-800 hover:bg-blue-50">
                  <Icon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  {tujuan.label}
                  <ChevronRight className="ml-auto w-4 h-4 text-slate-400" aria-hidden="true" />
                </Link>
              );
            }) : <p className="p-4 text-[12px] text-slate-500">Tidak ada menu yang cocok.</p>}
          </div>
        )}
      </div>

      {/* ===== QUICK ACCESS ===== */}
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-4 mt-4 grid grid-cols-3 gap-2.5 md:mx-5 md:grid-cols-6"
      >
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <motion.div key={q.label} variants={listItem}>
              <Link href={q.href} className="flex min-h-[98px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/80 px-1.5 py-3 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)] active:scale-[0.97] transition-transform" style={{ backgroundColor: q.bg }}>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="w-11 h-11 rounded-2xl bg-white/60 flex items-center justify-center"
                >
                  <Icon className="w-6 h-6" style={{ color: q.color }} strokeWidth={2.1} />
                </motion.div>
                <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">{q.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ===== PENGUMUMAN PENTING ===== */}
      {notices.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3 px-4">
            <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-blue-600" /> Pengumuman Penting
            </h2>
            <Link href="/app/berita" className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5">
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1"
          >
            {notices.map((a) => {
              const meta = PRIORITY_META[a.priority] ?? PRIORITY_META.low;
              const Icon = meta.icon;
              return (
                <motion.div
                  key={a.id}
                  variants={listItem}
                  className="flex-shrink-0 w-[268px] bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 border-l-[3px]"
                  style={{ borderLeftColor: meta.color }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    </span>
                    <span
                      className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: meta.color, backgroundColor: meta.bg }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate ml-auto">{a.target_audience}</span>
                  </div>

                  <p className="mt-2.5 font-bold text-slate-900 text-[13px] leading-snug line-clamp-2">
                    {a.title}
                  </p>
                  <p className="mt-1 text-[11.5px] text-slate-500 leading-relaxed line-clamp-3">
                    {a.content}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* ===== FLIGHT INFO ===== */}
      <div className="mx-4 mt-5 rounded-3xl border border-white bg-white p-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.28)] md:mx-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-[16px] font-black text-[#0b1e5b]">
            <Plane className="w-5 h-5 text-blue-600" aria-hidden="true" /> Informasi Penerbangan
          </h2>
          <Link href="/app/penerbangan" className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <Segmented
          layoutId="home-fids"
          value={tab}
          onChange={(v) => setTab(v)}
          options={[
            { value: 'departure', label: 'Keberangkatan', icon: <Plane className="w-3.5 h-3.5" /> },
            { value: 'arrival', label: 'Kedatangan', icon: <Plane className="w-3.5 h-3.5 rotate-90" /> },
          ]}
        />

        <motion.div
          key={tab}
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="mt-3 space-y-2.5"
        >
          {rows.map((f) => {
            const place = splitPlace(tab === 'departure' ? f.destination : f.origin);
            const st = statusInfo(f.status);
            return (
              <motion.div key={f.id} variants={listItem}>
                <Link
                  href={`/app/penerbangan/${f.id}`}
                  className="block rounded-2xl border border-slate-100 bg-slate-50/70 p-3 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <AirlineLogo airline={f.airline} logo={f.airline_logo} code={f.airline_code} color={f.airline_color} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-[14px] leading-tight">{f.flight_number}</p>
                      <p className="text-[11px] text-slate-500 truncate">{f.airline}</p>
                    </div>
                    <div className="text-center min-w-0">
                      <p className="font-bold text-slate-900 text-[14px]">{place.code}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[64px]">{place.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-[14px]">{f.scheduled_time.replace(' WITA', '')}</p>
                      <p className={`text-[10px] font-semibold ${st.className}`}>{labelStatus(f.status, kamus)}</p>
                    </div>
                  </div>

                  {/* Titik layan penumpang. Di layar ponsel inilah informasi
                      yang paling dicari begitu tiba di terminal: konter mana
                      untuk lapor, gate mana untuk naik, conveyor mana untuk
                      mengambil bagasi. */}
                  {(() => {
                    const g = gateLabel(f, kamus);
                    const c = counterLabel(f, kamus);
                    const departing = f.flight_type === 'departure';
                    const Icon = departing ? DoorOpen : Luggage;

                    return (
                      <div className="mt-2 pt-2 border-t border-dashed border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            {g.label}
                          </span>
                          <span className={g.assigned ? 'text-[12px] font-black text-slate-800 tabular-nums' : 'text-[10px] text-slate-400'}>
                            {g.bare}
                          </span>
                        </span>

                        {departing && (
                          <span className="inline-flex items-center gap-1">
                            <ClipboardList className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Konter
                            </span>
                            <span className={c.assigned ? 'text-[12px] font-black text-slate-800 tabular-nums' : 'text-[10px] text-slate-400'}>
                              {c.assigned ? c.list.join(', ') : 'Belum ditentukan'}
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </Link>
              </motion.div>
            );
          })}

          {/* Katakan apa adanya saat umpan FIDS kosong — jangan diisi contoh. */}
          {rows.length === 0 && (
            <div className="rounded-2xl bg-gradient-to-b from-white to-blue-50/70 px-5 py-7 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <ClipboardList className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-[13px] font-bold text-slate-800">
                Jadwal {tab === 'departure' ? 'keberangkatan' : 'kedatangan'} belum tersedia
              </p>
              <p className="mt-1 text-[11.5px] text-slate-500 leading-relaxed">
                Silakan periksa kembali nanti atau lihat semua informasi penerbangan.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Tiga pintu bantuan langsung menuju tab yang sesuai, tanpa formulir tiruan di beranda. */}
      <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-400 p-4 text-white shadow-[0_16px_30px_-20px_rgba(37,99,235,0.65)] md:mx-5">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[22px] border-white/10" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <LifeBuoy className="h-9 w-9 flex-shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <div>
            <h2 className="text-[16px] font-black">Pusat Bantuan</h2>
            <p className="text-[11.5px] text-blue-50">Kami siap membantu Anda</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Tanya Petugas', href: '/app/bantuan?mode=chat', icon: MessageCircle },
            { label: 'Pengaduan', href: '/app/bantuan?mode=aduan', icon: FileWarning },
            { label: 'Barang Hilang', href: '/app/bantuan?mode=hilang', icon: PackageSearch },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-1.5 py-2 text-center text-blue-700 shadow-sm active:bg-blue-50 md:min-h-[58px] md:flex-row md:gap-2">
                <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
                <span className="text-[10px] font-bold leading-tight text-slate-800 md:text-[12px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-4 mt-4 rounded-3xl border border-white bg-white p-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.28)] md:mx-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[16px] font-black text-[#0b1e5b]">
            <ClipboardList className="h-5 w-5 text-blue-600" aria-hidden="true" /> Layanan Populer
          </h2>
          <Link href="/app/layanan" className="inline-flex items-center text-[11.5px] font-semibold text-blue-600">
            Lihat semua <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'PPID', desc: 'Permohonan informasi publik', href: '/app/ppid', icon: ShieldCheck },
            { label: 'Pusat Unduhan', desc: 'Dokumen dan formulir publik', href: '/app/unduhan', icon: Download },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex min-h-[110px] flex-col gap-2 rounded-2xl bg-[#f3f8ff] p-3 active:bg-blue-100 md:min-h-[88px] md:flex-row md:items-center">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[12px] font-bold text-slate-900">{item.label}</span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-500">{item.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Gambar hanya dipakai bila benar-benar datang dari data portal. */}
      <section className="mx-4 mt-4 rounded-3xl border border-white bg-white p-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.28)] md:mx-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[16px] font-black text-[#0b1e5b]">
            <MapPin className="h-5 w-5 text-blue-600" aria-hidden="true" /> Jelajahi Bandara
          </h2>
          <Link href="/app/layanan" className="inline-flex items-center text-[11.5px] font-semibold text-blue-600">
            Lihat semua <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Fasilitas Terminal', desc: 'Lihat fasilitas yang tersedia', href: '/app/fasilitas', icon: Building2, image: topFacilities.find((f) => f.image_url)?.image_url },
            { label: 'Transportasi', desc: 'Pilihan ke dan dari bandara', href: '/app/transportasi', icon: Car, image: moda.find((m) => m.image_url)?.image_url },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="relative flex min-h-[138px] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-[#0b1e5b] p-3 text-white active:scale-[0.98] transition-transform">
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#071a43]/90 via-[#071a43]/20 to-transparent" aria-hidden="true" />
                {!item.image && <Icon className="absolute right-3 top-3 h-12 w-12 text-white/25" strokeWidth={1.5} aria-hidden="true" />}
                <span className="relative text-[12.5px] font-bold leading-tight">{item.label}</span>
                <span className="relative mt-1 text-[10px] leading-snug text-white/85">{item.desc}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== INFORMASI & KONTAK ===== */}
      <section className="mx-4 mt-4 rounded-3xl border border-white bg-white p-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.28)] md:mx-5">
        <h2 className="mb-3 flex items-center gap-2 text-[16px] font-black text-[#0b1e5b]">
          <MapPin className="h-5 w-5 text-blue-600" aria-hidden="true" /> Informasi Bandara
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" strokeWidth={2.1} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] text-slate-500">Alamat Terminal</p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-slate-800 leading-relaxed">{CONTACT.address}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            <span className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-600" strokeWidth={2.1} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] text-slate-500">Waktu Setempat</p>
              <p className="mt-0.5 text-[12px] font-bold text-slate-800 tabular-nums">
                {clock ? `${clock} WITA` : 'WITA'}
              </p>
              <p className="text-[10px] text-slate-500">Waktu di bandara udara ini</p>
            </div>
          </div>
        </div>
          {/* "Peta Bandara" sudah tidak ada di sini. Layar yang dituju memuat
              denah lantai yang seluruh titiknya dikarang, dan tidak ada sumber
              data denah terminal di mana pun — jadi layarnya dihapus, bukan
              ditambal. Petunjuk arah kini `tel:` ke pusat informasi. */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 py-2 text-[11px] font-bold text-white active:bg-blue-700 transition-colors"
            >
              <Navigation className="w-4 h-4" /> Rute ke Bandara
            </a>
            <a
              href={`tel:${CONTACT.phoneHref}`}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-blue-600 px-2 py-2 text-[11px] font-bold text-blue-700 active:bg-blue-50 transition-colors"
            >
              <Phone className="w-4 h-4" /> Hubungi Kami
            </a>
          </div>
      </section>

      {/* ===== BERITA TERBARU ===== */}
      <section className="mx-4 mt-4 rounded-3xl border border-white bg-white p-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.28)] md:mx-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-black text-[#0b1e5b] flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600" /> Berita Terbaru
            </h2>
            <Link href="/app/berita" className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5">
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
            {latestNews.map((n) => {
              const cat = CATEGORY_STYLES[n.category] || { text: '#1d4ed8', bg: '#dbeafe' };
              return (
                <motion.div key={n.id} variants={listItem}>
                  <Link
                    href={`/app/berita/${n.slug}`}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm shadow-slate-200/60 active:scale-[0.98] transition-transform"
                  >
                    <GambarBerita
                      berita={n}
                      ukuranIkon="w-5 h-5"
                      className="w-[78px] h-[78px] rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{ color: cat.text, backgroundColor: cat.bg }}
                        >
                          {n.category}
                        </span>
                        <span className="text-[10px] text-slate-400">{fmtDate(n.published_at)}</span>
                      </div>
                      <h3 className="mt-1 font-bold text-slate-900 text-[13px] leading-snug line-clamp-2">
                        {n.title}
                      </h3>
                      <p className="mt-1 text-slate-500 text-[11px] leading-relaxed line-clamp-2">{n.excerpt}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
          {latestNews.length === 0 && (
            <div className="rounded-2xl bg-gradient-to-b from-white to-blue-50/70 px-4 py-6 text-center">
              <Newspaper className="mx-auto h-8 w-8 text-blue-300" aria-hidden="true" />
              <p className="mt-2 text-[12.5px] font-bold text-slate-800">Berita terbaru akan tampil di sini</p>
              <p className="mt-1 text-[11px] text-slate-500">Pantau terus informasi terbaru seputar Bandara APT Pranoto.</p>
            </div>
          )}
      </section>

      {/* ===== TENTANG BANDARA =====
           Padanan seksi 3 beranda desktop. Sebelumnya beranda PWA sama sekali
           tidak menyebut bandara ini apa dan melayani ke mana — pengunjung
           ponsel langsung dilempar ke jadwal penerbangan. */}
      <div className="px-4 mt-7">
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            Profil Bandara
          </p>
          <h2 className="mt-1 text-[16px] font-black text-slate-900 leading-snug">
            Tentang Bandar Udara APT Pranoto
          </h2>
          <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">
            Bandar Udara APT Pranoto Samarinda merupakan gerbang utama Kalimantan Timur yang
            melayani penerbangan domestik dan terus berkembang menjadi bandara modern berstandar
            internasional.
          </p>

          {/* Dua angka yang punya sumbernya sendiri di `lib/airportProfile.ts`
              (daftar rute reguler dan perintis), bukan klaim bulat. */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-3">
              <MapPin className="w-4 h-4 text-blue-600" />
              <p className="mt-2 text-[17px] font-black text-slate-900 leading-none">
                {ROUTES.reguler.length}
              </p>
              <p className="mt-1 text-[10.5px] text-slate-500 leading-tight">Rute Reguler</p>
            </div>
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-3">
              <Plane className="w-4 h-4 text-blue-600" />
              <p className="mt-2 text-[17px] font-black text-slate-900 leading-none">
                {ROUTES.perintis.length}
              </p>
              <p className="mt-1 text-[10.5px] text-slate-500 leading-tight">Rute Perintis</p>
            </div>
          </div>

          <Link
            href="/app/profil"
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-blue-50 text-[12.5px] font-bold text-blue-700 active:bg-blue-100 transition-colors"
          >
            Lihat Profil Bandara <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ===== INFORMASI TERBARU (INSTAGRAM) =====
           Unggahan yang sama dengan kolom kanan hero beranda desktop. Dibaca
           dari tabel LOKAL portal, bukan dari Instagram: tokennya tidak boleh
           sampai ke peramban, dan gangguan di Instagram tidak boleh ikut
           merusak beranda. Sumbernya boleh sinkronisasi API maupun masukan
           petugas — beranda tidak perlu tahu bedanya. */}
      {igTampil.length > 0 && (
        <div className="mt-7">
          <div className="flex items-center justify-between mb-3 px-4">
            <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-1.5">
              <InstagramGlyph className="w-4 h-4 text-pink-600" /> Informasi Terbaru
            </h2>
            <a
              /* Akun resmi yang sama dengan kanal alternatif Pusat Bantuan
                 (`components/helpdesk/shared.tsx`). */
              href="https://www.instagram.com/aptpranotoairport"
              target="_blank"
              rel="noreferrer"
              className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5"
            >
              Instagram <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1 snap-x snap-mandatory"
          >
            {igTampil.map((p) => {
              const isi = (
                <>
                  {p.is_video ? (
                    /* Tanpa `autoPlay`: beranda yang memutar video sendiri
                       menyedot kuota pengunjung ponsel tanpa diminta. */
                    <video
                      src={p.image_url!}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={p.caption_excerpt ?? 'Video unggahan Instagram bandara'}
                      className="w-full aspect-square object-cover bg-slate-900"
                    />
                  ) : (
                    /* Gambar yang gagal dimuat DISEMBUNYIKAN, bukan dibiarkan
                       sebagai kotak putih setinggi lebar kartu. `image_url`
                       dibangun backend dari `APP_URL`; bila nilainya menunjuk
                       host yang tidak terjangkau pembaca, seluruh kartu tampil
                       kosong tanpa petunjuk apa pun. Keterangannya tetap
                       terbaca. */
                    <img
                      src={p.image_url!}
                      alt={p.caption_excerpt ?? 'Unggahan Instagram bandara'}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="w-full aspect-square object-cover bg-slate-100"
                    />
                  )}
                  <div className="p-3 flex-1 min-h-0 flex flex-col">
                    {p.posted_at && (
                      <p className="text-[10px] text-slate-400">{fmtDate(p.posted_at)}</p>
                    )}
                    <p className="mt-1 text-[11.5px] text-slate-600 leading-snug line-clamp-3">
                      {p.caption_excerpt ?? p.caption ?? ''}
                    </p>
                  </div>
                </>
              );

              return (
                <motion.div
                  key={p.id}
                  variants={listItem}
                  className="flex-shrink-0 w-[210px] snap-start bg-white rounded-2xl shadow-sm shadow-slate-200/60 overflow-hidden flex flex-col"
                >
                  {/* Unggahan manual boleh tanpa permalink — jangan dipaksa
                      jadi tautan yang tidak menuju ke mana-mana. */}
                  {p.permalink ? (
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col h-full active:scale-[0.98] transition-transform"
                    >
                      {isi}
                    </a>
                  ) : (
                    <div className="flex flex-col h-full">{isi}</div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* ===== FASILITAS TERMINAL ===== */}
      {topFacilities.length > 0 && (
        <div className="px-4 mt-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-slate-900">Fasilitas Terminal</h2>
            <Link href="/app/fasilitas" className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5">
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2.5">
            {topFacilities.map((f) => {
              const meta = facilityCatMeta(f.category);
              const Icon = facilityIcon(f);
              return (
                <motion.div key={f.id} variants={listItem}>
                  <Link
                    href="/app/fasilitas"
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm shadow-slate-200/60 active:scale-[0.98] transition-transform"
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: meta.color }} strokeWidth={2.1} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-[13.5px] leading-snug truncate">{f.name}</p>
                      {/* `location_description` KOSONG pada seluruh fasilitas
                          yang benar-benar terdaftar — keterangannya ada di
                          `description`. Sebelum ada cadangan ini, tiap baris
                          menampilkan ikon peta yang menggantung tanpa teks. */}
                      {(f.location_description || f.description) && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 min-w-0">
                          <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: meta.color }} />
                          <span className="truncate">
                            {f.location_description || f.description?.split('\n')[0]}
                          </span>
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* ===== PEJABAT BANDARA =====
           Padanan seksi 5 beranda desktop, disusutkan jadi satu kartu berganti
           sendiri plus deretan potret yang dapat digulir. Bagan bersusun ala
           desktop tidak terbaca di layar selebar ponsel. */}
      {tokoh && (
        <div className="mt-7">
          <div className="flex items-center justify-between mb-3 px-4">
            <h2 className="text-[16px] font-bold text-slate-900">Pejabat Bandara</h2>
            <Link href="/profile#pejabat" className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5">
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="px-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] text-white">
              <motion.div
                key={tokoh.slug}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45 }}
                className="relative z-10 flex items-end gap-3 p-4 pb-0"
              >
                <div className="flex-1 min-w-0 pb-4">
                  <p className="text-cyan-300 text-[11px] italic font-medium leading-snug">
                    {tokoh.shortTitle}
                  </p>
                  <p className="mt-1 text-[16px] font-black leading-tight">{tokoh.name}</p>
                  <p className="mt-1 text-blue-100/80 text-[10.5px] leading-snug">{ORG_NAME}</p>

                  <span className="mt-3 inline-block text-[10px] font-mono text-white/70">
                    {String(pejabat + 1).padStart(2, '0')} / {String(OFFICIALS.length).padStart(2, '0')}
                  </span>
                </div>

                <img
                  key={tokoh.photo}
                  src={tokoh.photo}
                  alt={tokoh.name}
                  loading="lazy"
                  className="relative z-10 h-[132px] w-auto object-contain object-bottom flex-shrink-0 drop-shadow-2xl"
                />
              </motion.div>

              <Plane className="absolute -top-3 -left-4 w-24 h-24 text-white/10 rotate-12" aria-hidden="true" />
            </div>

            {/* Potret lain — menekan salah satu menghentikan pergantian
                otomatis pada yang dipilih. */}
            <div className="mt-3 flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {OFFICIALS.map((p, i) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setPejabat(i)}
                  aria-label={p.name}
                  aria-pressed={i === pejabat}
                  className={`flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-100 ring-2 transition-colors ${
                    i === pejabat ? 'ring-blue-600' : 'ring-transparent'
                  }`}
                >
                  <img
                    src={p.photo}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-contain object-bottom"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== AKSES MENUJU BANDARA =====
           Padanan seksi 6 beranda desktop. BERSUMBER API, bukan daftar tetap:
           beranda desktop menuliskan empat moda beserta klaimnya sendiri
           ("Bus & Shuttle — tersedia layanan bus dari berbagai titik kota")
           yang tidak berasal dari data mana pun. Yang tampil di sini mitra
           transportasi yang benar-benar terdaftar. */}
      <div className="px-4 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-bold text-slate-900">Akses Menuju Bandara</h2>
          <Link href="/app/transportasi" className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {moda.length > 0 && (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-2.5 mb-2.5"
          >
            {moda.map((m) => (
              <motion.div
                key={m.id}
                variants={listItem}
                className="bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60"
              >
                <span className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                  <Car className="w-5 h-5 text-cyan-600" strokeWidth={2.1} />
                </span>
                <p className="mt-2.5 font-bold text-slate-900 text-[12.5px] leading-snug">{m.name}</p>
                {m.location && (
                  <p className="mt-1 text-[10.5px] text-slate-500 leading-snug line-clamp-2">{m.location}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Kartu alamat selalu tampil, dengan atau tanpa mitra terdaftar —
            inilah yang sebenarnya dicari orang yang sedang dalam perjalanan. */}
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
        >
          <span className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-white" strokeWidth={2.1} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-slate-900 text-[13px]">APT Pranoto Samarinda</span>
            <span className="block text-[11px] text-slate-500 leading-snug">{CONTACT.address}</span>
          </span>
          <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
        </a>
      </div>

      {/* ===== WISATA TERDEKAT ===== */}
      <div className="mt-7">
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 className="text-[16px] font-bold text-slate-900">Wisata Terdekat</h2>
          <Link href="/app/wisata" className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <motion.div
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1"
        >
          {NEARBY.map((spot) => {
            const meta = TOURISM_CAT_META[spot.category];
            return (
              <motion.div key={spot.slug} variants={listItem} className="flex-shrink-0 w-[186px]">
                <Link
                  href="/app/wisata"
                  className="block h-full bg-white rounded-2xl shadow-sm shadow-slate-200/60 overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between px-3.5 py-2" style={{ backgroundColor: meta.bg }}>
                    <span className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                      {spot.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold tabular-nums" style={{ color: meta.color }}>
                      <Car className="w-3 h-3" /> {spot.distanceKm} km
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="font-bold text-slate-900 text-[13px] leading-snug line-clamp-2">{spot.name}</p>
                    <p className="mt-1 text-[10.5px] text-slate-500 truncate">{spot.city}</p>
                    <p className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-slate-600">
                      <MapPin className="w-3 h-3" style={{ color: meta.color }} /> {spot.duration}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ===== APT PRANOTO DALAM ANGKA =====
           Padanan seksi 8 beranda desktop — lihat catatan pada `ANGKA_TRAFIK`
           soal mengapa angkanya ditarik dari API alih-alih disalin. */}
      {trafik && trafik.days > 0 && (
        <div className="px-4 mt-7">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1226] to-[#111c3d] p-5">
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
                backgroundSize: '22px 22px',
              }}
              aria-hidden="true"
            />

            <div className="relative z-10">
              <h2 className="text-[16px] font-black text-white">APT Pranoto dalam Angka</h2>
              {/* Periodenya disebut, bukan disembunyikan: tanpa itu angkanya
                  terbaca sebagai capaian sepanjang masa. */}
              <p className="mt-1 text-[10.5px] text-slate-400 leading-snug">
                {fmtDateShort(trafik.range.from)} – {fmtDateShort(trafik.range.to)} · {trafik.days} hari tercatat
              </p>

              <motion.div
                variants={listContainer}
                initial="hidden"
                animate="show"
                className="mt-4 grid grid-cols-2 gap-4"
              >
                {ANGKA_TRAFIK.map((a) => {
                  const Icon = a.icon;
                  return (
                    <motion.div key={a.kunci} variants={listItem}>
                      <span className="w-9 h-9 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-blue-300" />
                      </span>
                      <p className="mt-2 text-[18px] font-black text-white leading-none tabular-nums">
                        {angka(trafik.summary[a.kunci].total)}
                      </p>
                      <p className="mt-1 text-[10.5px] text-slate-400 leading-tight">{a.label}</p>
                    </motion.div>
                  );
                })}
              </motion.div>

              <Link
                href="/statistik"
                className="mt-4 flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-white/10 border border-white/15 text-[12.5px] font-bold text-white active:bg-white/20 transition-colors"
              >
                <Boxes className="w-4 h-4" /> Statistik Lengkap
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
