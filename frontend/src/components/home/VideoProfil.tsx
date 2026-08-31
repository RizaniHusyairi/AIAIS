'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useTeks } from '@/lib/kamus';
import { idYouTube } from '@/lib/tentang';

/**
 * Sampul video profil pada kartu "Tentang" beranda.
 *
 * ────────────────────────────────────────────────────────────────────────
 * POLA FACADE — INI KEPUTUSAN PRIVASI, BUKAN PENGOPTIMALAN.
 *
 * Yang dirender mula-mula hanyalah gambar milik portal sendiri. `<iframe>`
 * YouTube baru dibuat SESUDAH pengunjung menekan tombol putar. Menyematkannya
 * di muka berarti setiap pemuatan beranda menyeret seluruh pengunjung portal
 * pemerintah ke server Google — beserta cookie dan sidik jarinya — untuk
 * video yang mungkin tidak pernah mereka putar.
 *
 * Keberatan yang sama sudah tertulis panjang di `PetaSematanGoogle.tsx` dan
 * menjadi alasan font dimuat lewat `next/font` alih-alih fonts.googleapis.com.
 * Kalau kelak ada yang memindahkan iframe ini ke luar percabangan `main`,
 * jaminan itu hilang tanpa gejala apa pun yang terlihat di layar.
 * ────────────────────────────────────────────────────────────────────────
 *
 * Sematannya memakai `youtube-nocookie.com`, yang menunda penyimpanan cookie
 * penelusuran sampai video benar-benar diputar.
 *
 * Komponen ini juga melayani Video Profil PPID pada halaman /ppid — lewat prop
 * ukuran dan tautan keterangan, BUKAN lewat salinan kedua. Menyalin iframe-nya
 * ke berkas lain adalah persis cara jaminan di atas hilang tanpa gejala apa pun
 * yang terlihat di layar.
 */
export default function VideoProfil({
  gambar,
  videoUrl,
  caption,
  tinggiKelas = 'h-[220px]',
  captionHref = '/profile',
}: {
  gambar: string;
  videoUrl: string;
  caption: string;
  /**
   * Kelas tinggi sampulnya. Halaman Profil PPID memakainya dalam rasio 16:9;
   * beranda tetap pada tinggi tetap 220px seperti sebelumnya.
   */
  tinggiKelas?: string;
  /** Tujuan tulisan keterangan di sudut sampul. */
  captionHref?: string;
}) {
  const t = useTeks();
  const kurangiGerak = useReducedMotion();
  const [main, setMain] = useState(false);

  const kode = idYouTube(videoUrl);

  return (
    <div className="relative rounded-2xl overflow-hidden group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gambar}
        alt=""
        aria-hidden="true"
        className={`w-full ${tinggiKelas} object-cover group-hover:scale-105 transition-transform duration-700`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1e5b]/70 via-transparent to-transparent" />

      {/* Tombol putar hanya ada bila videonya memang ada.

          Sebelum modul ini, tombol ini selalu tampil dan tidak punya `onClick`
          sama sekali — sebuah sasaran klik seukuran seluruh gambar yang tidak
          melakukan apa pun. Tombol mati lebih buruk daripada tidak ada tombol,
          terutama pada gambar yang tampak seperti pemutar video. */}
      {kode && (
        <button
          type="button"
          onClick={() => setMain(true)}
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          aria-label={t.beranda.putarVideo}
        >
          <motion.span
            animate={kurangiGerak ? undefined : { scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-900/40"
          >
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </motion.span>
        </button>
      )}

      {/* Tulisan di sudut ini sudah lama menjanjikan halaman profil tanpa
          pernah dapat diklik. Kini ia tautan sungguhan.

          `relative z-10` supaya ia tetap dapat dijangkau meskipun tombol putar
          di atas menutupi seluruh gambar. */}
      <Link
        href={captionHref}
        className="absolute bottom-4 right-4 z-10 text-white text-[12.5px] font-semibold drop-shadow hover:underline"
      >
        {caption}
      </Link>

      <AnimatePresence>
        {main && kode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: kurangiGerak ? 0 : 0.2 }}
            className="absolute inset-0 z-20 bg-black"
          >
            <iframe
              /* `autoplay=1` aman di sini: iframe ini baru ada karena
                 pengunjung menekan putar, jadi tidak ada video yang berbunyi
                 tanpa diminta. */
              src={`https://www.youtube-nocookie.com/embed/${kode}?autoplay=1&rel=0`}
              title={t.beranda.putarVideo}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />

            <button
              type="button"
              onClick={() => setMain(false)}
              aria-label={t.umum.tutup}
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
