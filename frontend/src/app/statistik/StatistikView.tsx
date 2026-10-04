'use client';

/**
 * Dasbor statistik lalu lintas udara dari rekapitulasi LLAU bulanan.
 *
 * KEPUTUSAN BENTUK yang menentukan tampilan ini:
 *
 *  1. **Angka utama sebagai kartu, bukan grafik**, masing-masing dengan
 *     perubahan terhadap bulan sebelumnya. Satu bilangan tidak butuh grafik;
 *     yang membuatnya bermakna adalah pembandingnya.
 *
 *  2. **Satu grafik per satuan.** Penumpang (orang), pesawat (penerbangan),
 *     kargo (kg), dan ketepatan waktu (%) tidak pernah berbagi sumbu — dua
 *     sumbu berbeda skala membuat garis tampak sebanding padahal tidak.
 *
 *  3. **Peringkat (rute, maskapai, penyebab) sebagai batang HTML berlabel**,
 *     bukan grafik pustaka. Nama bandara panjang dan angkanya perlu terbaca
 *     langsung; batang di sini hanya penegas besarnya.
 *
 *  4. **Dua warna saja**: kedatangan dan keberangkatan dari palet tervalidasi.
 *     Grafik berseri tunggal memakai biru yang sama. Identitas seri tidak
 *     pernah bergantung warna semata — legenda selalu ada, dan tabel angka di
 *     bawah menyediakan nilai yang sama dalam teks.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import { fetchApi } from '@/lib/api';
import { WARNA_SERI, angka } from '@/lib/airTraffic';
import {
  WARNA_TUNGGAL, judulKata, namaRute, perubahan, persen, ringkasSumbu,
} from '@/lib/llau';
import type { LlauStats, LlauSummary, LlauNamedCount } from '@/types';
import {
  CalendarRange, Table2, Info, Plane, Users, Package, Luggage, Timer, Armchair,
  ArrowUpRight, ArrowDownRight, MapPin, Building2, Clock, CloudRain, Layers,
} from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

/* ------------------------------------------------------------------ */
/* Bagian kecil                                                        */
/* ------------------------------------------------------------------ */

type Baris = { name: string; value: number; color: string };

