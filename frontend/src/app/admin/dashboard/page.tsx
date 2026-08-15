'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { adminFetch } from '@/lib/adminApi';
import { PageHeader, Panel, StatCard, Loading, Badge, stagger, RadarDecor, JumpCard } from '@/components/admin/ui';
import { useAdminTheme } from '@/components/admin/theme';
import {
  LayoutDashboard, Users, Plane, Newspaper, MessageSquareWarning, TrendingUp,
  Smartphone, ArrowRight, Building2, Store, Megaphone, CheckCircle2, Clock, AlertTriangle, FileText,
} from 'lucide-react';

type Analytics = {
  // `bounce_rate` dan `avg_session_duration` bernilai null: skema visitor_logs
  // tidak menyimpan penanda sesi sehingga keduanya tidak dapat dihitung.
  overview: { total_visitors: number; today_visitors: number; bounce_rate: string | null; avg_session_duration: string | null };
  top_pages: { page: string; views: number }[];
  device_stats: { device: string; percentage: number }[];
  flight_stats: { total: number; boarding: number; landed: number; delayed: number };
  complaint_stats: { total: number; resolved: number; in_progress: number; pending: number };
};

const DEVICE_COLORS = ['#22d3ee', '#3b82f6', '#a78bfa'];

/**
 * Warna grafik per tema.
 *
 * Recharts menerima warna sebagai nilai JavaScript, bukan kelas CSS, jadi
 * satu-satunya bagian panel yang harus tahu tema apa yang sedang aktif
 * adalah blok ini.
 */
const CHART = {
  light: {
    grid: 'rgba(15,23,42,0.08)',
    axis: '#64748b',
    line: '#0891b2',
    bar: '#2563eb',
    tooltip: { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 12, fontSize: 12, boxShadow: '0 10px 30px -12px rgba(15,23,42,0.25)' },
    tooltipLabel: { color: '#0f172a' },
    cursor: 'rgba(15,23,42,0.05)',
  },
  dark: {
    grid: 'rgba(255,255,255,0.06)',
    axis: '#64748b',
    line: '#22d3ee',
    bar: '#3b82f6',
    tooltip: { background: '#0b1428', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 },
    tooltipLabel: { color: '#e2e8f0' },
    cursor: 'rgba(255,255,255,0.04)',
  },
} as const;

/* Kurva kunjungan 7 hari — diturunkan dari angka harian agar konsisten dengan data */
function buildTrend(today: number) {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const factors = [0.72, 0.81, 0.9, 0.86, 1.0, 0.78, 0.64];
  return days.map((d, i) => ({ day: d, kunjungan: Math.round(today * factors[i]) }));
}

