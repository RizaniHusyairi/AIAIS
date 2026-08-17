'use client';

/**
 * SOP PPID — tiga prosedur layanan informasi publik.
 *
 * Bukan daftar dokumen, melainkan isi prosedur itu sendiri, jadi layar ini
 * tidak memakai `DaftarDokumen`. Isinya dibaca dari `lib/ppidData.ts`, sumber
 * yang sama dengan halaman desktop — kutipan verbatim beserta tenggatnya.
 *
 * Urutan langkah ditampilkan sebagai daftar bernomor, bukan kartu berdampingan
 * seperti versi desktop: prosedur adalah urutan, dan pada layar sempit satu
 * kolom bernomor jauh lebih jujur menyampaikannya.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SOP_PENGANTAR, SOP_PROSEDUR, PPID_DASAR_HUKUM } from '@/lib/ppidData';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import { ChevronDown, Scale, Clock3 } from 'lucide-react';

export default function SopPpidScreen() {
  const [terbuka, setTerbuka] = useState<string | null>(SOP_PROSEDUR[0]?.slug ?? null);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="SOP PPID" />
      </div>

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-3xl p-4 space-y-3"
      >
        <motion.p variants={listItem} className="text-[12.5px] text-slate-600 leading-relaxed">
          {SOP_PENGANTAR}
        </motion.p>

        {SOP_PROSEDUR.map((p) => {
          const buka = terbuka === p.slug;
          return (
            <motion.div
              key={p.slug}
              variants={listItem}
              className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setTerbuka(buka ? null : p.slug)}
                aria-expanded={buka}
                className="w-full flex items-start gap-3.5 p-4 text-left min-h-[44px]"
              >
                <span className="w-9 h-9 rounded-xl bg-blue-600 text-white text-[14px] font-black flex items-center justify-center flex-shrink-0">
                  {p.order}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-bold text-slate-900 leading-snug">
                    {p.title}
                  </span>
                  <span className="block text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                    {p.lead}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">
                    <Clock3 className="w-3 h-3" /> {p.headline} · {p.headlineLabel}
                  </span>
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
                    <ol className="px-4 pb-4 space-y-2.5">
                      {p.steps.map((s, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10.5px] font-bold flex items-center justify-center mt-px">
                            {i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12.5px] text-slate-600 leading-relaxed">
                              {s.text}
                            </span>
                            {s.deadline && (
                              <span className="mt-1 inline-block text-[10.5px] font-bold text-rose-700 bg-rose-50 rounded-full px-2 py-0.5">
                                {s.deadline}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        <motion.p
          variants={listItem}
          className="flex items-start gap-2 text-[11.5px] text-slate-500 leading-relaxed px-1"
        >
          <Scale className="w-4 h-4 flex-shrink-0 mt-px text-slate-400" />
          Dasar hukum: {PPID_DASAR_HUKUM}
        </motion.p>
      </motion.div>
    </div>
  );
}
