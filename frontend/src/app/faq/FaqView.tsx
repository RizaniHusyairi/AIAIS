'use client';

/**
 * Pertanyaan yang Sering Diajukan.
 *
 * Tampilannya mengikuti tema baku portal — `PpidHero`, lebar 1400px, kartu
 * putih ber-`ring`, gerak `rise`/`container` — sama seperti Pusat Bantuan,
 * Tautan Terkait, dan halaman-halaman PPID. Sebelumnya halaman ini berdiri
 * sendiri dengan hero gelap, lebar 4xl, dan sepasang kelas `dark:` yang tidak
 * pernah aktif (portal publik hanya bertema terang); akibatnya ia terlihat
 * seperti berasal dari situs lain begitu pengunjung berpindah dari Pusat
 * Bantuan — padahal keduanya menyajikan jawaban yang sama.
 *
 * Kategori ditempatkan pada rel kiri yang menempel saat digulir, bukan deretan
 * tab mendatar. Daftar pertanyaan bisa panjang, dan tab mendatar menghilang
 * dari layar begitu pengunjung menggulir — persis ketika ia butuh berpindah
 * kategori.
 */

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PpidHero from '@/components/ppid/PpidHero';
import {
  Search, HelpCircle, ChevronDown, ArrowRight, MessageCircle, X, ListFilter, Info,
} from 'lucide-react';
// Isi FAQ datang dari API; `lib/faqData` tinggal menyediakan ikon per
// kategori dan penurunan teks pencarian. Jangan mengembalikan daftar
// pertanyaan ke berkas ini — dua salinan akan segera berbeda.
import { gabungFaq, kategoriDari, SEMUA_KATEGORI, type FaqTampil } from '@/lib/faqData';
import { fetchApi } from '@/lib/api';
import SafeHtml from '@/components/SafeHtml';
import type { FaqItem } from '@/types';

