'use client';

/**
 * Statistik lalu lintas udara.
 *
 * TIGA KEPUTUSAN BENTUK yang menentukan tampilan ini:
 *
 *  1. **Angka utama disajikan sebagai kartu, bukan grafik.** Empat totalnya
 *     adalah bilangan tunggal — grafik untuk satu angka hanya menambah tinta
 *     tanpa menambah makna.
 *
 *  2. **Satu grafik per kategori, bukan satu grafik gabungan.** Satuannya
 *     berbeda jauh: pesawat ratusan, penumpang puluhan ribu, bagasi dan kargo
 *     ratusan ribu kilogram. Menggabungkannya menuntut dua sumbu berbeda
 *     skala — cara paling umum membuat grafik berbohong, karena dua garis
 *     tampak sebanding padahal satuannya tidak sama sekali.
 *
 *  3. **Batang berkelompok, bukan garis.** Datanya cuma beberapa periode
 *     diskret; garis di antara tiga titik menyiratkan perubahan mulus yang
 *     tidak terukur.
 *
 * Identitas seri tidak pernah bergantung warna semata: legenda selalu ada, dan
 * tabel angka di bawahnya menyediakan nilai yang sama dalam teks — sekaligus
 * jalan bagi pembaca layar dan pengguna yang mencetak halaman.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import { fetchApi } from '@/lib/api';
import { KATEGORI, WARNA_SERI, angka, barisGrafik } from '@/lib/airTraffic';
import type { AirTrafficStats } from '@/types';
import { CalendarRange, Table2, Info } from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/** Ringkas angka besar pada sumbu supaya labelnya tidak bertabrakan. */
const ringkasSumbu = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return String(n);
};