function Keterangan({ aktif, payload, label, unit }: {
  aktif?: boolean;
  payload?: Baris[];
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
            <span className="font-bold text-slate-900 tabular-nums">
              {unit === '%' ? persen(p.value) : angka(p.value)}
            </span>
            {unit !== '%' && <span className="text-slate-400">{unit}</span>}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Kartu grafik dengan judul dan satuan. */
function KartuGrafik({ judul, unit, children, tinggi = 'h-56' }: {
  judul: string;
  unit: string;
  children: React.ReactElement;
  tinggi?: string;
}) {
  return (
    <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[14.5px] font-black text-slate-900">{judul}</h3>
        <span className="text-[11.5px] text-slate-400">{unit}</span>
      </div>
      <div className={`mt-4 ${tinggi}`}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

const sumbuX = { tick: { fontSize: 11.5, fill: '#64748b' }, axisLine: { stroke: '#e2e8f0' }, tickLine: false } as const;
const sumbuY = { tickFormatter: ringkasSumbu, tick: { fontSize: 11, fill: '#94a3b8' }, axisLine: false, tickLine: false, width: 48 } as const;
const legenda = {
  verticalAlign: 'top' as const, align: 'right' as const, height: 28, iconType: 'square' as const, iconSize: 9,
  wrapperStyle: { fontSize: 11.5, color: '#475569' },
};

/** Penanda perubahan terhadap bulan lalu. Teks berwarna netral; arah dibawa ikon. */
function Delta({ nilai, satuan = '%' }: { nilai: number | null; satuan?: string }) {
  if (nilai === null || !Number.isFinite(nilai)) return null;

  const naik = nilai >= 0;
  const Ikon = naik ? ArrowUpRight : ArrowDownRight;

  return (
    <span className="inline-flex items-center gap-0.5 text-[11.5px] font-bold text-slate-600 tabular-nums">
      <Ikon className="w-3.5 h-3.5" aria-hidden />
      {naik ? '+' : '−'}
      {Math.abs(nilai).toLocaleString('id-ID', { maximumFractionDigits: 1 })}
      {satuan}
    </span>
  );
}

/** Daftar peringkat berbatang: nama, batang sebanding, angka. */
function Peringkat({ baris, unit, kosong }: {
  baris: { key: string; nama: string; sub?: string; nilai: number }[];
  unit: string;
  kosong: string;
}) {
  const maks = Math.max(1, ...baris.map((b) => b.nilai));

  if (baris.length === 0) {
    return <p className="text-[12.5px] text-slate-500 py-6 text-center">{kosong}</p>;
  }

  return (
    <ol className="space-y-3">
      {baris.map((b, i) => (
        <li key={b.key}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-[12.5px] text-slate-700 truncate">
              <span className="text-slate-400 tabular-nums mr-1.5">{i + 1}.</span>
              <span className="font-bold text-slate-900">{b.nama}</span>
              {b.sub && <span className="text-slate-400"> · {b.sub}</span>}
            </p>
            <p className="flex-shrink-0 text-[12.5px] font-bold text-slate-900 tabular-nums">
              {angka(b.nilai)} <span className="font-medium text-slate-400">{unit}</span>
            </p>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(b.nilai / maks) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: WARNA_TUNGGAL }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Panel({ ikon: Ikon, judul, catatan, children }: {
  ikon: React.ComponentType<{ className?: string }>;
  judul: string;
  catatan?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-5 sm:p-6">
      <h3 className="text-[14.5px] font-black text-slate-900 flex items-center gap-2">
        <Ikon className="w-4 h-4 text-blue-600" /> {judul}
      </h3>
      {catatan && <p className="mt-1 text-[12px] text-slate-500 leading-relaxed">{catatan}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Kartu = {
  key: string;
  label: string;
  ikon: React.ComponentType<{ className?: string }>;
  nilai: string;
  unit: string;
  rinci?: string;
  delta: number | null;
  deltaSatuan?: string;
};

function susunKartu(s: LlauSummary, lalu: LlauSummary | null): Kartu[] {
  const otpLalu = lalu?.otp.rate ?? null;
  const lfLalu = lalu?.load_factor ?? null;

  return [
    {
      key: 'flights', label: 'Pergerakan Pesawat', ikon: Plane, nilai: angka(s.flights.total), unit: 'penerbangan',
      rinci: `datang ${angka(s.flights.arrival)} · berangkat ${angka(s.flights.departure)}`,
      delta: perubahan(s.flights.total, lalu?.flights.total),
    },
    {
      key: 'passengers', label: 'Penumpang', ikon: Users, nilai: angka(s.passengers.total), unit: 'orang',
      rinci: `datang ${angka(s.passengers.arrival)} · berangkat ${angka(s.passengers.departure)}`,
      delta: perubahan(s.passengers.total, lalu?.passengers.total),
    },
    {
      key: 'cargo', label: 'Kargo', ikon: Package, nilai: angka(s.cargo.total), unit: 'kg',
      rinci: `bongkar ${angka(s.cargo.arrival)} · muat ${angka(s.cargo.departure)}`,
      delta: perubahan(s.cargo.total, lalu?.cargo.total),
    },
    {
      key: 'baggage', label: 'Bagasi', ikon: Luggage, nilai: angka(s.baggage.total), unit: 'kg',
      rinci: `datang ${angka(s.baggage.arrival)} · berangkat ${angka(s.baggage.departure)}`,
      delta: perubahan(s.baggage.total, lalu?.baggage.total),
    },
    {
      key: 'otp', label: 'Ketepatan Waktu', ikon: Timer, nilai: persen(s.otp.rate), unit: '',
      rinci: `${angka(s.otp.on_time)} dari ${angka(s.otp.measured)} penerbangan berjadwal`,
      // Selisih persen dinyatakan dalam POIN, bukan persen dari persen.
      delta: s.otp.rate !== null && otpLalu !== null ? s.otp.rate - otpLalu : null,
      deltaSatuan: ' poin',
    },
    {
      key: 'lf', label: 'Keterisian Kursi', ikon: Armchair, nilai: persen(s.load_factor), unit: '',
      rinci: 'rata-rata penerbangan berjadwal',
      delta: s.load_factor !== null && lfLalu !== null ? s.load_factor - lfLalu : null,
      deltaSatuan: ' poin',
    },
  ];
}

type ModeHarian = 'passengers' | 'flights';

export default function StatistikView({ awal }: { awal: LlauStats | null }) {
  const [data, setData] = useState<LlauStats | null>(awal);
  /** Bulan yang dipilih pengunjung; null = bulan terbaru kiriman server. */
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [modeHarian, setModeHarian] = useState<ModeHarian>('passengers');

  /**
   * Keadaan memuat DITURUNKAN, bukan disetel: begitu bulan lain diklik,
   * bulan yang diminta berbeda dari bulan yang datanya ada.
   */
  const memuat = pilihan !== null && data?.period?.period !== pilihan;

  useEffect(() => {
    if (pilihan === null) return;

    let batal = false;
    fetchApi<LlauStats>(`/llau?period=${pilihan}`).then((res) => {
      if (!batal && res.success && res.data) setData(res.data);
    });

    return () => { batal = true; };
  }, [pilihan]);

  const aktif = pilihan ?? data?.period?.period ?? null;
  const p = data?.period ?? null;
  const s = p?.summary ?? null;
  const kartu = useMemo(() => (s ? susunKartu(s, data?.previous?.summary ?? null) : []), [s, data?.previous]);

  const harian = useMemo(() => (p?.daily ?? []).map((d) => ({
    label: String(Number(d.date.slice(8, 10))),
    tanggal: new Date(`${d.date}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
    Kedatangan: modeHarian === 'passengers' ? d.passengers_arrival : d.flights_arrival,
    Keberangkatan: modeHarian === 'passengers' ? d.passengers_departure : d.flights_departure,
  })), [p, modeHarian]);

  const tren = useMemo(() => data?.trend ?? [], [data]);
  const trenBaris = useMemo(() => tren.map((t) => ({
    label: t.label,
    PenumpangDatang: t.passengers_arrival,
    PenumpangBerangkat: t.passengers_departure,
    PesawatDatang: t.flights_arrival,
    PesawatBerangkat: t.flights_departure,
    Kargo: t.cargo,
    OTP: t.otp_rate,
  })), [tren]);

  const jam = useMemo(() => (p?.hourly ?? [])
    // Jam tanpa satu pun penerbangan di ujung hari dipangkas supaya
    // batangnya tidak berdesakan; jam kosong di tengah tetap tampil.
    .filter((h, _, semua) => {
      const aktif = semua.filter((x) => x.arrival + x.departure > 0).map((x) => x.hour);
      return aktif.length === 0 || (h.hour >= Math.min(...aktif) && h.hour <= Math.max(...aktif));
    })
    .map((h) => ({ label: `${String(h.hour).padStart(2, '0')}.00`, Kedatangan: h.arrival, Keberangkatan: h.departure })), [p]);

  const daftarHitung = (b: LlauNamedCount[]) =>
    b.map((x) => ({ key: x.name, nama: judulKata(x.name), nilai: x.flights }));

  const diperbarui = p?.updated_at
    ? new Date(p.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Statistik"
        accent="Lalu Lintas Udara"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead="Rekapitulasi bulanan Lalu Lintas Angkutan Udara (LLAU): pergerakan pesawat, penumpang, kargo, rute, maskapai, dan ketepatan waktu."
        showBack={false}
      />

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        {!p ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 px-6 py-14 text-center">
            <Info className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="mt-3 text-[13.5px] font-bold text-slate-700">Belum ada rekapitulasi yang diterbitkan.</p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Statistik tampil setelah unit operasi mengunggah rekapitulasi LLAU bulanan.
            </p>
          </div>
        ) : (
          <>
            {/* ---- Penyaring bulan: satu baris di atas seluruh isi ---- */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-slate-500 flex-shrink-0">
                <CalendarRange className="w-3.5 h-3.5" /> Bulan
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 [scrollbar-width:thin]">
                {(data?.periods ?? []).map((b) => (
                  <button
                    key={b.period}
                    onClick={() => setPilihan(b.period)}
                    aria-pressed={aktif === b.period}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-colors cursor-pointer ${
                      aktif === b.period ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[12.5px] text-slate-500" aria-live="polite">
              {memuat ? 'Memuat…' : (
                <>
                  Sumber: Rekapitulasi LLAU <strong className="text-slate-700">{p.label}</strong>
                  {' '}· {angka(s!.days)} hari tercatat{diperbarui && <> · diperbarui {diperbarui}</>}
                  {data?.previous && <> · perubahan dibandingkan {data.previous.label}</>}
                </>
              )}
            </p>

            {/* ---- Kartu angka utama ---- */}
            <motion.div
              key={p.period}
              variants={container}
              initial="hidden"
              animate="show"
              className={`mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 transition-opacity ${memuat ? 'opacity-50' : ''}`}
            >
              {kartu.map((k) => {
                const Ikon = k.ikon;

                return (
                  <motion.div key={k.key} variants={rise} className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Ikon className="w-5 h-5 text-blue-600" />
                      </span>
                      <Delta nilai={k.delta} satuan={k.deltaSatuan} />
                    </div>
                    <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{k.label}</p>
                    <p className="mt-1 text-[28px] font-black text-slate-900 leading-none tabular-nums">
                      {k.nilai}
                      {k.unit && <span className="ml-1.5 text-[12px] font-bold text-slate-400">{k.unit}</span>}
                    </p>
                    {k.rinci && <p className="mt-1.5 text-[11.5px] text-slate-500">{k.rinci}</p>}
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </section>

      {p && s && (
        <>
          {/* ---- Harian ---- */}
          <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Harian · {p.label}</h2>
                <p className="mt-1.5 text-[13px] text-slate-500">Kedatangan dan keberangkatan setiap tanggal.</p>
              </div>
              <div role="group" aria-label="Ukuran grafik harian" className="inline-flex rounded-full bg-white ring-1 ring-slate-200 p-1">
                {([['passengers', 'Penumpang'], ['flights', 'Penerbangan']] as const).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setModeHarian(m)}
                    aria-pressed={modeHarian === m}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
                      modeHarian === m ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-blue-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <KartuGrafik
                judul={modeHarian === 'passengers' ? 'Penumpang per Hari' : 'Pergerakan Pesawat per Hari'}
                unit={modeHarian === 'passengers' ? 'orang' : 'penerbangan'}
                tinggi="h-64"
              >
                <BarChart data={harian} margin={{ top: 4, right: 4, bottom: 0, left: -8 }} barGap={2}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" {...sumbuX} interval="preserveStartEnd" minTickGap={6} />
                  <YAxis {...sumbuY} />
                  <Tooltip
                    cursor={{ fill: '#0f172a08' }}
                    content={({ active, payload }) => (
                      <Keterangan
                        aktif={active}
                        payload={payload as never}
                        label={(payload?.[0]?.payload as { tanggal?: string } | undefined)?.tanggal}
                        unit={modeHarian === 'passengers' ? 'orang' : 'penerbangan'}
                      />
                    )}
                  />
                  <Legend {...legenda} />
                  {/* Bertumpuk: totalnya per hari yang dibaca lebih dulu;
                      celah 2px memisahkan kedua ruas. */}
                  <Bar dataKey="Kedatangan" stackId="h" fill={WARNA_SERI.arrival} stroke="#fff" strokeWidth={1} maxBarSize={22} />
                  <Bar dataKey="Keberangkatan" stackId="h" fill={WARNA_SERI.departure} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </KartuGrafik>
            </div>
          </section>

          {/* ---- Rute & maskapai ---- */}
          <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Rute dan Maskapai</h2>
            <p className="mt-1.5 text-[13px] text-slate-500">
              {angka(s.routes)} bandara terhubung dan {angka(s.operators)} operator penerbangan pada {p.label}.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel ikon={MapPin} judul="Rute Teramai" catatan="Penumpang datang dan berangkat, menurut bandara di ujung lain rute.">
                <Peringkat
                  kosong="Belum ada rute berpenumpang."
                  unit="orang"
                  baris={p.routes.filter((r) => r.passengers > 0).slice(0, 10).map((r) => ({
                    key: r.code,
                    nama: namaRute(r.code),
                    sub: `${r.code === 'LOKAL' || r.code === 'ZZZZ' ? '' : `${r.code} · `}${angka(r.flights)} penerbangan`,
                    nilai: r.passengers,
                  }))}
                />
              </Panel>

              <Panel ikon={Building2} judul="Operator Penerbangan" catatan="Diurutkan menurut jumlah pergerakan; persentase dari seluruh penerbangan bulan ini.">
                <Peringkat
                  kosong="Belum ada data operator."
                  unit="penerbangan"
                  baris={p.operators.slice(0, 10).map((o) => ({
                    key: o.icao ?? o.name,
                    nama: o.name,
                    sub: `${persen(o.share)} · ${angka(o.passengers)} penumpang`,
                    nilai: o.flights,
                  }))}
                />
              </Panel>
            </div>
          </section>

          {/* ---- Ketepatan waktu ---- */}
          <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ketepatan Waktu</h2>
            <p className="mt-1.5 text-[13px] text-slate-500 max-w-3xl leading-relaxed">
              Penerbangan berjadwal dianggap tepat waktu bila waktu aktualnya paling lambat 15 menit dari
              jadwal. Penerbangan perintis, carter, dan bukan niaga tidak ikut diukur.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] rounded-2xl p-6 text-white relative overflow-hidden">
                <FlightArc className="absolute inset-x-0 top-2 h-32 text-white/10" d="M-20 140 Q 200 20 520 90" />
                <p className="relative text-[10.5px] font-bold uppercase tracking-[0.16em] text-sky-200">Tepat waktu · {p.label}</p>
                <p className="relative mt-2 text-[52px] font-black leading-none tabular-nums">{persen(s.otp.rate)}</p>
                <dl className="relative mt-5 grid grid-cols-2 gap-4 text-[12.5px]">
                  <div>
                    <dt className="text-blue-100/70">Tepat waktu</dt>
                    <dd className="mt-0.5 text-lg font-black tabular-nums">{angka(s.otp.on_time)}</dd>
                  </div>
                  <div>
                    <dt className="text-blue-100/70">Terlambat &gt; 15 menit</dt>
                    <dd className="mt-0.5 text-lg font-black tabular-nums">{angka(s.otp.late)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-blue-100/70">Rata-rata keterlambatan (yang terlambat)</dt>
                    <dd className="mt-0.5 text-lg font-black tabular-nums">
                      {s.otp.average_late_minutes !== null ? `${angka(s.otp.average_late_minutes)} menit` : '—'}
                    </dd>
                  </div>
                </dl>
              </div>

              <Panel ikon={CloudRain} judul="Penyebab Keterlambatan" catatan="Kategori yang dicatat pada penerbangan berjadwal yang terlambat.">
                <Peringkat kosong="Tidak ada penerbangan berjadwal yang terlambat." unit="penerbangan" baris={daftarHitung(p.delay_causes)} />
              </Panel>

              <KartuGrafik judul="Ketepatan Waktu per Bulan" unit="%">
                <LineChart data={trenBaris} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" {...sumbuX} />
                  <YAxis {...sumbuY} tickFormatter={(n: number) => `${n}%`} domain={[0, 100]} />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <Keterangan aktif={active} payload={payload as never} label={label as string} unit="%" />
                    )}
                  />
                  <Line type="linear" dataKey="OTP" name="Tepat waktu" stroke={WARNA_TUNGGAL} strokeWidth={2} dot={{ r: 4, fill: WARNA_TUNGGAL, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls={false} />
                </LineChart>
              </KartuGrafik>
            </div>
          </section>

          {/* ---- Jam sibuk & komposisi ---- */}
          <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pola Operasi</h2>
            <p className="mt-1.5 text-[13px] text-slate-500">Sebaran jam terjadwal, jenis kegiatan, dan tipe pesawat.</p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-3">
                <KartuGrafik judul="Jam Sibuk (waktu setempat)" unit="penerbangan sebulan">
                  <BarChart data={jam} margin={{ top: 4, right: 4, bottom: 0, left: -8 }} barGap={2}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" {...sumbuX} />
                    <YAxis {...sumbuY} />
                    <Tooltip
                      cursor={{ fill: '#0f172a08' }}
                      content={({ active, payload, label }) => (
                        <Keterangan aktif={active} payload={payload as never} label={`Pukul ${label}`} unit="penerbangan" />
                      )}
                    />
                    <Legend {...legenda} />
                    <Bar dataKey="Kedatangan" fill={WARNA_SERI.arrival} radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="Keberangkatan" fill={WARNA_SERI.departure} radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </KartuGrafik>
              </div>

              <Panel ikon={Layers} judul="Kegiatan Penerbangan">
                <Peringkat kosong="Belum ada data." unit="penerbangan" baris={daftarHitung(p.categories)} />
              </Panel>
              <Panel ikon={Plane} judul="Tipe Pesawat">
                <Peringkat kosong="Belum ada data." unit="penerbangan" baris={p.aircraft_types.map((a) => ({ key: a.name, nama: a.name, nilai: a.flights }))} />
              </Panel>
              <Panel ikon={Clock} judul="Ringkasan Lain">
                <dl className="space-y-3 text-[12.5px]">
                  {[
                    ['Penumpang transit', `${angka(s.transit)} orang`],
                    ['Pos', `${angka(s.mail.total)} kg`],
                    ['Rata-rata penerbangan per hari', s.days ? angka(Math.round(s.flights.total / s.days)) : '—'],
                    ['Rata-rata penumpang per hari', s.days ? `${angka(Math.round(s.passengers.total / s.days))} orang` : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-0">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-bold text-slate-900 tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </div>
          </section>

          {/* ---- Tren bulanan ---- */}
          <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tren Bulanan</h2>
            <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed max-w-2xl">
              Setiap ukuran digambar terpisah karena satuannya berbeda — menyatukannya dalam satu grafik
              akan membuat keduanya tampak sebanding padahal tidak.
            </p>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <KartuGrafik judul="Penumpang" unit="orang">
                <BarChart data={trenBaris} margin={{ top: 4, right: 4, bottom: 0, left: -8 }} barGap={2}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" {...sumbuX} />
                  <YAxis {...sumbuY} />
                  <Tooltip cursor={{ fill: '#0f172a08' }} content={({ active, payload, label }) => (
                    <Keterangan aktif={active} payload={payload as never} label={label as string} unit="orang" />
                  )} />
                  <Legend {...legenda} />
                  <Bar dataKey="PenumpangDatang" name="Kedatangan" fill={WARNA_SERI.arrival} radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="PenumpangBerangkat" name="Keberangkatan" fill={WARNA_SERI.departure} radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </KartuGrafik>

              <KartuGrafik judul="Pergerakan Pesawat" unit="penerbangan">
                <BarChart data={trenBaris} margin={{ top: 4, right: 4, bottom: 0, left: -8 }} barGap={2}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" {...sumbuX} />
                  <YAxis {...sumbuY} />
                  <Tooltip cursor={{ fill: '#0f172a08' }} content={({ active, payload, label }) => (
                    <Keterangan aktif={active} payload={payload as never} label={label as string} unit="penerbangan" />
                  )} />
                  <Legend {...legenda} />
                  <Bar dataKey="PesawatDatang" name="Kedatangan" fill={WARNA_SERI.arrival} radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="PesawatBerangkat" name="Keberangkatan" fill={WARNA_SERI.departure} radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </KartuGrafik>

              <KartuGrafik judul="Kargo" unit="kg">
                <BarChart data={trenBaris} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" {...sumbuX} />
                  <YAxis {...sumbuY} />
                  <Tooltip cursor={{ fill: '#0f172a08' }} content={({ active, payload, label }) => (
                    <Keterangan aktif={active} payload={payload as never} label={label as string} unit="kg" />
                  )} />
                  <Bar dataKey="Kargo" fill={WARNA_TUNGGAL} radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </KartuGrafik>
            </div>

            {/* ---- Tabel angka: identitas tidak bergantung warna ---- */}
            <div className="mt-10">
              <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Table2 className="w-4 h-4 text-slate-400" /> Angka Lengkap per Bulan
              </h3>
              <p className="mt-1 text-[12px] text-slate-500">
                Nilai yang sama dalam bentuk teks — dapat dibaca pembaca layar, disalin, dan dicetak.
              </p>

              <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-slate-200 bg-white">
                <table className="w-full text-[12.5px] border-collapse">
                  <caption className="sr-only">Rekapitulasi LLAU per bulan.</caption>
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th scope="col" className="text-left font-bold px-4 py-3">Bulan</th>
                      <th scope="col" className="text-right font-bold px-4 py-3 whitespace-nowrap">Pesawat<span className="block font-medium text-slate-400">datang / berangkat</span></th>
                      <th scope="col" className="text-right font-bold px-4 py-3 whitespace-nowrap">Penumpang<span className="block font-medium text-slate-400">datang / berangkat</span></th>
                      <th scope="col" className="text-right font-bold px-4 py-3 whitespace-nowrap">Bagasi<span className="block font-medium text-slate-400">kg</span></th>
                      <th scope="col" className="text-right font-bold px-4 py-3 whitespace-nowrap">Kargo<span className="block font-medium text-slate-400">kg</span></th>
                      <th scope="col" className="text-right font-bold px-4 py-3 whitespace-nowrap">Tepat waktu<span className="block font-medium text-slate-400">berjadwal</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tren].reverse().map((t) => (
                      <tr key={t.period} className="border-t border-slate-100">
                        <th scope="row" className="text-left font-bold text-slate-800 px-4 py-3 whitespace-nowrap">
                          {data?.periods.find((x) => x.period === t.period)?.label ?? t.label}
                        </th>
                        <td className="text-right px-4 py-3 tabular-nums whitespace-nowrap">
                          {angka(t.flights_arrival)}<span className="text-slate-300"> / </span>{angka(t.flights_departure)}
                        </td>
                        <td className="text-right px-4 py-3 tabular-nums whitespace-nowrap">
                          {angka(t.passengers_arrival)}<span className="text-slate-300"> / </span>{angka(t.passengers_departure)}
                        </td>
                        <td className="text-right px-4 py-3 tabular-nums">{angka(t.baggage)}</td>
                        <td className="text-right px-4 py-3 tabular-nums">{angka(t.cargo)}</td>
                        <td className="text-right px-4 py-3 tabular-nums">{persen(t.otp_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-12 flex items-start gap-4">
          <span className="w-10 h-10 rounded-xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-sky-200" />
          </span>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Tentang Angka Ini</h2>
            <ul className="mt-2 space-y-1.5 text-[13.5px] text-blue-100/85 leading-relaxed max-w-3xl list-disc pl-4">
              <li>Sumbernya rekapitulasi LLAU bulanan yang disusun unit operasi bandara per penerbangan, menurut format Direktorat Jenderal Perhubungan Udara.</li>
              <li>Penumpang mencakup dewasa, anak, bayi, dan penumpang transit — sama dengan baris total pada rekapitulasi resminya.</li>
              <li>Ketepatan waktu dan keterisian kursi hanya dihitung pada penerbangan berjadwal. Bayi dipangku sehingga tidak dihitung menempati kursi.</li>
              <li>Bagasi, kargo, dan pos dinyatakan dalam kilogram. Bulan yang rekapitulasinya belum diunggah tidak ditampilkan, bukan ditampilkan sebagai nol.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
