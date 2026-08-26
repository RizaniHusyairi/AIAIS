'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { NewsItem } from '@/types';
import GambarBerita from '@/components/GambarBerita';
import { CATEGORY_STYLES } from '@/lib/newsData';
import { useSetting } from '@/lib/settings';
import { StatusBar, listContainer, listItem } from '@/components/pwa/ui';
import {
  LayoutGrid, Megaphone, Plane, Users, CalendarDays, Search, Bell, Menu,
  Star, ArrowRight, ChevronRight, Mail, Send,
} from 'lucide-react';

const FILTERS = [
  { label: 'Semua Berita', value: 'Semua', icon: LayoutGrid },
  { label: 'Pengumuman', value: 'Pengumuman', icon: Megaphone },
  { label: 'Operasional', value: 'Operasional', icon: Plane },
  { label: 'Layanan', value: 'Layanan', icon: Users },
  { label: 'Kegiatan', value: 'Kegiatan', icon: CalendarDays },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

export default function BeritaScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Semua');
  const [slide, setSlide] = useState(0);
  const heroBg = useSetting('bg_app_news');

  useEffect(() => {
    fetchApi<NewsItem[]>('/news').then((res) => {
      if (res.success && Array.isArray(res.data)) setNews(res.data);
      setLoading(false);
    });
  }, []);

  const visible = filter === 'Semua' ? news : news.filter((n) => n.category === filter);
  const featuredPool = visible.filter((n) => n.is_featured);
  const slides = featuredPool.length ? featuredPool : visible.slice(0, 1);
  const featured = slides[slide % (slides.length || 1)];
  const rest = visible.filter((n) => n.id !== featured?.id);

  useEffect(() => setSlide(0), [filter]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className="min-h-full bg-slate-50">
      {/* ===== APP HEADER ===== */}
      <div className="bg-white">
        <StatusBar />
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/app" className="flex items-center gap-2">
            <img src="/icon-192.png" alt="APT Pranoto" className="w-8 h-8 rounded-lg" />
            <div className="leading-none">
              <p className="font-black text-slate-900 text-[13px] tracking-tight">APT PRANOTO</p>
              <p className="font-semibold text-slate-500 text-[11px] -mt-0.5">SAMARINDA</p>
              <p className="text-[7px] text-slate-400 tracking-[0.18em] mt-0.5">KALIMANTAN TIMUR</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <motion.button whileTap={{ scale: 0.88 }} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700" aria-label="Cari">
              <Search className="w-[22px] h-[22px]" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }} className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-700" aria-label="Notifikasi">
              <Bell className="w-[22px] h-[22px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700" aria-label="Menu">
              <Menu className="w-[22px] h-[22px]" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <div className="relative h-[230px] overflow-hidden bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#f1f5f9] rounded-t-3xl">
        <div className="absolute inset-y-0 right-0 w-[72%]">
          <img
            src={heroBg}
            alt="Terminal APT Pranoto"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#eff6ff] via-[#eff6ff]/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -40, y: 24 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-8 top-[14%]"
        >
          <motion.div animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <Plane className="w-14 h-14 text-white drop-shadow-lg -rotate-[18deg]" strokeWidth={1.2} fill="white" />
          </motion.div>
        </motion.div>

        <div className="relative px-5 pt-6">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Plane className="w-6 h-6 text-blue-600 -rotate-[30deg] mb-1.5" />
            <h1 className="text-[27px] font-black text-slate-900 tracking-tight leading-tight">
              Berita &amp; Pengumuman
            </h1>
            <p className="mt-1.5 text-slate-500 text-[12.5px] leading-relaxed max-w-[15rem]">
              Informasi terbaru seputar kegiatan, layanan dan perkembangan Bandara APT Pranoto Samarinda.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ===== SHEET ===== */}
      <div className="relative -mt-6 bg-slate-50 rounded-t-3xl pt-5 pb-6">
        {/* filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-4">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const on = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12.5px] font-semibold transition-colors ${
                  on ? 'text-white' : 'text-slate-600 bg-white border border-slate-200'
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="berita-filter-pill"
                    className="absolute inset-0 rounded-full bg-blue-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <Icon className="relative w-4 h-4" />
                <span className="relative whitespace-nowrap">{f.label}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <motion.div
              animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
            >
              <Plane className="w-7 h-7 text-white rotate-45" />
            </motion.div>
            <p className="text-slate-500 text-[13px]">Memuat berita...</p>
          </div>
        ) : !featured ? (
          <div className="py-20 text-center text-slate-500 text-[13px]">Belum ada berita pada kategori ini.</div>
        ) : (
          <div className="px-4 space-y-4">
            {/* ----- FEATURED ----- */}
            <div className="bg-white rounded-3xl shadow-sm shadow-slate-200/60 border border-slate-100 overflow-hidden">
                <motion.div
                  key={featured.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="relative"
                >
                  {/* image on the right, text overlays the left */}
                  <div className="absolute inset-y-0 right-0 w-[52%]">
                    <GambarBerita berita={featured} ukuranIkon="w-8 h-8" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent" />
                  </div>

                  <div className="relative p-4 pr-[46%] min-h-[260px] flex flex-col justify-center">
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full w-fit">
                      <Star className="w-3 h-3 fill-blue-600 text-blue-600" /> Berita Utama
                    </span>
                    <p className="mt-2.5 text-[11.5px] text-slate-500">{fmtDate(featured.published_at)}</p>
                    <Link href={`/app/berita/${featured.slug}`}>
                      <h2 className="mt-1 text-[19px] font-black text-slate-900 leading-snug">{featured.title}</h2>
                    </Link>
                    <p className="mt-2 text-slate-500 text-[11.5px] leading-relaxed line-clamp-3">{featured.excerpt}</p>

                    <Link href={`/app/berita/${featured.slug}`} className="mt-4 inline-flex items-center gap-2.5 w-fit">
                      <span className="text-blue-600 text-[12.5px] font-bold">Baca Selengkapnya</span>
                      <motion.span
                        whileTap={{ scale: 0.88 }}
                        className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30"
                      >
                        <ArrowRight className="w-4 h-4 text-white" />
                      </motion.span>
                    </Link>
                  </div>
                </motion.div>

              {slides.length > 1 && (
                <div className="flex items-center justify-end gap-1.5 px-4 pb-3.5 -mt-1">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${i === slide % slides.length ? 'w-7 bg-blue-600' : 'w-5 bg-slate-200'}`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ----- LIST ----- */}
            <motion.div key={filter} variants={listContainer} initial="hidden" animate="show" className="space-y-3">
              {rest.map((n) => {
                const cat = CATEGORY_STYLES[n.category] || { text: '#1d4ed8', bg: '#dbeafe' };
                return (
                  <motion.div key={n.id} variants={listItem}>
                    <Link
                      href={`/app/berita/${n.slug}`}
                      className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm shadow-slate-200/60 border border-slate-100 active:scale-[0.98] transition-transform"
                    >
                      <GambarBerita berita={n} ukuranIkon="w-5 h-5" className="w-[92px] h-[92px] rounded-xl object-cover flex-shrink-0" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                            style={{ color: cat.text, backgroundColor: cat.bg }}
                          >
                            {n.category}
                          </span>
                          <span className="text-[10.5px] text-slate-400">{fmtDate(n.published_at)}</span>
                        </div>
                        <h3 className="mt-1 font-bold text-slate-900 text-[13.5px] leading-snug line-clamp-2">{n.title}</h3>
                        <p className="mt-1 text-slate-500 text-[11px] leading-relaxed line-clamp-2">{n.excerpt}</p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* ----- NEWSLETTER ----- */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1e5b] to-[#1e40af] p-4 text-white flex items-center gap-3.5"
            >
              <Plane className="absolute right-24 top-4 w-16 h-16 text-white/10 -rotate-[20deg]" />

              <span className="w-14 h-14 rounded-full bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur">
                <Mail className="w-6 h-6 text-white" />
              </span>

              <div className="flex-1 min-w-0 relative">
                <h3 className="font-bold text-[14.5px]">Dapatkan Informasi Terbaru</h3>
                <p className="text-blue-100 text-[11px] leading-relaxed mt-0.5">
                  Berlangganan newsletter kami untuk mendapatkan berita dan pengumuman terbaru langsung di email Anda.
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.94 }}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-900/30 transition-colors"
              >
                Berlangganan <Send className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
