'use client';

/**
 * Rincian satu rekapitulasi LLAU — ruang periksa petugas.
 *
 * Dasbor publik menjawab "bagaimana bulan ini"; halaman ini menjawab
 * "apakah angka bulan ini bisa dipercaya, dan kalau janggal, baris mana
 * penyebabnya". Karena itu susunannya dari ringkas ke rinci:
 *
 *  1. Angka utama + perubahan terhadap bulan sebelumnya.
 *  2. Kecocokan per kolom dengan baris JUMLAH Excel, dan DAFTAR PERIKSA mutu
 *     data — baris yang lolos parser tetapi isinya patut dicurigai
 *     (penumpang melebihi kursi, selisih waktu berjam-jam, terlambat tanpa
 *     penyebab). Pemeriksaan ini sengaja di sisi klien dan TIDAK menolak
 *     apa pun: ambangnya tebakan wajar, bukan aturan, dan keputusan
 *     memperbaiki berkas tetap di tangan petugas.
 *  3. Pola bulanan (harian, jam sibuk, rute, operator, ketepatan waktu).
 *  4. Tabel seluruh baris, bisa disaring dan diunduh. Nomor baris yang
 *     ditampilkan adalah nomor baris di lembar Excel aslinya — rujukan
 *     langsung saat petugas membuka berkasnya untuk memperbaiki.
 *
 * Mengklik satu butir daftar periksa menyaring tabel ke baris-baris itu;
 * memeriksa dan memperbaiki adalah satu alur, bukan dua halaman.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  ArrowLeft, ChevronLeft, ChevronRight, FileSpreadsheet, Download, Printer, Plane, Users,
  Package, Timer, Armchair, Luggage, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  PlaneLanding, PlaneTakeoff, FileDown, X, FileText,
} from 'lucide-react';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import { WARNA_SERI, angka } from '@/lib/airTraffic';
import { judulKata, namaRute, perubahan, persen, ringkasSumbu } from '@/lib/llau';
import type { LlauFlight, LlauReportDetail, LlauSummary } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, Toast, type ToastMsg, Loading, EmptyState,
  Table, Row, Cell, SearchBox, StatCard, stagger, InfoNote,
} from '@/components/admin/ui';
import { useAdminTheme } from '@/components/admin/theme';

/** Warna grafik per tema — Recharts menerima nilai, bukan kelas CSS. */
const CHART = {
  light: {
    grid: 'rgba(15,23,42,0.08)', axis: '#64748b', cursor: 'rgba(15,23,42,0.04)',
    tooltip: { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 12, fontSize: 12, boxShadow: '0 10px 30px -12px rgba(15,23,42,0.25)' },
    tooltipLabel: { color: '#0f172a', fontWeight: 700 },
  },
  dark: {
    grid: 'rgba(255,255,255,0.06)', axis: '#64748b', cursor: 'rgba(255,255,255,0.04)',
    tooltip: { background: '#0b1428', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 },
    tooltipLabel: { color: '#e2e8f0', fontWeight: 700 },
  },
} as const;

const PER_HALAMAN = 25;

/* ------------------------------------------------------------------ */
/* Daftar periksa mutu data                                            */
/* ------------------------------------------------------------------ */

type Periksa = {
  key: string;
  label: string;
  hint: string;
  cocok: (f: LlauFlight) => boolean;
};

const duduk = (f: LlauFlight) => f.pax_adult + f.pax_child + f.transit_adult + f.transit_child;
const penumpang = (f: LlauFlight) =>
  f.pax_adult + f.pax_child + f.pax_infant + f.transit_adult + f.transit_child + f.transit_infant;
const terlambat = (f: LlauFlight) => f.flight_category === 'BERJADWAL' && f.delay_minutes !== null && f.delay_minutes > 15;

/**
 * Ambang di bawah ini adalah kecurigaan, bukan aturan: penerbangan yang
 * memang tertunda lima jam itu ada. Tujuannya menunjukkan baris yang layak
 * dilihat dua kali, misalnya jam aktual yang tertukar AM/PM.
 */
