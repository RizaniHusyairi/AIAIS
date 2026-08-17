'use client';

/**
 * Akun warga di dalam PWA.
 *
 * MENGGANTIKAN LAYAR PROFIL YANG SELURUHNYA MAKET. Layar lama menyapa
 * "Selamat Datang, Pengguna" kepada siapa pun, menampilkan tujuh menu
 * (Profil Saya, Notifikasi, Tiket & Booking, …) yang semuanya `<button>` tanpa
 * `onClick`, dan sebuah tombol "Keluar" yang tidak mengeluarkan siapa pun.
 * Tidak satu pun di antaranya tersambung ke sistem akun yang sebenarnya sudah
 * berjalan penuh di `lib/akunApi.ts`.
 *
 * Sesi DIVALIDASI ke backend, tidak cukup membaca `localStorage`: nilainya
 * dapat diketik siapa pun lewat konsol peramban.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { masuk, muatSesiWarga, keluar, akunFetch } from '@/lib/akunApi';
import { savedTicket, ticketKind } from '@/lib/helpdesk';
import { APP_VERSION } from '@/lib/version';
import type { AdminUser, FieldTrip } from '@/types';
import { StatusBar, Memuat, listContainer, listItem } from '@/components/pwa/ui';
import { Field, inputCls } from '@/components/ui/FormField';
import {
  UserRound, LogIn, LogOut, ArrowRight, Ticket, FileText, ShieldCheck,
  LayoutDashboard, Monitor, CircleAlert, Plus, Clock,
} from 'lucide-react';

/** Label jenis tiket bagi pemiliknya — bukan istilah internal. */
const LABEL_TIKET: Record<string, string> = {
  chat: 'Percakapan dengan petugas',
  complaint: 'Pengaduan',
  lost: 'Laporan kehilangan',
  information: 'Permohonan informasi publik',
  unknown: 'Tiket',
};

type Keadaan = 'memeriksa' | 'tamu' | 'warga' | 'petugas';

