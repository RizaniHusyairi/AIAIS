'use client';

/**
 * Simpan kata sandi baru dari tautan surel.
 *
 * Token dan surel dibawa lewat kueri; keduanya disusun
 * `AppServiceProvider::arahkanTautanResetKePortal()` di backend.
 *
 * Isi halaman dibungkus `<Suspense>` karena `useSearchParams()` menunda render
 * sampai kueri tersedia — tanpa pembungkus itu, build Next gagal.
 *
 * Berada di bawah /admin tetapi TIDAK dijaga sesi: pemakainya justru orang
 * yang sedang tidak dapat masuk. Lihat daftar `isPublik` pada admin/layout.tsx.
 */

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { resetSandi } from '@/lib/adminApi';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { LogoApt } from '@/components/admin/LogoApt';

function Kerangka({ children }: { children: React.ReactNode }) {
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

        <div className="bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-2xl p-7">{children}</div>
      </motion.div>
    </div>
  );
}

function FormulirReset() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [lihat, setLihat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Tautan yang tidak lengkap tidak akan pernah berhasil; katakan sejak awal
  // alih-alih membiarkan pengguna mengisi formulir lalu ditolak.
  if (!token || !email) {
    return (
      <>
        <span className="inline-flex w-12 h-12 rounded-xl bg-amber-500/15 ring-1 ring-amber-400/30 items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-amber-300" />
        </span>
        <h1 className="mt-4 text-[17px] font-black text-[var(--adm-fg)]">Tautan Tidak Lengkap</h1>
        <p className="mt-2 text-[12.5px] text-[var(--adm-muted)] leading-relaxed">
          Buka halaman ini lewat tautan pada surel yang kami kirimkan. Bila tautannya sudah
          kedaluwarsa, mintalah yang baru.
        </p>
        <Link
          href="/admin/lupa-sandi"
          className="mt-5 inline-flex items-center justify-center w-full bg-cyan-500 hover:bg-cyan-400 text-[#04121f] font-bold text-[13px] px-4 py-3 rounded-xl transition-colors"
        >
          Minta Tautan Baru
        </Link>
      </>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const res = await resetSandi({
      token,
      email,
      password,
      password_confirmation: konfirmasi,
    });

    if (res.ok) {
      router.replace('/admin/login?reset=1');
      return;
    }

    setError(res.message);
    setBusy(false);
  };

  return (
    <>
      <span className="inline-flex w-12 h-12 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/30 items-center justify-center">
        <KeyRound className="w-6 h-6 text-[var(--adm-accent)]" />
      </span>
      <h1 className="mt-4 text-[17px] font-black text-[var(--adm-fg)]">Kata Sandi Baru</h1>
      <p className="mt-1.5 text-[12.5px] text-[var(--adm-muted)] leading-relaxed">
        Untuk akun <span className="text-[var(--adm-body)] font-semibold">{email}</span>. Setelah diganti,
        seluruh sesi yang sedang berjalan akan berakhir.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">
            Kata Sandi Baru
          </label>
          <div className="relative">
            <input
              id="password"
              type={lihat ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--adm-hover)] border border-[var(--adm-line)] rounded-xl px-4 py-3 pr-11 text-[13px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <button
              type="button"
              onClick={() => setLihat((v) => !v)}
              aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--adm-dim)] hover:text-[var(--adm-body)] cursor-pointer"
            >
              {lihat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--adm-dim)]">Minimal 8 karakter.</p>
        </div>

        <div>
          <label htmlFor="konfirmasi" className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">
            Ulangi Kata Sandi
          </label>
          <input
            id="konfirmasi"
            type={lihat ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
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
          {busy ? 'Menyimpan...' : 'Simpan Kata Sandi'}
        </button>
      </form>

      <Link
        href="/admin/login"
        className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-muted)] hover:text-[var(--adm-accent)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke halaman masuk
      </Link>
    </>
  );
}

export default function ResetSandiPage() {
  return (
    <Kerangka>
      <Suspense fallback={<p className="text-[12.5px] text-[var(--adm-muted)]">Memuat...</p>}>
        <FormulirReset />
      </Suspense>
    </Kerangka>
  );
}
