'use client';

/**
 * Panggung destinasi wisata Samarinda.
 *
 * Halaman ini sengaja tampil gelap-sinematik dan berbeda dari halaman portal
 * lain: destinasi dijual lewat foto, bukan lewat tabel. Kartu disusun sebagai
 * coverflow tiga dimensi — kartu tengah terbuka penuh, tetangganya dimiringkan
 * sebagai bayangan konteks — sehingga pengunjung melihat "ada apa lagi" tanpa
 * meninggalkan kartu yang sedang dibaca.
 *
 * Sumber data: API `/tourisms` (punya foto sampul & galeri). Bila API kosong
 * atau tidak dapat dihubungi, halaman jatuh ke direktori statis berprovenans
 * `lib/tourismData.ts` — nama, alamat, dan jaraknya tetap benar, hanya tanpa
 * foto. Tidak ada data wisata yang dikarang di berkas ini.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import ImageLightbox, { type LightboxImage } from '@/components/ui/ImageLightbox';
import {
  TOURISM_SPOTS, TOURISM_CAT_META, TOURISM_CATEGORIES, type TourismCategory,
} from '@/lib/tourismData';
import type { TourismItem } from '@/types';
import {
  MapPin, Clock, Route, Camera, Map as MapIcon, Heart, ArrowLeft, ArrowRight, Navigation,
  Landmark, Trees, MoonStar, ShoppingBag, FerrisWheel, Sparkles, Search, Plane, Images, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ================================================================
   Bentuk data terpadu — API dan direktori statis dipetakan ke sini
   ================================================================ */

type Spot = {
  slug: string;
  name: string;
  category: TourismCategory;
  distanceKm: number | null;
  duration: string | null;
  city: string;
  address: string;
  shortDesc: string;
  description: string;
  highlights: string[];
  cover: string | null;
  gallery: string[];
  mapsUrl: string;
  directionsUrl: string;
};

const CAT_ICON: Record<TourismCategory, LucideIcon> = {
  Budaya: Landmark,
  Alam: Trees,
  Religi: MoonStar,
  Belanja: ShoppingBag,
  Rekreasi: FerrisWheel,
};

/** Kategori bebas dari admin dinormalkan ke lima kategori yang dikenal tampilan. */
function normalizeCat(raw: string): TourismCategory {
  const hit = TOURISM_CATEGORIES.find((c) => c.toLowerCase() === String(raw ?? '').toLowerCase());
  return hit ?? 'Rekreasi';
}

function fromApi(it: TourismItem): Spot {
  const q = `${it.name} ${it.city ?? ''}`.trim();
  return {
    slug: it.slug,
    name: it.name,
    category: normalizeCat(it.category),
    distanceKm: it.distance_km,
    duration: it.duration,
    city: it.city ?? '',
    address: it.address,
    shortDesc: it.short_desc,
    description: it.description,
    highlights: it.highlights ?? [],
    cover: it.cover_url,
    gallery: it.gallery_urls ?? [],
    mapsUrl: it.gmaps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`,
  };
}

function fromStatic(t: (typeof TOURISM_SPOTS)[number]): Spot {
  return {
    slug: t.slug,
    name: t.name,
    category: t.category,
    distanceKm: t.distanceKm,
    duration: t.duration,
    city: t.city,
    address: t.address,
    shortDesc: `${t.description.split('. ')[0]}.`,
    description: t.description,
    highlights: t.highlights,
    cover: null,
    gallery: [],
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.mapsQuery)}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t.mapsQuery)}`,
  };
}

/* ================================================================
   Dekorasi latar
   ================================================================ */

/** Daun melayang — dibangkitkan sekali agar posisinya tidak berubah tiap render. */
const LEAVES = Array.from({ length: 14 }).map((_, i) => ({
  id: i,
  left: (i * 37) % 100,
  size: 10 + ((i * 13) % 18),
  delay: (i * 1.7) % 12,
  dur: 16 + ((i * 5) % 12),
  drift: i % 2 ? 90 : -90,
}));

