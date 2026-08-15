'use client';

/**
 * Minta tautan penggantian kata sandi.
 *
 * Pesan berhasilnya sengaja tidak menyatakan apakah alamatnya terdaftar —
 * sama seperti jawaban backend. Membedakannya akan mengubah halaman ini
 * menjadi alat memeriksa siapa saja pengelola bandara.
 *
 * Berada di bawah /admin tetapi TIDAK dijaga sesi; lihat daftar `isPublik`
 * pada admin/layout.tsx.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { lupaSandi } from '@/lib/adminApi';
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react';
import { LogoApt } from '@/components/admin/LogoApt';

export default function LupaSandiPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [terkirim, setTerkirim] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const res = await lupaSandi(email.trim());
    setBusy(false);

    if (res.ok) setTerkirim(true);
    else setError(res.message);
  };

  return (
    <div className="min-h-screen bg-[var(--adm-bg)] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-full max-w-md"
      >
        <div className="mb-7">
          <LogoApt className="h-11 w-auto" />
          <p className="mt-2.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--adm-muted)]">
            Panel Manajemen
          </p>
        </div>

        <div className="bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-2xl p-7">
          {terkirim ? (
            <div className="text-center">
              <span className="inline-flex w-12 h-12 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 items-center justify-center">
                <MailCheck className="w-6 h-6 text-emerald-300" />
              </span>
              <h1 className="mt-4 text-[17px] font-black text-[var(--adm-fg)]">Periksa Kotak Masuk Anda</h1>
              <p className="mt-2 text-[12.5px] text-[var(--adm-muted)] leading-relaxed">
                Bila alamat surel itu terdaftar, tautan penggantian kata sandi sudah dikirimkan.
                Tautannya berlaku 60 menit.
              </p>
            </div>
          ) : (
            <>
              <span className="inline-flex w-12 h-12 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/30 items-center justify-center">
                <KeyRound className="w-6 h-6 text-[var(--adm-accent)]" />
              </span>
              <h1 className="mt-4 text-[17px] font-black text-[var(--adm-fg)]">Lupa Kata Sandi</h1>
              <p className="mt-1.5 text-[12.5px] text-[var(--adm-muted)] leading-relaxed">
                Masukkan alamat surel akun Anda. Kami kirimkan tautan untuk membuat kata sandi baru.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">
                    Alamat Surel
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@aptpairport.id"
                    className="w-full bg-[var(--adm-hover)] border border-[var(--adm-line)] rounded-xl px-4 py-3 text-[13px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-[12px] text-rose-300 bg-rose-500/10 ring-1 ring-rose-400/25 rounded-lg px-3 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-[#04121f] font-bold text-[13px] px-4 py-3 rounded-xl transition-colors cursor-pointer"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {busy ? 'Mengirim...' : 'Kirim Tautan'}
                </button>
              </form>
            </>
          )}

          <Link
            href="/admin/login"
            className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-muted)] hover:text-[var(--adm-accent)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke halaman masuk
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
