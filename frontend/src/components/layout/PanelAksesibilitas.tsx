'use client';

import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ALargeSmall, Contrast, Eye, Link2, MoveHorizontal, Pause, Play,
  RotateCcw, Square, Type, Volume2, X, Zap,
} from 'lucide-react';
import {
  resetAksesibilitas, setAksesibilitas, useAksesibilitas,
} from '@/lib/aksesibilitas';
import { semuanyaBawaan, UKURAN_TEKS, type Aksesibilitas } from '@/lib/aksesibilitasShared';
import { useBacaNyaring } from '@/lib/bacaNyaring';

/**
 * Panel penyetelan aksesibilitas.
 *
 * Dirender lewat portal ke <body>, bukan di tempatnya berdiri: `position:
 * fixed` akan terikat pada leluhur mana pun yang punya `transform` —
 * persoalan yang sama sudah dicatat pada lapisan sapuan `TombolTema`.
 *
 * Panel ini sendiri HARUS dapat dipakai dengan papan tik saja. Fitur
 * aksesibilitas yang hanya bisa dibuka dengan tetikus adalah lelucon yang
 * buruk. Karena itu ia menjebak fokus, menutup dengan Esc, dan mengembalikan
 * fokus ke peluncurnya saat ditutup.
 */

type Sakelar = {
  kunci: Exclude<keyof Aksesibilitas, 'teks'>;
  label: string;
  ket: string;
  Ikon: React.ComponentType<{ className?: string }>;
};

const SAKELAR: Sakelar[] = [
  {
    kunci: 'kontras',
    label: 'Kontras tinggi',
    ket: 'Teks hitam pekat di atas latar polos, garis tepi dipertegas.',
    Ikon: Contrast,
  },
  {
    kunci: 'gerak',
    label: 'Kurangi gerak',
    ket: 'Menghentikan animasi, partikel, dan hiasan bergerak.',
    Ikon: Zap,
  },
  {
    kunci: 'tautan',
    label: 'Garis bawah tautan',
    ket: 'Tautan dalam teks tidak lagi dibedakan warnanya saja.',
    Ikon: Link2,
  },
  {
    kunci: 'fokus',
    label: 'Penanda fokus tebal',
    ket: 'Memperjelas posisi kursor papan tik saat menekan Tab.',
    Ikon: Eye,
  },
  {
    kunci: 'spasi',
    label: 'Perenggangan teks',
    ket: 'Menambah jarak baris, huruf, dan kata pada paragraf.',
    Ikon: MoveHorizontal,
  },
  {
    kunci: 'font',
    label: 'Font ramah baca',
    ket: 'Atkinson Hyperlegible, dirancang agar huruf mirip tetap terbedakan.',
    Ikon: Type,
  },
];

