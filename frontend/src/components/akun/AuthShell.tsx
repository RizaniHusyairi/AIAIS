'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plane, ArrowLeft } from 'lucide-react';

/**
 * Kerangka layar masuk dan daftar akun warga.
 *
 * Dipisahkan dari layar masuk panel pengelolaan dengan sengaja. Keduanya
 * memang mirip, tetapi menyatukannya berarti satu halaman harus tahu sedang
 * melayani warga atau petugas — dan percabangan itu selalu berakhir dengan
 * warga yang tersesat di layar bergaya panel admin, atau sebaliknya.
 */
export default function AuthShell({ title, lead, children, footer }: {
  title: string;
  lead: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#0b1e5b] flex items-center justify-center px-4 py-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-100/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke beranda
        </Link>

        <div className="mt-4 bg-white rounded-3xl ring-1 ring-slate-200 shadow-2xl px-7 py-8">
          <span className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Plane className="w-6 h-6 text-blue-600" />
          </span>

          <h1 className="mt-4 text-[22px] font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="mt-1.5 text-[12.5px] text-slate-500 leading-relaxed">{lead}</p>

          <div className="mt-6">{children}</div>

          <div className="mt-6 pt-5 border-t border-slate-100 text-[12.5px] text-slate-500 text-center">
            {footer}
          </div>
        </div>
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
