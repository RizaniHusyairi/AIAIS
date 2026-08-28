'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun, Plane } from 'lucide-react';
import { setSiteTheme, useSiteTheme } from '@/lib/siteTheme';
import type { SiteTheme } from '@/lib/siteThemeShared';
import { useTeks } from '@/lib/kamus';

/**
 * Tombol pergantian tema portal publik.
 *
 * Berdiri sebagai berkasnya sendiri, bukan JSX di dalam `Navbar.tsx` yang
 * sudah 790-an baris: sapuan peralihannya membawa state, portal, dan tiga
 * pewaktu sendiri, dan semuanya tidak ada urusan dengan menu navigasi.
 *
 * IKONNYA MENUNJUKKAN TEMA YANG AKAN DIPILIH, BUKAN YANG SEDANG AKTIF.
 * Konvensi ini sudah dipakai tombol tema panel admin (`AdminShell.tsx`);
 * membalikkannya di sini hanya membuat dua tombol yang berlawanan arti.
 */

/* Detik-detik sapuan. Temanya berganti saat lingkaran sudah menutupi layar,
   sehingga pergantian warnanya tidak pernah terlihat mentah. */
const DURASI_TUTUP = 560;   // lingkaran memuai sampai menutupi viewport
const SAAT_TUKAR = 360;     // tema ditukar di balik lingkaran
const DURASI_TOTAL = 1150;  // lingkaran selesai memudar dan dilepas

type Sapuan = {
  id: number;
  x: number;
  y: number;
  r: number;
  ke: SiteTheme;
};

/**
 * Jari-jari yang diperlukan agar lingkaran berpusat di (x, y) menutupi seluruh
 * viewport: jarak ke sudut terjauh. Dihitung, bukan ditebak dengan angka
 * besar — layar bandara jauh lebih lebar dari ponsel, dan sebaliknya.
 */
function jariJariPenuh(x: number, y: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
}

/* Lapisan sapuan. Dirender ke <body> lewat portal karena `position: fixed`
   akan terikat pada leluhur mana pun yang punya `transform` — dan laci ponsel
   navbar memang sebuah `motion.div` yang bertransformasi saat membuka. */
