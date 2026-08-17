'use client';

/**
 * Pertanyaan yang Sering Diajukan.
 *
 * Sebelumnya kartu FAQ di daftar layanan PWA menunjuk `/faq` — halaman
 * desktop. Layar ini menggantikannya, memakai `gabungFaq` dan `kategoriDari`
 * dari `lib/faqData.tsx` supaya ikon kategori dan teks pencariannya sama
 * dengan versi desktop.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import type { FaqItem } from '@/types';
import { gabungFaq, kategoriDari, SEMUA_KATEGORI, type FaqTampil } from '@/lib/faqData';
import SafeHtml from '@/components/SafeHtml';
import {
  StatusBar, AppHeader, Segmented, KotakCari, Memuat, LayarKosong,
  listContainer, listItem,
} from '@/components/pwa/ui';
import { CircleHelp, ChevronDown } from 'lucide-react';

export default function FaqScreen() {
  const [faqs, setFaqs] = useState<FaqTampil[] | null>(null);
  const [kategori, setKategori] = useState(SEMUA_KATEGORI);
  const [cari, setCari] = useState('');
  const [terbuka, setTerbuka] = useState<number | null>(null);

  useEffect(() => {
    fetchApi<FaqItem[]>('/faqs').then((res) => {
      setFaqs(res.success && Array.isArray(res.data) ? res.data.map(gabungFaq) : []);
    });
  }, []);

  /* `faqs ?? []` sengaja lewat useMemo: array literal baru tiap render akan
     membuat kedua useMemo di bawahnya menghitung ulang tanpa henti. */
  const semua = useMemo(() => faqs ?? [], [faqs]);
  const kategoriTersedia = useMemo(() => kategoriDari(semua), [semua]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return semua.filter((f) => {
      const cocokKategori = kategori === SEMUA_KATEGORI || f.category === kategori;
      // Pencarian menjangkau isi jawaban, bukan hanya judul pertanyaannya.
      return cocokKategori && (!q || f.cariTeks.includes(q));
    });
  }, [semua, kategori, cari]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="FAQ" />
        <div className="px-4 pb-3 space-y-3">
          <KotakCari value={cari} onChange={setCari} placeholder="Cari pertanyaan…" />
          {kategoriTersedia.length > 2 && (
            <Segmented
              options={kategoriTersedia.map((k) => ({ value: k, label: k }))}
              value={kategori}
              onChange={setKategori}
              layoutId="seg-faq"
            />
          )}
        </div>
      </div>

      {faqs === null ? (
        <Memuat label="Memuat pertanyaan…" />
      ) : tampil.length === 0 ? (
        <LayarKosong
          icon={CircleHelp}
          judul={semua.length === 0 ? 'Belum ada pertanyaan' : 'Tidak ada yang cocok'}
          pesan={
            semua.length === 0
              ? 'Daftar pertanyaan belum diisi petugas.'
              : 'Coba kata kunci lain, atau tanyakan langsung lewat Pusat Bantuan.'
          }
        />
      ) : (
        <motion.div
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-3xl p-4 space-y-2.5"
        >
          {tampil.map((f) => {
            const buka = terbuka === f.id;
            const Icon = f.icon;
            return (
              <motion.div
                key={f.id}
                variants={listItem}
                className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setTerbuka(buka ? null : f.id)}
                  aria-expanded={buka}
                  className="w-full flex items-start gap-3.5 p-4 text-left min-h-[44px]"
                >
                  <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-[18px] h-[18px] text-blue-600" strokeWidth={2.1} />
                  </span>
                  <span className="flex-1 min-w-0 text-[13.5px] font-bold text-slate-900 leading-snug">
                    {f.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-300 flex-shrink-0 transition-transform ${buka ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {buka && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {/* Jawaban berupa HTML dari editor panel admin — selalu
                          lewat `SafeHtml`, tidak pernah mentah. */}
                      <SafeHtml
                        html={f.answerHtml}
                        className="px-4 pb-4 text-[12.5px] text-slate-600 leading-relaxed [&_a]:text-blue-600 [&_a]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
