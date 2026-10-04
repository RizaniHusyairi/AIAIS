'use client';

/**
 * Dasbor manajemen.
 *
 * Disusun dari yang paling mendesak ke yang paling umum: antrean yang
 * menunggu petugas, lalu angka utama, lalu tren. Seluruh angka berasal dari
 * `GET /admin/analytics` — satu permintaan, bukan lima daftar penuh yang
 * hanya dihitung panjangnya seperti dulu.
 *
 * Kurva kunjungan 7 hari sebelumnya adalah karangan (angka hari ini dikali
 * faktor tetap) berlabel "Realtime". Kini tren dihitung dari `visitor_logs`
 * per hari WITA; hari tanpa kunjungan memang tampil nol.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Eye, Plane, Newspaper, MessageSquareWarning, MessagesSquare,
  Building2, Store, Megaphone, FileText, CheckCircle2, AlertTriangle, RefreshCw,
  PackageSearch, ScrollText, ArrowUpRight, ArrowDownRight, Minus, Clock, PartyPopper,
  ExternalLink, Activity, Upload,
} from 'lucide-react';
import { adminFetch, getUser } from '@/lib/adminApi';
import { API_BASE_URL } from '@/lib/api';
import { Panel, Loading, Badge, stagger, riseIn, RadarDecor, JumpCard, EmptyState } from '@/components/admin/ui';
import {
  GrafikTren, GrafikJam, DonutPerangkat, GrafikLlau, Sparkline, useWarna, angka,
  type TitikTren, type Perangkat, type TitikLlau,
} from './grafik';

/* ---------------- bentuk data ---------------- */

type Antrean = {
  key: 'complaints' | 'chat' | 'lost_reports' | 'information_requests';
  label: string;
  href: string;
  count: number;
  oldest_at: string | null;
  overdue: number;
};

type Aktivitas = {
  type: 'complaint' | 'chat' | 'lost_report' | 'news' | 'information_request';
  title: string;
  ref: string | null;
  status: string | null;
  at: string;
  href: string;
};

type Analytics = {
  overview: { total_visitors: number; today_visitors: number };
  range_days: number;
  visitor_trend: TitikTren[];
  visitor_trend_previous: TitikTren[];
  visitor_period: { views: number; unique: number };
  visitor_previous: { views: number; unique: number };
  visitor_hourly: { hour: number; views: number }[];
  top_pages: { page: string; views: number }[];
  device_stats: Perangkat[];
  flight_stats: { total: number; boarding: number; landed: number; delayed: number };
  complaint_stats: { total: number; resolved: number; in_progress: number; pending: number };
  action_queue: Antrean[];
  llau_trend: TitikLlau[];
  recent_activity: Aktivitas[];
  content_counts: { news: number; announcements: number; facilities: number; tenants: number; documents: number };
};

const RENTANG = [7, 30, 90] as const;
const SEGAR_TIAP_MS = 60_000;
const ZONA = 'Asia/Makassar';

const IKON_ANTREAN: Record<Antrean['key'], React.ElementType> = {
  complaints: MessageSquareWarning,
  chat: MessagesSquare,
  lost_reports: PackageSearch,
  information_requests: ScrollText,
};

const AKTIVITAS: Record<Aktivitas['type'], { label: string; icon: React.ElementType; color: string }> = {
  complaint: { label: 'Pengaduan', icon: MessageSquareWarning, color: '#fb7185' },
  chat: { label: 'Chat', icon: MessagesSquare, color: '#38bdf8' },
  lost_report: { label: 'Kehilangan', icon: PackageSearch, color: '#fbbf24' },
  news: { label: 'Berita', icon: Newspaper, color: '#a78bfa' },
  information_request: { label: 'PPID', icon: ScrollText, color: '#34d399' },
};

/* ---------------- pembantu ---------------- */

