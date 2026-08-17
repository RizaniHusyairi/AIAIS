'use client';

/**
 * Layar sambutan perayaan.
 *
 * Muncul sekali per kunjungan ketika hari ini bertepatan dengan perayaan yang
 * didaftarkan petugas, lalu menutup sendiri dan menyerahkan beranda apa adanya.
 *
 * ────────────────────────────────────────────────────────────────────────
 * EMPAT ATURAN YANG MENJAGA INI TIDAK BERUBAH JADI GANGGUAN
 *
 *  1. SELALU DAPAT DILEWATI, DAN TOMBOLNYA MUNCUL SEJAK DETIK PERTAMA.
 *     Pengunjung yang datang untuk memeriksa jadwal penerbangan yang sedang
 *     ditunggu tidak boleh disandera animasi.
 *
 *  2. MENUTUP SENDIRI. Tidak ada layar sambutan yang boleh menunggu izin
 *     untuk pergi.
 *
 *  3. `prefers-reduced-motion` DIHORMATI. Yang tampil menjadi satu komposisi
 *     diam beserta ucapannya — bukan layar kosong, dan bukan pula gerak yang
 *     dipaksakan kepada orang yang memintanya berhenti.
 *
 *  4. SEKALI PER KUNJUNGAN, per perayaan. Penandanya `sessionStorage`:
 *     pengunjung yang kembali esok hari pantas melihatnya lagi, tetapi
 *     berpindah halaman lalu kembali ke beranda tidak.
 * ────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { TEMA_EVENT, type SiteEvent } from '@/lib/siteEvents';
import Kemerdekaan from './tema/Kemerdekaan';
import { Nataru, TahunBaru, Lebaran, TahunBaruIslam, Nyepi, Imlek } from './tema/Lainnya';

/** Berapa lama layar bertahan sebelum menutup sendiri. */
const DURASI_TAYANG = 7200;

export function AdeganTema({ tema, diam }: { tema: SiteEvent['theme']; diam: boolean }) {
  switch (tema) {
    case 'kemerdekaan': return <Kemerdekaan diam={diam} />;
    case 'nataru': return <Nataru diam={diam} />;
    case 'tahun-baru': return <TahunBaru diam={diam} />;
    case 'lebaran': return <Lebaran diam={diam} />;
    case 'tahun-baru-islam': return <TahunBaruIslam diam={diam} />;
    case 'nyepi': return <Nyepi diam={diam} />;
    case 'imlek': return <Imlek diam={diam} />;
    default: return null;
  }
}

export default function SambutanEvent({
  event, onSelesai,
}: {
  event: SiteEvent;
  onSelesai: () => void;
}) {
  const kurangiGerak = !!useReducedMotion();
  const [tampil, setTampil] = useState(true);
  const meta = TEMA_EVENT[event.theme];

  const tutup = () => setTampil(false);

  useEffect(() => {
    // Layar diam tidak perlu ditonton lama — isinya sudah utuh sejak awal.
    const t = setTimeout(tutup, kurangiGerak ? 3800 : DURASI_TAYANG);

    return () => clearTimeout(t);
  }, [kurangiGerak]);

  /* Esc menutup. Layar yang menutupi seluruh halaman wajib punya jalan keluar
     lewat papan ketik, bukan hanya lewat tombol yang harus ditemukan dulu. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') tutup(); };
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Halaman di belakang tidak boleh ikut menggulir selama layar terbuka. */
  useEffect(() => {
    const semula = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => { document.body.style.overflow = semula; };
  }, []);

  if (!meta) return null;

  return (
    <AnimatePresence onExitComplete={onSelesai}>
      {tampil && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={event.name}
          className="fixed inset-0 z-[100] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: 'easeInOut' } }}
        >
          <AdeganTema tema={event.theme} diam={kurangiGerak} />

          {/* Peredup di bawah tulisan supaya ucapannya tetap terbaca di atas
              latar seramai apa pun. */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/25 to-transparent pointer-events-none" />

          {/* ---------- ucapan ---------- */}
          <div className="absolute inset-x-0 bottom-0 px-6 pb-16 sm:pb-20 flex flex-col items-center text-center pointer-events-none">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: kurangiGerak ? 0 : 2.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.28em]"
              style={{ color: meta.aksen }}
            >
              {event.name}
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: kurangiGerak ? 0.1 : 2.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 font-[family-name:var(--font-display)] text-[30px] sm:text-[44px] lg:text-[54px] font-bold leading-[1.08] max-w-4xl"
              style={{ color: meta.tulisan }}
            >
              {event.greeting || meta.sambutan}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: kurangiGerak ? 0.2 : 3.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3 text-[13px] sm:text-[15px] max-w-xl leading-relaxed"
              style={{ color: meta.tulisan, opacity: 0.82 }}
            >
              {event.subgreeting || meta.subsambutan}
            </motion.p>

            {/* Garis penutup, seirama dengan hiasan hero beranda. */}
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: kurangiGerak ? 0.3 : 3.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 block h-px w-40 origin-center"
              style={{ background: meta.aksen }}
              aria-hidden="true"
            />
          </div>

          {/* ---------- lewati ----------
              Tanpa penundaan sedikit pun: lihat aturan 1 di kepala berkas. */}
          <button
            type="button"
            onClick={tutup}
            className="absolute top-5 right-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 hover:bg-black/45 backdrop-blur px-4 py-2 text-[12px] font-semibold text-white ring-1 ring-white/25 transition-colors cursor-pointer"
          >
            Lewati <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
