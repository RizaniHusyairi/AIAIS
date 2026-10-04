'use client';

/**
 * Galeri foto berita — kisi untuk desktop, karusel untuk aplikasi mobile,
 * keduanya membuka lightbox yang sama.
 *
 * Satu komponen untuk dua layar supaya urutan, keterangan, dan perilaku
 * lightbox tidak pernah berbeda antara portal dan PWA; yang berbeda hanya
 * cara foto dijajarkan (`tata`).
 *
 * KENAPA LIGHTBOX LEWAT PORTAL. Lembar artikel di `TampilanBerita` dianimasikan
 * framer-motion dengan `transform`, dan elemen ber-`transform` menjadi blok
 * penampung bagi keturunan `position: fixed`. Tanpa portal, lightbox "layar
 * penuh" hanya memenuhi lembar artikel dan ikut tergulir bersamanya.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Images, Maximize2, X } from 'lucide-react';
import type { NewsImage } from '@/types';

type Tata = 'kisi' | 'karusel';

export default function GaleriBerita({ foto, tata = 'kisi' }: { foto: NewsImage[]; tata?: Tata }) {
  const tampil = foto.filter((f) => f.url);
  const [buka, setBuka] = useState<number | null>(null);

  if (tampil.length === 0) return null;

  return (
    <section aria-label="Galeri foto" className={tata === 'kisi' ? 'mt-12' : undefined}>
      <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 font-mono">
        <Images className="w-4 h-4 text-blue-600" />
        Galeri · {String(tampil.length).padStart(2, '0')} foto
      </h2>

      {tata === 'kisi' ? (
        <Kisi foto={tampil} onBuka={setBuka} />
      ) : (
        <Karusel foto={tampil} onBuka={setBuka} />
      )}

      <Lightbox foto={tampil} indeks={buka} setIndeks={setBuka} />
    </section>
  );
}

/* ------------------------------ kisi ------------------------------ */

/**
 * Foto pertama dibesarkan bila fotonya tiga atau lebih — satu titik pandang
 * utama lebih mudah dibaca daripada kisi seragam yang semuanya sama penting.
 */
function Kisi({ foto, onBuka }: { foto: NewsImage[]; onBuka: (i: number) => void }) {
  const sorot = foto.length >= 3;

  return (
    <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
      {foto.map((f, i) => (
        <li key={f.id} className={sorot && i === 0 ? 'col-span-2 row-span-2' : ''}>
          {/* `h-full` hanya di kisi: foto sorotan harus mengisi dua baris
              selnya. Di karusel ia mendorong keterangan keluar wadah. */}
          <TombolFoto foto={f} indeks={i} onBuka={onBuka} className="aspect-[4/3] h-full rounded-2xl" />
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------- karusel ---------------------------- */

function Karusel({ foto, onBuka }: { foto: NewsImage[]; onBuka: (i: number) => void }) {
  return (
    // Margin negatif + padding membuat karusel menyentuh tepi layar ponsel
    // sementara foto pertamanya tetap sejajar dengan teks artikel.
    <ul className="mt-3 -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2 [scrollbar-width:none]">
      {foto.map((f, i) => (
        <li key={f.id} className="snap-start shrink-0 w-[82%] md:w-[46%]">
          <TombolFoto foto={f} indeks={i} onBuka={onBuka} className="aspect-[4/3] rounded-2xl" />
          {f.caption && (
            <p className="mt-2 text-[12px] leading-snug text-slate-500 line-clamp-2">{f.caption}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function TombolFoto({
  foto, indeks, onBuka, className,
}: { foto: NewsImage; indeks: number; onBuka: (i: number) => void; className: string }) {
  return (
    <button
      type="button"
      onClick={() => onBuka(indeks)}
      aria-label={`Buka foto ${indeks + 1}${foto.caption ? `: ${foto.caption}` : ''}`}
      className={`group relative block w-full overflow-hidden bg-slate-100 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
    >
      <img
        src={foto.url as string}
        alt={foto.caption || ''}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Maximize2 className="absolute bottom-3 right-3 w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

/* ----------------------------- lightbox --------------------------- */

function Lightbox({
  foto, indeks, setIndeks,
}: { foto: NewsImage[]; indeks: number | null; setIndeks: (i: number | null) => void }) {
  const kurangiGerak = !!useReducedMotion();
  const tutupRef = useRef<HTMLButtonElement>(null);
  const [arah, setArah] = useState(0);
  const terbuka = indeks !== null;

  const ke = useCallback(
    (langkah: 1 | -1) => {
      if (indeks === null) return;
      setArah(langkah);
      setIndeks((indeks + langkah + foto.length) % foto.length);
    },
    [indeks, foto.length, setIndeks],
  );

  useEffect(() => {
    if (!terbuka) return;

    const semula = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    tutupRef.current?.focus();

    const tombol = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndeks(null);
      else if (e.key === 'ArrowRight') ke(1);
      else if (e.key === 'ArrowLeft') ke(-1);
    };
    window.addEventListener('keydown', tombol);

    return () => {
      document.body.style.overflow = semula;
      window.removeEventListener('keydown', tombol);
    };
  }, [terbuka, ke, setIndeks]);

  if (typeof document === 'undefined') return null;

  const f = indeks !== null ? foto[indeks] : null;
  const banyak = foto.length > 1;

  return createPortal(
    <AnimatePresence>
      {f && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Galeri foto layar penuh"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Di atas hamparan pratinjau panel admin (z-120).
          className="fixed inset-0 z-[140] bg-slate-950/95 flex flex-col"
          onClick={() => setIndeks(null)}
        >
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] font-mono text-cyan-300 tabular-nums">
              {String((indeks ?? 0) + 1).padStart(2, '0')} / {String(foto.length).padStart(2, '0')}
            </span>
            <button
              ref={tutupRef}
              type="button"
              onClick={() => setIndeks(null)}
              className="ml-auto w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tutup galeri"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16">
            <AnimatePresence initial={false} custom={arah} mode="popLayout">
              <motion.img
                key={f.id}
                src={f.url as string}
                alt={f.caption || `Foto ${(indeks ?? 0) + 1}`}
                custom={arah}
                initial={kurangiGerak ? { opacity: 0 } : { opacity: 0, x: arah * 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={kurangiGerak ? { opacity: 0 } : { opacity: 0, x: arah * -80 }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                // Geser jari di ponsel; ambangnya cukup besar supaya ketukan
                // yang sedikit meleset tidak dianggap pindah foto.
                drag={banyak ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70) ke(1);
                  else if (info.offset.x > 70) ke(-1);
                }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full object-contain rounded-lg select-none touch-pan-y"
                draggable={false}
              />
            </AnimatePresence>

            {banyak && (
              <>
                <TombolArah sisi="kiri" onClick={() => ke(-1)} />
                <TombolArah sisi="kanan" onClick={() => ke(1)} />
              </>
            )}
          </div>

          <div className="px-4 sm:px-6 pt-3 pb-5 min-h-[64px] text-center" onClick={(e) => e.stopPropagation()}>
            {f.caption && <p className="max-w-2xl mx-auto text-[13.5px] leading-relaxed text-white/85">{f.caption}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function TombolArah({ sisi, onClick }: { sisi: 'kiri' | 'kanan'; onClick: () => void }) {
  const Ikon = sisi === 'kiri' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={sisi === 'kiri' ? 'Foto sebelumnya' : 'Foto berikutnya'}
      className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 ${sisi === 'kiri' ? 'left-4' : 'right-4'} w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-colors cursor-pointer`}
    >
      <Ikon className="w-6 h-6" />
    </button>
  );
}