function LapisanSapuan({ sapuan }: { sapuan: Sapuan }) {
  const malam = sapuan.ke === 'night';

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Lingkaran yang memuai dari tombol. Memakai `scale`, bukan `clip-path`
          maupun animasi lebar: hanya transform yang dikerjakan compositor,
          dan inilah bedanya mulus atau tersendat di ponsel kelas bawah. */}
      <motion.span
        className="absolute rounded-full"
        style={{
          left: sapuan.x - sapuan.r,
          top: sapuan.y - sapuan.r,
          width: sapuan.r * 2,
          height: sapuan.r * 2,
          background: malam
            ? 'radial-gradient(circle at 50% 45%, #0f1f3d 0%, #071223 45%, #030712 100%)'
            : 'radial-gradient(circle at 50% 45%, #ffffff 0%, #eaf4ff 45%, #dbeafe 100%)',
        }}
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 1, 1], opacity: [1, 1, 0] }}
        transition={{
          duration: DURASI_TOTAL / 1000,
          times: [0, DURASI_TUTUP / DURASI_TOTAL, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
      />

      {/* Bintang-bintang yang berkelip sekejap di dalam sapuan malam. Hanya
          hiasan sesaat; langit malam yang sebenarnya digambar `LangitMalam`. */}
      {malam && (
        <motion.span
          className="absolute inset-0 tema-sapuan-bintang"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          transition={{ duration: DURASI_TOTAL / 1000, times: [0, 0.45, 1] }}
        />
      )}

      {/* Pesawat yang melintas membawa perubahan, lengkap dengan jejak
          kondensasinya. Ketinggiannya mengikuti tombol supaya ia terasa
          benar-benar berangkat dari sana. */}
      <motion.span
        className="absolute left-0 flex items-center"
        style={{ top: sapuan.y - 10 }}
        initial={{ x: '-15vw', opacity: 0 }}
        animate={{ x: '115vw', opacity: [0, 1, 1, 0] }}
        transition={{ duration: DURASI_TOTAL / 1000, ease: [0.32, 0, 0.2, 1], times: [0, 0.15, 0.7, 1] }}
      >
        <span
          className="block h-px w-[18vw] max-w-[240px]"
          style={{
            background: malam
              ? 'linear-gradient(90deg, rgba(34,211,238,0) 0%, rgba(34,211,238,.75) 100%)'
              : 'linear-gradient(90deg, rgba(37,99,235,0) 0%, rgba(37,99,235,.55) 100%)',
          }}
        />
        <Plane
          className={`w-5 h-5 -ml-1 rotate-45 ${malam ? 'text-cyan-300' : 'text-blue-600'}`}
          strokeWidth={2.2}
        />
      </motion.span>
    </div>,
    document.body,
  );
}

export default function TombolTema({
  variant = 'bar',
  className = '',
}: {
  /** `bar` → tombol ikon di bilah navigasi. `laci` → baris berlabel di laci ponsel. */
  variant?: 'bar' | 'laci';
  className?: string;
}) {
  const theme = useSiteTheme();
  const t = useTeks();
  const kurangiGerak = useReducedMotion();
  const tombolRef = useRef<HTMLButtonElement>(null);
  const [sapuan, setSapuan] = useState<Sapuan | null>(null);
  const pewaktu = useRef<number[]>([]);
  /* Kunci klik. Umurnya sengaja hanya sampai lingkaran selesai memuai, bukan
     sampai lapisannya dilepas: menahan tombol selama sapuan lengkap membuat
     tombol tampak macet lebih dari satu detik bagi orang yang cuma ingin
     mengintip lalu kembali. Ekor pudarnya biar berjalan sendiri. */
  const terkunci = useRef(false);

  // Pewaktunya berumur lebih panjang dari satu klik; kalau komponennya
  // dilepas di tengah sapuan (laci ponsel menutup, misalnya) sisanya harus
  // ikut mati, kalau tidak `setState` dipanggil pada komponen yang sudah tiada.
  useEffect(() => {
    const daftar = pewaktu.current;
    return () => daftar.forEach(window.clearTimeout);
  }, []);

  const malam = theme === 'night';
  const tujuan: SiteTheme = malam ? 'day' : 'night';
  const label = malam ? t.umum.keModeTerang : t.umum.keModeMalam;

  const tukar = useCallback(() => {
    // Sapuan sebelumnya belum selesai membuka — abaikan, jangan menumpuk.
    if (terkunci.current) return;

    // Pemakai yang meminta gerak seminimal mungkin mendapat pergantian
    // seketika. Tidak ada percabangan render di sini, hanya jalur klik, jadi
    // hidrasinya tetap aman.
    if (kurangiGerak) {
      setSiteTheme(tujuan);
      return;
    }

    const r = tombolRef.current?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r ? r.top + r.height / 2 : 0;

    // Ekor pudar sapuan sebelumnya mungkin masih menyimpan pewaktu yang akan
    // melepas lapisan. Dibiarkan hidup, ia justru melepas sapuan BARU ini di
    // tengah jalan. Kuncinya sudah menjamin yang tersisa hanyalah ekor itu.
    // Dikosongkan di tempat, bukan diganti larik baru: pembersih saat lepas
    // pasang memegang rujukan ke larik yang sama sejak awal.
    pewaktu.current.forEach(window.clearTimeout);
    pewaktu.current.length = 0;

    terkunci.current = true;
    setSapuan({ id: Date.now(), x, y, r: jariJariPenuh(x, y), ke: tujuan });

    pewaktu.current.push(
      window.setTimeout(() => setSiteTheme(tujuan), SAAT_TUKAR),
      window.setTimeout(() => { terkunci.current = false; }, DURASI_TUTUP),
      window.setTimeout(() => setSapuan(null), DURASI_TOTAL),
    );
  }, [kurangiGerak, tujuan]);

  const Ikon = malam ? Sun : Moon;

  const ikonBeranimasi = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={theme}
        initial={{ rotate: -70, scale: 0.5, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 70, scale: 0.5, opacity: 0 }}
        transition={{ duration: kurangiGerak ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center"
      >
        <Ikon className="w-[18px] h-[18px]" />
      </motion.span>
    </AnimatePresence>
  );

  return (
    <>
      {variant === 'laci' ? (
        <button
          ref={tombolRef}
          onClick={tukar}
          className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer ${className}`}
          aria-label={label}
          /* Sakelar yang tidak mengumumkan keadaannya hanya terdengar sebagai
             tombol biasa. Ditekan = tema malam sedang aktif. */
          aria-pressed={malam}
        >
          <span className="flex items-center gap-3">
            {ikonBeranimasi}
            {malam ? t.umum.modeTerang : t.umum.modeMalam}
          </span>
          {/* Sakelar kecil; posisinya sendiri yang memberi tahu keadaan
              sekarang, sementara ikon di kiri memberi tahu tujuannya. */}
          <span
            className={`relative w-10 h-[22px] rounded-full transition-colors ${
              malam ? 'bg-cyan-500/70' : 'bg-slate-200'
            }`}
            aria-hidden="true"
          >
            <motion.span
              className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow"
              animate={{ left: malam ? 22 : 3 }}
              transition={{ type: 'spring', stiffness: 480, damping: 34 }}
            />
          </span>
        </button>
      ) : (
        <motion.button
          ref={tombolRef}
          whileTap={{ scale: 0.9 }}
          onClick={tukar}
          className={`w-10 h-10 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer ${className}`}
          title={label}
          aria-label={label}
          aria-pressed={malam}
        >
          {ikonBeranimasi}
        </motion.button>
      )}

      <AnimatePresence>{sapuan && <LapisanSapuan key={sapuan.id} sapuan={sapuan} />}</AnimatePresence>
    </>
  );
}