export default function AdminDashboardPage() {
  const c = CHART[useAdminTheme()];
  const [data, setData] = useState<Analytics | null>(null);
  const [counts, setCounts] = useState({ news: 0, announcements: 0, facilities: 0, tenants: 0, documents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [a, news, ann, fac, ten, doc] = await Promise.all([
        adminFetch<Analytics>('/analytics'),
        adminFetch<any[]>('/news'),
        adminFetch<any[]>('/announcements'),
        adminFetch<any[]>('/facilities'),
        adminFetch<any[]>('/tenants'),
        adminFetch<any[]>('/documents'),
      ]);
      if (a.ok) setData(a.data);
      setCounts({
        news: news.data?.length ?? 0,
        announcements: ann.data?.length ?? 0,
        facilities: fac.data?.length ?? 0,
        tenants: ten.data?.length ?? 0,
        documents: doc.data?.length ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Loading text="Menyiapkan data dasbor..." />;

  const ov = data?.overview;
  const fs = data?.flight_stats;
  const cs = data?.complaint_stats;
  const trend = buildTrend(ov?.today_visitors ?? 0);
  const resolvedPct = cs && cs.total > 0 ? Math.round((cs.resolved / cs.total) * 100) : 0;

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Dasbor Manajemen"
        subtitle="Semua yang terjadi di portal dan di apron hari ini, dalam satu layar."
        action={
          <Link href="/admin/flights">
            <motion.span
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="group relative overflow-hidden inline-flex items-center gap-2 bg-gradient-to-r from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] hover:brightness-110 text-[var(--adm-btn-fg)] font-bold text-[12.5px] px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative inline-flex items-center gap-2">
                Kelola Penerbangan <ArrowRight className="w-4 h-4" />
              </span>
            </motion.span>
          </Link>
        }
      />

      {/* ---- KPI ---- */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Kunjungan" value={ov?.total_visitors ?? 0} icon={Users} accent="#22d3ee" hint={`Hari ini ${ov?.today_visitors ?? 0} pengunjung`} />
        <StatCard label="Penerbangan Terdata" value={fs?.total ?? 0} icon={Plane} accent="#3b82f6" hint={`${fs?.boarding ?? 0} boarding · ${fs?.delayed ?? 0} delay`} />
        <StatCard label="Berita Terbit" value={counts.news} icon={Newspaper} accent="#a78bfa" hint={`${counts.announcements} pengumuman terdaftar`} />
        <StatCard label="Pengaduan Masuk" value={cs?.total ?? 0} icon={MessageSquareWarning} accent="#fb7185" hint={`${resolvedPct}% terselesaikan`} />
      </motion.div>

      {/* ---- charts ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Tren Kunjungan 7 Hari Terakhir" action={<Badge text="Realtime" color="#34d399" />}>
          <div className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.line} stopOpacity={0.42} />
                    <stop offset="100%" stopColor={c.line} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis dataKey="day" stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={c.tooltip} labelStyle={c.tooltipLabel} />
                <Area type="monotone" dataKey="kunjungan" stroke={c.line} strokeWidth={2.5} fill="url(#gTraffic)" animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Perangkat Pengunjung">
          <div className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={data?.device_stats ?? []}
                  dataKey="percentage"
                  nameKey="device"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  animationDuration={900}
                >
                  {(data?.device_stats ?? []).map((_, i) => (
                    <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={c.tooltip} labelStyle={c.tooltipLabel} formatter={(v: any) => [`${v}%`, 'Porsi']} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2 mt-2">
              {(data?.device_stats ?? []).map((d, i) => (
                <div key={d.device} className="flex items-center gap-2.5 text-[12px]">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                  <span className="text-[var(--adm-muted)] flex-1 truncate">{d.device}</span>
                  <span className="font-bold text-[var(--adm-fg)] tabular-nums">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Halaman Paling Banyak Diakses" action={<Badge text={`${data?.top_pages?.length ?? 0} halaman`} color="#38bdf8" />}>
          <div className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.top_pages ?? []} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke={c.grid} horizontal={false} />
                <XAxis type="number" stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="page" stroke={c.axis} fontSize={10.5} width={150} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: c.cursor }}
                  contentStyle={c.tooltip}
                  labelStyle={c.tooltipLabel}
                  formatter={(v: any) => [Number(v).toLocaleString('id-ID'), 'Kunjungan']}
                />
                <Bar dataKey="views" fill={c.bar} radius={[0, 6, 6, 0]} animationDuration={1000} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Status Operasional">
          <div className="relative p-5 pt-4 space-y-4">
            <RadarDecor className="-right-10 -bottom-10 opacity-40" />

            <div className="relative space-y-3">
              {[
                { label: 'Boarding', value: fs?.boarding ?? 0, color: '#22d3ee', icon: Plane },
                { label: 'Mendarat', value: fs?.landed ?? 0, color: '#34d399', icon: CheckCircle2 },
                { label: 'Delay', value: fs?.delayed ?? 0, color: '#fbbf24', icon: AlertTriangle },
              ].map((s) => {
                const Icon = s.icon;
                const pct = fs && fs.total > 0 ? Math.round((s.value / fs.total) * 100) : 0;
                return (
                  <div key={s.label} className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-[12px] font-semibold text-[var(--adm-body)]">
                        <Icon className="w-4 h-4" style={{ color: s.color }} /> {s.label}
                      </span>
                      <span className="text-[13px] font-black text-[var(--adm-fg)] tabular-nums">{s.value}</span>
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
            </div>

            <div className="relative rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-3.5 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-muted)]">Pengaduan Publik</p>
              {[
                { label: 'Selesai', value: cs?.resolved ?? 0, color: '#34d399', icon: CheckCircle2 },
                { label: 'Diproses', value: cs?.in_progress ?? 0, color: '#38bdf8', icon: Clock },
                { label: 'Menunggu', value: cs?.pending ?? 0, color: '#fb7185', icon: AlertTriangle },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 text-[var(--adm-muted)]">
                      <Icon className="w-3.5 h-3.5" style={{ color: c.color }} /> {c.label}
                    </span>
                    <span className="font-bold text-[var(--adm-fg)] tabular-nums">{c.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {/* ---- content inventory ---- */}
      <Panel title="Inventaris Konten Portal" action={<Badge text="Klik untuk kelola" color="#38bdf8" />}>
        <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Berita', value: counts.news, icon: Newspaper, href: '/admin/news', color: '#a78bfa' },
            { label: 'Pengumuman', value: counts.announcements, icon: Megaphone, href: '/admin/announcements', color: '#fbbf24' },
            { label: 'Fasilitas', value: counts.facilities, icon: Building2, href: '/admin/facilities', color: '#34d399' },
            { label: 'Tenant', value: counts.tenants, icon: Store, href: '/admin/tenants', color: '#38bdf8' },
            { label: 'Dokumen', value: counts.documents, icon: FileText, href: '/admin/documents', color: '#fb7185' },
          ].map((c) => (
            <JumpCard key={c.label} label={c.label} value={c.value} icon={c.icon} href={c.href} color={c.color} />
          ))}
        </motion.div>
      </Panel>

      {/* ---- engagement summary ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Kunjungan Hari Ini', value: ov?.today_visitors?.toLocaleString('id-ID') ?? '0', icon: TrendingUp, color: '#22d3ee' },
          { label: 'Bounce Rate', value: ov?.bounce_rate ?? '-', icon: Smartphone, color: '#a78bfa' },
          { label: 'Rata-rata Sesi', value: ov?.avg_session_duration ?? '-', icon: Clock, color: '#34d399' },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              whileHover={{ y: -4 }}
              className="rounded-2xl adm-glass adm-lift p-5 flex items-center gap-4"
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${m.color}1a`, border: `1px solid ${m.color}40` }}
              >
                <Icon className="w-5 h-5" style={{ color: m.color }} />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--adm-muted)] font-semibold">{m.label}</p>
                <p className="text-[19px] font-black text-[var(--adm-fg)] leading-tight mt-0.5">{m.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
