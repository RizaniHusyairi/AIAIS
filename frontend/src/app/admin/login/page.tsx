'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { login, saveSession, getToken } from '@/lib/adminApi';
import { Plane, Lock, Mail, Eye, EyeOff, ShieldCheck, AlertTriangle, ArrowRight, Radar, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState('--:--:--');

  // already signed in → go straight to dashboard
  useEffect(() => {
    if (getToken()) router.replace('/admin/dashboard');
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
      saveSession(res.data.token, res.data.user);
      router.replace('/admin/dashboard');
    } else {
      setError(res.message);
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050a16] text-slate-100 overflow-hidden flex items-center justify-center px-4 py-10">
      {/* ---------- animated backdrop ---------- */}
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
        }}
      />
      {/* glow */}
      <div className="absolute -top-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute -bottom-40 -right-24 w-[32rem] h-[32rem] rounded-full bg-cyan-500/15 blur-[130px]" />

      {/* radar sweep */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
        <div className="relative w-[620px] h-[620px] rounded-full border border-cyan-400/10">
          <div className="absolute inset-16 rounded-full border border-cyan-400/10" />
          <div className="absolute inset-32 rounded-full border border-cyan-400/10" />
          <div className="absolute inset-48 rounded-full border border-cyan-400/10" />
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
        <Plane className="w-7 h-7 text-cyan-300/50 rotate-[10deg]" />
      </motion.div>
      <motion.div
        initial={{ x: '104vw', y: 0, opacity: 0 }}
        animate={{ x: '-12vw', y: 60, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear', delay: 5 }}
        className="absolute top-[72%] pointer-events-none"
      >
        <Plane className="w-5 h-5 text-blue-300/40 -rotate-[160deg]" />
      </motion.div>

      {/* ---------- card ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative z-10 w-full max-w-[430px]"
      >
        {/* back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-cyan-300 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Portal Publik
        </Link>

        <div className="relative overflow-hidden rounded-3xl bg-[#0b1428]/85 backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* top accent */}
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-transparent" />

          <div className="p-7 sm:p-8">
            {/* brand */}
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 flex-shrink-0"
              >
                <Plane className="w-6 h-6 text-white rotate-45" />
              </motion.span>
              <div>
                <p className="font-black text-white text-[17px] tracking-tight leading-none">Panel Manajemen</p>
                <p className="text-[11px] text-cyan-300/90 tracking-wide mt-1">APT PRANOTO SAMARINDA</p>
              </div>
            </div>

            {/* status strip */}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#08111f] border border-white/8 px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-300">
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                />
                SISTEM AKTIF
              </span>
              <span className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
                <Radar className="w-3.5 h-3.5 text-cyan-400" />
                {clock} WITA
              </span>
            </div>

            <h1 className="mt-6 text-[22px] font-black text-white leading-tight">Masuk ke Dasbor</h1>
            <p className="mt-1 text-[12.5px] text-slate-400 leading-relaxed">
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
                  <div className="flex gap-2.5 rounded-xl bg-rose-500/12 border border-rose-500/35 px-3.5 py-3">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-rose-200 leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* form */}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aptpranoto-airport.id"
                    className="w-full bg-[#08111f] border border-white/10 rounded-xl pl-10 pr-3.5 py-3 text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#08111f] border border-white/10 rounded-xl pl-10 pr-11 py-3 text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300 transition-colors cursor-pointer"
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
                className="w-full relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-[13.5px] py-3.5 rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy ? (
                  <>
                    <motion.span
                      animate={{ x: [-6, 6, -6] }}
                      transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                      className="inline-flex"
                    >
                      <Plane className="w-4 h-4 rotate-45" />
                    </motion.span>
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    Masuk Dasbor <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* footer */}
            <div className="mt-6 pt-5 border-t border-white/8 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Akses terbatas untuk petugas berwenang UPBU Kelas I APT Pranoto. Seluruh aktivitas tercatat dalam sistem.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10.5px] text-slate-600 mt-5 tracking-wide">
          AIAIS · Airport Integrated Information System
        </p>
      </motion.div>
    </div>
  );
}