export default function AkunScreen() {
  const [keadaan, setKeadaan] = useState<Keadaan>('memeriksa');
  const [warga, setWarga] = useState<AdminUser | null>(null);
  const [pengajuan, setPengajuan] = useState<FieldTrip[]>([]);
  const [tiket, setTiket] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    let batal = false;

    (async () => {
      const sesi = await muatSesiWarga();
      if (batal) return;

      setTiket(savedTicket());

      if (!sesi) {
        setKeadaan('tamu');
        return;
      }

      setWarga(sesi);

      if (sesi.role === 'admin' || sesi.role === 'staff') {
        setKeadaan('petugas');
        return;
      }

      setKeadaan('warga');

      const res = await akunFetch<FieldTrip[]>('/fieldtrips');
      if (batal) return;
      setPengajuan(Array.isArray(res.data) ? res.data : []);
    })();

    return () => { batal = true; };
  }, []);

  const kirimMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat('');
    setMengirim(true);

    const res = await masuk(email, sandi);
    setMengirim(false);

    if (!res.ok || !res.data) {
      setGalat(res.message);
      return;
    }

    const peran = res.data.user.role;
    setWarga(res.data.user);
    setKeadaan(peran === 'admin' || peran === 'staff' ? 'petugas' : 'warga');
    setEmail('');
    setSandi('');

    if (peran !== 'admin' && peran !== 'staff') {
      const daftarRes = await akunFetch<FieldTrip[]>('/fieldtrips');
      setPengajuan(Array.isArray(daftarRes.data) ? daftarRes.data : []);
    }
  };

  const kirimKeluar = async () => {
    await keluar();
    setWarga(null);
    setPengajuan([]);
    setKeadaan('tamu');
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* ===== kepala ===== */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#123a8f] to-[#2563eb] text-white rounded-b-[2rem]">
        <StatusBar />
        <div className="px-5 pt-3 pb-8 flex items-center gap-4">
          <span className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center backdrop-blur flex-shrink-0">
            <UserRound className="w-8 h-8 text-white" />
          </span>
          <div className="min-w-0">
            {warga ? (
              <>
                <p className="text-blue-100 text-[12px]">Masuk sebagai</p>
                <p className="font-black text-[20px] leading-tight truncate">{warga.name}</p>
                <p className="text-blue-100/80 text-[11.5px] mt-0.5 truncate">{warga.email}</p>
              </>
            ) : (
              <>
                <p className="text-blue-100 text-[12px]">Akun Layanan Bandara</p>
                <p className="font-black text-[20px] leading-tight">Belum Masuk</p>
                <p className="text-blue-100/80 text-[11.5px] mt-0.5">
                  Masuk untuk mengirim pengajuan layanan
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl p-4 -mt-4 relative z-10 space-y-3">
        {keadaan === 'memeriksa' && <Memuat label="Memeriksa sesi…" />}

        {/* ===== belum masuk ===== */}
        {keadaan === 'tamu' && (
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
            <motion.form
              variants={listItem}
              onSubmit={kirimMasuk}
              className="bg-white rounded-3xl shadow-sm shadow-slate-200/60 p-5 space-y-4"
              noValidate
            >
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <LogIn className="w-[18px] h-[18px] text-blue-600" />
                </span>
                <p className="text-[15px] font-black text-slate-900">Masuk</p>
              </div>

              <Field label="Alamat Surel">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@contoh.id"
                />
              </Field>

              <Field label="Kata Sandi">
                <input
                  type="password"
                  autoComplete="current-password"
                  className={inputCls}
                  value={sandi}
                  onChange={(e) => setSandi(e.target.value)}
                />
              </Field>

              {galat && (
                <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-700">
                  <CircleAlert className="w-4 h-4 flex-shrink-0 mt-px" /> {galat}
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={mengirim}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-700 disabled:opacity-60 text-white font-bold text-[14px] py-4 rounded-2xl shadow-lg shadow-blue-600/25"
              >
                {mengirim ? 'Memproses…' : <>Masuk <ArrowRight className="w-4 h-4" /></>}
              </motion.button>

              <p className="text-center text-[12.5px] text-slate-500">
                Belum punya akun?{' '}
                <Link href="/daftar" className="font-bold text-blue-600">Daftar di sini</Link>
              </p>
            </motion.form>

            {/* Tiket tersimpan tetap dapat dilacak tanpa akun — itu memang
                janji Pusat Bantuan, dan menyembunyikannya di balik layar masuk
                akan mengingkarinya. */}
            {tiket && (
              <motion.div variants={listItem}>
                <KartuTiket tiket={tiket} />
              </motion.div>
            )}

            <motion.div variants={listItem}>
              <KartuLacak />
            </motion.div>
          </motion.div>
        )}

        {/* ===== petugas ===== */}
        {keadaan === 'petugas' && (
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
            {/* Pengelola tidak ditolak, diantar. Kredensialnya sah; yang keliru
                hanya pintu yang dipakainya. */}
            <motion.div variants={listItem} className="bg-white rounded-3xl shadow-sm shadow-slate-200/60 p-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <ShieldCheck className="w-[18px] h-[18px] text-amber-600" />
                </span>
                <p className="text-[15px] font-black text-slate-900">Akun Kedinasan</p>
              </div>
              <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">
                Akun ini milik pengelola bandara. Pengajuan layanan warga tidak berlaku
                untuknya — yang Anda cari ada di panel pengelolaan.
              </p>
              <Link
                href="/admin/dashboard"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-bold text-[13.5px] py-3.5 rounded-2xl"
              >
                <LayoutDashboard className="w-4 h-4" /> Buka Panel Pengelolaan
              </Link>
            </motion.div>

            <motion.div variants={listItem}>
              <TombolKeluar onKeluar={kirimKeluar} />
            </motion.div>
          </motion.div>
        )}

        {/* ===== warga ===== */}
        {keadaan === 'warga' && (
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
            {tiket && (
              <motion.div variants={listItem}>
                <KartuTiket tiket={tiket} />
              </motion.div>
            )}

            <motion.div variants={listItem} className="bg-white rounded-3xl shadow-sm shadow-slate-200/60 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                    <FileText className="w-[18px] h-[18px] text-violet-600" />
                  </span>
                  <p className="text-[15px] font-black text-slate-900">Pengajuan Saya</p>
                </div>
                <Link href="/akun" className="text-[12px] font-bold text-blue-600 flex items-center gap-1">
                  Semua <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {pengajuan.length === 0 ? (
                <p className="px-5 pb-5 text-[12.5px] text-slate-500 leading-relaxed">
                  Belum ada pengajuan. Formulirnya memerlukan unggahan dokumen, jadi
                  pengisiannya dibuka di halaman pengajuan.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pengajuan.slice(0, 5).map((p) => (
                    <li key={p.id} className="px-5 py-3 flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-bold text-slate-800 truncate">
                          {p.fieldtrip_name}
                        </p>
                        <p className="text-[11.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {p.submission_status}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/akun"
                className="flex items-center justify-center gap-1.5 border-t border-slate-100 py-3.5 text-[13px] font-bold text-blue-600 active:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajukan Layanan Baru
              </Link>
            </motion.div>

            <motion.div variants={listItem}>
              <KartuLacak />
            </motion.div>

            <motion.div variants={listItem}>
              <TombolKeluar onKeluar={kirimKeluar} />
            </motion.div>
          </motion.div>
        )}

        {/* ===== kaki ===== */}
        <div className="pt-2 space-y-1">
          <button
            type="button"
            onClick={() => {
              document.cookie = 'aptView=desktop; path=/; max-age=' + 60 * 60 * 24 * 30;
              window.location.href = '/';
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-blue-600 py-2"
          >
            <Monitor className="w-3.5 h-3.5" /> Buka Versi Desktop
          </button>
          <p className="text-center text-[11px] text-slate-400">
            APT Pranoto App · Versi {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Tiket terakhir yang tersimpan di perangkat ini. */
function KartuTiket({ tiket }: { tiket: string }) {
  return (
    <Link
      href="/app/bantuan?mode=lacak"
      className="block bg-white rounded-3xl shadow-sm shadow-slate-200/60 p-5 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
          <Ticket className="w-[18px] h-[18px] text-cyan-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black text-slate-900">Tiket Terakhir Anda</p>
          <p className="text-[11.5px] text-slate-500">{LABEL_TIKET[ticketKind(tiket)]}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
      </div>
      <p className="mt-3 font-mono text-[13px] font-bold text-slate-800 bg-slate-50 rounded-xl px-3 py-2 text-center tracking-wide">
        {tiket}
      </p>
    </Link>
  );
}

function KartuLacak() {
  return (
    <Link
      href="/app/bantuan?mode=lacak"
      className="flex items-center gap-3.5 bg-white rounded-3xl shadow-sm shadow-slate-200/60 p-4 active:scale-[0.99] transition-transform"
    >
      <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Ticket className="w-5 h-5 text-slate-500" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold text-slate-800">Lacak Tiket</p>
        <p className="text-[11.5px] text-slate-500">Pengaduan, kehilangan, atau percakapan</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300" />
    </Link>
  );
}

function TombolKeluar({ onKeluar }: { onKeluar: () => void }) {
  return (
    <button
      type="button"
      onClick={onKeluar}
      className="w-full flex items-center justify-center gap-2 text-rose-600 font-semibold text-[14px] py-3.5 rounded-2xl bg-rose-50 active:bg-rose-100 transition-colors"
    >
      <LogOut className="w-[18px] h-[18px]" /> Keluar
    </button>
  );
}
