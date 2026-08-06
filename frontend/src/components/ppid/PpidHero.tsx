'use client';

/**
 * Hero baku untuk seluruh halaman di bawah menu PPID.
 *
 * Sebelumnya markup ini disalin ke tiap halaman, dan salah satunya sempat
 * menyimpang (judul Standar Pelayanan memakai papan bolak-balik). Diekstrak
 * ke sini supaya keseragaman menjadi sifat struktural, bukan kebetulan yang
 * harus dijaga manual: mengubah hero berarti mengubah satu berkas.
 *
 * Nuansa penerbangan: gradien langit, partikel `SkyParticles`, busur rute
 * putus-putus yang menggambar dirinya sendiri, dan lengkungan pemisah ke
 * area terang di bawahnya.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import SkyParticles from '@/components/effects/SkyParticles';
import { ShieldCheck, ArrowRight } from 'lucide-react';

/** Busur rute putus-putus yang tergambar saat masuk layar. */
export function FlightArc({
  className = '',
  d = 'M-20 170 Q 380 50 1020 130',
  delay = 0,
}: { className?: string; d?: string; delay?: number }) {
  return (
    <svg
      className={`pointer-events-none ${className}`}
      viewBox="0 0 1000 220"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 9"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay, ease: 'easeInOut' }}
      />
    </svg>
  );
}

export default function PpidHero({
  /** Bagian judul yang berwarna putih. */
  title,
  /** Bagian judul yang berwarna biru langit. Boleh kosong. */
  accent,
  /** Baris tebal di bawah judul, biasanya nama organisasi. */
  subtitle,
  /** Paragraf penjelas. */
  lead,
  /** Lencana kecil di atas judul. Dipakai halaman utama PPID. */
  eyebrow,
  /** Tautan kembali ke halaman induk. Dipakai halaman anak. */
  backHref = '/ppid',
  backLabel = 'Profil PPID',
  showBack = true,
  /** Tombol atau elemen apa pun di bawah teks. */
  children,
}: {
  title: string;
  accent?: string;
  subtitle?: string;
  lead?: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-blue-700 to-sky-500">
      <SkyParticles tone="sky" />
      <div className="absolute -top-28 -right-20 w-[30rem] h-[30rem] rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 pt-12 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          {eyebrow && (
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/95 text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-full ring-1 ring-white/25">
              <ShieldCheck className="w-3.5 h-3.5" />
              {eyebrow}
            </span>
          )}

          {!eyebrow && showBack && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-blue-100 hover:text-white text-[12.5px] font-semibold transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {backLabel}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.03]">
            {title}
            {accent && <> <span className="text-sky-200">{accent}</span></>}
          </h1>

          {subtitle && (
            <p className="mt-3 text-[15px] sm:text-base text-blue-100/90 font-semibold">{subtitle}</p>
          )}

          {lead && (
            <p className="mt-4 text-[14px] text-blue-100/85 leading-relaxed max-w-2xl">{lead}</p>
          )}

          {children}
        </motion.div>

        <FlightArc className="absolute inset-x-0 bottom-6 h-40 text-white/20" delay={0.35} />
      </div>

      {/* lengkungan pemisah ke area terang */}
      <svg
        className="absolute bottom-0 left-0 w-full h-12 text-slate-50"
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 48h1440V16C1200 40 960 48 720 48S240 40 0 16Z" fill="currentColor" />
      </svg>
    </section>
  );
}