function DaunMelayang() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {LEAVES.map((l) => (
        <motion.span
          key={l.id}
          className="absolute -top-10"
          style={{ left: `${l.left}%` }}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: ['-10%', '115%'], x: [0, l.drift, 0], rotate: [0, 220, 380], opacity: [0, 0.55, 0] }}
          transition={{ duration: l.dur, delay: l.delay, repeat: Infinity, ease: 'linear' }}
        >
          <svg width={l.size} height={l.size} viewBox="0 0 24 24" fill="none">
            <path
              d="M21 3C10 3 3 9 3 17c0 2 1 4 1 4s2-8 10-11c-5 4-7 8-7 11 8 0 14-7 14-18Z"
              fill="rgba(134,239,172,0.5)"
            />
          </svg>
        </motion.span>
      ))}
    </div>
  );
}

/* ================================================================
   Kartu coverflow
   ================================================================ */

const RUPA_KARTU = 'relative overflow-hidden rounded-[28px] border border-white/12 bg-[#0a1223]';

function KartuSisi({ spot, latar, onClick }: { spot: Spot; latar: string; onClick: () => void }) {
  const meta = TOURISM_CAT_META[spot.category];
  const Icon = CAT_ICON[spot.category];
  return (
    <button
      onClick={onClick}
      aria-label={`Lihat ${spot.name}`}
      className={`${RUPA_KARTU} group w-[300px] h-[520px] text-left cursor-pointer`}
    >
      <img src={latar} alt="" className="absolute inset-0 w-full h-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105" />
      <span className="absolute inset-0 bg-gradient-to-t from-[#050b1c] via-[#050b1c]/55 to-[#050b1c]/25" />

      <span
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-white text-[10px] font-bold uppercase tracking-[0.14em] pl-1.5 pr-3 py-1.5 rounded-full backdrop-blur"
        style={{ backgroundColor: `${meta.color}cc` }}
      >
        <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
          <Icon className="w-3 h-3" />
        </span>
        {spot.category}
      </span>

      <span className="absolute inset-x-6 bottom-6 block">
        <span className="block text-[22px] sm:text-[26px] font-black text-white leading-[1.15] drop-shadow">
          {spot.name}
        </span>
        <span className="mt-2 block text-[12px] text-white/65 leading-relaxed line-clamp-3">{spot.shortDesc}</span>
        <span className="mt-4 flex items-center gap-2 text-[11.5px] font-semibold text-white/70">
          <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${meta.color})` }} />
          Klik untuk lihat detail
          <span className="w-7 h-7 rounded-full border flex items-center justify-center" style={{ borderColor: meta.color, color: meta.color }}>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </span>
      </span>
    </button>
  );
}

function BarisInfo({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border" style={{ borderColor: `${color}66`, backgroundColor: `${color}1f` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-white/90">{label}</p>
        <p className="text-[11.5px] text-white/55 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

function KartuUtama({ spot, latar, onGaleri }: { spot: Spot; latar: string; onGaleri: () => void }) {
  const meta = TOURISM_CAT_META[spot.category];
  const Icon = CAT_ICON[spot.category];

  /* Kemiringan mengikuti kursor — memberi kesan kartu benda fisik. */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 160, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 160, damping: 18 });

  return (
    <motion.article
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
      className={`${RUPA_KARTU} w-[86vw] max-w-[620px] h-[520px] flex flex-col shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]`}
    >
      {/* foto destinasi sebagai latar seluruh kartu */}
      <motion.img
        key={latar}
        src={latar}
        alt={spot.name}
        initial={{ scale: 1.14, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dua lapis peredup: tegak untuk keterbacaan judul, mendatar agar sisi
          kanan foto tetap terlihat sebagai gambar, bukan sekadar tekstur. */}
      <span className="absolute inset-0 bg-gradient-to-t from-[#050b1c] via-[#050b1c]/75 to-[#050b1c]/25" />
      <span className="absolute inset-0 bg-gradient-to-r from-[#050b1c]/90 via-[#050b1c]/35 to-transparent" />
      <span className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-amber-200/25" />

      <div className="relative z-10 flex flex-col h-full p-6 sm:p-7">
        <span
          className="self-start inline-flex items-center gap-2 text-white text-[10.5px] font-bold uppercase tracking-[0.18em] pl-1.5 pr-3.5 py-1.5 rounded-full"
          style={{ backgroundColor: meta.color }}
        >
          <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5" />
          </span>
          {spot.category}
        </span>

        <h2 className="mt-4 text-[26px] sm:text-[34px] font-black text-white leading-[1.08] tracking-tight drop-shadow-lg">
          {spot.name}
        </h2>
        <p className="mt-2 text-[12.5px] text-white/75 leading-relaxed max-w-[62%] line-clamp-2">{spot.shortDesc}</p>

        <div className="mt-4 w-full sm:w-[74%] rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 p-4 space-y-3">
          <BarisInfo icon={MapPin} label="Lokasi" value={spot.address || spot.city} color={meta.color} />
          <BarisInfo
            icon={Clock}
            label="Waktu Tempuh"
            value={spot.duration ? `${spot.duration} dari terminal` : 'Perkiraan waktu belum tersedia'}
            color={meta.color}
          />
          <BarisInfo
            icon={Route}
            label="Jarak"
            value={spot.distanceKm != null ? `${spot.distanceKm} km dari Bandara APT Pranoto` : 'Jarak belum tersedia'}
            color={meta.color}
          />
        </div>

        {/* keterangan panjang + tombol — didorong ke dasar kartu */}
        <p className="mt-4 text-[12px] text-white/65 leading-relaxed line-clamp-2">{spot.description}</p>

        <div className="mt-auto pt-4 flex flex-wrap items-center justify-center gap-3">
          <motion.button
            onClick={onGaleri}
            disabled={spot.gallery.length === 0}
            whileHover={{ scale: spot.gallery.length ? 1.03 : 1 }}
            whileTap={{ scale: spot.gallery.length ? 0.97 : 1 }}
            className="relative overflow-hidden inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-[14px] font-black text-[#2a1a02] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: 'linear-gradient(100deg,#f7d488,#e0a53f 45%,#f7d488)' }}
          >
            {spot.gallery.length > 0 && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-1/3 bg-white/45 blur-md"
                animate={{ x: ['-140%', '340%'] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.4 }}
              />
            )}
            <Camera className="relative w-4 h-4" />
            <span className="relative">
              {spot.gallery.length > 0 ? 'Lihat Galeri Foto' : 'Galeri Belum Tersedia'}
            </span>
          </motion.button>

          <a
            href={spot.directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-6 py-3.5 text-[13px] font-bold text-white hover:bg-white/15 transition-colors"
          >
            <Navigation className="w-4 h-4" /> Rute ke Sini
          </a>
        </div>
      </div>
    </motion.article>
  );
}

/* ================================================================
   Halaman
   ================================================================ */

const CATATAN = [
  { icon: Camera, title: 'Abadikan Momen', desc: 'Tempat terbaik untuk mengabadikan momen berharga Anda di Samarinda.' },
  { icon: MapIcon, title: 'Jelajahi Lebih Banyak', desc: 'Masih banyak destinasi menarik lainnya yang menanti untuk Anda jelajahi.' },
  { icon: Heart, title: 'Dukung Pariwisata Lokal', desc: 'Dengan berkunjung, Anda ikut mendukung pelestarian budaya dan alam Samarinda.' },
];

export default function TourismView() {
  const heroBg = useSetting('bg_tourism');
  const [spots, setSpots] = useState<Spot[]>(() => TOURISM_SPOTS.map(fromStatic));
  const [aktif, setAktif] = useState(0);
  const [cat, setCat] = useState<'all' | TourismCategory>('all');
  const [q, setQ] = useState('');
  const [galeri, setGaleri] = useState<Spot | null>(null);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

  /* Data API menggantikan cadangan statis begitu tersedia. */
  useEffect(() => {
    let batal = false;
    fetchApi<TourismItem[]>('/tourisms')
      .then((res) => {
        if (batal || !res.success || !Array.isArray(res.data) || res.data.length === 0) return;
        setSpots(res.data.map(fromApi));
        setAktif(0);
      })
      .catch(() => { /* cadangan statis sudah tampil */ });
    return () => { batal = true; };
  }, []);

  const daftar = useMemo(() => {
    const s = q.toLowerCase();
    return spots
      .filter((t) => (cat === 'all' || t.category === cat)
        && (!q || [t.name, t.category, t.city, t.description, ...t.highlights].some((v) => String(v ?? '').toLowerCase().includes(s))))
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [spots, cat, q]);

  const panggung = daftar.length ? daftar : spots;
  const idx = Math.min(aktif, Math.max(panggung.length - 1, 0));
  const kini = panggung[idx];

  /* Penyaringan mengubah isi panggung, jadi sorotan dikembalikan ke kartu pertama. */
  const pilihKategori = (v: 'all' | TourismCategory) => { setCat(v); setAktif(0); };
  const ubahCari = (v: string) => { setQ(v); setAktif(0); };

  const geser = useCallback((arah: number) => {
    setAktif((i) => (panggung.length ? (i + arah + panggung.length) % panggung.length : 0));
  }, [panggung.length]);

  /* Panah kiri/kanan menavigasi panggung. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.key === 'ArrowRight') geser(1);
      if (e.key === 'ArrowLeft') geser(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [geser]);

  if (!kini) return null;
  const metaKini = TOURISM_CAT_META[kini.category];

  return (
    <div className="relative bg-[#050b1c] overflow-hidden">
      {/* ============ LATAR SINEMATIK ============ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AnimatePresence mode="sync">
          <motion.div
            key={kini.slug}
            initial={{ opacity: 0, scale: 1.14 }}
            animate={{ opacity: 0.4, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-cover bg-center blur-[2px]"
            style={{ backgroundImage: `url(${kini.cover || heroBg})` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,11,28,0.35),rgba(5,11,28,0.94)_70%,#050b1c)]" />
        <motion.div
          className="absolute inset-0 opacity-40"
          animate={{
            background: [
              `radial-gradient(600px circle at 20% 30%, ${metaKini.color}33, transparent 60%)`,
              `radial-gradient(600px circle at 80% 60%, ${metaKini.color}33, transparent 60%)`,
              `radial-gradient(600px circle at 20% 30%, ${metaKini.color}33, transparent 60%)`,
            ],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <DaunMelayang />
      </div>

      {/* ============ PANGGUNG ============ */}
      <section className="relative z-10 min-h-screen flex flex-col items-center pt-14 pb-10 px-4">
        {/* judul */}
        <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center">
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex w-11 h-11 rounded-full items-center justify-center border border-amber-300/40 bg-amber-200/10"
          >
            <Plane className="w-5 h-5 text-amber-300 -rotate-45" />
          </motion.span>

          <p className="mt-3 text-[11px] sm:text-[13px] font-bold text-white/85 uppercase tracking-[0.55em] pl-[0.55em]">
            Destinasi Wisata
          </p>

          <h1
            className="mt-1 text-[52px] sm:text-[86px] lg:text-[110px] font-black leading-[0.9] tracking-[0.02em] bg-clip-text text-transparent bg-cover bg-center drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.72)), url(${kini.cover || heroBg})` }}
          >
            SAMARINDA
          </h1>

          <p className="mt-2 text-[12.5px] sm:text-[14px] text-white/60">
            Jelajahi keindahan, budaya, dan spiritualitas Kota Samarinda
          </p>
        </motion.div>

        {/* coverflow */}
        <div className="relative w-full max-w-[1500px] mt-8 sm:mt-10 flex-1 flex items-center justify-center" style={{ perspective: 1800 }}>
          <button
            onClick={() => geser(-1)}
            aria-label="Destinasi sebelumnya"
            className="absolute left-1 sm:left-6 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full border backdrop-blur flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            style={{ borderColor: `${metaKini.color}88`, backgroundColor: `${metaKini.color}33`, boxShadow: `0 0 30px ${metaKini.color}55` }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => geser(1)}
            aria-label="Destinasi berikutnya"
            className="absolute right-1 sm:right-6 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full border backdrop-blur flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            style={{ borderColor: `${metaKini.color}88`, backgroundColor: `${metaKini.color}33`, boxShadow: `0 0 30px ${metaKini.color}55` }}
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) geser(1);
              else if (info.offset.x > 70) geser(-1);
            }}
            className="relative w-full h-[560px] flex items-center justify-center touch-pan-y"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {panggung.map((spot, i) => {
              /* Selisih melingkar supaya kartu terakhir bertetangga dengan kartu pertama. */
              const n = panggung.length;
              let d = i - idx;
              if (d > n / 2) d -= n;
              if (d < -n / 2) d += n;
              if (Math.abs(d) > 2) return null;

              const tengah = d === 0;
              const jauh = Math.abs(d);
              /* Jarak dalam piksel, bukan persen: lebar kartu tengah dan kartu
                 samping berbeda, sehingga offset persen membuat keduanya bertumpuk. */
              const x = Math.sign(d) * (455 + (jauh - 1) * 250);
              const latar = spot.cover || heroBg;

              return (
                <motion.div
                  key={spot.slug}
                  /* Di bawah lg layar tidak cukup lebar untuk kartu samping — hanya kartu tengah yang tampil. */
                  className={`absolute ${tengah ? '' : 'hidden lg:block'}`}
                  initial={false}
                  animate={{
                    x: tengah ? 0 : x,
                    scale: tengah ? 1 : 0.8 - (jauh - 1) * 0.1,
                    rotateY: tengah ? 0 : d > 0 ? -24 : 24,
                    opacity: jauh > 1 ? 0.28 : tengah ? 1 : 0.75,
                    filter: tengah ? 'blur(0px)' : 'blur(1.5px)',
                    zIndex: 20 - jauh,
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                  style={{ transformStyle: 'preserve-3d', pointerEvents: jauh > 1 ? 'none' : 'auto' }}
                >
                  {tengah ? (
                    <KartuUtama spot={spot} latar={latar} onGaleri={() => setGaleri(spot)} />
                  ) : (
                    <KartuSisi spot={spot} latar={latar} onClick={() => setAktif(i)} />
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* titik navigasi */}
        <div className="relative z-20 mt-2 flex items-center gap-2.5 flex-wrap justify-center">
          {panggung.map((s, i) => (
            <button
              key={s.slug}
              onClick={() => setAktif(i)}
              aria-label={`Ke ${s.name}`}
              className="h-2.5 rounded-full transition-all cursor-pointer"
              style={{
                width: i === idx ? 26 : 10,
                backgroundColor: i === idx ? '#e0a53f' : 'rgba(255,255,255,0.28)',
                boxShadow: i === idx ? '0 0 14px #e0a53f' : 'none',
              }}
            />
          ))}
        </div>

        {/* tiga catatan bawah */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-20 mt-8 w-full max-w-[1100px] rounded-3xl border border-white/10 bg-black/45 backdrop-blur-xl px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {CATATAN.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center border border-amber-300/40 bg-amber-200/10">
                  <Icon className="w-5 h-5 text-amber-300" />
                </span>
                <div>
                  <p className="text-[13px] font-black text-white">{c.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-white/55 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ DIREKTORI LENGKAP ============ */}
      <section id="destinasi" className="relative z-10 bg-[#050b1c]/80 backdrop-blur-sm border-t border-white/10 py-16 scroll-mt-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
            <span className="inline-flex items-center gap-2 text-amber-300 text-[11px] font-bold uppercase tracking-[0.16em] bg-amber-300/10 border border-amber-300/25 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Direktori Destinasi
            </span>
            <h2 className="mt-4 text-3xl font-black text-white tracking-tight">Semua Destinasi Terdekat</h2>
            <p className="mt-2.5 text-white/55 text-[13.5px] leading-relaxed">
              Diurutkan dari yang paling dekat dengan terminal. Pilih salah satu untuk menampilkannya di panggung atas.
            </p>
          </motion.div>

          {/* penyaring */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {[{ value: 'all' as const, label: 'Semua', color: '#e0a53f', icon: Sparkles },
                ...TOURISM_CATEGORIES.map((c) => ({ value: c, label: c, color: TOURISM_CAT_META[c].color, icon: CAT_ICON[c] })),
              ].map((c) => {
                const Icon = c.icon;
                const on = cat === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => pilihKategori(c.value)}
                    className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${on ? 'text-white' : 'text-white/60 hover:text-white'}`}
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
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => ubahCari(e.target.value)}
                placeholder="Cari destinasi..."
                className="w-full bg-white/5 border border-white/12 rounded-xl pl-10 pr-3 py-2.5 text-[12.5px] text-white placeholder:text-white/35 focus:outline-none focus:border-amber-300/60 transition-colors"
              />
            </div>
          </div>

          {daftar.length === 0 ? (
            <p className="py-16 text-center text-white/50 text-[13.5px]">Tidak ada destinasi yang cocok dengan pencarian Anda.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {daftar.map((spot, i) => {
                const meta = TOURISM_CAT_META[spot.category];
                const Icon = CAT_ICON[spot.category];
                return (
                  <motion.button
                    key={spot.slug}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i % 8) * 0.05 }}
                    whileHover={{ y: -6 }}
                    onClick={() => {
                      setAktif(i);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group relative h-56 overflow-hidden rounded-2xl border border-white/10 text-left cursor-pointer"
                  >
                    <img src={spot.cover || heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-110" />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#050b1c] via-[#050b1c]/45 to-[#050b1c]/15" />
                    {!spot.cover && (
                      <Icon className="absolute inset-0 m-auto w-12 h-12 text-white/25" strokeWidth={1} />
                    )}
                    <span className="absolute top-3 left-3 text-white text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ backgroundColor: meta.color }}>
                      {spot.category}
                    </span>
                    {spot.distanceKm != null && (
                      <span className="absolute top-3 right-3 text-white/85 text-[10px] font-bold px-2 py-1 rounded-full bg-black/50 tabular-nums">
                        {spot.distanceKm} km
                      </span>
                    )}
                    <span className="absolute inset-x-4 bottom-4">
                      <span className="block text-[14.5px] font-black text-white leading-snug">{spot.name}</span>
                      <span className="mt-0.5 block text-[11px] text-white/55">{spot.city}</span>
                    </span>
                    <span className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: meta.color }} />
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/tenants" className="inline-flex items-center gap-2 rounded-full bg-white text-[#0b1e5b] font-bold text-[13.5px] px-5 py-3 hover:bg-amber-100 transition-colors">
              Transportasi Resmi Bandara <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/facilities" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 text-white font-bold text-[13.5px] px-5 py-3 hover:bg-white/15 transition-colors">
              Fasilitas Terminal
            </Link>
          </div>

          <p className="mt-8 text-center text-[11.5px] text-white/40 max-w-2xl mx-auto leading-relaxed">
            Jarak dan waktu tempuh adalah perkiraan perjalanan darat dalam kondisi lalu lintas normal.
            Pastikan Anda kembali ke terminal minimal 90 menit sebelum jadwal keberangkatan.
          </p>
        </div>
      </section>

      {/* ============ GALERI FOTO ============ */}
      <AnimatePresence>
        {galeri && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#050b1c]/95 backdrop-blur-xl overflow-y-auto"
            onClick={() => setGaleri(null)}
          >
            <div className="min-h-full flex flex-col items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
              <div className="w-full max-w-5xl flex items-center justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-amber-300 text-[11px] font-bold uppercase tracking-[0.16em]">
                    <Images className="w-3.5 h-3.5" /> Galeri Foto
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white">{galeri.name}</h3>
                </div>
                <button
                  onClick={() => setGaleri(null)}
                  aria-label="Tutup galeri"
                  className="w-11 h-11 rounded-full border border-white/20 bg-white/8 text-white flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 gap-3">
                {galeri.gallery.map((src, i) => (
                  <motion.button
                    key={src}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setLightbox({ src, title: galeri.name, desc: galeri.city })}
                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 cursor-pointer"
                  >
                    <img src={src} alt={`${galeri.name} — foto ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