/** "3 menit lalu", "2 hari lalu" — umur antrean lebih bermakna daripada jam. */
function relatif(iso: string, kini: number): string {
  const detik = Math.max(0, Math.round((kini - new Date(iso).getTime()) / 1000));
  if (detik < 60) return 'baru saja';
  const menit = Math.round(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.round(jam / 24);
  return hari < 30 ? `${hari} hari lalu` : new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function sapaan(jam: number): string {
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 19) return 'Selamat sore';
  return 'Selamat malam';
}

/** Persentase perubahan; null bila pembandingnya nol (tidak bermakna). */
const delta = (kini: number, lalu: number) => (lalu > 0 ? Math.round(((kini - lalu) / lalu) * 100) : null);

function Delta({ nilai, label }: { nilai: number | null; label: string }) {
  if (nilai === null) return <span className="text-[11px] text-[var(--adm-dim)]">Belum ada pembanding</span>;
  const naik = nilai > 0;
  const Ikon = nilai === 0 ? Minus : naik ? ArrowUpRight : ArrowDownRight;
  const warna = nilai === 0 ? 'var(--adm-muted)' : naik ? 'var(--adm-ok)' : 'var(--adm-danger)';
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: warna }}>
      <Ikon className="w-3.5 h-3.5" />
      {Math.abs(nilai)}% <span className="font-normal text-[var(--adm-muted)]">{label}</span>
    </span>
  );
}

/* ---------------- halaman ---------------- */

