'use client';

/**
 * Grafik dasbor admin.
 *
 * Recharts menerima warna sebagai nilai JavaScript, bukan kelas CSS, jadi
 * blok `WARNA` di bawah adalah satu-satunya tempat yang tahu tema aktif.
 * Warna seri diambil dari palet kategorikal tervalidasi (lolos uji buta warna
 * untuk tiga slot pertama di kedua tema); periode pembanding sengaja abu-abu
 * putus-putus agar terbaca sebagai konteks, bukan seri kedua yang bersaing.
 */

import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { useAdminTheme } from '@/components/admin/theme';

export const WARNA = {
  light: {
    seri: '#2a78d6',
    pembanding: '#94a3b8',
    grid: 'rgba(15,23,42,0.07)',
    sumbu: '#64748b',
    kursor: 'rgba(15,23,42,0.05)',
    kategori: ['#2a78d6', '#eb6834', '#1baf7a'],
  },
  dark: {
    seri: '#3987e5',
    pembanding: '#64748b',
    grid: 'rgba(255,255,255,0.06)',
    sumbu: '#64748b',
    kursor: 'rgba(255,255,255,0.05)',
    kategori: ['#3987e5', '#d95926', '#199e70'],
  },
} as const;

export const useWarna = () => WARNA[useAdminTheme()];

export const angka = (n: number) => n.toLocaleString('id-ID');

const tglPendek = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

const tglPanjang = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

/** Kotak tooltip bersama — memakai token panel agar mengikuti tema. */
function KotakTooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--adm-line)] bg-[var(--adm-panel)] px-3 py-2 shadow-xl text-[11.5px] text-[var(--adm-body)] space-y-1 backdrop-blur">
      {children}
    </div>
  );
}

