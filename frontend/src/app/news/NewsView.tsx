'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import { NewsItem } from '@/types';
import {
  LayoutGrid, Megaphone, Plane, Users, CalendarDays, Flame, List,
  ChevronRight, ArrowRight, ArrowLeft, Send, Calendar,
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

export default function NewsView() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Semua');
  const [slide, setSlide] = useState(0);
  const heroBg = useSetting('bg_news');

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
  const latest = visible.filter((n) => n.id !== featured?.id).slice(0, 4);
  const popular = [...news].sort((a, b) => b.views_count - a.views_count).slice(0, 3);

  useEffect(() => setSlide(0), [filter]);

  // auto-advance featured carousel
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className="bg-slate-50 min-h-screen pb-14">
      {/* ================= HERO ================= */}
      <section className="relative h-[300px] overflow-hidden bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#f8fafc]">
        {/* terminal photo on the right, faded into the gradient */}
        <div className="absolute inset-y-0 right-0 w-[62%] hidden md:block">
          <img
            src={heroBg}
            alt="Terminal APT Pranoto"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#eff6ff] via-[#eff6ff]/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
        </div>

        {/* dotted flight path + small plane */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1400 300" preserveAspectRatio="none">
          <motion.path
            d="M340 250 Q 520 150 760 190"
            fill="none"
            stroke="#93c5fd"
            strokeWidth="2"
            strokeDasharray="5 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        </svg>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute left-[36%] top-[62%] hidden lg:block"
        >
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.5 }}>
            <Plane className="w-6 h-6 text-blue-300 rotate-[18deg]" />
          </motion.div>
        </motion.div>

        {/* big plane taking off */}
        <motion.div
          initial={{ opacity: 0, x: -70, y: 40 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-[22%] top-[14%] hidden md:block"
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <Plane className="w-20 h-20 text-white drop-shadow-lg -rotate-[18deg]" strokeWidth={1.2} fill="white" />
          </motion.div>
        </motion.div>

        {/* heading */}
        <div className="relative max-w-[1400px] mx-auto px-6 pt-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Plane className="w-7 h-7 text-blue-600 -rotate-[30deg] mb-2" />
            <h1 className="text-4xl md:text-[44px] font-black text-slate-900 tracking-tight leading-tight">
              Berita &amp; Pengumuman
            </h1>
            <p className="mt-2 text-slate-500 text-[15px] leading-relaxed max-w-sm">
              Informasi terbaru seputar kegiatan, layanan, dan perkembangan Bandara APT Pranoto Samarinda.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================= FILTER BAR ================= */}
      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 24 }}
          className="-mt-8 inline-flex flex-wrap gap-1.5 bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-2"
        >
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const on = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                  on ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="news-filter-pill"
                    className="absolute inset-0 rounded-xl bg-blue-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <Icon className="relative w-4 h-4" />
                <span className="relative">{f.label}</span>
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="max-w-[1400px] mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ---------- LEFT ---------- */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-24 flex flex-col items-center gap-4">
              <motion.div
                animate={{ x: [-16, 16, -16], y: [4, -4, 4] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
              >
                <Plane className="w-7 h-7 text-white rotate-45" />
              </motion.div>
              <p className="text-slate-500 text-sm">Memuat berita...</p>
            </div>
          ) : !featured ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-24 text-center text-slate-500 text-sm">
              Belum ada berita pada kategori ini.
            </div>
          ) : (
            <>
              {/* ----- FEATURED ----- */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <motion.div
                    key={featured.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <Link href={`/news/${featured.slug}`} className="group block relative h-[250px] rounded-xl overflow-hidden">
                      <img src={featured.thumbnail} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </Link>

                    <div className="flex flex-col justify-center pr-2">
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-50 text-blue-700 text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                          Berita Utama
                        </span>
                        <span className="text-[12.5px] text-slate-500">{fmtDate(featured.published_at)}</span>
                      </div>

                      <Link href={`/news/${featured.slug}`}>
                        <h2 className="mt-3 text-[26px] font-black text-slate-900 leading-snug hover:text-blue-600 transition-colors">
                          {featured.title}
                        </h2>
                      </Link>

                      <p className="mt-3 text-slate-500 text-[13.5px] leading-relaxed line-clamp-3">{featured.excerpt}</p>

                      <Link href={`/news/${featured.slug}`} className="mt-5 inline-flex items-center gap-2 text-blue-600 text-[13.5px] font-bold group w-fit">
                        Baca Selengkapnya <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>

                {/* carousel controls */}
                {slides.length > 1 && (
                  <div className="flex items-center justify-end gap-4 pt-4 pr-2">
                    <div className="flex items-center gap-1.5 mr-auto md:mr-0 md:ml-auto">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSlide(i)}
                          className={`h-1.5 rounded-full transition-all ${i === slide % slides.length ? 'w-6 bg-blue-600' : 'w-4 bg-slate-200 hover:bg-slate-300'}`}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}
                        className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                        aria-label="Sebelumnya"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSlide((s) => (s + 1) % slides.length)}
                        className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                        aria-label="Selanjutnya"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              {/* ----- BERITA TERBARU ----- */}
              {latest.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="flex items-center gap-2 text-[17px] font-bold text-slate-900">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <List className="w-4 h-4 text-blue-600" />
                      </span>
                      Berita Terbaru
                    </h2>
                    <Link href="/news" className="text-[13px] font-semibold text-blue-600 flex items-center gap-1.5 hover:gap-2.5 transition-all">
                      Lihat Semua <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {latest.map((n, i) => (
                      <motion.article
                        key={n.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 26 }}
                        whileHover={{ y: -5 }}
                        className="rounded-xl border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                      >
                        <Link href={`/news/${n.slug}`} className="group flex flex-col h-full">
                          <div className="h-[110px] overflow-hidden">
                            <img src={n.thumbnail} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <div className="p-3.5 flex flex-col flex-1">
                            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <Calendar className="w-3.5 h-3.5" /> {fmtDate(n.published_at)}
                            </p>
                            <h3 className="mt-1.5 font-bold text-slate-900 text-[13.5px] leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {n.title}
                            </h3>
                            <p className="mt-1.5 text-slate-500 text-[11.5px] leading-relaxed line-clamp-3 flex-1">{n.excerpt}</p>
                            <span className="mt-3 inline-flex items-center gap-1.5 text-blue-600 text-[11.5px] font-bold">
                              Baca Selengkapnya <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </Link>
                      </motion.article>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ---------- RIGHT SIDEBAR ---------- */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Berita Populer */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-slate-900 mb-4">
              <span className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-500" />
              </span>
              Berita Populer
            </h2>

            <div className="space-y-3">
              {popular.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                >
                  <Link href={`/news/${n.slug}`} className="group flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-50 transition-colors">
                    <span className="text-[15px] font-black text-slate-300 w-6 flex-shrink-0 text-center">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <img src={n.thumbnail} alt={n.title} className="w-[74px] h-[52px] rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-[12.5px] leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {n.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(n.published_at)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-6 text-white"
          >
            {/* paper-plane trail */}
            <svg className="absolute top-6 right-4 w-32 h-24 pointer-events-none" viewBox="0 0 130 100" fill="none">
              <motion.path
                d="M5 85 Q 45 80 70 45"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
                strokeDasharray="4 5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4 }}
              />
              <motion.g
                initial={{ opacity: 0, x: -14, y: 14 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.3 }}
              >
                <path d="M78 18 L122 40 L96 46 L90 68 Z" fill="white" />
                <path d="M96 46 L122 40 L90 68 Z" fill="#bfdbfe" />
              </motion.g>
            </svg>

            <h3 className="relative text-[19px] font-bold">Dapatkan Informasi Terbaru</h3>
            <p className="relative mt-2 text-blue-100 text-[13px] leading-relaxed max-w-[15rem]">
              Berlangganan newsletter kami untuk mendapatkan berita dan pengumuman terbaru langsung di email Anda.
            </p>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="relative mt-5 flex bg-white rounded-xl p-1.5 shadow-lg"
            >
              <input
                type="email"
                required
                placeholder="Masukkan email Anda"
                className="flex-1 min-w-0 bg-transparent px-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors active:scale-95"
              >
                Berlangganan <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
