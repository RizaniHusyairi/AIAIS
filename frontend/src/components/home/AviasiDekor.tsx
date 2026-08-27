'use client';

/**
 * Dekorasi bernuansa penerbangan yang dipakai berulang di beranda.
 *
 * Ditaruh dalam satu berkas supaya bahasanya seragam: kalau kelak lampu
 * landasannya diubah, seluruh beranda ikut berubah — bukan tiga tempat yang
 * perlahan menyimpang satu sama lain.
 *
 * SELURUHNYA MENGHORMATI `prefers-reduced-motion`, TETAPI LEWAT `transition` —
 * bukan lewat `initial` maupun percabangan elemen. Server tidak tahu preferensi
 * pemakai; begitu keluaran server dan klien berbeda, hidrasinya gagal dan React
 * merender ulang seluruh pohon dari nol. Keadaan awal karenanya dibuat selalu
 * sama, dan yang berbeda hanya durasinya.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/* ================================================================
   Lampu landasan
   ================================================================ */

/** Banyaknya lampu bawaan; ganjil supaya ada satu yang benar-benar di tengah. */
const JUMLAH_LAMPU = 25;

/**
 * Deret lampu landasan yang menyala berurutan.
 *
 * Meniru lampu tepi landasan yang menyala berkejaran menuju ambang landas.
 * Ditaruh pada kaki hero sebagai garis pemisah ke bagian berikutnya —
 * menggantikan garis abu-abu biasa dengan sesuatu yang menjelaskan tempatnya.
 *
 * Bisa disetel jumlah dan warnanya karena tema malam memakainya ulang sebagai
 * lampu pendekatan selebar layar (`effects/LampuPendekatan.tsx`). Menyalin
 * komponennya ke sana hanya akan melahirkan dua deret lampu yang perlahan
 * menyimpang satu sama lain — persis yang dihindari berkas ini sejak awal.
 */
export function LampuLandasan({
  className = '',
  jumlah = JUMLAH_LAMPU,
  /** Kelas warna lampu, mis. `bg-cyan-400`. */
  warnaKelas = 'bg-cyan-400',
  /** Opasitas puncak saat menyala. */
  puncak = 1,
}: {
  className?: string;
  jumlah?: number;
  warnaKelas?: string;
  puncak?: number;
}) {
  const kurangiGerak = useReducedMotion();
  const tengah = (jumlah - 1) / 2;

  return (
    <div
      className={`pointer-events-none flex items-end justify-center gap-[6px] h-3 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: jumlah }, (_, i) => (
        <motion.span
          key={i}
          className={`w-1 rounded-full ${warnaKelas}`}
          style={{
            // Lampu tengah paling tinggi, meredup ke kedua tepi — memberi kesan
            // deretnya menjauh.
            height: 4 + Math.round(6 * (1 - (tengah ? Math.abs(i - tengah) / tengah : 0))),
          }}
          initial={{ opacity: 0.25 }}
          animate={kurangiGerak ? { opacity: 0.35 } : { opacity: [0.2, puncak, 0.2] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            // Jeda bertingkat itulah yang membuatnya terlihat berkejaran.
            delay: (i / jumlah) * 1.6,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================
   Judul bagian
   ================================================================ */

/**
 * Judul bagian dengan lintasan penerbangan yang menggambar sendiri.
 *
 * Garis putus-putus melengkung dari kiri ke kanan lalu berakhir pada ikon
 * pesawat kecil — bentuk yang sama dipakai peta rute portal. Menggantikan
 * judul telanjang tanpa mengubah teksnya sedikit pun.
 *
 * Elemen `<h2>` tetap dirender di sini supaya urutan judul halaman tidak
 * berubah bagi pembaca layar; lintasannya `aria-hidden`.
 */
export function JudulBagian({
  children,
  kicker,
  className = '',
}: {
  children: React.ReactNode;
  /** Label kecil di atas judul, mis. "Informasi". Opsional. */
  kicker?: string;
  className?: string;
}) {
  const kurangiGerak = useReducedMotion();

  return (
    <div className={className}>
      {kicker && (
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-blue-600">
          <span className="w-4 h-px bg-blue-400" aria-hidden="true" />
          {kicker}
        </span>
      )}

      <h2 className="mt-1.5 text-[19px] sm:text-[21px] font-black text-slate-900 tracking-tight">
        {children}
      </h2>

      {/* Lintasan: garis putus-putus yang tergambar sekali saat terlihat. */}
      <svg
        viewBox="0 0 220 14"
        className="mt-2 h-3.5 w-[220px] max-w-full overflow-visible"
        aria-hidden="true"
      >
        <motion.path
          d="M0 11 C 60 11, 110 3, 205 3"
          fill="none"
          stroke="url(#lintasan)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 5"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: kurangiGerak ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.g
          initial={{ opacity: 0, x: -14 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: kurangiGerak ? 0 : 0.6, delay: kurangiGerak ? 0 : 0.75 }}
        >
          {/* Pesawat kecil di ujung lintasan. */}
          <path
            d="M205 3 l-7 -3.2 v2.2 l-5 1 l5 1 v2.2 z"
            fill="#2563eb"
            transform="rotate(-8 205 3)"
          />
        </motion.g>
        <defs>
          <linearGradient id="lintasan" x1="0" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#93c5fd" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