export default function AdminDashboardPage() {
  const w = useWarna();
  const [days, setDays] = useState<(typeof RENTANG)[number]>(7);
  const [metrik, setMetrik] = useState<'views' | 'unique'>('views');
  const [data, setData] = useState<Analytics | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [diperbarui, setDiperbarui] = useState<number | null>(null);
  const [kini, setKini] = useState(() => Date.now());
  const [perangkatAktif, setPerangkatAktif] = useState<number | null>(null);
  const [nama, setNama] = useState('');

  const muat = useCallback(async (rentang: number) => {
    setMenyegarkan(true);
    const res = await adminFetch<Analytics>(`/analytics?days=${rentang}`);
    if (res.ok && res.data) {
      setData(res.data);
      setGalat(null);
      setDiperbarui(Date.now());
    } else {
      setGalat(res.message);
    }
    setMenyegarkan(false);
    setMemuat(false);
  }, []);

  useEffect(() => {
    // Dimuat di luar badan efek: setState sinkron di sini memicu render berantai.
    const t = setTimeout(() => muat(days), 0);
    // Antrean berubah sepanjang hari; disegarkan diam-diam selama tab terbuka.
    const segar = setInterval(() => {
      if (document.visibilityState === 'visible') muat(days);
    }, SEGAR_TIAP_MS);
    return () => { clearTimeout(t); clearInterval(segar); };
  }, [days, muat]);

  useEffect(() => {
    const t = setTimeout(() => setNama(getUser()?.name?.split(' ')[0] ?? ''), 0);
    const jam = setInterval(() => setKini(Date.now()), 30_000);
    return () => { clearTimeout(t); clearInterval(jam); };
  }, []);

  const turunan = useMemo(() => {
    if (!data) return null;
    const trenNilai = data.visitor_trend.map((d) => d[metrik]);
    const puncakJam = data.visitor_hourly.reduce((a, b) => (b.views > a.views ? b : a), { hour: 0, views: 0 });
    const llauTerakhir = data.llau_trend.at(-1) ?? null;
    const llauSebelum = data.llau_trend.at(-2) ?? null;
    const totalHalaman = data.top_pages.reduce((s, p) => s + p.views, 0);
    const antreanTotal = data.action_queue.reduce((s, a) => s + a.count, 0);
    const cs = data.complaint_stats;
    return {
      trenNilai,
      puncakJam,
      llauTerakhir,
      llauSebelum,
      totalHalaman,
      antreanTotal,
      selesaiPct: cs.total > 0 ? Math.round((cs.resolved / cs.total) * 100) : null,
    };
  }, [data, metrik]);

  if (memuat) return <Loading text="Menyiapkan data dasbor..." />;

  if (!data || !turunan) {
    return <EmptyState text="Dasbor tidak dapat dimuat." hint={galat ?? undefined} />;
  }

  const waktuWita = new Date(kini);
  const jamWita = Number(waktuWita.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: ZONA }));
  const asalPortal = API_BASE_URL.replace(/\/api\/.*$/, '');
  const urlPublik = (page: string) => (page.startsWith('http') ? page : `${typeof window !== 'undefined' ? window.location.origin : asalPortal}${page}`);

  return (
    <>
      {/* ---------- sapaan ---------- */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl adm-glass p-5 sm:p-6"
      >
        <RadarDecor className="-right-16 -top-16 opacity-40" />
        <div className="relative flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] shadow-lg flex-shrink-0">
              <LayoutDashboard className="w-6 h-6 text-[var(--adm-btn-fg)]" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-[var(--adm-muted)]">
                {waktuWita.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA })}
                {' · '}
                {waktuWita.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: ZONA })} WITA
              </p>
              <h1 className="text-[22px] sm:text-[26px] font-black text-[var(--adm-fg)] leading-tight">
                {sapaan(jamWita)}{nama ? `, ${nama}` : ''}
              </h1>
              <p className="text-[12.5px] text-[var(--adm-body)] mt-1">
                {turunan.antreanTotal > 0
                  ? `Ada ${angka(turunan.antreanTotal)} hal yang menunggu ditangani.`
                  : 'Tidak ada antrean yang menunggu. Portal berjalan normal.'}
                {' '}Hari ini {angka(data.overview.today_visitors)} tayangan halaman.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {galat && <span className="text-[11px] text-[var(--adm-danger)]">{galat}</span>}
            <span className="text-[11px] text-[var(--adm-dim)] whitespace-nowrap">
              {diperbarui ? `Diperbarui ${relatif(new Date(diperbarui).toISOString(), kini)}` : ''}
            </span>
            <button
              onClick={() => muat(days)}
              disabled={menyegarkan}
              title="Segarkan data"
              className="w-9 h-9 rounded-xl bg-[var(--adm-hover)] border border-[var(--adm-line)] flex items-center justify-center text-[var(--adm-body)] hover:text-[var(--adm-accent)] transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${menyegarkan ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.section>

      {/* ---------- perlu tindakan ---------- */}
      <Panel
        title="Perlu Tindakan"
        action={turunan.antreanTotal > 0
          ? <Badge text={`${turunan.antreanTotal} menunggu`} color="#fb7185" />
          : <Badge text="Semua beres" color="#34d399" />}
      >
        {turunan.antreanTotal === 0 ? (
          <div className="p-5 flex items-center gap-3 text-[12.5px] text-[var(--adm-body)]">
            <PartyPopper className="w-5 h-5 text-[var(--adm-ok)]" />
            Pengaduan, chat, laporan kehilangan{data.action_queue.some((a) => a.key === 'information_requests') ? ', dan permohonan informasi' : ''} sudah tertangani semua.
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className={`p-4 grid grid-cols-1 sm:grid-cols-2 ${data.action_queue.length > 3 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-3`}
          >
            {data.action_queue.map((a) => {
              const Ikon = IKON_ANTREAN[a.key];
              const kosong = a.count === 0;
              return (
                <motion.div key={a.key} variants={riseIn}>
                  <Link
                    href={a.href}
                    className={`group block h-full rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${
                      kosong
                        ? 'border-[var(--adm-line)] bg-[var(--adm-inset)] opacity-70'
                        : a.overdue > 0
                          ? 'border-[var(--adm-danger-line)] bg-[var(--adm-danger-soft)]'
                          : 'border-[var(--adm-warn-line)] bg-[var(--adm-warn-soft)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Ikon className={`w-5 h-5 ${kosong ? 'text-[var(--adm-muted)]' : a.overdue > 0 ? 'text-[var(--adm-danger)]' : 'text-[var(--adm-warn)]'}`} />
                      <ArrowUpRight className="w-4 h-4 text-[var(--adm-dim)] group-hover:text-[var(--adm-accent)] transition-colors" />
                    </div>
                    <p className="text-[28px] font-black text-[var(--adm-fg)] tabular-nums leading-none mt-3">{angka(a.count)}</p>
                    <p className="text-[12px] font-semibold text-[var(--adm-body)] mt-1">{a.label}</p>
                    <div className="mt-2 space-y-1">
                      {a.oldest_at && !kosong && (
                        <p className="flex items-center gap-1 text-[11px] text-[var(--adm-muted)]">
                          <Clock className="w-3 h-3" /> Terlama masuk {relatif(a.oldest_at, kini)}
                        </p>
                      )}
                      {a.overdue > 0 && (
                        <p className="flex items-center gap-1 text-[11px] font-bold text-[var(--adm-danger)]">
                          <AlertTriangle className="w-3 h-3" /> {a.overdue} lewat tenggat
                        </p>
                      )}
                      {kosong && <p className="text-[11px] text-[var(--adm-muted)]">Tidak ada antrean</p>}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </Panel>

      {/* ---------- saringan rentang: satu baris di atas semua grafik ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--adm-muted)]">
          Lalu lintas portal <span className="font-semibold text-[var(--adm-body)]">{days} hari terakhir</span>, dibandingkan dengan {days} hari sebelumnya.
        </p>
        <div role="tablist" aria-label="Rentang waktu" className="inline-flex rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-1">
          {RENTANG.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={days === r}
              onClick={() => setDays(r)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                days === r ? 'bg-[var(--adm-panel)] text-[var(--adm-fg)] shadow-sm' : 'text-[var(--adm-muted)] hover:text-[var(--adm-fg)]'
              }`}
            >
              {r} hari
            </button>
          ))}
        </div>
      </div>

      {/* ---------- angka utama ---------- */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KartuKpi
          label="Tayangan halaman"
          ikon={Eye}
          nilai={angka(data.visitor_period.views)}
          bawah={<Delta nilai={delta(data.visitor_period.views, data.visitor_previous.views)} label="dari periode lalu" />}
          grafik={<Sparkline nilai={data.visitor_trend.map((d) => d.views)} />}
        />
        <KartuKpi
          label="Pengunjung unik"
          ikon={Users}
          nilai={angka(data.visitor_period.unique)}
          bawah={<Delta nilai={delta(data.visitor_period.unique, data.visitor_previous.unique)} label="dari periode lalu" />}
          grafik={<Sparkline nilai={data.visitor_trend.map((d) => d.unique)} />}
          catatan="Perkiraan dari penanda anonim, bukan identitas."
        />
        <KartuKpi
          label={turunan.llauTerakhir
            ? `Penumpang ${new Date(`${turunan.llauTerakhir.period}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`
            : 'Penumpang bulanan'}
          ikon={Plane}
          nilai={turunan.llauTerakhir ? angka(turunan.llauTerakhir.passengers) : '—'}
          bawah={turunan.llauTerakhir
            ? <Delta nilai={turunan.llauSebelum ? delta(turunan.llauTerakhir.passengers, turunan.llauSebelum.passengers) : null} label="dari bulan sebelumnya" />
            : <Link href="/admin/llau" className="text-[11px] font-semibold text-[var(--adm-accent)]">Unggah rekap LLAU →</Link>}
          catatan={turunan.llauTerakhir ? 'Sumber: rekap LLAU.' : undefined}
        />
        <KartuKpi
          label="Pengaduan terselesaikan"
          ikon={CheckCircle2}
          nilai={turunan.selesaiPct !== null ? `${turunan.selesaiPct}%` : '—'}
          bawah={
            <span className="text-[11px] text-[var(--adm-muted)]">
              {angka(data.complaint_stats.resolved)} dari {angka(data.complaint_stats.total)} pengaduan
            </span>
          }
          grafik={turunan.selesaiPct !== null ? (
            <div className="h-1.5 mt-3 rounded-full bg-[var(--adm-line)] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: w.seri }}
                initial={{ width: 0 }}
                animate={{ width: `${turunan.selesaiPct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
          ) : undefined}
        />
      </motion.div>

      {/* ---------- tren & jam ramai ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel
          className="xl:col-span-2"
          title="Tren Kunjungan Harian"
          action={
            <div className="inline-flex rounded-lg bg-[var(--adm-inset)] border border-[var(--adm-line)] p-0.5">
              {([['views', 'Tayangan'], ['unique', 'Pengunjung unik']] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setMetrik(k)}
                  aria-pressed={metrik === k}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    metrik === k ? 'bg-[var(--adm-panel)] text-[var(--adm-fg)] shadow-sm' : 'text-[var(--adm-muted)] hover:text-[var(--adm-fg)]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-5 pt-4">
            <div className="flex flex-wrap items-center gap-4 mb-3 text-[11px] text-[var(--adm-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0" style={{ borderTop: `2px solid ${w.seri}` }} /> {days} hari terakhir
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0" style={{ borderTop: `2px dashed ${w.pembanding}` }} /> {days} hari sebelumnya
              </span>
            </div>
            {turunan.trenNilai.every((v) => v === 0) ? (
              <EmptyState text="Belum ada kunjungan tercatat pada rentang ini." />
            ) : (
              <GrafikTren data={data.visitor_trend} sebelumnya={data.visitor_trend_previous} metrik={metrik} />
            )}
          </div>
        </Panel>

        <Panel title="Jam Ramai" action={<Badge text="WITA" color="#38bdf8" />}>
          <div className="p-5 pt-4">
            {turunan.puncakJam.views > 0 ? (
              <>
                <p className="text-[12px] text-[var(--adm-body)] mb-2">
                  Puncak pukul{' '}
                  <span className="font-black text-[var(--adm-fg)]">
                    {String(turunan.puncakJam.hour).padStart(2, '0')}.00–{String(turunan.puncakJam.hour).padStart(2, '0')}.59
                  </span>{' '}
                  dengan {angka(turunan.puncakJam.views)} tayangan.
                </p>
                <GrafikJam data={data.visitor_hourly} />
                <p className="text-[10.5px] text-[var(--adm-dim)] mt-2">
                  Waktu terbaik menerbitkan pengumuman adalah sesaat sebelum jam puncak.
                </p>
              </>
            ) : (
              <EmptyState text="Belum ada data jam kunjungan." />
            )}
          </div>
        </Panel>
      </div>

      {/* ---------- halaman & perangkat ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Halaman Paling Banyak Diakses" action={<Badge text={`${days} hari`} color="#38bdf8" />}>
          <div className="p-4">
            {data.top_pages.length === 0 ? (
              <EmptyState text="Belum ada kunjungan tercatat." />
            ) : (
              <ol className="space-y-1">
                {data.top_pages.map((p, i) => {
                  const pct = turunan.totalHalaman > 0 ? (p.views / data.top_pages[0].views) * 100 : 0;
                  const porsi = data.visitor_period.views > 0 ? Math.round((p.views / data.visitor_period.views) * 100) : 0;
                  return (
                    <li key={p.page}>
                      <a
                        href={urlPublik(p.page)}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--adm-hover)] transition-colors"
                      >
                        <span className="w-5 text-[11px] font-black text-[var(--adm-dim)] tabular-nums">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[12.5px] font-semibold text-[var(--adm-fg)]">{p.page}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0 text-[var(--adm-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="h-1.5 mt-1.5 rounded-full bg-[var(--adm-line)] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: w.seri }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: i * 0.04, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[12.5px] font-black text-[var(--adm-fg)] tabular-nums">{angka(p.views)}</p>
                          <p className="text-[10.5px] text-[var(--adm-muted)] tabular-nums">{porsi}%</p>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Panel>

        <Panel title="Perangkat Pengunjung">
          <div className="p-5 pt-4">
            {data.device_stats.length === 0 ? (
              <EmptyState text="Belum ada data perangkat." />
            ) : (
              <>
                <DonutPerangkat data={data.device_stats} aktif={perangkatAktif} onAktif={setPerangkatAktif} />
                <div className="space-y-1 mt-3">
                  {data.device_stats.map((d, i) => (
                    <button
                      key={d.device}
                      onMouseEnter={() => setPerangkatAktif(i)}
                      onMouseLeave={() => setPerangkatAktif(null)}
                      onFocus={() => setPerangkatAktif(i)}
                      onBlur={() => setPerangkatAktif(null)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${perangkatAktif === i ? 'bg-[var(--adm-hover)]' : ''}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: w.kategori[i % w.kategori.length] }} />
                      <span className="text-[var(--adm-body)] flex-1 truncate text-left">{d.device}</span>
                      <span className="text-[var(--adm-muted)] tabular-nums">{angka(d.count)}</span>
                      <span className="font-bold text-[var(--adm-fg)] tabular-nums w-10 text-right">{d.percentage}%</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* ---------- operasional & aktivitas ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel
          title="Penumpang per Bulan"
          action={<Link href="/admin/llau" className="text-[11px] font-bold text-[var(--adm-accent)]">Rekap LLAU →</Link>}
        >
          <div className="p-5 pt-4">
            {data.llau_trend.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Upload className="w-7 h-7 mx-auto text-[var(--adm-dim)]" />
                <p className="text-[12px] text-[var(--adm-muted)]">Belum ada rekap LLAU yang diunggah.</p>
                <Link href="/admin/llau" className="inline-block text-[12px] font-bold text-[var(--adm-accent)]">Unggah rekap pertama →</Link>
              </div>
            ) : (
              <>
                <GrafikLlau data={data.llau_trend} />
                {turunan.llauTerakhir && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-lg bg-[var(--adm-inset)] border border-[var(--adm-line)] p-2.5">
                      <p className="text-[10.5px] text-[var(--adm-muted)]">Penerbangan</p>
                      <p className="text-[15px] font-black text-[var(--adm-fg)] tabular-nums">{angka(turunan.llauTerakhir.flights)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--adm-inset)] border border-[var(--adm-line)] p-2.5">
                      <p className="text-[10.5px] text-[var(--adm-muted)]">Tepat waktu (OTP)</p>
                      <p className="text-[15px] font-black text-[var(--adm-fg)] tabular-nums">
                        {turunan.llauTerakhir.otp_rate !== null ? `${turunan.llauTerakhir.otp_rate}%` : '—'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>

        <Panel title="Status Penerbangan" action={<Badge text={`${data.flight_stats.total} terdata`} color="#3b82f6" />}>
          <div className="p-5 pt-4 space-y-3">
            {[
              { label: 'Boarding', value: data.flight_stats.boarding, color: '#38bdf8', icon: Plane },
              { label: 'Mendarat', value: data.flight_stats.landed, color: '#34d399', icon: CheckCircle2 },
              { label: 'Tertunda', value: data.flight_stats.delayed, color: '#fbbf24', icon: AlertTriangle },
            ].map((s) => {
              const Ikon = s.icon;
              const pct = data.flight_stats.total > 0 ? Math.round((s.value / data.flight_stats.total) * 100) : 0;
              return (
                <div key={s.label} className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-[12px] font-semibold text-[var(--adm-body)]">
                      <Ikon className="w-4 h-4" style={{ color: s.color }} /> {s.label}
                    </span>
                    <span className="text-[13px] font-black text-[var(--adm-fg)] tabular-nums">
                      {s.value} <span className="text-[10.5px] font-semibold text-[var(--adm-muted)]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--adm-line)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: s.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
            <Link href="/admin/flights" className="block text-[11px] font-bold text-[var(--adm-accent)] pt-1">Kelola jadwal penerbangan →</Link>
          </div>
        </Panel>

        <Panel title="Aktivitas Terbaru" action={<Activity className="w-4 h-4 text-[var(--adm-muted)]" />}>
          <div className="p-4">
            {data.recent_activity.length === 0 ? (
              <EmptyState text="Belum ada aktivitas." />
            ) : (
              <ol className="relative space-y-0.5">
                <span className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--adm-line)]" aria-hidden />
                {data.recent_activity.map((k, i) => {
                  const m = AKTIVITAS[k.type];
                  const Ikon = m.icon;
                  return (
                    <li key={`${k.type}-${k.ref ?? i}-${k.at}`}>
                      <Link href={k.href} className="relative flex items-start gap-3 rounded-lg px-1.5 py-2 hover:bg-[var(--adm-hover)] transition-colors">
                        <span
                          className="relative z-10 w-[19px] h-[19px] mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--adm-panel)]"
                          style={{ border: `1.5px solid ${m.color}` }}
                        >
                          <Ikon className="w-2.5 h-2.5" style={{ color: m.color }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-[var(--adm-fg)]">{k.title || m.label}</p>
                          <p className="text-[10.5px] text-[var(--adm-muted)]">
                            {m.label}{k.ref ? ` · ${k.ref}` : ''} · {relatif(k.at, kini)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Panel>
      </div>

      {/* ---------- inventaris konten ---------- */}
      <Panel title="Inventaris Konten Portal" action={<Badge text="Klik untuk kelola" color="#38bdf8" />}>
        <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Berita', value: data.content_counts.news, icon: Newspaper, href: '/admin/news', color: '#a78bfa' },
            { label: 'Pengumuman', value: data.content_counts.announcements, icon: Megaphone, href: '/admin/announcements', color: '#fbbf24' },
            { label: 'Fasilitas', value: data.content_counts.facilities, icon: Building2, href: '/admin/facilities', color: '#34d399' },
            { label: 'Tenant', value: data.content_counts.tenants, icon: Store, href: '/admin/tenants', color: '#38bdf8' },
            { label: 'Dokumen', value: data.content_counts.documents, icon: FileText, href: '/admin/documents', color: '#fb7185' },
          ].map((c) => (
            <JumpCard key={c.label} label={c.label} value={c.value} icon={c.icon} href={c.href} color={c.color} />
          ))}
        </motion.div>
      </Panel>
    </>
  );
}

/* ---------------- kartu KPI ---------------- */

function KartuKpi({
  label, ikon: Ikon, nilai, bawah, grafik, catatan,
}: {
  label: string;
  ikon: React.ElementType;
  nilai: string;
  bawah: React.ReactNode;
  grafik?: React.ReactNode;
  catatan?: string;
}) {
  return (
    <motion.div variants={riseIn} whileHover={{ y: -3 }} className="rounded-2xl adm-glass adm-lift p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-[var(--adm-muted)] font-semibold truncate" title={label}>{label}</p>
        <Ikon className="w-4 h-4 text-[var(--adm-accent)] flex-shrink-0" />
      </div>
      <p className="text-[26px] font-black text-[var(--adm-fg)] tabular-nums leading-tight mt-2">{nilai}</p>
      <div className="mt-1">{bawah}</div>
      {grafik && <div className="mt-auto pt-2">{grafik}</div>}
      {catatan && <p className="text-[10px] text-[var(--adm-dim)] mt-1.5" title={catatan}>{catatan}</p>}
    </motion.div>
  );
}
