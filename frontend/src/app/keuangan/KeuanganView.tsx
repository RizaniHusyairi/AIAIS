'use client';

/**
 * Kinerja keuangan BLU Bandara APT Pranoto.
 *
 * KEPUTUSAN BENTUK:
 *
 *  1. **Dua grafik, bukan satu.** Pemasukan dan anggaran adalah dua besaran
 *     sejenis (rupiah) — sah disandingkan pada satu sumbu. Sedangkan "berapa
 *     anggaran yang sudah dirinci" bukan seri ketiga melainkan BAGIAN DARI
 *     anggaran, jadi ia digambar sebagai batang bertumpuk tersendiri. Menaruh
 *     ketiganya berdampingan akan menghitung ganda uang yang sama.
 *
 *  2. **Batang bertumpuk untuk terinci vs belum terinci**, karena keduanya
 *     berjumlah tepat sebesar pagunya. Bagian yang belum terinci berwarna
 *     abu-abu netral: ia bukan pos anggaran, melainkan data yang belum
 *     diketik.
 *
 *  3. **Tak satu pun label berbunyi "realisasi" atau "pengeluaran".** Lihat
 *     `lib/finance.ts` — v1 memakai kata itu dan membuat bandaranya sendiri
 *     tampak tak menyerap anggaran.
 *
 * Identitas seri tidak pernah bergantung warna semata: legenda selalu ada dan
 * tabel angka menyediakan nilai yang sama dalam teks.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import { fetchApi } from '@/lib/api';
import { WARNA, rupiah, rupiahRingkas, ringkasSumbu, persenTerinci } from '@/lib/finance';
import type { FinanceStats } from '@/types';
import {
  CalendarRange, Table2, Info, TrendingUp, Wallet, ListChecks, PieChart,
} from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

function Keterangan({ aktif, payload, label }: {
  aktif?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
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
            {/* Angka memakai warna teks, bukan warna seri. */}
            <span className="font-bold text-slate-900 tabular-nums">{rupiah(p.value)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function KartuGrafik({ judul, keterangan, children }: {
  judul: string;
  keterangan: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
      <h3 className="text-[14.5px] font-black text-slate-900">{judul}</h3>
      <p className="mt-1 text-[11.5px] text-slate-500 leading-relaxed">{keterangan}</p>
      <div className="mt-4 h-60">{children}</div>
    </div>
  );
}

export default function KeuanganView({ awal }: { awal: FinanceStats | null }) {
  const [data, setData] = useState<FinanceStats | null>(awal);
  const [tahun, setTahun] = useState<number | null>(awal?.year ?? null);

  // Keadaan memuat diturunkan, bukan disetel — menyetelnya dari dalam efek
  // memicu render berantai. Pola yang sama dipakai halaman statistik.
  const memuat = data === null || data.year !== tahun;

  useEffect(() => {
    let batal = false;
    const kueri = tahun ? `?year=${tahun}` : '';

    fetchApi<FinanceStats>(`/finances${kueri}`).then((res) => {
      if (!batal && res.success && res.data) setData(res.data);
    });

    return () => { batal = true; };
  }, [tahun]);

  const seri = data?.series ?? [];
  const punyaData = seri.length > 0;
  const ringkasan = data?.summary;
  const persen = ringkasan ? persenTerinci(ringkasan.budget, ringkasan.detailed) : null;

  const barisArus = seri.map((p) => ({
    label: p.label,
    Pemasukan: p.income,
    Anggaran: p.budget,
  }));

  const barisRincian = seri.map((p) => ({
    label: p.label,
    Terinci: p.detailed,
    'Belum terinci': p.undetailed,
  }));

  const kartu = [
    {
      key: 'income',
      label: 'Pemasukan',
      nilai: ringkasan?.income,
      icon: TrendingUp,
      catatan: 'Total penerimaan tercatat',
    },
    {
      key: 'budget',
      label: 'Anggaran',
      nilai: ringkasan?.budget,
      icon: Wallet,
      catatan: 'Pagu anggaran tercatat',
    },
    {
      key: 'detailed',
      label: 'Anggaran Terinci',
      nilai: ringkasan?.detailed,
      icon: ListChecks,
      catatan: persen !== null ? `${persen}% dari pagu sudah dirinci` : 'Belum ada anggaran tercatat',
    },
  ];

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Kinerja"
        accent="Keuangan"
        subtitle="Badan Layanan Umum Bandar Udara APT Pranoto"
        lead="Rekapitulasi pemasukan dan anggaran bandara beserta rincian pos belanjanya, dibuka sebagai bagian dari keterbukaan informasi publik."
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

        {data && (
          <p className="mt-3 text-[12.5px] text-slate-500">
            {data.entries.toLocaleString('id-ID')} catatan keuangan pada periode ini.
          </p>
        )}

        {/* ---- Kartu ringkasan: angka utama, bukan grafik ---- */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {kartu.map((k) => {
            const Ikon = k.icon;

            return (
              <motion.div key={k.key} variants={rise} className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
                <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Ikon className="w-5 h-5 text-blue-600" />
                </span>
                <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {k.label}
                </p>
                {/* Nilai ringkas terbaca sekilas; nilai utuhnya ada pada
                    atribut title dan pada tabel angka di bawah. */}
                <p
                  className="mt-1 text-[26px] font-black text-slate-900 leading-none tabular-nums"
                  title={k.nilai !== undefined ? rupiah(k.nilai) : undefined}
                >
                  {k.nilai !== undefined ? rupiahRingkas(k.nilai) : '—'}
                </p>
                <p className="mt-1 text-[11.5px] text-slate-500">{k.catatan}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ---- Grafik ---- */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tren per Periode</h2>
        <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed max-w-2xl">
          Seluruh angka dalam rupiah dan digambar pada satu skala, sehingga tinggi batang benar-benar
          dapat dibandingkan antargrafik.
        </p>

        {memuat && !punyaData ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5" aria-busy="true" aria-label="Memuat data keuangan">
            {[0, 1].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-white ring-1 ring-slate-200 animate-pulse" />
            ))}
          </div>
        ) : !punyaData ? (
          <div className="mt-8 rounded-2xl bg-white ring-1 ring-slate-200 px-6 py-12 text-center">
            <Info className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="mt-3 text-[13.5px] font-bold text-slate-700">Belum ada catatan pada periode ini.</p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Data ditampilkan setelah unit keuangan memasukkan catatannya.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <KartuGrafik
              judul="Pemasukan dan Anggaran"
              keterangan="Dua besaran sejenis, satu sumbu — tinggi batangnya sebanding."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barisArus} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
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
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: '#0f172a08' }}
                    content={({ active, payload, label }) => (
                      <Keterangan aktif={active} payload={payload as never} label={label as string} />
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
                  <Bar dataKey="Pemasukan" fill={WARNA.pemasukan} radius={[4, 4, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="Anggaran" fill={WARNA.anggaran} radius={[4, 4, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </KartuGrafik>

            <KartuGrafik
              judul="Seberapa Jauh Anggaran Sudah Dirinci"
              keterangan="Tumpukan keduanya sama tinggi dengan pagu anggaran. Bagian abu-abu adalah pos yang rinciannya belum dicatat — bukan sisa uang."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barisRincian} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
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
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: '#0f172a08' }}
                    content={({ active, payload, label }) => (
                      <Keterangan aktif={active} payload={payload as never} label={label as string} />
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
                  {/* Garis putih 2px memisahkan kedua segmen tumpukan, supaya
                      batasnya terbaca tanpa mengandalkan beda warna saja. */}
                  <Bar
                    dataKey="Terinci"
                    stackId="anggaran"
                    fill={WARNA.anggaran}
                    stroke="#ffffff"
                    strokeWidth={2}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="Belum terinci"
                    stackId="anggaran"
                    fill={WARNA.belumTerinci}
                    stroke="#ffffff"
                    strokeWidth={2}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </KartuGrafik>
          </div>
        )}

        {/* ---- Sumber dana ---- */}
        {(data?.sources.length ?? 0) > 0 && (
          <div className="mt-10">
            <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-400" /> Sumber Dana
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Hanya catatan yang sumber dananya sudah diisi yang muncul di sini, sehingga jumlahnya
              belum tentu sama dengan total di atas.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {data!.sources.map((s) => (
                <div key={s.source} className="bg-white ring-1 ring-slate-200 rounded-2xl px-5 py-4 min-w-[200px]">
                  <p className="text-[12.5px] font-bold text-slate-700">{s.source}</p>
                  <p
                    className="mt-1 text-[20px] font-black text-slate-900 tabular-nums leading-none"
                    title={rupiah(s.amount)}
                  >
                    {rupiahRingkas(s.amount)}
                  </p>
                  <p className="mt-1 text-[11.5px] text-slate-500">{s.entries} catatan</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Tabel angka: identitas tidak bergantung warna ---- */}
        {punyaData && (
          <div className="mt-10">
            <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Table2 className="w-4 h-4 text-slate-400" /> Angka Lengkap
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Nilai rupiah utuh dalam bentuk teks — dapat dibaca pembaca layar, disalin, dan dicetak.
            </p>

            <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-slate-200 bg-white">
              <table className="w-full text-[12.5px] border-collapse">
                <caption className="sr-only">
                  Pemasukan, anggaran, dan bagian anggaran yang sudah dirinci, per periode.
                </caption>
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th scope="col" className="text-left font-bold px-4 py-3">Periode</th>
                    <th scope="col" className="text-right font-bold px-4 py-3">Catatan</th>
                    <th scope="col" className="text-right font-bold px-4 py-3">Pemasukan</th>
                    <th scope="col" className="text-right font-bold px-4 py-3">Anggaran</th>
                    <th scope="col" className="text-right font-bold px-4 py-3">Terinci</th>
                    <th scope="col" className="text-right font-bold px-4 py-3 whitespace-nowrap">
                      Belum terinci
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seri.map((p) => (
                    <tr key={p.period} className="border-t border-slate-100">
                      <th scope="row" className="text-left font-bold text-slate-800 px-4 py-3">{p.label}</th>
                      <td className="text-right text-slate-500 px-4 py-3 tabular-nums">{p.entries}</td>
                      <td className="text-right px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-slate-800">
                        {rupiah(p.income)}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-slate-800">
                        {rupiah(p.budget)}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-slate-800">
                        {rupiah(p.detailed)}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums whitespace-nowrap text-slate-500">
                        {rupiah(p.undetailed)}
                      </td>
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
            <h2 className="text-xl font-black text-white tracking-tight">Cara Membaca Angka Ini</h2>
            <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-2xl">
              <strong className="text-white">Anggaran terinci</strong> adalah bagian pagu yang sudah
              dipecah ke dalam pos belanja pada catatan bandara — bukan jumlah uang yang sudah
              dibelanjakan. Selisihnya menunjukkan pos yang rinciannya belum dicatat, bukan anggaran
              yang tidak terpakai. Periode yang belum memiliki catatan tidak ditampilkan sebagai nol.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
