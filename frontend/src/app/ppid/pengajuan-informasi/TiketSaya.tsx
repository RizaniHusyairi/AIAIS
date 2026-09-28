'use client';

/**
 * "Tiket Saya" — riwayat permohonan yang diajukan dari perangkat ini.
 *
 * Nomornya dari `lib/tiketSaya.ts` (hanya nomor dan tanggal); statusnya
 * diambil langsung dari server setiap kali daftar tampil. Hanya lima teratas
 * yang ditanyakan dulu: rute pelacakan dibatasi 20 permintaan per menit per
 * IP, dan daftar panjang yang ditanyakan sekaligus bisa menghabiskannya —
 * sisanya menyusul saat pemohon membuka "tiket lainnya".
 *
 * Tidak merender apa pun bila perangkat ini belum pernah mengajukan.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Clock, History, Loader2, Trash2, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { hapusTiket, useTiketSaya } from '@/lib/tiketSaya';
import type { InformationRequestTracking } from '@/types';
import { fmtTanggal, sisaHariKerja, tanggalWita } from './aturan';
import { LABEL_STATUS } from './LacakPermohonan';

const AWAL = 5;

type Keadaan =
  | { jenis: 'ada'; data: InformationRequestTracking }
  | { jenis: 'hilang' }
  | { jenis: 'galat' };

function Keterangan({ k }: { k?: Keadaan }) {
  if (!k) return <span className="inline-flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Memuat status…</span>;
  if (k.jenis === 'hilang') return <span className="text-slate-400">Tidak ditemukan di server</span>;
  if (k.jenis === 'galat') return <span className="text-slate-400">Status belum dapat dimuat</span>;

  const h = k.data;
  if (h.status === 'fulfilled') return <span className="text-emerald-700">Sudah dijawab — ketuk untuk melihat tanggapan</span>;
  if (h.status === 'rejected') return <span className="text-rose-700">Ditolak dengan alasan — ketuk untuk melihat</span>;
  if (!h.due_date) return null;

  const sisa = sisaHariKerja(tanggalWita(h.due_date));
  return (
    <span className={`inline-flex items-center gap-1 ${sisa < 0 ? 'text-rose-700' : sisa <= 2 ? 'text-amber-700' : 'text-slate-500'}`}>
      <Clock className="h-3 w-3" />
      {sisa < 0 ? `Batas jawaban terlewati ${Math.abs(sisa)} hari kerja` : sisa === 0 ? 'Batas jawaban hari ini' : `Sisa ${sisa} hari kerja`}
    </span>
  );
}

export default function TiketSaya({ onPilih }: { onPilih: (tiket: string) => void }) {
  const daftar = useTiketSaya();
  const [semua, setSemua] = useState(false);
  const [keadaan, setKeadaan] = useState<Record<string, Keadaan>>({});
  const [akanHapus, setAkanHapus] = useState<string | null>(null);

  const tampil = semua ? daftar : daftar.slice(0, AWAL);
  const kunciTampil = tampil.map((t) => t.ticket_number).join(',');

  // Ambil status untuk yang tampil dan BELUM pernah ditanyakan. Menghapus
  // satu tiket atau membuka "tiket lainnya" tidak menanyakan ulang yang sudah
  // ada — setiap permintaan memotong jatah 20/menit rute pelacakan.
  const diambil = useRef<Set<string>>(new Set());
  useEffect(() => {
    const baru = kunciTampil.split(',').filter((t) => t && !diambil.current.has(t));

    baru.forEach((t) => {
      diambil.current.add(t);
      fetch(`${API_BASE_URL}/information-requests/track/${encodeURIComponent(t)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          const k: Keadaan = res.ok && json?.data
            ? { jenis: 'ada', data: json.data as InformationRequestTracking }
            : res.status === 404 ? { jenis: 'hilang' } : { jenis: 'galat' };
          setKeadaan((s) => ({ ...s, [t]: k }));
        })
        .catch(() => setKeadaan((s) => ({ ...s, [t]: { jenis: 'galat' } })));
    });
  }, [kunciTampil]);

  if (daftar.length === 0) return null;

  return (
    <section aria-labelledby="judul-tiket-saya" className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/70 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <History className="h-5 w-5 text-blue-600" />
        </span>
        <div className="min-w-0">
          <h2 id="judul-tiket-saya" className="text-[17px] font-black tracking-tight text-slate-900">
            Tiket Saya <span className="text-[13px] font-bold text-slate-400">({daftar.length})</span>
          </h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
            Permohonan yang pernah diajukan dari perangkat ini. Hanya nomor tiket yang tersimpan di sini.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {tampil.map((t) => {
            const k = keadaan[t.ticket_number];
            const status = k?.jenis === 'ada' ? LABEL_STATUS[k.data.status] ?? LABEL_STATUS.submitted : null;
            const diajukan = k?.jenis === 'ada' ? k.data.submitted_at : t.submitted_at;
            const konfirmasi = akanHapus === t.ticket_number;

            return (
              <motion.li
                key={t.ticket_number}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24, height: 0, marginTop: 0 }}
                className="flex items-stretch gap-2"
              >
                <button
                  type="button"
                  onClick={() => onPilih(t.ticket_number)}
                  className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3.5 py-3 text-left ring-1 ring-slate-200/70 transition-colors hover:bg-blue-50/60 hover:ring-blue-200 cursor-pointer"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-black tracking-wider text-slate-900">{t.ticket_number}</span>
                    {status && (
                      <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1 ${status.cls}`}>{status.text}</span>
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px]">
                    <span className="text-slate-500">Diajukan {fmtTanggal(diajukan)}</span>
                    <Keterangan k={k} />
                  </span>
                </button>

                {konfirmasi ? (
                  <span className="flex flex-shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => { hapusTiket(t.ticket_number); setAkanHapus(null); }}
                      className="flex-1 rounded-xl bg-rose-600 px-2.5 text-[10.5px] font-bold text-white cursor-pointer"
                    >
                      Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setAkanHapus(null)}
                      className="flex-1 rounded-xl bg-slate-100 px-2.5 text-[10.5px] font-bold text-slate-600 cursor-pointer"
                    >
                      Batal
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAkanHapus(t.ticket_number)}
                    className="flex w-10 flex-shrink-0 items-center justify-center rounded-2xl text-slate-400 ring-1 ring-slate-200/70 transition-colors hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    aria-label={`Hapus ${t.ticket_number} dari perangkat ini`}
                    title="Hapus dari perangkat ini"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {daftar.length > AWAL && (
        <button
          type="button"
          onClick={() => setSemua((s) => !s)}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 cursor-pointer"
          aria-expanded={semua}
        >
          {semua ? 'Tampilkan lebih sedikit' : `${daftar.length - AWAL} tiket lainnya`}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${semua ? 'rotate-180' : ''}`} />
        </button>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-400">
        <Trash2 className="mt-px h-3 w-3 flex-shrink-0" />
        Menghapus dari daftar ini tidak membatalkan permohonan — hanya melupakan nomornya di perangkat ini.
      </p>
    </section>
  );
}

/** Pintasan ringkas untuk kartu beranda PWA: tanpa permintaan jaringan. */
export function PintasanTiketSaya({ href }: { href: (tiket: string) => string }) {
  const daftar = useTiketSaya();
  if (daftar.length === 0) return null;
  const terbaru = daftar[0];

  return (
    <Link
      href={href(terbaru.ticket_number)}
      className="mt-3 flex items-center gap-3 rounded-2xl bg-blue-50 px-3 py-2.5 ring-1 ring-blue-100 active:bg-blue-100"
    >
      <History className="h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-slate-800">
          Tiket Saya{daftar.length > 1 ? ` · ${daftar.length} permohonan` : ''}
        </span>
        <span className="block truncate font-mono text-[11px] tracking-wider text-blue-700">{terbaru.ticket_number}</span>
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
    </Link>
  );
}
