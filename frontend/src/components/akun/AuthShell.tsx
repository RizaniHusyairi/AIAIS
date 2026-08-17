'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plane, ArrowLeft } from 'lucide-react';

/** Posisi lampu landas di kaki layar — tetap, bukan acak.
 *  Nilai acak akan berbeda antara render server dan klien, dan React membuang
 *  seluruh hasil SSR begitu keduanya tidak cocok. */
const LAMPU = [6, 14, 22, 30, 38, 46, 54, 62, 70, 78, 86, 94];

/**
 * Kerangka layar masuk dan daftar akun warga.
 *
 * Dipisahkan dari layar masuk panel pengelolaan dengan sengaja. Keduanya
 * memang mirip, tetapi menyatukannya berarti satu halaman harus tahu sedang
 * melayani warga atau petugas — dan percabangan itu selalu berakhir dengan
 * warga yang tersesat di layar bergaya panel admin, atau sebaliknya.
 *
 * Dekor langit-landasannya bukan hiasan lepas: warga tiba di sini dari kartu
 * terang di Portal Aplikasi, dan layar yang polos memutus rasa bahwa keduanya
 * satu perjalanan.
 */
export default function AuthShell({ title, lead, children, footer }: {
  title: string;
  lead: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#0b1e5b] flex items-center justify-center px-4 py-14">
      {/* ---- suasana penerbangan (murni dekoratif) ---- */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* semburat langit */}
        <div className="absolute -top-32 -left-24 w-[26rem] h-[26rem] rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />

        {/* jaring halus, memberi kedalaman tanpa mencuri perhatian */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
          }}
        />

        {/* lintasan terbang yang menggores layar sekali saat halaman terbuka */}
        <motion.div
          initial={{ x: '-15%', y: '32%', opacity: 0 }}
          animate={{ x: '115%', y: '8%', opacity: [0, 0.55, 0] }}
          transition={{ duration: 9, ease: 'linear', repeat: Infinity, repeatDelay: 5 }}
          className="absolute top-0 left-0"
        >
          <span className="block h-px w-40 bg-gradient-to-r from-transparent to-white/70" />
        </motion.div>

        {/* garis cakrawala + lampu landas */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#061238] to-transparent" />
        <div className="absolute bottom-7 inset-x-0 flex justify-between px-[3%]">
          {LAMPU.map((kiri, i) => (
            <motion.span
              key={kiri}
              initial={{ opacity: 0.25 }}
              animate={{ opacity: [0.25, 0.9, 0.25] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
              className="w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_8px_2px_rgba(252,211,77,0.55)]"
            />
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-100/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke beranda
        </Link>

        <div className="mt-4 overflow-hidden bg-white rounded-3xl ring-1 ring-white/30 shadow-[0_30px_70px_-25px_rgba(2,8,40,0.85)]">
          {/* pita landas di kepala kartu — penanda yang sama dengan kartu warga
              di Portal Aplikasi */}
          <div className="h-1.5 bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-600" />

          <div className="px-7 py-8">
            <motion.span
              initial={{ opacity: 0, scale: 0.85, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.18, type: 'spring', stiffness: 260, damping: 18 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg shadow-blue-600/30 flex items-center justify-center"
            >
              <Plane className="w-6 h-6 text-white" />
            </motion.span>

            <h1 className="mt-4 text-[22px] font-black text-slate-900 tracking-tight">{title}</h1>
            <p className="mt-1.5 text-[12.5px] text-slate-500 leading-relaxed">{lead}</p>

            <div className="mt-6">{children}</div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-[12.5px] text-slate-500 text-center">
              {footer}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11.5px] text-blue-100/60">
          Petugas bandara masuk lewat{' '}
          <Link href="/aplikasi" className="font-bold text-blue-100/90 hover:text-white transition-colors">
            Portal Aplikasi
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

/** Isian formulir bergaya publik; galat per medan ditampilkan di bawahnya. */
export function Isian({ label, value, onChange, type = 'text', placeholder, error, autoComplete, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={`mt-1.5 w-full rounded-xl px-4 py-3 text-[13.5px] text-slate-900 bg-slate-50 ring-1 transition-colors outline-none ${
          error ? 'ring-rose-300 focus:ring-rose-400' : 'ring-slate-200 focus:ring-blue-400'
        }`}
      />
      {hint && !error && <span className="mt-1 block text-[11.5px] text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-[11.5px] font-semibold text-rose-600">{error}</span>}
    </label>
  );
}
