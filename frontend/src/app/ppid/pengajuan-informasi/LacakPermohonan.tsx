'use client';

/**
 * Pelacakan tiket permohonan informasi publik.
 *
 * Statusnya digambar sebagai lintasan tiga titik (diterima → diproses →
 * dijawab) disertai sisa hari kerja menuju tenggat. Bila tenggat lewat atau
 * permohonan ditolak, halaman menunjukkan jalan keberatan — hak yang kerap
 * tidak diketahui pemohon, padahal tenggatnya ikut berjalan.
 */

import React, { forwardRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, Check, Clock, ExternalLink, Loader2, Scale, Search, Ticket, TriangleAlert, X,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import type { InformationRequestTracking } from '@/types';
import { fmtTanggal, sisaHariKerja } from './aturan';
import { TENGGAT } from './PasPermohonan';

const LABEL_STATUS: Record<InformationRequestTracking['status'], { text: string; cls: string }> = {
  submitted: { text: 'Diterima, menunggu diproses', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  in_progress: { text: 'Sedang diproses', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  fulfilled: { text: 'Sudah dijawab', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { text: 'Ditolak dengan alasan', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

const URUTAN: Record<InformationRequestTracking['status'], number> = {
  submitted: 0, in_progress: 1, fulfilled: 2, rejected: 2,
};

/** State pelacakan diangkat ke hook supaya layar tiket bisa memicunya langsung. */
export function useLacak() {
  const [nomor, setNomor] = useState('');
  const [muat, setMuat] = useState(false);
  const [hasil, setHasil] = useState<InformationRequestTracking | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const cari = useCallback(async (masukan?: string) => {
    const t = (masukan ?? nomor).trim().toUpperCase();
    if (!t) return;
    setNomor(t);
    setMuat(true);
    setGalat(null);
    setHasil(null);
    try {
      const res = await fetch(`${API_BASE_URL}/information-requests/track/${encodeURIComponent(t)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok && json?.data) setHasil(json.data as InformationRequestTracking);
      else if (res.status === 429) setGalat('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
      else setGalat(json?.message || 'Nomor tiket tidak ditemukan.');
    } catch {
      setGalat('Server tidak dapat dihubungi.');
    } finally {
      setMuat(false);
    }
  }, [nomor]);

  return { nomor, setNomor, muat, hasil, galat, cari };
}

type Lacak = ReturnType<typeof useLacak>;

function Lintasan({ h }: { h: InformationRequestTracking }) {
  const posisi = URUTAN[h.status] ?? 0;
  const titik = [
    { nama: 'Diterima', tgl: h.submitted_at },
    { nama: 'Diproses', tgl: null },
    { nama: h.status === 'rejected' ? 'Ditolak' : 'Dijawab', tgl: h.responded_at },
  ];

  return (
    <ol className="mt-5 grid grid-cols-3" aria-label="Tahapan permohonan">
      {titik.map((t, i) => {
        const lewat = i <= posisi;
        const tolak = i === 2 && h.status === 'rejected';
        return (
          <li key={t.nama} className="relative flex flex-col items-center text-center" aria-current={i === posisi ? 'step' : undefined}>
            {i > 0 && (
              <span className="absolute right-1/2 top-4 w-full h-0.5 bg-slate-200" aria-hidden="true">
                <motion.span
                  className={`block h-full ${tolak ? 'bg-rose-400' : 'bg-emerald-400'}`}
                  initial={{ width: 0 }}
                  animate={{ width: lewat ? '100%' : 0 }}
                  transition={{ delay: 0.15 * i, duration: 0.4 }}
                />
              </span>
            )}
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 * i + 0.2 }}
              className={`relative w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-slate-50 ${
                tolak ? 'bg-rose-500 text-white'
                : lewat ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-400'
              }`}
            >
              {tolak ? <X className="w-4 h-4" /> : lewat ? <Check className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
            </motion.span>
            <span className={`mt-2 text-[11.5px] font-bold ${lewat ? 'text-slate-800' : 'text-slate-400'}`}>{t.nama}</span>
            {t.tgl && <span className="text-[10.5px] text-slate-500">{fmtTanggal(t.tgl)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function SisaWaktu({ h }: { h: InformationRequestTracking }) {
  if (!h.due_date || h.status === 'fulfilled' || h.status === 'rejected') return null;
  const sisa = sisaHariKerja(new Date(h.due_date));
  const lewat = sisa < 0;
  return (
    <p className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-bold ring-1 ${
      lewat ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : sisa <= 2 ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : 'bg-blue-50 text-blue-700 ring-blue-200'
    }`}>
      <Clock className="w-4 h-4 flex-shrink-0" />
      {lewat
        ? `Batas jawaban terlewati ${Math.abs(sisa)} hari kerja`
        : sisa === 0 ? 'Batas jawaban jatuh hari ini'
        : `Sisa ${sisa} hari kerja menuju batas jawaban`}
    </p>
  );
}

const LacakPermohonan = forwardRef<HTMLInputElement, {
  lacak: Lacak;
  /** Layar PWA menautkan ke layar SOP-nya sendiri, yang tidak berjangkar. */
  tautanKeberatan?: string;
}>(function LacakPermohonan({ lacak, tautanKeberatan = '/ppid/sop#keberatan' }, ref) {
  const { nomor, setNomor, muat, hasil, galat, cari } = lacak;
  const status = hasil ? LABEL_STATUS[hasil.status] ?? LABEL_STATUS.submitted : null;
  const tawarkanKeberatan = hasil && (
    hasil.status === 'rejected'
    || (hasil.status !== 'fulfilled' && hasil.due_date && sisaHariKerja(new Date(hasil.due_date)) < 0)
  );

  return (
    <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Ticket className="w-5 h-5 text-blue-600" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Lacak Permohonan</h2>
          <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
            Masukkan nomor tiket yang Anda terima saat mengirim permohonan.
          </p>
        </div>
      </div>

      <form
        className="mt-5 flex flex-col sm:flex-row gap-3"
        onSubmit={(e) => { e.preventDefault(); cari(); }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={ref}
            type="text"
            value={nomor}
            onChange={(e) => setNomor(e.target.value.toUpperCase())}
            placeholder="PIP-20260802-XXXX"
            aria-label="Nomor tiket permohonan"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl ring-1 ring-slate-200 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono tracking-wider"
          />
        </div>
        <button
          type="submit"
          disabled={muat || !nomor.trim()}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[13px] px-6 py-3 rounded-xl transition-colors cursor-pointer"
        >
          {muat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Lacak
        </button>
      </form>

      <div aria-live="polite">
        {galat && (
          <p className="mt-4 flex items-start gap-2.5 bg-rose-50 ring-1 ring-rose-200 text-rose-700 rounded-xl px-4 py-3 text-[12.5px] font-semibold">
            <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-px" />
            {galat}
          </p>
        )}

        {hasil && status && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 bg-slate-50 rounded-2xl ring-1 ring-slate-200 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[15px] font-black text-slate-900 tracking-wider">{hasil.ticket_number}</p>
              <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-full ring-1 ${status.cls}`}>
                <Clock className="w-3.5 h-3.5" />
                {status.text}
              </span>
            </div>

            <Lintasan h={hasil} />

            <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12.5px]">
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Diterima</dt>
                <dd className="mt-0.5 font-bold text-slate-800">{fmtTanggal(hasil.submitted_at)}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Batas Jawaban</dt>
                <dd className="mt-0.5 font-bold text-slate-800">
                  {fmtTanggal(hasil.due_date)}
                  {hasil.is_extended && (
                    <span className="ml-2 text-[11px] font-semibold text-amber-700">diperpanjang</span>
                  )}
                </dd>
              </div>
            </dl>

            <SisaWaktu h={hasil} />

            {hasil.admin_response && (
              <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Tanggapan PPID</p>
                <p className="mt-1.5 text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {hasil.admin_response}
                </p>
                {hasil.response_link && (
                  <a
                    href={hasil.response_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    Buka Dokumen Jawaban
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {tawarkanKeberatan && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-white ring-1 ring-slate-200 p-4">
                <Scale className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-black text-slate-800">Anda berhak mengajukan keberatan</p>
                  <p className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">
                    Keberatan diajukan kepada PPID {TENGGAT.keberatan}.
                  </p>
                  <Link
                    href={tautanKeberatan}
                    className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    Tata cara keberatan <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
});

export default LacakPermohonan;
