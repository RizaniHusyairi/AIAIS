'use client';

/**
 * Formulir daftar hadir rapat, dibuka lewat tautan bertoken.
 *
 * Dipakai peserta sambil BERDIRI DI PINTU RUANG RAPAT, dari ponselnya, sering
 * bergantian dengan orang di belakangnya. Itu yang menentukan bentuknya:
 *
 *  - Sasaran sentuh besar (≥ 48px) dan isian sedikit — tiga medan, tidak lebih.
 *  - Sesudah terkirim, formulirnya BERSIH KEMBALI dan siap untuk orang
 *    berikutnya, tanpa perlu memuat ulang halaman. Satu ponsel biasanya dipakai
 *    beberapa peserta berurutan.
 *  - Peserta yang baru saja mengisi disebut namanya pada layar berhasil, supaya
 *    yang bersangkutan yakin kehadirannya tercatat sebelum menyerahkan ponsel.
 *
 * Halaman ini `noindex` — tokennya ada di dalam URL.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TandaTanganKanvas from '@/components/akun/TandaTanganKanvas';
import { API_BASE_URL } from '@/lib/api';
import type { AbsensiInfo } from '@/types';
import { CalendarDays, MapPin, User, CircleCheck, CircleAlert, Clock } from 'lucide-react';

const gaya =
  'mt-1.5 w-full rounded-xl px-4 py-3.5 text-[15px] text-slate-900 bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-400 outline-none transition-colors';

const tanggalPanjang = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

export default function AbsensiForm({ token, info }: { token: string; info: AbsensiInfo | null }) {
  const [nama, setNama] = useState('');
  const [unit, setUnit] = useState('');
  const [telepon, setTelepon] = useState('');
  const [ttd, setTtd] = useState<string | null>(null);
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [berhasil, setBerhasil] = useState<string | null>(null);

  /* Tautan tidak dikenali — token salah ketik atau sudah diputar petugas. */
  if (!info) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <CircleAlert className="w-8 h-8 text-rose-500 mx-auto" />
          <h1 className="mt-3 text-[17px] font-black text-slate-900">Tautan absensi tidak dikenali</h1>
          <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
            Tautannya mungkin salah ketik, atau sudah diperbarui petugas. Mintalah tautan terbaru
            kepada penyelenggara rapat.
          </p>
        </div>
      </div>
    );
  }

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ttd) {
      setGalat('Tanda tangan wajib diisi. Goreskan tanda tangan Anda pada kotak di atas.');

      return;
    }

    setGalat('');
    setMengirim(true);

    try {
      const res = await fetch(`${API_BASE_URL}/absensi/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: nama,
          department: unit,
          phone: telepon.trim(),
          signature: ttd,
        }),
      });
      const json = await res.json().catch(() => null);
      setMengirim(false);

      if (!res.ok || !json?.success) {
        setGalat(json?.message ?? 'Kehadiran gagal dikirim. Coba lagi.');

        return;
      }

      // Bersihkan untuk peserta berikutnya — satu ponsel dipakai bergantian.
      setBerhasil(nama);
      setNama('');
      setUnit('');
      setTelepon('');
      setTtd(null);
    } catch {
      setMengirim(false);
      setGalat('Tidak dapat terhubung. Periksa sambungan internet Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200/80">Daftar Hadir</p>
          <h1 className="mt-1 text-[21px] font-black text-white leading-tight">{info.title}</h1>

          <div className="mt-3 space-y-1 text-[12.5px] text-blue-100/85">
            <p className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" /> {tanggalPanjang(info.date)}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" /> {info.start_time?.slice(0, 5) ?? '—'} WITA
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {info.location}
            </p>
            <p className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 flex-shrink-0" /> {info.organizer}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        {/* Absensi ditutup — dinyatakan terang, bukan sekadar tombol mati. */}
        {!info.is_active ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 px-6 py-10 text-center">
            <CircleAlert className="w-7 h-7 text-amber-500 mx-auto" />
            <p className="mt-3 text-[14px] font-black text-slate-900">Absensi rapat ini sudah ditutup.</p>
            <p className="mt-1.5 text-[12.5px] text-slate-500 leading-relaxed">
              Penyelenggara telah menutup daftar hadir. Hubungi penyelenggara bila kehadiran Anda
              belum tercatat.
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {berhasil && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 flex items-start gap-3 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-4"
                >
                  <CircleCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13.5px] font-bold text-emerald-900">
                      Kehadiran <span className="font-black">{berhasil}</span> sudah tercatat.
                    </p>
                    <p className="mt-0.5 text-[12px] text-emerald-800/85">
                      Serahkan perangkat ini kepada peserta berikutnya.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={kirim} className="bg-white ring-1 ring-slate-200 rounded-2xl p-5 space-y-4">
              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Nama Lengkap</span>
                <input
                  required maxLength={125} autoComplete="name" className={gaya}
                  value={nama} onChange={(e) => setNama(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Unit Kerja / Instansi
                </span>
                <input
                  required maxLength={125} className={gaya}
                  value={unit} onChange={(e) => setUnit(e.target.value)}
                />
              </label>

              {/* WAJIB, bukan opsional. Nomor inilah satu-satunya penanda yang
                  membedakan peserta pada daftar hadir tanpa akun, dan yang
                  dipakai backend menolak absensi ganda. */}
              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Nomor Telepon
                </span>
                <input
                  type="tel" inputMode="numeric" required maxLength={125} autoComplete="tel" className={gaya}
                  value={telepon} onChange={(e) => setTelepon(e.target.value)}
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Dipakai untuk memastikan satu peserta tercatat sekali saja.
                </span>
              </label>

              <TandaTanganKanvas onChange={setTtd} />

              {galat && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-[12.5px] font-semibold text-rose-700">
                  <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> {galat}
                </p>
              )}

              <button
                type="submit"
                disabled={mengirim}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-[15px] py-4 transition-colors cursor-pointer"
              >
                {mengirim ? 'Mengirim...' : 'Catat Kehadiran Saya'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
