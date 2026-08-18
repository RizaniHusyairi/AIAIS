'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import SkyParticles from '@/components/effects/SkyParticles';
import {
  Search, HelpCircle, ChevronDown, ArrowRight, Sparkles, MessageCircle, Phone, X,
} from 'lucide-react';
// Isi FAQ datang dari API; `lib/faqData` tinggal menyediakan ikon per
// kategori dan penurunan teks pencarian. Jangan mengembalikan daftar
// pertanyaan ke berkas ini — dua salinan akan segera berbeda.
import { gabungFaq, kategoriDari, SEMUA_KATEGORI, type FaqTampil } from '@/lib/faqData';
import { fetchApi } from '@/lib/api';
import SafeHtml from '@/components/SafeHtml';
import type { FaqItem } from '@/types';

export default function FaqView({ awal }: { awal: FaqItem[] }) {
  /*
   * Bentuk siap tampil dirakit DI SINI, bukan di server. `gabungFaq`
   * melekatkan komponen ikon pada tiap butir, dan komponen tidak dapat
   * dikirim menyeberangi batas Server → Client Component — lihat catatan
   * panjang di `page.tsx`.
   */
  const awalTampil = useMemo(() => awal.map(gabungFaq), [awal]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(SEMUA_KATEGORI);
  const [openItems, setOpenItems] = useState<number[]>(awalTampil[0] ? [awalTampil[0].id] : []);
  // Data awal datang dari server supaya halaman sudah berisi pada render
  // pertama — halaman FAQ justru paling sering ditemukan lewat mesin pencari.
  const [items, setItems] = useState<FaqTampil[]>(awalTampil);
  const [loading, setLoading] = useState(awalTampil.length === 0);

  useEffect(() => {
    let batal = false;

    fetchApi<FaqItem[]>('/faqs').then((res) => {
      if (batal) return;

      const daftar = Array.isArray(res.data) ? res.data.map(gabungFaq) : [];
      setItems(daftar);
      // Pertanyaan pertama terbuka sejak awal supaya halaman tidak tampak
      // kosong; id-nya baru diketahui setelah datanya tiba.
      if (daftar[0]) setOpenItems([daftar[0].id]);
      setLoading(false);
    });

    return () => { batal = true; };
  }, []);

  const CATEGORIES = useMemo(() => kategoriDari(items), [items]);

  const filteredFAQs = useMemo(() => {
    const qLower = searchQuery.toLowerCase().trim();

    return items.filter((item) => {
      const matchCat = activeCategory === SEMUA_KATEGORI || item.category === activeCategory;
      if (!qLower) return matchCat;

      // Pencarian menjangkau isi jawaban, bukan hanya judul pertanyaannya.
      return matchCat && item.cariTeks.includes(qLower);
    });
  }, [items, searchQuery, activeCategory]);

  const toggleItem = (id: number) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setOpenItems(filteredFAQs.map((f) => f.id));
  };

  const collapseAll = () => {
    setOpenItems([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white pb-20">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 text-white pt-24 pb-20 px-4 sm:px-6">
        <SkyParticles />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.25),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Pusat Bantuan & Informasi FAQ</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-black tracking-tight leading-tight"
          >
            Pertanyaan yang Sering Diajukan
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto"
          >
            Temukan jawaban lengkap seputar rute penerbangan, jam operasional, tarif parkir, taksi, kargo, serta layanan di Bandara A.P.T. Pranoto Samarinda.
          </motion.p>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto pt-2"
          >
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci (misal: rute, parkir inap, taksi, disabilitas, perintis)..."
                className="w-full bg-white/10 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/80 text-white placeholder-slate-400 text-sm sm:text-base rounded-2xl pl-12 pr-10 py-4 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 p-1 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 space-y-6">

        {/* Category Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Actions bar (Count & Expand/Collapse) */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <span>Menampilkan <strong>{filteredFAQs.length}</strong> pertanyaan</span>
          <div className="flex items-center gap-3 font-semibold">
            <button onClick={expandAll} className="hover:text-blue-600 transition-colors">Buka Semua</button>
            <span>•</span>
            <button onClick={collapseAll} className="hover:text-blue-600 transition-colors">Tutup Semua</button>
          </div>
        </div>

        {/* FAQ Accordion List */}
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Memuat pertanyaan">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : filteredFAQs.length > 0 ? (
          <div className="space-y-4">
            {filteredFAQs.map((item, idx) => {
              const isOpen = openItems.includes(item.id);
              const ItemIcon = item.icon;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full text-left p-4 sm:p-5 flex items-start gap-3 sm:gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100 dark:border-blue-900/50">
                      <ItemIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                        {item.category}
                      </span>
                      <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-snug">
                        {item.question}
                      </h3>
                    </div>

                    <div className={`p-1.5 rounded-full text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600 bg-blue-50 dark:bg-blue-950' : ''}`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        {/* Jawaban berupa HTML dari panel admin; disaring
                            lebih dulu — lihat components/SafeHtml.tsx. */}
                        <SafeHtml
                          className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/60 ml-13 sm:ml-14 faq-answer"
                          html={item.answerHtml}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Tidak ada pertanyaan yang cocok</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Coba kata kunci lain atau pilih kategori &quot;Semua&quot; untuk menemukan informasi yang Anda cari.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('Semua'); }}
              className="mt-2 text-sm text-blue-600 font-semibold hover:underline"
            >
              Reset Pencarian
            </button>
          </div>
        )}

        {/* Support & Contact Card */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left z-10 max-w-lg">
            <h3 className="text-xl sm:text-2xl font-bold">Masih Punya Pertanyaan Lain?</h3>
            <p className="text-slate-300 text-sm">
              Tim Customer Service & Layanan Informasi Bandara A.P.T. Pranoto siap membantu memberikan informasi lebih lengkap.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 z-10 w-full md:w-auto">
            <Link
              href="/complaints"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-blue-600/30"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim Pengaduan / Saran</span>
            </Link>
            <Link
              href="/ppid"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-colors backdrop-blur-md border border-white/20"
            >
              <span>Layanan PPID</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
