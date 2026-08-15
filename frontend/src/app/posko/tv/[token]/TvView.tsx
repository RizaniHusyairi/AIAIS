'use client';

/**
 * Papan monitor Posko Nataru untuk layar TV.
 *
 * Dibaca dari JARAK BEBERAPA METER oleh orang yang sedang berjalan lewat, dan
 * menyala berjam-jam tanpa ada yang menyentuhnya. Itu yang menentukan
 * bentuknya, dan setiap keputusan di bawah berasal dari sana:
 *
 *  - Angka sangat besar, label kecil. Yang dibaca dari jauh adalah angkanya.
 *  - Latar gelap. Layar putih menyala di ruang posko yang remang melelahkan
 *    mata dan memantul pada kaca.
 *  - Menyegarkan diri tiap 60 detik TANPA memuat ulang halaman — memuat ulang
 *    membuat layar berkedip hitam, dan itu terlihat seperti perangkat rusak.
 *  - Jam dan penanda "diperbarui" selalu tampak. Papan yang membeku karena
 *    jaringan putus tampak persis seperti papan yang datanya memang tidak
 *    berubah; tanpa penanda ini tak seorang pun tahu bedanya.
 *
 * Tokennya TERPISAH dari token petugas dan hanya dapat membaca. Lihat catatan
 * pada `NataruController::tvByToken`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import type { NataruSummary } from '@/types';
import { Plane, Users, Package, Luggage, Gauge, CircleAlert } from 'lucide-react';

const angka = (n: number) => n.toLocaleString('id-ID');

/** Selang penyegaran. Cukup jarang agar tidak membebani, cukup sering agar hidup. */
const SELANG_MS = 60_000;

export default function TvView({ token, awal }: { token: string; awal: NataruSummary | null }) {
  const [data, setData] = useState<NataruSummary | null>(awal);
  const [jam, setJam] = useState('--:--:--');
  const [segar, setSegar] = useState<Date | null>(awal ? new Date() : null);
  const [putus, setPutus] = useState(false);

  const muat = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/nataru/tv/${token}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const json = await r.json().catch(() => null);

      if (r.ok && json?.success && json.data) {
        setData(json.data);
        setSegar(new Date());
        setPutus(false);
      } else {
        setPutus(true);
      }
    } catch {
      // Data LAMA tetap ditampilkan, hanya diberi penanda. Mengosongkan layar
      // saat jaringan putus sejenak justru membuang informasi yang masih
      // berguna bagi orang yang sedang membacanya.
      setPutus(true);
    }
  }, [token]);

  useEffect(() => {
    const t = setInterval(muat, SELANG_MS);

    return () => clearInterval(t);
  }, [muat]);

  useEffect(() => {
    const tik = () =>
      setJam(new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Makassar' }));

    tik();
    const t = setInterval(tik, 1000);

    return () => clearInterval(t);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#050b1c] flex items-center justify-center px-6">
        <div className="text-center">
          <CircleAlert className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="mt-4 text-2xl font-black text-white">Tautan layar tidak dikenali</p>
          <p className="mt-2 text-slate-400">Mintakan tautan layar terbaru kepada petugas posko.</p>
        </div>
      </div>
    );
  }

  const kartu = [
    { label: 'Penerbangan', nilai: data.totals.flights, icon: Plane, warna: 'text-sky-300' },
    { label: 'Penumpang', nilai: data.totals.passengers, icon: Users, warna: 'text-emerald-300' },
    { label: 'Kargo (kg)', nilai: data.totals.cargo, icon: Package, warna: 'text-amber-300' },
    { label: 'Bagasi (kg)', nilai: data.totals.baggage, icon: Luggage, warna: 'text-violet-300' },
  ];

  return (
    <div className="min-h-screen bg-[#050b1c] text-white px-8 py-7">
      <header className="flex items-start justify-between gap-6 pb-5 border-b border-white/10">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.24em] text-sky-400">
            Posko Monitoring Nataru
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight">{data.event.name}</h1>
          <p className="mt-1 text-slate-400 text-lg">
            Bandar Udara APT Pranoto Samarinda
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-5xl font-black tabular-nums tracking-tight">{jam}</p>
          <p className="mt-1 text-[13px] text-slate-400">
            WITA
            {segar && (
              <> · diperbarui {segar.toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Makassar' })}</>
            )}
          </p>
          {/* Papan beku karena jaringan putus tampak sama dengan papan yang
              datanya memang tidak berubah — penanda ini yang membedakan. */}
          {putus && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-amber-300">
              <CircleAlert className="w-4 h-4" /> Sambungan terputus — angka mungkin tertinggal
            </p>
          )}
        </div>
      </header>

      <section className="mt-7 grid grid-cols-4 gap-5">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 px-7 py-6">
            <k.icon className={`w-8 h-8 ${k.warna}`} />
            <p className="mt-4 text-[15px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {k.label}
            </p>
            <p className="mt-1 text-[56px] leading-none font-black tabular-nums">{angka(k.nilai)}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-3 gap-5">
        {(['arrival', 'departure'] as const).map((arah) => (
          <div key={arah} className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 px-7 py-6">
            <p className="text-[15px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {arah === 'arrival' ? 'Kedatangan' : 'Keberangkatan'}
            </p>
            <p className="mt-2 text-[40px] leading-none font-black tabular-nums">
              {angka(data.by_direction[arah].passengers)}
              <span className="ml-2 text-[18px] font-bold text-slate-400">penumpang</span>
            </p>
            <p className="mt-2 text-[17px] text-slate-300">
              {angka(data.by_direction[arah].flights)} penerbangan
            </p>
          </div>
        ))}

        <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 px-7 py-6">
          <Gauge className="w-8 h-8 text-sky-300" />
          <p className="mt-3 text-[15px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Rata-rata Load Factor
          </p>
          {/* Null BUKAN nol: kapasitas kursinya yang belum diisi, bukan
              pesawatnya yang kosong. */}
          <p className="mt-1 text-[56px] leading-none font-black tabular-nums">
            {data.totals.average_load_factor === null
              ? '—'
              : <>{data.totals.average_load_factor}<span className="text-[28px]">%</span></>}
          </p>
          {data.totals.average_load_factor === null && (
            <p className="mt-1 text-[13px] text-slate-500">Kapasitas kursi belum diisi</p>
          )}
        </div>
      </section>

      <footer className="mt-6 text-[13px] text-slate-500">
        {angka(data.totals.airlines)} maskapai tercatat · periode {data.event.start_date} s/d {data.event.end_date}
      </footer>
    </div>
  );
}
