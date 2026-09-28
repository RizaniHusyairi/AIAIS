'use client';

/**
 * Konfirmasi sebelum meninggalkan formulir yang sudah berisi.
 * Pasangan `usePenjagaNavigasi` (lib/usePenjagaNavigasi.ts).
 *
 * Tombol bawaannya "Tetap di sini": salah ketuk semestinya tidak membuang
 * pekerjaan pengguna, jadi fokus awal dan tombol Esc sama-sama memilih tetap.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileWarning } from 'lucide-react';

export default function DialogTinggalkan({
  buka, onTetap, onTinggalkan,
  judul = 'Tinggalkan formulir?',
  pesan = 'Isian yang belum dikirim akan hilang dan harus diisi ulang dari awal.',
}: {
  buka: boolean;
  onTetap: () => void;
  onTinggalkan: () => void;
  judul?: string;
  pesan?: string;
}) {
  const tombolTetap = useRef<HTMLButtonElement>(null);
  // Induk mengirim fungsi baru di tiap render; lewat ref supaya efek fokus
  // di bawah tidak berjalan ulang (dan melompatkan fokus) setiap kali.
  const tetapRef = useRef(onTetap);
  useEffect(() => { tetapRef.current = onTetap; });

  useEffect(() => {
    if (!buka) return;
    const kembalikan = document.activeElement as HTMLElement | null;
    tombolTetap.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') tetapRef.current(); };
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
      kembalikan?.focus?.();
    };
  }, [buka]);

  return (
    <AnimatePresence>
      {buka && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onTetap}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-tinggalkan-judul"
            aria-describedby="dialog-tinggalkan-pesan"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/25"
          >
            <span className="w-12 h-12 rounded-2xl bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center">
              <FileWarning className="w-6 h-6 text-amber-600" />
            </span>
            <h2 id="dialog-tinggalkan-judul" className="mt-4 text-[17px] font-black text-slate-900">{judul}</h2>
            <p id="dialog-tinggalkan-pesan" className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">{pesan}</p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={onTinggalkan}
                className="w-full sm:flex-1 h-11 flex-shrink-0 rounded-full ring-1 ring-slate-200 bg-white hover:bg-rose-50 hover:ring-rose-200 text-[13px] font-bold text-rose-600 transition-colors cursor-pointer"
              >
                Tinggalkan
              </button>
              <button
                ref={tombolTetap}
                type="button"
                onClick={onTetap}
                className="w-full sm:flex-1 h-11 flex-shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-[13px] font-bold text-white shadow-lg shadow-blue-600/25 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
              >
                Tetap di sini
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