const PERIKSA: Periksa[] = [
  { key: 'kursi', label: 'Penumpang melebihi kursi', hint: 'Dewasa + anak (termasuk transit) lebih banyak dari kapasitas kursi.', cocok: (f) => (f.seat_capacity ?? 0) > 0 && duduk(f) > (f.seat_capacity ?? 0) },
  { key: 'lama', label: 'Selisih waktu lebih dari 4 jam', hint: 'Kerap berarti jam aktual salah ketik atau tanggal aktual keliru.', cocok: (f) => f.delay_minutes !== null && f.delay_minutes > 240 },
  { key: 'awal', label: 'Lebih awal lebih dari 1 jam', hint: 'Jam aktual jauh mendahului jadwal.', cocok: (f) => f.delay_minutes !== null && f.delay_minutes < -60 },
  { key: 'sebab', label: 'Terlambat tanpa penyebab', hint: 'Berjadwal, terlambat > 15 menit, kolom kategori perbedaan waktu kosong.', cocok: (f) => terlambat(f) && !f.delay_category },
  { key: 'jam', label: 'Jam terjadwal/aktual kosong', hint: 'Tidak ikut dihitung ketepatan waktunya.', cocok: (f) => !f.scheduled_at || !f.actual_at },
  { key: 'kegiatan', label: 'Kegiatan penerbangan kosong', hint: 'Tidak masuk hitungan berjadwal/perintis/carter.', cocok: (f) => !f.flight_category },
  { key: 'muatan', label: 'Berjadwal tanpa penumpang & muatan', hint: 'Penerbangan berjadwal dengan penumpang, bagasi, dan kargo nol.', cocok: (f) => f.flight_category === 'BERJADWAL' && penumpang(f) === 0 && f.baggage_kg === 0 && f.cargo_kg === 0 },
];

/* ------------------------------------------------------------------ */

