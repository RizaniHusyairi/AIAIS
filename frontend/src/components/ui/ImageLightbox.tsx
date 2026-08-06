'use client';

/**
 * Penampil gambar layar penuh.
 *
 * Dokumen PPID (bagan struktur, maklumat, alur SOP) berukuran 1280 px dan
 * berisi teks kecil — tidak terbaca di dalam kartu. v1 memakai glightbox untuk
 * ini; di sini ditulis sendiri agar tidak menambah dependensi hanya demi satu
 * pola, dan agar perilaku aksesibilitasnya sama dengan dialog pejabat pada
 * halaman /profile: peran dialog, Escape menutup, klik latar menutup, fokus
 * terkurung, dan fokus kembali ke pemicu saat ditutup.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ZoomIn } from 'lucide-react';

export type LightboxImage = {
  src: string;
  title: string;
  desc?: string;
  alt?: string;
};

export default function ImageLightbox({
  image,
  onClose,
}: {
  image: LightboxImage | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  /** Elemen yang membuka dialog, supaya fokus bisa dikembalikan. */
  const openerRef = useRef<HTMLElement | null>(null);

  const open = image !== null;

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;

    // Kunci gulir halaman di belakang. Lebar scrollbar dikompensasi supaya
    // tata letak tidak melompat mendatar saat batangnya disembunyikan.
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      // Jebakan fokus sederhana — isinya hanya beberapa tombol.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    // Fokus awal diletakkan di panel agar pembaca layar mengumumkan judulnya.
    requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      document.removeEventListener('keydown', onKey, true);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-[#04102e]/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lightbox-judul"
            tabIndex={-1}
            onClick={stop}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-5xl max-h-full flex flex-col outline-none"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0">
                <h2 id="lightbox-judul" className="text-white font-black text-[15px] sm:text-lg leading-tight">
                  {image.title}
                </h2>
                {image.desc && (
                  <p className="mt-1 text-blue-200/80 text-[12px] leading-relaxed">{image.desc}</p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-0 overflow-auto rounded-2xl bg-white ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element -- dokumen statis, ukuran asli dipertahankan agar teks kecilnya terbaca */}
              <img
                src={image.src}
                alt={image.alt || image.title}
                className="w-full h-auto"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-[11.5px]">
              <p className="text-blue-200/70">Tekan Esc atau klik di luar untuk menutup.</p>
              <a
                href={image.src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-cyan-200 hover:text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka ukuran penuh
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Tombol gambar yang membuka lightbox. Dipakai bersama oleh kedua halaman PPID. */
export function LightboxThumb({
  image,
  onOpen,
  className = '',
  ratio = 'aspect-[4/3]',
}: {
  image: LightboxImage;
  onOpen: (image: LightboxImage) => void;
  className?: string;
  ratio?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(image)}
      aria-haspopup="dialog"
      aria-label={`Perbesar: ${image.title}`}
      className={`group relative block w-full overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 cursor-zoom-in transition-shadow hover:shadow-lg hover:shadow-blue-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${ratio} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- dokumen statis di public/ */}
      <img
        src={image.src}
        alt={image.alt || image.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
      />

      <span className="absolute inset-0 bg-gradient-to-t from-[#0b1e5b]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1.5 bg-white/95 text-blue-700 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
        <ZoomIn className="w-3 h-3" />
        Perbesar
      </span>
    </button>
  );
}