function Keterangan({ aktif, payload, label, unit }: {
  aktif?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  unit: string;
}) {
  if (!aktif || !payload?.length) return null;

  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-lg px-3.5 py-2.5">
      <p className="text-[12px] font-black text-slate-900">{label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((p) => (
          <p key={p.name} className="flex items-center gap-2 text-[12px] text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="flex-1">{p.name}</span>
            {/* Angka memakai warna teks, bukan warna seri — warna adalah
                identitas mark, bukan hiasan tipografi. */}
            <span className="font-bold text-slate-900 tabular-nums">{angka(p.value)}</span>
            <span className="text-slate-400">{unit}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export default function StatistikView({ awal }: { awal: AirTrafficStats | null }) {
  const [data, setData] = useState<AirTrafficStats | null>(awal);
  const [tahun, setTahun] = useState<number | null>(awal?.year ?? null);

  /**
   * Keadaan memuat DITURUNKAN, bukan disetel.
   *
   * Menyetelnya dari dalam efek memicu render berantai. Di sini cukup
   * membandingkan tahun yang diminta dengan tahun yang sudah ada datanya:
   * begitu penyaring diklik, keduanya berbeda dan tampilannya langsung
   * menyatakan sedang memuat — tanpa render tambahan.
   */
  const memuat = data === null || data.year !== tahun;

  useEffect(() => {
    let batal = false;
    const kueri = tahun ? `?year=${tahun}` : '';

    fetchApi<AirTrafficStats>(`/air-traffic${kueri}`).then((res) => {
      if (!batal && res.success && res.data) setData(res.data);
    });

    return () => { batal = true; };
  }, [tahun]);

  const seri = data?.series ?? [];
  const punyaData = seri.length > 0;

  const rentang = useMemo(() => {
    if (!data?.range.from || !data.range.to) return null;

    const fmt = (t: string) =>
      new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return `${fmt(data.range.from)} – ${fmt(data.range.to)}`;
  }, [data]);

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Statistik"
        accent="Lalu Lintas Udara"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead="Catatan pergerakan pesawat, penumpang, bagasi, dan kargo yang dihimpun harian oleh unit operasi bandara."
        showBack={false}
      />

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        {/* ---- Penyaring: satu baris di atas seluruh grafik ---- */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-slate-500 mr-1">
            <CalendarRange className="w-3.5 h-3.5" /> Periode
          </span>

          <button
            onClick={() => setTahun(null)}
            aria-pressed={tahun === null}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-colors cursor-pointer ${
              tahun === null ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300'
            }`}
          >
            Semua Tahun
          </button>

          {(data?.years ?? []).map((t) => (
            <button
              key={t}
              onClick={() => setTahun(t)}
              aria-pressed={tahun === t}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-colors cursor-pointer ${
                tahun === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {rentang && (
          <p className="mt-3 text-[12.5px] text-slate-500">
            Tercatat {angka(data?.days ?? 0)} hari, {rentang}.
          </p>
        )}

        {/* ---- Kartu ringkasan: angka utama, bukan grafik ---- */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {KATEGORI.map((k) => {
            const Ikon = k.icon;
            const nilai = data?.summary[k.key];

            return (
              <motion.div
                key={k.key}
                variants={rise}
                className="bg-white ring-1 ring-slate-200 rounded-2xl p-5"
              >
                <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Ikon className="w-5 h-5 text-blue-600" />
                </span>
                <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {k.label}
                </p>
                <p className="mt-1 text-[26px] font-black text-slate-900 leading-none tabular-nums">
                  {nilai ? angka(nilai.total) : '—'}
                </p>
                <p className="mt-1 text-[11.5px] text-slate-500">
                  {k.unit}
                  {nilai && (
                    <> · datang {angka(nilai.arrival)} · berangkat {angka(nilai.departure)}</>
                  )}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ---- Grafik: satu per kategori ---- */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tren per Periode</h2>
        <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed max-w-2xl">
          Tiap kategori digambarkan terpisah karena satuannya berbeda — pergerakan pesawat dihitung
          per penerbangan, sedangkan bagasi dan kargo dalam kilogram. Menyatukannya dalam satu
          grafik akan membuat keduanya tampak sebanding padahal tidak.
        </p>

        {memuat && !punyaData ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5" aria-busy="true" aria-label="Memuat statistik">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-white ring-1 ring-slate-200 animate-pulse" />
            ))}
          </div>
        ) : !punyaData ? (
          <div className="mt-8 rounded-2xl bg-white ring-1 ring-slate-200 px-6 py-12 text-center">
            <Info className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="mt-3 text-[13.5px] font-bold text-slate-700">Belum ada catatan pada periode ini.</p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Statistik ditampilkan setelah unit operasi memasukkan catatan hariannya.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {KATEGORI.map((k) => (
              <div key={k.key} className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[14.5px] font-black text-slate-900">{k.label}</h3>
                  <span className="text-[11.5px] text-slate-400">{k.unit}</span>
                </div>

                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barisGrafik(seri, k.key)} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                      {/* Kisi menepi: garis horizontal tipis saja, supaya
                          batangnya yang terbaca lebih dulu. */}
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11.5, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={ringkasSumbu}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                      />
                      <Tooltip
                        cursor={{ fill: '#0f172a08' }}
                        content={({ active, payload, label }) => (
                          <Keterangan
                            aktif={active}
                            payload={payload as never}
                            label={label as string}
                            unit={k.unit}
                          />
                        )}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        height={28}
                        iconType="square"
                        iconSize={9}
                        wrapperStyle={{ fontSize: 11.5, color: '#475569' }}
                      />
                      {/* Ujung batang dibulatkan 4px dan berjarak 2px, sesuai
                          spesifikasi mark; radius hanya di ujung data. */}
                      <Bar dataKey="Kedatangan" fill={WARNA_SERI.arrival} radius={[4, 4, 0, 0]} maxBarSize={38} />
                      <Bar dataKey="Keberangkatan" fill={WARNA_SERI.departure} radius={[4, 4, 0, 0]} maxBarSize={38} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---- Tabel angka: identitas tidak bergantung warna ---- */}
        {punyaData && (
          <div className="mt-10">
            <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Table2 className="w-4 h-4 text-slate-400" /> Angka Lengkap
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Nilai yang sama dalam bentuk teks — dapat dibaca pembaca layar, disalin, dan dicetak.
            </p>

            <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-slate-200 bg-white">
              <table className="w-full text-[12.5px] border-collapse">
                <caption className="sr-only">
                  Statistik lalu lintas udara per periode, dipecah kedatangan dan keberangkatan.
                </caption>
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th scope="col" className="text-left font-bold px-4 py-3">Periode</th>
                    <th scope="col" className="text-right font-bold px-4 py-3">Hari</th>
                    {KATEGORI.map((k) => (
                      <th key={k.key} scope="col" className="text-right font-bold px-4 py-3 whitespace-nowrap">
                        {k.label}
                        <span className="block font-medium text-slate-400">datang / berangkat</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seri.map((p) => (
                    <tr key={p.period} className="border-t border-slate-100">
                      <th scope="row" className="text-left font-bold text-slate-800 px-4 py-3">{p.label}</th>
                      <td className="text-right text-slate-500 px-4 py-3 tabular-nums">{p.days}</td>
                      {KATEGORI.map((k) => (
                        <td key={k.key} className="text-right px-4 py-3 tabular-nums whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{angka(p[k.key].arrival)}</span>
                          <span className="text-slate-300"> / </span>
                          <span className="font-semibold text-slate-800">{angka(p[k.key].departure)}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-12 flex items-start gap-4">
          <span className="w-10 h-10 rounded-xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-sky-200" />
          </span>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Tentang Angka Ini</h2>
            <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-2xl">
              Angka dihimpun harian oleh unit operasi bandara dan dijumlahkan per periode. Bagasi dan
              kargo dinyatakan dalam kilogram; pergerakan pesawat dihitung per penerbangan, bukan per
              pesawat. Periode yang belum memiliki catatan tidak ditampilkan — bukan ditampilkan
              sebagai nol.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
