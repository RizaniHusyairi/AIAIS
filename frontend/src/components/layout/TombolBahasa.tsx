'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { setBahasa, useBahasa } from '@/lib/bahasa';
import { useTeks } from '@/lib/kamus';

/**
 * Tombol pergantian bahasa portal publik.
 *
 * Menggantikan tombol `Globe` mati yang sejak awal menempati sudut kanan
 * navbar — susunannya memang sudah disiapkan untuk fitur ini.
 *
 * SAKELAR, BUKAN MENU. Bahasanya ada dua; dropdown untuk dua pilihan berarti
 * dua klik untuk pekerjaan satu klik. Bentuknya karena itu meniru
 * `TombolTema`, bukan menu navigasi — termasuk dua variannya (`bar` untuk
 * bilah navigasi, `laci` untuk laci ponsel).
 *
 * Yang TIDAK ikut ditiru dari `TombolTema` adalah sapuan lingkarannya. Sapuan
 * itu menerangkan perubahan warna yang menyapu seluruh layar; pergantian teks
 * tidak butuh pengantar dan justru terasa lamban bila diberi satu detik
 * animasi.
 */
export default function TombolBahasa({
  variant = 'bar',
  className = '',
}: {
  /** `bar` → tombol di bilah navigasi. `laci` → baris berlabel di laci ponsel. */
  variant?: 'bar' | 'laci';
  className?: string;
}) {
  const bahasa = useBahasa();
  const t = useTeks();

  const inggris = bahasa === 'en';
  const label = inggris ? t.bahasa.keId : t.bahasa.keEn;

  /* Nama bahasa tujuan ditandai `lang`-nya sendiri. Tanpa ini pembaca layar
     melafalkan "English" dengan fonem Indonesia pada halaman berbahasa
     Indonesia — persis kebingungan yang hendak dihindari tombol ini. */
  const lang = inggris ? 'id' : 'en';
  const namaTujuan = inggris ? t.bahasa.id : t.bahasa.en;

  const tukar = () => setBahasa(inggris ? 'id' : 'en');

  if (variant === 'laci') {
    return (
      <button
        onClick={tukar}
        className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer ${className}`}
        aria-label={label}
      >
        <span className="flex items-center gap-3">
          <Globe className="w-[18px] h-[18px]" />
          <span lang={lang}>{namaTujuan}</span>
        </span>
        {/* Kode bahasa yang SEDANG aktif. Ikon dan teks di kiri memberi tahu
            tujuannya, lencana ini memberi tahu keadaan sekarang. */}
        <span className="text-[12px] font-black tracking-wide text-slate-400 tabular-nums">
          {inggris ? t.bahasa.kodeEn : t.bahasa.kodeId}
        </span>
      </button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={tukar}
      className={`flex items-center gap-1.5 px-2.5 h-10 rounded-xl text-[12.5px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer ${className}`}
      title={label}
      aria-label={label}
    >
      <Globe className="w-4 h-4" />
      {inggris ? t.bahasa.kodeEn : t.bahasa.kodeId}
    </motion.button>
  );
}