/* Gerak baku portal — sama persis dengan halaman PPID dan Pusat Bantuan. */
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

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

  /** Jumlah per kategori, ditampilkan di rel penyaring. */
  const jumlahKategori = useMemo(() => {
    const out: Record<string, number> = { [SEMUA_KATEGORI]: items.length };
    for (const f of items) out[f.category] = (out[f.category] ?? 0) + 1;
    return out;
  }, [items]);

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

  const expandAll = () => setOpenItems(filteredFAQs.map((f) => f.id));
  const collapseAll = () => setOpenItems([]);

  return (
    <div className="bg-slate-50 min-h-screen">
      <PpidHero
        title="Pertanyaan yang"
        accent="Sering Diajukan"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead="Jawaban atas hal-hal yang paling sering ditanyakan pengunjung — rute penerbangan, jam operasional, tarif parkir, taksi, kargo, hingga cara menyampaikan pengaduan. Semuanya disusun dan diperbarui petugas layanan informasi."
        showBack={false}
      >
        <div className="mt-6 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm ring-1 ring-white/25 px-3.5 py-2 rounded-full">
          <HelpCircle className="w-3.5 h-3.5 text-sky-200" />
          <span className="text-[11.5px] font-bold text-white/95 tabular-nums">
            {items.length} pertanyaan · {Math.max(CATEGORIES.length - 1, 0)} kategori
          </span>
        </div>
      </PpidHero>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* ============ PENCARIAN ============ */}
        <motion.section variants={container} initial="hidden" animate="show">
          <motion.div variants={rise} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
              <Search className="w-3.5 h-3.5" /> Cari Jawaban
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Ketik kata kuncinya
            </h2>
            <p className="mt-2 text-slate-500 text-[13.5px] leading-relaxed">
              Pencarian menelusuri isi jawaban, bukan judul pertanyaannya saja — jadi
              kata yang hanya muncul di tengah penjelasan pun tetap ketemu.
            </p>
          </motion.div>

          <motion.div variants={rise} className="mt-6 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari pertanyaan"
                placeholder="Contoh: rute, parkir inap, taksi, disabilitas, perintis..."
                className="w-full bg-white rounded-2xl ring-1 ring-slate-200 shadow-lg shadow-slate-200/50 pl-12 pr-11 py-4 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.section>

        {/* ============ PENYARING + DAFTAR ============ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Rel kategori — menempel saat digulir pada layar lebar. */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-blue-600 mb-3 flex items-center gap-1.5">
                <ListFilter className="w-3.5 h-3.5" /> Kategori
              </p>

              <div className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      aria-pressed={isActive}
                      className={`flex items-center justify-between gap-3 whitespace-nowrap lg:whitespace-normal text-left px-4 py-2.5 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex-shrink-0 lg:flex-shrink ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200/70 hover:ring-blue-300 hover:text-blue-700'
                      }`}
                    >
                      <span className="leading-snug">{cat}</span>
                      <span
                        className={`text-[11px] font-black tabular-nums px-1.5 py-0.5 rounded-md ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {jumlahKategori[cat] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden lg:flex items-start gap-3 mt-6 bg-blue-50/60 ring-1 ring-blue-100 rounded-2xl px-4 py-3.5">
                <span className="w-8 h-8 rounded-xl bg-white ring-1 ring-blue-100 flex items-center justify-center flex-shrink-0">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                </span>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Belum menemukan jawabannya? Kirim pertanyaan lewat{' '}
                  <Link href="/complaints" className="font-bold text-blue-700 hover:underline">
                    Pusat Bantuan
                  </Link>{' '}
                  — dijawab petugas dan dapat dilacak dengan nomor tiket.
                </p>
              </div>
            </div>
          </aside>

          {/* Daftar pertanyaan */}
          <div className="lg:col-span-9 space-y-4">

            <div className="flex items-center justify-between gap-4 text-[12px] text-slate-500">
              <span>
                Menampilkan <strong className="text-slate-800 font-black tabular-nums">{filteredFAQs.length}</strong> pertanyaan
              </span>
              <div className="flex items-center gap-3 font-bold">
                <button type="button" onClick={expandAll} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Buka Semua
                </button>
                <span className="text-slate-300">·</span>
                <button type="button" onClick={collapseAll} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Tutup Semua
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4" aria-busy="true" aria-label="Memuat pertanyaan">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[86px] rounded-2xl bg-white ring-1 ring-slate-200/70 animate-pulse" />
                ))}
              </div>
            ) : filteredFAQs.length > 0 ? (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                {filteredFAQs.map((item, idx) => {
                  const isOpen = openItems.includes(item.id);
                  const ItemIcon = item.icon;

                  return (
                    <motion.div
                      key={item.id}
                      variants={rise}
                      className={`bg-white rounded-2xl overflow-hidden transition-all ${
                        isOpen
                          ? 'ring-1 ring-blue-200 shadow-lg shadow-blue-900/5'
                          : 'ring-1 ring-slate-200/70 hover:ring-blue-300 hover:shadow-lg hover:shadow-blue-900/5'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        aria-expanded={isOpen}
                        className="w-full text-left px-4 sm:px-5 py-4 sm:py-5 flex items-start gap-4 cursor-pointer"
                      >
                        <span className="w-11 h-11 rounded-xl bg-blue-50 ring-1 ring-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <ItemIcon className="w-5 h-5" />
                        </span>

                        <span className="flex-1 min-w-0">
                          {/* Nomor bergaya boarding pass, seperti kartu prosedur SOP. */}
                          <span className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded tabular-nums">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 truncate">
                              {item.category}
                            </span>
                          </span>
                          <span className="block text-[14.5px] sm:text-[15.5px] font-black text-slate-900 leading-snug">
                            {item.question}
                          </span>
                        </span>

                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            isOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            {/* Jawaban berupa HTML dari panel admin; disaring
                                lebih dulu — lihat components/SafeHtml.tsx. */}
                            <SafeHtml
                              className="mx-4 sm:mx-5 mb-5 pt-4 border-t border-dashed border-slate-200 sm:ml-[76px] faq-answer"
                              html={item.answerHtml}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 px-6 py-14 text-center space-y-3">
                <span className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-5 h-5" />
                </span>
                <h3 className="text-[15px] font-black text-slate-800">Tidak ada pertanyaan yang cocok</h3>
                <p className="text-slate-500 text-[13px] max-w-sm mx-auto leading-relaxed">
                  Coba kata kunci lain atau pilih kategori &ldquo;Semua&rdquo; untuk menelusuri
                  seluruh jawaban yang tersedia.
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setActiveCategory(SEMUA_KATEGORI); }}
                  className="mt-1 text-[12.5px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Bersihkan penyaring
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ============ MASIH ADA PERTANYAAN ============ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] text-white"
        >
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center gap-6 px-6 sm:px-8 py-7">
            <div className="w-14 h-14 rounded-2xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-sky-200" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] font-black uppercase tracking-[0.18em] text-sky-200 bg-white/10 px-2 py-0.5 rounded">
                Layanan Informasi
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-black leading-tight">
                Masih ada yang ingin ditanyakan?
              </h2>
              <p className="mt-1.5 text-[13px] text-blue-100/80 leading-relaxed max-w-2xl">
                Petugas layanan informasi bertugas 07.00–20.00 WITA. Pertanyaan dan pengaduan
                yang masuk diberi nomor tiket sehingga dapat dilacak sendiri.
              </p>
            </div>

            {/* takik perforasi, motif boarding pass */}
            <div className="hidden md:block self-stretch border-l-2 border-dashed border-white/25 relative">
              <span className="absolute -top-[30px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
              <span className="absolute -bottom-[30px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 flex-shrink-0">
              <Link
                href="/complaints"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0b1e5b] hover:bg-sky-100 font-bold text-[12.5px] px-5 py-3 rounded-full transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Pusat Bantuan
              </Link>
              <Link
                href="/ppid"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 ring-1 ring-white/25 text-white font-bold text-[12.5px] px-5 py-3 rounded-full transition-colors"
              >
                Layanan PPID
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