/** Elemen yang dapat menerima fokus di dalam panel; dipakai penjebak fokus. */
const BISA_FOKUS =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function PanelAksesibilitas({
  tutup,
  kembalikanFokusKe,
}: {
  tutup: () => void;
  /** Tombol yang membuka panel; fokus dikembalikan ke sana saat panel ditutup. */
  kembalikanFokusKe: React.RefObject<HTMLButtonElement | null>;
}) {
  const a11y = useAksesibilitas();
  const kurangiGerak = useReducedMotion();
  const suara = useBacaNyaring();
  const panelRef = useRef<HTMLDivElement>(null);
  const judulId = useId();

  const bawaan = semuanyaBawaan(a11y);

  /* Fokus masuk ke panel saat dibuka, dan kembali ke peluncur saat ditutup.
     Tanpa yang kedua, pemakai papan tik yang menutup panel terlempar ke awal
     halaman dan harus menyusuri seluruh navbar lagi. */
  useEffect(() => {
    const peluncur = kembalikanFokusKe.current;
    panelRef.current?.querySelector<HTMLElement>(BISA_FOKUS)?.focus();
    return () => peluncur?.focus();
  }, [kembalikanFokusKe]);

  /* Esc menutup, Tab berputar di dalam panel. Penjebakan ditulis sendiri
     karena portal ini tidak memakai pustaka dialog apa pun, dan <dialog>
     bawaan peramban membawa lapisan ::backdrop yang tidak dapat ditembus
     animasi masuk-keluar di sini. */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        tutup();
        return;
      }
      if (e.key !== 'Tab') return;

      const isi = panelRef.current?.querySelectorAll<HTMLElement>(BISA_FOKUS);
      if (!isi || isi.length === 0) return;

      const awal = isi[0];
      const akhir = isi[isi.length - 1];

      if (e.shiftKey && document.activeElement === awal) {
        e.preventDefault();
        akhir.focus();
      } else if (!e.shiftKey && document.activeElement === akhir) {
        e.preventDefault();
        awal.focus();
      }
    },
    [tutup],
  );

  const isi = (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center sm:justify-end">
      {/* Lapisan gelap. `aria-hidden` dan tidak dapat difokuskan: penutup bagi
          pemakai papan tik adalah Esc dan tombol silang, bukan lapisan ini. */}
      <motion.div
        className="absolute inset-0 bg-slate-900/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: kurangiGerak ? 0 : 0.2 }}
        onClick={tutup}
        aria-hidden="true"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={judulId}
        onKeyDown={onKeyDown}
        initial={kurangiGerak ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={kurangiGerak ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: kurangiGerak ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full sm:w-[400px] sm:mr-5 max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3 rounded-t-3xl">
          <h2 id={judulId} className="text-[15px] font-extrabold text-slate-900">
            Aksesibilitas
          </h2>
          <button
            onClick={tutup}
            aria-label="Tutup panel aksesibilitas"
            className="w-9 h-9 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ---- Ukuran teks ---- */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <ALargeSmall className="w-4 h-4 text-blue-600" />
              <span className="text-[13.5px] font-bold text-slate-800">Ukuran teks</span>
            </div>
            {/* Kelompok radio, bukan empat tombol lepas: pembaca layar
                mengumumkan "2 dari 4", dan panah kiri/kanan berpindah pilihan
                seperti yang diharapkan dari sekelompok pilihan tunggal. */}
            <div role="radiogroup" aria-label="Ukuran teks" className="grid grid-cols-4 gap-1.5">
              {UKURAN_TEKS.map((u) => {
                const aktif = a11y.teks === u;
                return (
                  <button
                    key={u}
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setAksesibilitas({ teks: u })}
                    className={`py-2.5 rounded-xl text-[12.5px] font-bold border transition-colors cursor-pointer ${
                      aktif
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {u}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- Sakelar ---- */}
          <div className="space-y-1">
            {SAKELAR.map(({ kunci, label, ket, Ikon }) => {
              const aktif = a11y[kunci];
              return (
                <button
                  key={kunci}
                  onClick={() => setAksesibilitas({ [kunci]: !aktif })}
                  aria-pressed={aktif}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Ikon
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${aktif ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                  <span className="flex-grow min-w-0">
                    <span className="block text-[13.5px] font-bold text-slate-800">{label}</span>
                    <span className="block text-[11.5px] text-slate-500 leading-snug mt-0.5">{ket}</span>
                  </span>
                  {/* Sakelar visual saja; keadaan sebenarnya sudah diumumkan
                      `aria-pressed` pada tombol pembungkusnya. */}
                  <span
                    className={`relative w-10 h-[22px] rounded-full flex-shrink-0 mt-0.5 transition-colors ${
                      aktif ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                    aria-hidden="true"
                  >
                    <motion.span
                      className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: aktif ? 22 : 3 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {/* ---- Baca nyaring ----
              Hanya dirender bila perambannya benar-benar mendukung, bukan
              dirender lalu gagal saat diklik. */}
          {suara.didukung && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span className="text-[13.5px] font-bold text-slate-800">Baca nyaring</span>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-snug mb-2.5">
                Membacakan isi halaman ini memakai suara bawaan perangkat Anda.
                {suara.tanpaSuaraIndonesia
                  ? ' Perangkat ini tidak memiliki suara berbahasa Indonesia, sehingga pelafalannya akan terdengar asing.'
                  : ' Tidak ada teks yang dikirim keluar dari perangkat Anda.'}
              </p>

              <div className="flex gap-2">
                {!suara.sedangBaca ? (
                  <button
                    onClick={suara.mulai}
                    className="flex-grow flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-bold transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Mulai membaca
                  </button>
                ) : (
                  <>
                    <button
                      onClick={suara.terjeda ? suara.lanjut : suara.jeda}
                      className="flex-grow flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-bold transition-colors cursor-pointer"
                    >
                      {suara.terjeda ? (
                        <>
                          <Play className="w-3.5 h-3.5" /> Lanjutkan
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Jeda
                        </>
                      )}
                    </button>
                    <button
                      onClick={suara.henti}
                      aria-label="Hentikan pembacaan"
                      className="w-11 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ---- Kembalikan bawaan ---- */}
          <button
            onClick={resetAksesibilitas}
            disabled={bawaan}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-[12.5px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Kembalikan ke bawaan
          </button>

          <p className="text-[11px] text-slate-400 leading-snug text-center">
            Penyetelan disimpan di peramban ini saja dan tidak dikirim ke mana pun.
          </p>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(isi, document.body);
}
