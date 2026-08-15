'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { login, muatSesi } from '@/lib/adminApi';
import { LogoApt, LambangApt } from '@/components/admin/LogoApt';
import { Plane, Lock, Mail, Eye, EyeOff, ShieldCheck, AlertTriangle, ArrowRight, Radar, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState('--:--:--');

  // Sudah masuk → langsung ke dasbor.
  //
  // Ditanyakan ke backend, bukan diperiksa dari peramban: tokennya kini ada di
  // cookie httpOnly yang memang tidak terbaca dari sini, dan cookie yang masih
  // tersimpan pun belum tentu tokennya masih berlaku.
  useEffect(() => {
    let batal = false;

    muatSesi().then((sesi) => {
      if (!batal && sesi) router.replace('/admin/dashboard');
    });

    return () => { batal = true; };
  }, [router]);

  // live clock (cockpit flavour)
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Makassar' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await login(email.trim(), password);
    if (res.ok && res.data) {
      // Sesi sudah tersimpan sebagai cookie oleh route handler; tidak ada
      // token yang perlu — atau boleh — disentuh dari sini.
      router.replace('/admin/dashboard');
    } else {
      setError(res.message);
      setBusy(false);
    }
  };

  return (
    <div className="adm-sky relative min-h-screen text-[var(--adm-fg)] overflow-hidden flex items-center justify-center px-4 py-10">
      {/* ---------- animated backdrop ---------- */}
      {/* glow */}
      <div className="absolute -top-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-[var(--adm-glow-a)] blur-[120px]" />
      <div className="absolute -bottom-40 -right-24 w-[32rem] h-[32rem] rounded-full bg-[var(--adm-glow-b)] blur-[130px]" />

      {/* radar sweep */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
        <div className="relative w-[620px] h-[620px] rounded-full border border-[var(--adm-accent-line)] opacity-40">
          <div className="absolute inset-16 rounded-full border border-[var(--adm-accent-line)] opacity-40" />
          <div className="absolute inset-32 rounded-full border border-[var(--adm-accent-line)] opacity-40" />
          <div className="absolute inset-48 rounded-full border border-[var(--adm-accent-line)] opacity-40" />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'conic-gradient(from 0deg, rgba(34,211,238,0.16), transparent 26%)' }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
          />
        </div>
      </div>

      {/* flight paths */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 800" preserveAspectRatio="none">
        {[
          { d: 'M-30 620 Q 340 470 1230 560', dur: 2.0 },
          { d: 'M-30 250 Q 420 120 1230 210', dur: 2.4 },
        ].map((p, i) => (
          <motion.path
            key={i}
            d={p.d}
            fill="none"
            stroke="rgba(56,189,248,0.22)"
            strokeWidth="1.5"
            strokeDasharray="6 9"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: p.dur, ease: 'easeInOut' }}
          />
        ))}
      </svg>

      {/* drifting planes */}
      <motion.div
        initial={{ x: '-12vw', y: 40, opacity: 0 }}
        animate={{ x: '106vw', y: -30, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[16%] pointer-events-none"
      >
        <Plane className="w-7 h-7 text-[var(--adm-accent)] opacity-50 rotate-[10deg]" />
      </motion.div>
      <motion.div
        initial={{ x: '104vw', y: 0, opacity: 0 }}
        animate={{ x: '-12vw', y: 60, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear', delay: 5 }}
        className="absolute top-[72%] pointer-events-none"
      >
        <Plane className="w-5 h-5 text-[var(--adm-accent)] opacity-40 -rotate-[160deg]" />
      </motion.div>

      {/* ---------- card ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative z-10 w-full max-w-[430px]"
      >
        {/* back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--adm-muted)] hover:text-[var(--adm-accent)] mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Portal Publik
        </Link>

        <div className="relative overflow-hidden rounded-3xl adm-glass adm-sweep shadow-2xl">
          {/* top accent */}
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[var(--adm-btn-from)] via-[var(--adm-btn-to)] to-transparent" />

          <div className="p-7 sm:p-8">
            {/* brand — logo resmi mengambang pelan, sekadar tanda hidup */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
            >
              <LogoApt className="h-12 w-auto" />
            </motion.div>
            <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--adm-muted)]">
              Panel Manajemen
            </p>

            {/* status strip */}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[var(--adm-ok)]">
                <span className="adm-beacon w-1.5 h-1.5 rounded-full bg-current" />
                SISTEM AKTIF
              </span>
              <span className="flex items-center gap-1.5 text-[10.5px] text-[var(--adm-muted)]">
                <Radar className="w-3.5 h-3.5 text-[var(--adm-accent)]" />
                {clock} WITA
              </span>
            </div>

            <h1 className="mt-6 text-[22px] font-black text-[var(--adm-fg)] leading-tight">Masuk ke Dasbor</h1>
            <p className="mt-1 text-[12.5px] text-[var(--adm-muted)] leading-relaxed">
              Autentikasi diperlukan untuk mengelola seluruh informasi portal bandara.
            </p>

            {/* error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 18 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2.5 rounded-xl bg-[var(--adm-danger-soft)] border border-[var(--adm-danger-line)] px-3.5 py-3">
                    <AlertTriangle className="w-4 h-4 text-[var(--adm-danger)] flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[var(--adm-danger)] leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* form */}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--adm-dim)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aptpranoto-airport.id"
                    className="w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl pl-10 pr-3.5 py-3 text-[13px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-[var(--adm-accent-line)] focus:ring-2 focus:ring-[var(--adm-accent-ring)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--adm-dim)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl pl-10 pr-11 py-3 text-[13px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-[var(--adm-accent-line)] focus:ring-2 focus:ring-[var(--adm-accent-ring)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--adm-dim)] hover:text-[var(--adm-accent)] transition-colors cursor-pointer"
                    aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={busy}
                className="w-full relative overflow-hidden bg-gradient-to-r from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] hover:brightness-110 text-white font-bold text-[13.5px] py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy ? (
                  <>
                    <motion.span
                      animate={{ x: [-6, 6, -6] }}
                      transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                      className="inline-flex"
                    >
                      <LambangApt className="w-4 h-4" />
                    </motion.span>
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    Masuk Dasbor <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              <Link
                href="/admin/lupa-sandi"
                className="block text-center text-[12px] font-semibold text-[var(--adm-muted)] hover:text-[var(--adm-accent)] transition-colors"
              >
                Lupa kata sandi?
              </Link>
            </form>

            {/* footer */}
            <div className="mt-6 pt-5 border-t border-[var(--adm-line)] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[var(--adm-accent)] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--adm-dim)] leading-relaxed">
                Akses terbatas untuk petugas berwenang UPBU Kelas I APT Pranoto. Seluruh aktivitas tercatat dalam sistem.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10.5px] text-[var(--adm-dim)] mt-5 tracking-wide">
          AIAIS · Airport Integrated Information System
        </p>
      </motion.div>
    </div>
  );
}
