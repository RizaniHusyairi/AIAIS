'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSetting } from '@/lib/settings';
import {
  TOURISM_SPOTS, TOURISM_CATEGORIES, TOURISM_CAT_META, TourismCategory,
  mapsUrl, directionsUrl, TourismSpot,
} from '@/lib/tourismData';
import {
  Palmtree, MapPin, Search, Compass, Plane, ArrowRight, Sparkles, Navigation,
  Clock, Route, Car, Landmark, Trees, MoonStar, ShoppingBag, FerrisWheel, Info, Headphones,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ================================================================
   Lengkung lintasan dekoratif — sama dengan halaman fasilitas
   ================================================================ */
function FlightArc({ className = '', d = 'M-20 170 Q 380 50 1020 130' }: { className?: string; d?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 1000 220" preserveAspectRatio="none" fill="none">
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 9"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/** Ikon per kategori wisata. */
const CAT_ICON: Record<TourismCategory, LucideIcon> = {
  Budaya: Landmark,
  Alam: Trees,
  Religi: MoonStar,
  Belanja: ShoppingBag,
  Rekreasi: FerrisWheel,
};

/** Saran rencana kunjungan berdasarkan lama waktu transit. */
const ITINERARIES = [
  {
    title: 'Transit 3 Jam',
    desc: 'Cukup untuk satu destinasi terdekat tanpa khawatir terlambat check-in.',
    spots: ['Desa Budaya Pampang'],
    icon: Clock, color: '#2563eb', bg: '#eff6ff',
  },
  {
    title: 'Singgah Setengah Hari',
    desc: 'Padukan wisata alam dengan kuliner sekitar Samarinda Utara.',
    spots: ['Desa Budaya Pampang', 'Air Terjun Tanah Merah', 'Kebun Raya Unmul Samarinda (KRUS)'],
    icon: Route, color: '#059669', bg: '#ecfdf5',
  },
  {
    title: 'Satu Hari Penuh',
    desc: 'Menyusuri ikon Kota Samarinda hingga pusat oleh-oleh khas Kaltim.',
    spots: ['Masjid Islamic Center Samarinda', 'Taman Tepian Sungai Mahakam', 'Citra Niaga'],
    icon: Compass, color: '#7c3aed', bg: '#f5f3ff',
  },
  {
    title: 'Menginap 2 Hari',
    desc: 'Perjalanan hingga Tenggarong, pusat sejarah Kesultanan Kutai.',
    spots: ['Pulau Kumala', 'Museum Mulawarman', 'Kampung Tenun Samarinda Seberang'],
    icon: Plane, color: '#d97706', bg: '#fffbeb',
  },
];

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/* ================================================================ */

export default function TourismPage() {
  const [cat, setCat] = useState<'all' | TourismCategory>('all');
  const [q, setQ] = useState('');
  const heroBg = useSetting('bg_tourism');

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return TOURISM_SPOTS.filter((t) => {
      const byCat = cat === 'all' || t.category === cat;
      const byQ = !q || [t.name, t.category, t.city, t.description, ...t.highlights]
        .some((v) => String(v ?? '').toLowerCase().includes(s));
      return byCat && byQ;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [cat, q]);

  const counts = useMemo(() => ({
    total: TOURISM_SPOTS.length,
    categories: TOURISM_CATEGORIES.length,
    nearest: Math.min(...TOURISM_SPOTS.map((t) => t.distanceKm)),
    underHour: TOURISM_SPOTS.filter((t) => t.distanceKm <= 30).length,
  }), []);

  return (
    <div className="bg-slate-50 overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[440px] flex items-center overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#1e40af]">
        <motion.img
          initial={{ scale: 1.14, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
          src={heroBg}
          alt="Destinasi wisata di sekitar Samarinda"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1e5b] via-[#0b1e5b]/65 to-transparent" />

        {/* awan */}
        <div className="absolute top-16 left-[10%] w-48 h-16 bg-white/10 blur-3xl rounded-full" style={{ animation: 'cloudDrift 11s ease-in-out infinite alternate' }} />
        <div className="absolute bottom-20 right-[18%] w-60 h-20 bg-white/10 blur-3xl rounded-full" style={{ animation: 'cloudDrift 13s ease-in-out infinite alternate-reverse' }} />

        <FlightArc className="absolute inset-x-0 top-1/3 w-full h-48 text-white/25" />
        <motion.div
          initial={{ x: -80, y: 34, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-[16%] top-[24%] hidden md:block"
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <Palmtree className="w-14 h-14 text-cyan-200/80 drop-shadow-2xl" strokeWidth={1.2} />
          </motion.div>
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-16 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Palmtree className="w-3.5 h-3.5" /> Pariwisata Terdekat
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Jelajahi Sekitar
              <br />
              <span className="text-cyan-300">Bandara APT Pranoto</span>
            </h1>

            <p className="mt-4 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">
              Destinasi budaya, alam, religi, dan belanja khas Kalimantan Timur yang dapat dijangkau
              langsung dari terminal — mulai dari 15 menit perjalanan darat.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#destinasi" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                <Compass className="w-4 h-4" /> Lihat Destinasi
              </Link>
              <Link href="/tenants" className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors">
                Transportasi ke Kota <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* garis landasan */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 flex gap-2 px-4 opacity-70">
          {Array.from({ length: 26 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.08 }}
              className="flex-1 bg-cyan-300 rounded-full"
            />
          ))}
        </div>
      </section>

      {/* ============ RINGKASAN ANGKA ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Destinasi Terdata', value: counts.total, icon: Palmtree, color: '#059669' },
            { label: 'Kategori Wisata', value: counts.categories, icon: Sparkles, color: '#7c3aed' },
            { label: 'Destinasi Terdekat (km)', value: counts.nearest, icon: MapPin, color: '#2563eb' },
            { label: 'Dalam Radius 30 km', value: counts.underHour, icon: Route, color: '#d97706' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} variants={rise} whileHover={{ y: -5 }} className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-5">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}14` }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </span>
                <p className="text-[24px] font-black text-slate-900 leading-none mt-3 tabular-nums">{s.value}</p>
                <p className="text-[11.5px] text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ DIREKTORI DESTINASI ============ */}
      <section id="destinasi" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14 scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-emerald-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-emerald-50 px-3 py-1.5 rounded-full">
            <Palmtree className="w-3.5 h-3.5" /> Direktori Destinasi
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Wisata Terdekat dari Terminal</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">
            Diurutkan dari yang paling dekat. Saring berdasarkan kategori atau cari nama destinasi.
          </p>
        </motion.div>

        {/* filter + pencarian */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between"
        >
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[{ value: 'all' as const, label: 'Semua', color: '#2563eb', icon: Sparkles },
              ...TOURISM_CATEGORIES.map((c) => ({ value: c, label: c, color: TOURISM_CAT_META[c].color, icon: CAT_ICON[c] })),
            ].map((c) => {
              const Icon = c.icon;
              const on = cat === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCat(c.value)}
                  className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    on ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="tourism-filter"
                      className="absolute inset-0 rounded-xl"
                      style={{ backgroundColor: c.color }}
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    />
                  )}
                  <Icon className="relative w-4 h-4" />
                  <span className="relative whitespace-nowrap">{c.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative lg:w-64 flex-shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari destinasi..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </motion.div>

        {/* kisi kartu */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Palmtree className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-[13.5px] font-medium">
              Tidak ada destinasi yang cocok dengan pencarian Anda.
            </p>
          </div>
        ) : (
          <motion.div key={cat + q} variants={container} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((spot: TourismSpot) => {
              const meta = TOURISM_CAT_META[spot.category];
              const Icon = CAT_ICON[spot.category];
              return (
                <motion.article
                  key={spot.slug}
                  variants={rise}
                  whileHover={{ y: -7 }}
                  className="group relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 transition-shadow flex flex-col"
                >
                  {/* kepala kartu berwarna kategori */}
                  <div className="relative h-32 overflow-hidden flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                    <Icon
                      className="w-16 h-16 transition-transform duration-500 group-hover:scale-110"
                      style={{ color: meta.color, opacity: 0.4 }}
                      strokeWidth={1.4}
                    />
                    <span
                      className="absolute top-3 left-3 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow"
                      style={{ backgroundColor: meta.color }}
                    >
                      {spot.category}
                    </span>

                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/90 backdrop-blur text-slate-700 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm tabular-nums">
                      <Car className="w-3 h-3" style={{ color: meta.color }} /> {spot.distanceKm} km
                    </span>

                    {/* pesawat dekoratif */}
                    <Plane className="absolute -bottom-3 -right-2 w-14 h-14 text-white/50 rotate-[25deg]" />
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-black text-slate-900 text-[16px] leading-snug group-hover:text-emerald-700 transition-colors">
                      {spot.name}
                    </h3>
                    <p className="mt-1 text-[11.5px] font-semibold" style={{ color: meta.color }}>
                      {spot.city} · {spot.duration} dari bandara
                    </p>
                    <p className="mt-2 text-slate-500 text-[12.5px] leading-relaxed line-clamp-4">
                      {spot.description}
                    </p>

                    <ul className="mt-3.5 space-y-1.5">
                      {spot.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-[12px] text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: meta.color }} />
                          {h}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                      <span className="text-[12px] text-slate-600 leading-relaxed">{spot.address}</span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <a
                        href={directionsUrl(spot)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-white font-bold text-[12px] px-3 py-2.5 rounded-full transition-opacity hover:opacity-90"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Navigation className="w-3.5 h-3.5" /> Rute
                      </a>
                      <a
                        href={mapsUrl(spot)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold text-[12px] px-3 py-2.5 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Peta
                      </a>
                    </div>
                  </div>

                  <span className="block h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: meta.color }} />
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* ============ SARAN RENCANA KUNJUNGAN ============ */}
      <section className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-16 overflow-hidden">
        <FlightArc className="absolute inset-x-0 top-8 w-full h-36 text-white/15" d="M-20 150 Q 420 40 1020 120" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <Palmtree className="absolute right-8 bottom-6 w-40 h-40 text-white/[0.05]" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 bg-white/12 border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Route className="w-3.5 h-3.5" /> Rencana Kunjungan
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">Sesuaikan dengan Waktu Anda</h2>
            <p className="mt-3 text-blue-100/80 text-[14px] leading-relaxed">
              Punya waktu transit terbatas atau menginap beberapa hari? Berikut kombinasi destinasi yang
              dapat ditempuh dari Bandara APT Pranoto.
            </p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ITINERARIES.map((it) => {
              const Icon = it.icon;
              return (
                <motion.div
                  key={it.title}
                  variants={rise}
                  whileHover={{ y: -7 }}
                  className="group relative overflow-hidden bg-white rounded-3xl p-6 shadow-xl"
                >
                  <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: it.bg }}>
                    <Icon className="w-7 h-7" style={{ color: it.color }} />
                  </span>

                  <h3 className="mt-4 text-[16px] font-black text-slate-900 leading-snug">{it.title}</h3>
                  <p className="mt-1.5 text-[12px] text-slate-500 leading-relaxed">{it.desc}</p>

                  <ul className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-1.5">
                    {it.spots.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-[12px] text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: it.color }} />
                        {s}
                      </li>
                    ))}
                  </ul>

                  <span className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: it.color }} />
                </motion.div>
              );
            })}
          </motion.div>

          {/* catatan jarak */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden mt-8 rounded-3xl bg-white/[0.07] backdrop-blur border border-white/15 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
          >
            <span className="w-16 h-16 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center flex-shrink-0">
              <Info className="w-8 h-8 text-cyan-300" />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-black text-[19px]">Perhatikan Waktu Kembali ke Bandara</h3>
              <p className="mt-1.5 text-blue-100/85 text-[13px] leading-relaxed">
                Jarak dan waktu tempuh pada halaman ini adalah perkiraan perjalanan darat dalam kondisi
                lalu lintas normal. Pastikan Anda kembali ke terminal minimal 90 menit sebelum jadwal
                keberangkatan, dan gunakan moda transportasi resmi bandara.
              </p>
            </div>
            <Link
              href="/tenants"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              <Car className="w-4 h-4" /> Transportasi Resmi
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-lg p-8 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-emerald-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-emerald-50 px-3 py-1.5 rounded-full">
              <Headphones className="w-3.5 h-3.5" /> Butuh Informasi Lanjutan
            </span>
            <h2 className="mt-3.5 text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              Tanyakan pada Pusat Informasi Bandara
            </h2>
            <p className="mt-3 text-slate-500 text-[13.5px] leading-relaxed max-w-md">
              Petugas kami dapat membantu mengatur rute, merekomendasikan transportasi resmi, serta
              memperkirakan waktu tempuh menuju destinasi wisata pilihan Anda.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/complaints"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors"
              >
                Hubungi Kami <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/facilities"
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13.5px] px-5 py-3 rounded-full transition-colors"
              >
                Fasilitas Terminal
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 via-cyan-300 to-amber-300 blur-3xl opacity-40 rounded-full" />
              <Palmtree className="relative w-40 h-40 text-emerald-600/80" strokeWidth={1} />
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