const jam = (t: string | null) => (t ? t.slice(11, 16) : '—');
const tglPendek = (t: string) => new Date(`${t}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

function Selisih({ menit }: { menit: number | null }) {
  if (menit === null) return <span className="text-[var(--adm-dim)]">—</span>;

  const warna = menit > 15 ? '#f87171' : menit < -15 ? '#38bdf8' : '#34d399';
  const teks = menit === 0 ? 'tepat' : `${menit > 0 ? '+' : '−'}${Math.abs(menit)} mnt`;

  return <Badge text={teks} color={warna} />;
}

/** Angka utama + perubahan terhadap bulan lalu, dalam bentuk hint StatCard. */
function hintDelta(kini: number, lalu: number | undefined, label: string | undefined, poin = false) {
  if (lalu === undefined || !label) return 'tanpa pembanding bulan sebelumnya';
  const d = poin ? kini - lalu : perubahan(kini, lalu);
  if (d === null) return `${label}: 0`;
  const tanda = d >= 0 ? '▲ +' : '▼ −';

  return `${tanda}${Math.abs(d).toLocaleString('id-ID', { maximumFractionDigits: 1 })}${poin ? ' poin' : '%'} dari ${label}`;
}

function Peringkat({ baris, unit }: { baris: { key: string; nama: string; sub?: string; nilai: number }[]; unit: string }) {
  const maks = Math.max(1, ...baris.map((b) => b.nilai));

  if (baris.length === 0) return <p className="text-[12px] text-[var(--adm-muted)] py-4 text-center">Tidak ada data.</p>;

  return (
    <ol className="space-y-2.5">
      {baris.map((b) => (
        <li key={b.key}>
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="min-w-0 truncate">
              <span className="font-bold text-[var(--adm-fg)]">{b.nama}</span>
              {b.sub && <span className="text-[var(--adm-dim)]"> · {b.sub}</span>}
            </span>
            <span className="flex-shrink-0 font-bold text-[var(--adm-fg)] tabular-nums">
              {angka(b.nilai)} <span className="font-medium text-[var(--adm-dim)]">{unit}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--adm-hover)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(b.nilai / maks) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[var(--adm-btn-from)] to-[var(--adm-btn-to)]"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AdminLlauDetailPage() {
  const { id } = useParams<{ id: string }>();
  const c = CHART[useAdminTheme()];

  const [data, setData] = useState<LlauReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [mengunduh, setMengunduh] = useState<string | null>(null);

  const [modeHarian, setModeHarian] = useState<'flights' | 'passengers'>('flights');

  // Laporan bulanan bentuk surat BLU.
  const [bukaLaporan, setBukaLaporan] = useState(false);
  const [varian, setVarian] = useState<'biasa' | 'transit'>('biasa');
  // Terisi otomatis dari penanda tangan resmi (config/pejabat.php) begitu
  // rincian dimuat; petugas tetap bisa mengubah atau mengosongkannya.
  const [ttd, setTtd] = useState({ nama: '', nip: '' });

  // Penyaring tabel baris.
  const [q, setQ] = useState('');
  const [arah, setArah] = useState('');
  const [kategori, setKategori] = useState('');
  const [hanyaTerlambat, setHanyaTerlambat] = useState(false);
  const [periksa, setPeriksa] = useState<string | null>(null);
  const [halaman, setHalaman] = useState(1);
  const tabelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<LlauReportDetail>(`/llau/${id}`);
      if (batal) return;
      if (res.ok && res.data) {
        setData(res.data);
        setTtd(res.data.signer ?? { nama: '', nip: '' });
        setGalat(null);
      } else setGalat(res.message);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, [id]);

  const r = data?.report;
  const d = data?.detail;
  const s: LlauSummary | undefined = d?.summary;
  const lalu = data?.previous;
  const flights = useMemo(() => data?.flights ?? [], [data]);

  const hasilPeriksa = useMemo(
    () => PERIKSA.map((p) => ({ ...p, baris: flights.filter(p.cocok) })),
    [flights],
  );
  const totalCuriga = useMemo(
    () => new Set(hasilPeriksa.flatMap((p) => p.baris.map((f) => f.id))).size,
    [hasilPeriksa],
  );

  const daftarKategori = useMemo(
    () => [...new Set(flights.map((f) => f.flight_category ?? ''))].sort(),
    [flights],
  );

  const tersaring = useMemo(() => {
    const kata = q.trim().toLowerCase();
    const aturan = PERIKSA.find((p) => p.key === periksa);

    return flights.filter((f) => {
      if (arah && f.direction !== arah) return false;
      if (kategori && (f.flight_category ?? '') !== kategori) return false;
      if (hanyaTerlambat && !terlambat(f)) return false;
      if (aturan && !aturan.cocok(f)) return false;
      if (!kata) return true;

      return [f.flight_number, f.registration, f.operator_name, f.operator_brand, f.operator_icao,
        f.origin, f.destination, f.aircraft_type, f.flight_date, String(f.row_number), f.remarks]
        .some((v) => v && String(v).toLowerCase().includes(kata));
    });
  }, [flights, q, arah, kategori, hanyaTerlambat, periksa]);

  const jumlahHalaman = Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, jumlahHalaman);
  const barisTampil = tersaring.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  /** Setiap penyaring baru mengembalikan tabel ke halaman pertama. */
  const saring = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setHalaman(1); };

  const pilihPeriksa = (key: string) => {
    setPeriksa((k) => (k === key ? null : key));
    setHalaman(1);
    tabelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const harian = useMemo(() => (d?.daily ?? []).map((x) => ({
    label: String(Number(x.date.slice(8, 10))),
    Kedatangan: modeHarian === 'flights' ? x.flights_arrival : x.passengers_arrival,
    Keberangkatan: modeHarian === 'flights' ? x.flights_departure : x.passengers_departure,
  })), [d, modeHarian]);

  const perJam = useMemo(() => {
    const aktif = (d?.hourly ?? []).filter((h) => h.arrival + h.departure > 0).map((h) => h.hour);
    if (aktif.length === 0) return [];
    const [awal, akhir] = [Math.min(...aktif), Math.max(...aktif)];

    return (d?.hourly ?? [])
      .filter((h) => h.hour >= awal && h.hour <= akhir)
      .map((h) => ({ label: `${String(h.hour).padStart(2, '0')}.00`, Kedatangan: h.arrival, Keberangkatan: h.departure }));
  }, [d]);

  const terlambatTerparah = useMemo(
    () => flights.filter(terlambat).sort((a, b) => (b.delay_minutes ?? 0) - (a.delay_minutes ?? 0)).slice(0, 6),
    [flights],
  );

  const unduhAsli = async () => {
    if (!r) return;
    setMengunduh('asli');
    const res = await adminDownload(`/llau/${r.id}/file`, r.original_name);
    setMengunduh(null);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const cetak = async () => {
    if (!r) return;
    setMengunduh('pdf');
    const res = await adminDownload(`/air-traffic/export-pdf?month=${r.period}`, `lalu-lintas-udara-${r.period}.pdf`);
    setMengunduh(null);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const unduhLaporan = async () => {
    if (!r) return;
    setMengunduh('laporan');
    const nama = `LAPORAN LLAU BULAN ${r.label.toUpperCase()}${varian === 'transit' ? ' (transit)' : ''}.xlsx`;
    const res = await adminDownload(`/llau/${r.id}/laporan`, nama, 'unduh', {
      body: { varian, ttd_nama: ttd.nama.trim(), ttd_nip: ttd.nip.trim() },
    });
    setMengunduh(null);
    if (res.ok) setBukaLaporan(false);
    setToast({ text: res.ok ? 'Laporan bulanan diunduh' : res.message, kind: res.ok ? 'success' : 'error' });
  };

  /**
   * Unduh baris tersaring sebagai CSV.
   *
   * Disusun di peramban dari data yang sudah dimuat — tidak ada endpoint
   * ekspor baru. Pemisah titik koma dan BOM UTF-8 supaya Excel berlokal
   * Indonesia langsung membukanya dalam kolom yang benar.
   */
  const unduhCsv = () => {
    if (!r) return;
    const kepala = ['Baris Excel', 'Tanggal', 'Jadwal', 'Aktual', 'Selisih (menit)', 'Penyebab', 'Arah', 'Asal', 'Tujuan',
      'Operator', 'ICAO', 'Kegiatan', 'No. Penerbangan', 'Registrasi', 'Tipe', 'Kursi', 'Dewasa', 'Anak', 'Bayi',
      'Transit', 'Bagasi (kg)', 'Kargo (kg)', 'Pos (kg)'];
    const sel = (v: unknown) => {
      const t = v === null || v === undefined ? '' : String(v);
      return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const isi = tersaring.map((f) => [
      f.row_number, f.flight_date, jam(f.scheduled_at), jam(f.actual_at), f.delay_minutes, f.delay_category,
      f.direction === 'A' ? 'Datang' : 'Berangkat', f.origin, f.destination, f.operator_brand || f.operator_name,
      f.operator_icao, f.flight_category, f.flight_number, f.registration, f.aircraft_type, f.seat_capacity,
      f.pax_adult, f.pax_child, f.pax_infant, f.transit_adult + f.transit_child + f.transit_infant,
      f.baggage_kg, f.cargo_kg, f.mail_kg,
    ].map(sel).join(';'));

    const blob = new Blob(['﻿' + [kepala.join(';'), ...isi].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llau-${r.period}-baris.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tooltip = {
    contentStyle: c.tooltip,
    labelStyle: c.tooltipLabel,
    cursor: { fill: c.cursor },
    formatter: (v: unknown) => angka(Number(v)),
  };

  if (loading) return <Loading text="Memuat rincian rekapitulasi..." />;

  if (!data || !r || !d || !s) {
    return (
      <>
        <PageHeader icon={FileSpreadsheet} title="Rincian Rekapitulasi LLAU" action={
          <Link href="/admin/llau"><Btn variant="ghost"><ArrowLeft className="w-4 h-4" /> Semua Laporan</Btn></Link>
        } />
        <Panel><EmptyState text="Rekapitulasi tidak dapat dimuat" hint={galat ?? undefined} /></Panel>
      </>
    );
  }

  const cocokSemua = data.totals.every((t) => t.excel === null || t.excel === t.computed);
  const totalTerbaca = data.totals.some((t) => t.excel !== null);

  return (
    <>
      <PageHeader
        icon={FileSpreadsheet}
        title={`Rekapitulasi LLAU ${r.label}`}
        subtitle={`${r.original_name} · diterapkan ${r.updated_at ? new Date(r.updated_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '—'}${r.uploaded_by ? ` oleh ${r.uploaded_by}` : ''}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/llau"><Btn variant="ghost"><ArrowLeft className="w-4 h-4" /> Semua Laporan</Btn></Link>
            <Btn onClick={() => setBukaLaporan(true)}>
              <FileText className="w-4 h-4" /> Laporan Bulanan
            </Btn>
            <Btn variant="ghost" onClick={unduhAsli} disabled={!r.has_file || mengunduh === 'asli'}>
              <Download className="w-4 h-4" /> {mengunduh === 'asli' ? 'Mengunduh...' : 'Excel Asli'}
            </Btn>
            <Btn variant="ghost" onClick={cetak} disabled={mengunduh === 'pdf'}>
              <Printer className="w-4 h-4" /> {mengunduh === 'pdf' ? 'Menyiapkan...' : 'Cetak PDF'}
            </Btn>
          </div>
        }
      />

      {/* ---- Navigasi antarbulan ---- */}
      <div className="flex items-center justify-between gap-3">
        {data.neighbors.older ? (
          <Link href={`/admin/llau/${data.neighbors.older.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--adm-muted)] hover:text-[var(--adm-accent)] transition-colors">
            <ChevronLeft className="w-4 h-4" /> {data.neighbors.older.label}
          </Link>
        ) : <span />}
        <div className="flex flex-wrap justify-center gap-1.5">
          <Badge text={`${angka(r.flight_count)} baris`} color="#38bdf8" />
          {r.mismatch_ignored ? <Badge text="Total tak cocok — diterima" color="#f87171" />
            : cocokSemua && totalTerbaca ? <Badge text="Total cocok dengan Excel" color="#34d399" /> : null}
          {totalCuriga > 0 && <Badge text={`${totalCuriga} baris perlu diperiksa`} color="#fbbf24" />}
        </div>
        {data.neighbors.newer ? (
          <Link href={`/admin/llau/${data.neighbors.newer.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--adm-muted)] hover:text-[var(--adm-accent)] transition-colors">
            {data.neighbors.newer.label} <ChevronRight className="w-4 h-4" />
          </Link>
        ) : <span />}
      </div>

      {/* ---- Angka utama ---- */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard label="Pergerakan Pesawat" value={s.flights.total} icon={Plane} accent="#38bdf8"
          hint={hintDelta(s.flights.total, lalu?.summary.flights.total, lalu?.label)} />
        <StatCard label="Penumpang" value={s.passengers.total} icon={Users} accent="#a78bfa"
          hint={hintDelta(s.passengers.total, lalu?.summary.passengers.total, lalu?.label)} />
        <StatCard label="Kargo (kg)" value={s.cargo.total} icon={Package} accent="#34d399"
          hint={hintDelta(s.cargo.total, lalu?.summary.cargo.total, lalu?.label)} />
        <StatCard label="Bagasi (kg)" value={s.baggage.total} icon={Luggage} accent="#60a5fa"
          hint={hintDelta(s.baggage.total, lalu?.summary.baggage.total, lalu?.label)} />
        <StatCard label="Tepat Waktu" value={persen(s.otp.rate)} icon={Timer} accent="#fbbf24"
          hint={s.otp.rate !== null && lalu?.summary.otp.rate != null
            ? hintDelta(s.otp.rate, lalu.summary.otp.rate, lalu.label, true)
            : `${angka(s.otp.on_time)} dari ${angka(s.otp.measured)} berjadwal`} />
        <StatCard label="Keterisian Kursi" value={persen(s.load_factor)} icon={Armchair} accent="#f472b6"
          hint={s.load_factor !== null && lalu?.summary.load_factor != null
            ? hintDelta(s.load_factor, lalu.summary.load_factor, lalu.label, true)
            : 'penerbangan berjadwal'} />
      </motion.div>

      {/* ---- Mutu data ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Panel title="Kecocokan dengan Baris JUMLAH Excel" className="xl:col-span-2">
          {!totalTerbaca ? (
            <div className="p-5"><InfoNote>Baris JUMLAH tidak terbaca pada berkas ini, sehingga total tidak dapat dicocokkan.</InfoNote></div>
          ) : (
            <Table head={['Kolom', 'Excel', 'Hasil Hitung', '']}>
              {data.totals.map((t) => {
                const cocok = t.excel === null || t.excel === t.computed;

                return (
                  <Row key={t.column}>
                    <Cell><span className="text-[var(--adm-dim)] font-mono mr-1.5">{t.column}</span>{t.label}</Cell>
                    <Cell><span className="tabular-nums">{t.excel === null ? '—' : angka(t.excel)}</span></Cell>
                    <Cell><span className="tabular-nums font-bold text-[var(--adm-fg)]">{angka(t.computed)}</span></Cell>
                    <Cell>
                      {cocok
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="cocok" />
                        : <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-rose-400"><XCircle className="w-4 h-4" /> {angka(t.computed - (t.excel ?? 0))}</span>}
                    </Cell>
                  </Row>
                );
              })}
            </Table>
          )}
        </Panel>

        <Panel title="Daftar Periksa Mutu Data" className="xl:col-span-3">
          <div className="p-5 space-y-3">
            {totalCuriga === 0 && r.warnings.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3.5">
                <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-[12.5px] text-[var(--adm-body)]">Tidak ada baris yang patut dicurigai. Data bulan ini tampak bersih.</p>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--adm-muted)]">
                Klik butir untuk menyaring tabel penerbangan ke baris tersebut. Ini kecurigaan, bukan kesalahan pasti —
                periksa barisnya di berkas Excel.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {hasilPeriksa.map((p) => {
                const ada = p.baris.length > 0;
                const aktif = periksa === p.key;

                return (
                  <button
                    key={p.key}
                    onClick={() => ada && pilihPeriksa(p.key)}
                    disabled={!ada}
                    className={`text-left rounded-xl px-3.5 py-3 border transition-all ${
                      aktif ? 'border-[var(--adm-accent)] bg-[var(--adm-accent-soft)]'
                        : ada ? 'border-amber-400/35 bg-amber-400/8 hover:border-amber-400/70 cursor-pointer'
                          : 'border-[var(--adm-line)] opacity-60 cursor-default'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--adm-fg)]">
                        {ada ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {p.label}
                      </span>
                      <span className="text-[13px] font-black tabular-nums text-[var(--adm-fg)]">{p.baris.length}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--adm-muted)] leading-relaxed">{p.hint}</p>
                  </button>
                );
              })}
            </div>

            {r.warnings.length > 0 && (
              <div className="rounded-xl bg-[var(--adm-hover)] px-4 py-3">
                <p className="text-[12px] font-bold text-[var(--adm-fg)]">Peringatan saat diunggah</p>
                <ul className="mt-1.5 space-y-1 text-[11.5px] text-[var(--adm-body)] list-disc pl-5">
                  {r.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* ---- Harian ---- */}
      <Panel
        title={`Pergerakan Harian · ${r.label}`}
        action={
          <div className="inline-flex rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-0.5">
            {([['flights', 'Penerbangan'], ['passengers', 'Penumpang']] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setModeHarian(m)}
                aria-pressed={modeHarian === m}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold cursor-pointer transition-colors ${
                  modeHarian === m ? 'bg-[var(--adm-accent-soft)] text-[var(--adm-accent)]' : 'text-[var(--adm-muted)] hover:text-[var(--adm-fg)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div className="h-64 px-3 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={harian} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={4} />
              <YAxis tickFormatter={ringkasSumbu} tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} width={44} />
              <Tooltip {...tooltip} labelFormatter={(l) => `Tanggal ${l} ${r.label}`} />
              <Legend verticalAlign="top" align="right" height={26} iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11.5, color: c.axis }} />
              <Bar dataKey="Kedatangan" stackId="h" fill={WARNA_SERI.arrival} maxBarSize={20} />
              <Bar dataKey="Keberangkatan" stackId="h" fill={WARNA_SERI.departure} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ---- Rute & operator ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title={`Rute · ${angka(s.routes)} bandara terhubung`}>
          <Table head={['Bandara', 'Penerbangan', 'Pnp. Datang', 'Pnp. Berangkat', 'Kargo (kg)']}>
            {d.routes.slice(0, 12).map((rt) => (
              <Row key={rt.code}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)]">{namaRute(rt.code)}</span>
                  {rt.code !== 'LOKAL' && rt.code !== 'ZZZZ' && <span className="ml-1.5 font-mono text-[11px] text-[var(--adm-dim)]">{rt.code}</span>}
                </Cell>
                <Cell><span className="tabular-nums">{angka(rt.flights)}</span></Cell>
                <Cell><span className="tabular-nums">{angka(rt.passengers_arrival)}</span></Cell>
                <Cell><span className="tabular-nums">{angka(rt.passengers_departure)}</span></Cell>
                <Cell><span className="tabular-nums">{angka(rt.cargo)}</span></Cell>
              </Row>
            ))}
          </Table>
          {d.routes.length > 12 && (
            <p className="px-5 py-3 text-[11.5px] text-[var(--adm-dim)] border-t border-[var(--adm-line)]">
              +{d.routes.length - 12} ujung rute lain dengan lalu lintas lebih kecil — cari kodenya di tabel penerbangan.
            </p>
          )}
        </Panel>

        <Panel title={`Operator · ${angka(s.operators)} operator`}>
          <Table head={['Operator', 'Penerbangan', 'Pangsa', 'Penumpang', 'Kargo (kg)']}>
            {d.operators.map((o) => (
              <Row key={o.icao ?? o.name}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)]">{o.name}</span>
                  {o.icao && <span className="ml-1.5 font-mono text-[11px] text-[var(--adm-dim)]">{o.icao}</span>}
                </Cell>
                <Cell><span className="tabular-nums">{angka(o.flights)}</span></Cell>
                <Cell>
                  <div className="flex items-center gap-2 min-w-[90px]">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--adm-hover)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--adm-accent)]" style={{ width: `${o.share}%` }} />
                    </div>
                    <span className="tabular-nums text-[11.5px]">{persen(o.share)}</span>
                  </div>
                </Cell>
                <Cell><span className="tabular-nums">{angka(o.passengers)}</span></Cell>
                <Cell><span className="tabular-nums">{angka(o.cargo)}</span></Cell>
              </Row>
            ))}
          </Table>
        </Panel>
      </div>

      {/* ---- Ketepatan waktu & pola operasi ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Panel title="Ketepatan Waktu (Berjadwal)">
          <div className="p-5 space-y-5">
            <div className="flex items-end gap-4">
              <p className="text-[44px] font-black leading-none text-[var(--adm-fg)] tabular-nums">{persen(s.otp.rate)}</p>
              <div className="pb-1 text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
                <p>{angka(s.otp.on_time)} tepat · {angka(s.otp.late)} terlambat</p>
                <p>rata-rata {s.otp.average_late_minutes !== null ? `${angka(s.otp.average_late_minutes)} menit` : '—'} bila terlambat</p>
              </div>
            </div>
            {/* Proporsi tepat/terlambat sebagai satu batang terbagi dua. */}
            {s.otp.measured > 0 && (
              <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px]">
                <div className="bg-emerald-500 rounded-l-full" style={{ width: `${(s.otp.on_time / s.otp.measured) * 100}%` }} />
                <div className="bg-rose-400 rounded-r-full flex-1" />
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-muted)] mb-3">Penyebab keterlambatan</p>
              <Peringkat unit="pnb" baris={d.delay_causes.map((x) => ({ key: x.name, nama: judulKata(x.name), nilai: x.flights }))} />
            </div>
          </div>
        </Panel>

        <Panel title="Keterlambatan Terlama">
          {terlambatTerparah.length === 0 ? (
            <EmptyState text="Tidak ada penerbangan berjadwal yang terlambat" />
          ) : (
            <ul className="divide-y divide-[var(--adm-line)]">
              {terlambatTerparah.map((f) => (
                <li key={f.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-[var(--adm-fg)] truncate">
                      {f.flight_number ?? '—'} <span className="font-medium text-[var(--adm-muted)]">{f.operator_brand || f.operator_name}</span>
                    </p>
                    <p className="text-[11px] text-[var(--adm-dim)]">
                      {tglPendek(f.flight_date)} · {f.origin} → {f.destination} · jadwal {jam(f.scheduled_at)}, aktual {jam(f.actual_at)} · baris {f.row_number}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <Selisih menit={f.delay_minutes} />
                    <p className="mt-1 text-[10.5px] text-[var(--adm-dim)]">{f.delay_category ? judulKata(f.delay_category) : 'tanpa penyebab'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Komposisi">
          <div className="p-5 space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-muted)] mb-3">Kegiatan penerbangan</p>
              <Peringkat unit="pnb" baris={d.categories.map((x) => ({ key: x.name, nama: judulKata(x.name), nilai: x.flights }))} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-muted)] mb-3">Tipe pesawat</p>
              <Peringkat unit="pnb" baris={d.aircraft_types.slice(0, 6).map((x) => ({ key: x.name, nama: x.name, nilai: x.flights }))} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Jam Sibuk (waktu setempat, jam terjadwal)">
        <div className="h-60 px-3 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perJam} margin={{ top: 4, right: 8, bottom: 0, left: -8 }} barGap={2}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...tooltip} labelFormatter={(l) => `Pukul ${l}`} />
              <Legend verticalAlign="top" align="right" height={26} iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11.5, color: c.axis }} />
              <Bar dataKey="Kedatangan" fill={WARNA_SERI.arrival} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="Keberangkatan" fill={WARNA_SERI.departure} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ---- Tabel seluruh baris ---- */}
      <div ref={tabelRef} className="scroll-mt-24">
        <Panel>
          <div className="px-5 py-3.5 border-b border-[var(--adm-line)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">
                Data Penerbangan
                <span className="ml-2 font-medium text-[var(--adm-muted)]">
                  {tersaring.length === flights.length ? `${angka(flights.length)} baris` : `${angka(tersaring.length)} dari ${angka(flights.length)} baris`}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <SearchBox value={q} onChange={saring(setQ)} placeholder="No. penerbangan, registrasi, rute, baris..." />
                <Btn variant="ghost" onClick={unduhCsv} disabled={tersaring.length === 0}>
                  <FileDown className="w-4 h-4" /> CSV
                </Btn>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field label="Arah" type="select" value={arah} onChange={saring((v: string) => setArah(String(v)))} className="w-40"
                options={[{ value: '', label: 'Semua arah' }, { value: 'A', label: 'Kedatangan' }, { value: 'D', label: 'Keberangkatan' }]} />
              <Field label="Kegiatan" type="select" value={kategori} onChange={saring((v: string) => setKategori(String(v)))} className="w-48"
                options={[{ value: '', label: 'Semua kegiatan' }, ...daftarKategori.filter(Boolean).map((k) => ({ value: k, label: judulKata(k) }))]} />
              <Field label="Hanya yang terlambat > 15 menit" type="checkbox" value={hanyaTerlambat} onChange={saring((v: boolean) => setHanyaTerlambat(!!v))} className="pb-2" />
              {periksa && (
                <button
                  onClick={() => { setPeriksa(null); setHalaman(1); }}
                  className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] px-3 py-1.5 text-[11.5px] font-bold text-[var(--adm-accent)] cursor-pointer"
                >
                  {PERIKSA.find((p) => p.key === periksa)?.label} <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {barisTampil.length === 0 ? (
            <EmptyState text="Tidak ada baris yang cocok" hint="Longgarkan penyaring atau kosongkan kata pencarian." />
          ) : (
            <Table head={['Baris', 'Tanggal', 'Jadwal → Aktual', 'Rute', 'Operator', 'Penerbangan', 'Kegiatan', 'Penumpang', 'Bagasi / Kargo']}>
              {barisTampil.map((f) => {
                const curiga = hasilPeriksa.filter((p) => p.baris.includes(f));

                return (
                  <Row key={f.id}>
                    <Cell>
                      <span className="font-mono text-[11.5px] text-[var(--adm-muted)]" title="Nomor baris di lembar Excel">#{f.row_number}</span>
                      {curiga.length > 0 && (
                        <span title={curiga.map((p) => p.label).join('\n')}>
                          <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-amber-500" />
                        </span>
                      )}
                    </Cell>
                    <Cell><span className="whitespace-nowrap">{tglPendek(f.flight_date)}</span></Cell>
                    <Cell>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="tabular-nums">{jam(f.scheduled_at)} → {jam(f.actual_at)}</span>
                        <Selisih menit={f.delay_minutes} />
                      </div>
                      {f.delay_category && <p className="text-[10.5px] text-[var(--adm-dim)]">{judulKata(f.delay_category)}</p>}
                    </Cell>
                    <Cell>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        {f.direction === 'A'
                          ? <PlaneLanding className="w-3.5 h-3.5" style={{ color: WARNA_SERI.arrival }} aria-label="Kedatangan" />
                          : <PlaneTakeoff className="w-3.5 h-3.5" style={{ color: WARNA_SERI.departure }} aria-label="Keberangkatan" />}
                        <span className="font-mono">{f.origin} → {f.destination}</span>
                      </span>
                    </Cell>
                    <Cell>
                      <span className="text-[var(--adm-fg)]">{f.operator_brand || f.operator_name}</span>
                      {f.operator_icao && <span className="ml-1 font-mono text-[10.5px] text-[var(--adm-dim)]">{f.operator_icao}</span>}
                    </Cell>
                    <Cell>
                      <p className="font-bold text-[var(--adm-fg)] whitespace-nowrap">{f.flight_number ?? '—'}</p>
                      <p className="text-[10.5px] text-[var(--adm-dim)] whitespace-nowrap">{f.registration ?? '—'} · {f.aircraft_type ?? '—'}</p>
                    </Cell>
                    <Cell>
                      {f.flight_category ? <span className="text-[11.5px]">{judulKata(f.flight_category)}</span> : <Badge text="kosong" color="#fbbf24" />}
                      {f.remarks && <p className="text-[10.5px] text-[var(--adm-dim)] max-w-[160px] truncate" title={f.remarks}>{f.remarks}</p>}
                    </Cell>
                    <Cell>
                      <p className="tabular-nums font-bold text-[var(--adm-fg)]">
                        {angka(penumpang(f))}
                        {(f.seat_capacity ?? 0) > 0 && <span className="font-medium text-[var(--adm-dim)]"> / {f.seat_capacity} kursi</span>}
                      </p>
                      <p className="text-[10.5px] text-[var(--adm-dim)] tabular-nums whitespace-nowrap">
                        D{f.pax_adult} A{f.pax_child} B{f.pax_infant}
                        {f.transit_adult + f.transit_child + f.transit_infant > 0 && ` · T${f.transit_adult + f.transit_child + f.transit_infant}`}
                      </p>
                    </Cell>
                    <Cell>
                      <span className="tabular-nums whitespace-nowrap">{angka(f.baggage_kg)} / {angka(f.cargo_kg)}</span>
                    </Cell>
                  </Row>
                );
              })}
            </Table>
          )}

          {tersaring.length > PER_HALAMAN && (
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[var(--adm-line)] text-[12px] text-[var(--adm-muted)]">
              <span>
                Baris {angka((halamanAman - 1) * PER_HALAMAN + 1)}–{angka(Math.min(halamanAman * PER_HALAMAN, tersaring.length))} dari {angka(tersaring.length)}
              </span>
              <div className="flex items-center gap-2">
                <Btn variant="ghost" onClick={() => setHalaman(halamanAman - 1)} disabled={halamanAman <= 1}><ChevronLeft className="w-4 h-4" /></Btn>
                <span className="tabular-nums">{halamanAman} / {jumlahHalaman}</span>
                <Btn variant="ghost" onClick={() => setHalaman(halamanAman + 1)} disabled={halamanAman >= jumlahHalaman}><ChevronRight className="w-4 h-4" /></Btn>
              </div>
            </div>
          )}

          <p className="px-5 py-3 text-[11px] text-[var(--adm-dim)] border-t border-[var(--adm-line)]">
            Penumpang: D dewasa · A anak · B bayi · T transit. Selisih waktu dihitung dari tanggal dan jam aktual terhadap jadwal.
          </p>
        </Panel>
      </div>

      <Modal
        open={bukaLaporan}
        onClose={() => setBukaLaporan(false)}
        title={`Laporan LLAU Bulan ${r.label}`}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setBukaLaporan(false)}>Batal</Btn>
            <Btn onClick={unduhLaporan} disabled={mengunduh === 'laporan'}>
              <Download className="w-4 h-4" /> {mengunduh === 'laporan' ? 'Menyusun...' : 'Unduh Excel'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--adm-muted)] leading-relaxed">
            Lampiran Surat Laporan LLAU dalam format yang sama dengan laporan bulanan selama ini: satu baris per
            rotasi pesawat, dikelompokkan per tanggal, lengkap dengan tabel ringkasan maskapai, tipe pesawat, dan tujuan.
          </p>

          <div>
            <p className="text-[11.5px] font-bold text-[var(--adm-body)] mb-2">Varian</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {([
                ['biasa', 'Biasa', 'Penumpang transit dijumlahkan ke dewasa/anak/bayi.'],
                ['transit', 'Transit', 'Penumpang transit di kolom tersendiri.'],
              ] as const).map(([v, label, hint]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVarian(v)}
                  aria-pressed={varian === v}
                  className={`text-left rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${
                    varian === v ? 'border-[var(--adm-accent)] bg-[var(--adm-accent-soft)]' : 'border-[var(--adm-line)] hover:border-[var(--adm-accent-line)]'
                  }`}
                >
                  <p className="text-[12.5px] font-bold text-[var(--adm-fg)]">{label}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--adm-muted)]">{hint}</p>
                </button>
              ))}
            </div>
          </div>

          <Field label="Nama penanda tangan" value={ttd.nama} onChange={(v) => setTtd({ ...ttd, nama: String(v) })}
            placeholder="Kosong = ditulis tangan" hint="Ditulis kapital di laporan. Kosongkan bila akan ditulis tangan." />
          <Field label="NIP penanda tangan" value={ttd.nip} onChange={(v) => setTtd({ ...ttd, nip: String(v) })}
            placeholder="19xxxxxx xxxxxx x xxx" maxLength={30}
            hint="Terisi dari data penanda tangan resmi. Perubahan di sini hanya berlaku untuk berkas yang diunduh." />
        </div>
      </Modal>

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