function BarisTooltip({ warna, label, nilai, putus }: { warna: string; label: string; nilai: string; putus?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-0 flex-shrink-0"
        style={{ borderTop: `2px ${putus ? 'dashed' : 'solid'} ${warna}` }}
      />
      <span className="text-[var(--adm-muted)]">{label}</span>
      <span className="ml-auto pl-3 font-bold text-[var(--adm-fg)] tabular-nums">{nilai}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export type TitikTren = { date: string; views: number; unique: number };

/**
 * Tren harian dengan garis periode sebelumnya.
 *
 * Kedua periode disejajarkan per urutan hari (hari ke-1 dengan hari ke-1),
 * karena yang dibandingkan adalah bentuk dan tingkatnya, bukan tanggalnya.
 */
export function GrafikTren({
  data,
  sebelumnya,
  metrik,
}: {
  data: TitikTren[];
  sebelumnya: TitikTren[];
  metrik: 'views' | 'unique';
}) {
  const w = useWarna();
  const label = metrik === 'views' ? 'Tayangan' : 'Pengunjung unik';
  const gabung = data.map((d, i) => ({
    date: d.date,
    kini: d[metrik],
    lalu: sebelumnya[i]?.[metrik] ?? 0,
    tglLalu: sebelumnya[i]?.date,
  }));
  const rapat = data.length > 31;

  return (
    <ResponsiveContainer width="100%" height={270}>
      <AreaChart data={gabung} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="gTren" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={w.seri} stopOpacity={0.28} />
            <stop offset="100%" stopColor={w.seri} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={w.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={tglPendek}
          stroke={w.sumbu}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={rapat ? Math.ceil(data.length / 8) : 'preserveStartEnd'}
          minTickGap={16}
        />
        <YAxis stroke={w.sumbu} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ stroke: w.sumbu, strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof gabung)[number];
            const selisih = p.lalu > 0 ? Math.round(((p.kini - p.lalu) / p.lalu) * 100) : null;
            return (
              <KotakTooltip>
                <p className="font-bold text-[var(--adm-fg)]">{tglPanjang(p.date)}</p>
                <BarisTooltip warna={w.seri} label={label} nilai={angka(p.kini)} />
                <BarisTooltip
                  warna={w.pembanding}
                  putus
                  label={p.tglLalu ? `Pembanding (${tglPendek(p.tglLalu)})` : 'Pembanding'}
                  nilai={angka(p.lalu)}
                />
                {selisih !== null && (
                  <p className="text-[10.5px] text-[var(--adm-muted)] pt-0.5">
                    {selisih >= 0 ? '▲' : '▼'} {Math.abs(selisih)}% dari pembanding
                  </p>
                )}
              </KotakTooltip>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="lalu"
          stroke={w.pembanding}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
          animationDuration={700}
        />
        <Area
          type="monotone"
          dataKey="kini"
          stroke={w.seri}
          strokeWidth={2}
          fill="url(#gTren)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--adm-bg)' }}
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */

/** Garis kecil tanpa sumbu di kartu KPI — hanya bentuk, angkanya di kartu. */
export function Sparkline({ nilai }: { nilai: number[] }) {
  const w = useWarna();
  const data = nilai.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={w.seri} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */

/** Sebaran tayangan per jam WITA; jam tersibuk diberi warna penuh. */
export function GrafikJam({ data }: { data: { hour: number; views: number }[] }) {
  const w = useWarna();
  const puncak = Math.max(0, ...data.map((d) => d.views));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke={w.grid} vertical={false} />
        <XAxis
          dataKey="hour"
          stroke={w.sumbu}
          fontSize={10.5}
          tickLine={false}
          axisLine={false}
          tickFormatter={(h) => String(h).padStart(2, '0')}
          interval={2}
        />
        <YAxis stroke={w.sumbu} fontSize={10.5} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: w.kursor }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { hour: number; views: number };
            const jam = String(p.hour).padStart(2, '0');
            return (
              <KotakTooltip>
                <p className="font-bold text-[var(--adm-fg)]">{jam}.00–{jam}.59 WITA</p>
                <BarisTooltip warna={w.seri} label="Tayangan" nilai={angka(p.views)} />
              </KotakTooltip>
            );
          }}
        />
        <Bar dataKey="views" radius={[4, 4, 0, 0]} animationDuration={800}>
          {data.map((d) => (
            <Cell key={d.hour} fill={w.seri} fillOpacity={puncak > 0 && d.views === puncak ? 1 : 0.4} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */

export type Perangkat = { device: string; count: number; percentage: number };

/** Donut perangkat dengan total di tengah; identitas juga tertulis di legenda. */
export function DonutPerangkat({ data, aktif, onAktif }: {
  data: Perangkat[];
  aktif: number | null;
  onAktif: (i: number | null) => void;
}) {
  const w = useWarna();
  const total = data.reduce((s, d) => s + d.count, 0);
  const sorot = aktif !== null ? data[aktif] : null;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="device"
            innerRadius={56}
            outerRadius={80}
            paddingAngle={2}
            stroke="none"
            animationDuration={800}
            onMouseEnter={(_, i) => onAktif(i)}
            onMouseLeave={() => onAktif(null)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={w.kategori[i % w.kategori.length]}
                fillOpacity={aktif === null || aktif === i ? 1 : 0.35}
                className="cursor-pointer transition-opacity"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-black text-[var(--adm-fg)] tabular-nums leading-none">
          {sorot ? `${sorot.percentage}%` : angka(total)}
        </span>
        <span className="text-[10.5px] text-[var(--adm-muted)] mt-1">{sorot ? sorot.device : 'tayangan'}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export type TitikLlau = {
  report_id: number;
  period: string;
  flights: number;
  passengers: number;
  otp_rate: number | null;
};

const bulan = (p: string) =>
  new Date(`${p}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

/** Penumpang per bulan dari rekap LLAU yang diunggah. */
export function GrafikLlau({ data }: { data: TitikLlau[] }) {
  const w = useWarna();

  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={w.grid} vertical={false} />
        <XAxis dataKey="period" tickFormatter={bulan} stroke={w.sumbu} fontSize={10} tickLine={false} axisLine={false} interval={0} />
        <YAxis
          stroke={w.sumbu}
          fontSize={10.5}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))}
        />
        <Tooltip
          cursor={{ fill: w.kursor }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as TitikLlau;
            return (
              <KotakTooltip>
                <p className="font-bold text-[var(--adm-fg)]">
                  {new Date(`${p.period}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </p>
                <BarisTooltip warna={w.seri} label="Penumpang" nilai={angka(p.passengers)} />
                <p className="text-[10.5px] text-[var(--adm-muted)]">
                  {angka(p.flights)} penerbangan{p.otp_rate !== null ? ` · OTP ${p.otp_rate}%` : ''}
                </p>
              </KotakTooltip>
            );
          }}
        />
        <Bar dataKey="passengers" fill={w.seri} radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  );
}
