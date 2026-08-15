'use client';

/**
 * Catatan penerbangan satu periode Posko Nataru.
 *
 * Halaman terpisah, bukan modal: satu periode memuat ratusan baris, dan
 * meninjaunya adalah pekerjaan tersendiri — bukan lirikan sambil lalu dari
 * daftar periode.
 *
 * `pax_total` dan `load_factor` DITAMPILKAN tetapi tidak dapat disunting
 * langsung: keduanya dihitung server dari angka penyusunnya. Menyunting
 * jumlah penumpang otomatis memperbarui keduanya — itulah satu-satunya cara
 * keduanya bisa berubah, sehingga totalnya tidak pernah menyimpang dari
 * rinciannya.
 *
 * Load factor yang kosong berarti kapasitas kursi belum diisi, BUKAN
 * penerbangan kosong. Tabel menuliskannya sebagai tanda hubung, dan rata-rata
 * di kartu ringkasan hanya menghitung yang diketahui.
 *
 * Seluruh angka di halaman ini datang dari satu permintaan yang sama
 * (`/nataru/events/{id}/flights`): identitas periode, ringkasan, rincian per
 * arah, kurva harian, dan daftar penerbangannya. Tidak ada yang dihitung
 * ulang di peramban — kalau tabel dan ringkasannya berselisih, yang salah
 * satu-satunya adalah server, bukan dua sumber yang berbeda.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { adminFetch } from '@/lib/adminApi';
import type { NataruEvent, NataruFlight, NataruSummary } from '@/types';
import { angka } from '@/lib/airTraffic';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger, InfoNote,
} from '@/components/admin/ui';
import { useAdminTheme } from '@/components/admin/theme';
import {
  PlaneTakeoff, PlaneLanding, Pencil, Trash2, RefreshCw, ArrowLeft, Users, Package, Gauge,
  CalendarRange, CalendarClock, Briefcase, Building2, Link2, FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';

/** Warna kurva harian per tema — Recharts menerima nilai, bukan kelas CSS. */
const CHART = {
  light: { grid: 'rgba(15,23,42,0.08)', axis: '#64748b', line: '#0891b2', peak: '#b45309',
    tooltip: { background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 12, fontSize: 12, boxShadow: '0 10px 30px -12px rgba(15,23,42,0.25)' },
    tooltipLabel: { color: '#0f172a' } },
  dark: { grid: 'rgba(255,255,255,0.06)', axis: '#64748b', line: '#22d3ee', peak: '#fbbf24',
    tooltip: { background: '#0b1428', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 },
    tooltipLabel: { color: '#e2e8f0' } },
} as const;

type Muatan = { event: NataruEvent; summary: NataruSummary; flights: NataruFlight[] };

type FormState = {
  flight_date: string;
  flight_time: string;
  airline: string;
  flight_number: string;
  route: string;
  seat_capacity: string;
  pax_adult: string;
  pax_child: string;
  pax_infant: string;
  cargo: string;
  baggage: string;
  officer_name: string;
  remarks: string;
};

export default function AdminNataruFlightsPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const c = CHART[useAdminTheme()];

  const [data, setData] = useState<Muatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [arah, setArah] = useState<'semua' | 'arrival' | 'departure'>('semua');

  const [form, setForm] = useState<FormState | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<Muatan>(`/nataru/events/${id}/flights`);
    setData(res.data ?? null);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<Muatan>(`/nataru/events/${id}/flights`);
      if (batal) return;
      setData(res.data ?? null);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, [id]);

  const visible = useMemo(() => {
    const s = q.toLowerCase();

    return (data?.flights ?? []).filter((f) => {
      const cocokArah = arah === 'semua' || f.direction === arah;
      const cocokCari = !q || [f.flight_number, f.airline, f.route, f.officer_name]
        .some((v) => String(v ?? '').toLowerCase().includes(s));

      return cocokArah && cocokCari;
    });
  }, [data, q, arah]);

  const openEdit = (f: NataruFlight) => {
    setForm({
      flight_date: String(f.flight_date).slice(0, 10),
      flight_time: String(f.flight_time).slice(0, 5),
      airline: f.airline,
      flight_number: f.flight_number,
      route: f.route,
      seat_capacity: f.seat_capacity != null ? String(f.seat_capacity) : '',
      pax_adult: String(f.pax_adult),
      pax_child: String(f.pax_child),
      pax_infant: String(f.pax_infant),
      cargo: String(f.cargo),
      baggage: String(f.baggage),
      officer_name: f.officer_name,
      remarks: f.remarks ?? '',
    });
    setEditId(f.id);
  };

  const save = async () => {
    if (!form || editId == null) return;
    setSaving(true);

    const res = await adminFetch(`/nataru/flights/${editId}`, {
      method: 'PUT',
      body: {
        ...form,
        seat_capacity: form.seat_capacity === '' ? null : Number(form.seat_capacity),
        pax_adult: Number(form.pax_adult) || 0,
        pax_child: Number(form.pax_child) || 0,
        pax_infant: Number(form.pax_infant) || 0,
        cargo: Number(form.cargo) || 0,
        baggage: Number(form.baggage) || 0,
        remarks: form.remarks || null,
      },
    });
    setSaving(false);

    if (res.ok) {
      setEditId(null);
      setForm(null);
      setToast({ text: 'Catatan penerbangan diperbarui', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/nataru/flights/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Catatan dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const t = data?.summary.totals;
  const ev = data?.event;
  const arahRingkas = data?.summary.by_direction;

  const tanggal = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  /** Kurva harian dengan label tanggal pendek — sumbu X memuat belasan hari. */
  const harian = useMemo(
    () =>
      (data?.summary.daily ?? []).map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      })),
    [data],
  );

  /** Label hari puncak pada kurva, bila tanggalnya memang punya catatan. */
  const labelPuncak = useMemo(() => {
    if (!ev?.peak_date) return null;
    const kunci = String(ev.peak_date).slice(0, 10);

    return harian.find((d) => d.date === kunci)?.label ?? null;
  }, [ev, harian]);

  return (
    <>
      <PageHeader
        icon={PlaneTakeoff}
        title={data?.event.name ?? 'Detail Posko Nataru'}
        subtitle={
          ev
            ? `${tanggal(ev.start_date)} – ${tanggal(ev.end_date)} · ${ev.is_active ? 'posko terbuka' : 'posko ditutup'}`
            : 'Memuat rincian periode...'
        }
        action={
          <div className="flex gap-2">
            <Link href="/admin/nataru">
              <Btn variant="ghost"><ArrowLeft className="w-4 h-4" /> Daftar Periode</Btn>
            </Link>
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Penerbangan" value={t ? angka(t.flights) : '—'} icon={PlaneTakeoff} accent="#38bdf8" hint={t ? `${angka(t.airlines)} maskapai terlibat` : undefined} />
        <StatCard label="Penumpang" value={t ? angka(t.passengers) : '—'} icon={Users} accent="#34d399" />
        <StatCard label="Kargo (kg)" value={t ? angka(t.cargo) : '—'} icon={Package} accent="#a78bfa" hint={t ? `Bagasi ${angka(t.baggage)} kg` : undefined} />
        <StatCard
          label="Load Factor Rata-rata"
          value={t?.average_load_factor != null ? `${t.average_load_factor}%` : 'belum ada'}
          icon={Gauge}
          accent="#fbbf24"
          hint="Hanya dari penerbangan yang kapasitas kursinya terisi"
        />
      </motion.div>

      {/* ---- identitas periode + rincian per arah ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Identitas Periode">
          <div className="p-5 space-y-3.5">
            {[
              { icon: CalendarRange, label: 'Rentang posko', value: `${tanggal(ev?.start_date)} – ${tanggal(ev?.end_date)}` },
              { icon: CalendarClock, label: 'Perkiraan hari puncak', value: ev?.peak_date ? tanggal(ev.peak_date) : 'Belum ditentukan' },
              { icon: Building2, label: 'Maskapai terlibat', value: t ? `${angka(t.airlines)} maskapai` : '—' },
              { icon: Briefcase, label: 'Bagasi tercatat', value: t ? `${angka(t.baggage)} kg` : '—' },
              { icon: Link2, label: 'Status kiriman petugas', value: ev?.is_active ? 'Terbuka — petugas masih dapat mengirim' : 'Ditutup — kiriman baru ditolak' },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.label} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[var(--adm-accent)]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] uppercase tracking-wider text-[var(--adm-muted)] font-semibold">{b.label}</p>
                    <p className="text-[12.5px] text-[var(--adm-fg)] font-semibold mt-0.5">{b.value}</p>
                  </div>
                </div>
              );
            })}

            {ev?.description && (
              <div className="pt-1">
                <p className="text-[10.5px] uppercase tracking-wider text-[var(--adm-muted)] font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Keterangan untuk petugas
                </p>
                <p className="mt-1.5 text-[12px] text-[var(--adm-body)] leading-relaxed whitespace-pre-line">
                  {ev.description}
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel className="xl:col-span-2" title="Rincian per Arah">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ['arrival', 'Kedatangan', PlaneLanding, '#38bdf8'],
              ['departure', 'Keberangkatan', PlaneTakeoff, '#fb923c'],
            ] as const).map(([kunci, label, Icon, warna]) => {
              const r = arahRingkas?.[kunci];
              // Porsi dihitung terhadap total agar dua kotak ini terbaca
              // sebagai pembagian satu periode, bukan dua angka lepas.
              const porsi = t && t.flights > 0 ? Math.round(((r?.flights ?? 0) / t.flights) * 100) : 0;

              return (
                <div key={kunci} className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--adm-fg)]">
                      <Icon className="w-4 h-4" style={{ color: warna }} /> {label}
                    </span>
                    <Badge text={`${porsi}%`} color={warna} />
                  </div>

                  <p className="mt-3 text-[26px] font-black text-[var(--adm-fg)] leading-none tabular-nums">
                    {angka(r?.flights ?? 0)}
                  </p>
                  <p className="text-[11px] text-[var(--adm-muted)] mt-1">penerbangan</p>

                  <div className="mt-3 h-1.5 rounded-full bg-[var(--adm-hover)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: warna }}
                      initial={{ width: 0 }}
                      animate={{ width: `${porsi}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-[var(--adm-line)] space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[var(--adm-muted)]">Penumpang</span>
                      <span className="font-bold text-[var(--adm-fg)] tabular-nums">{angka(r?.passengers ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[var(--adm-muted)]">Load factor rata-rata</span>
                      <span className="font-bold text-[var(--adm-fg)] tabular-nums">
                        {r?.average_load_factor != null ? `${r.average_load_factor}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* ---- kurva harian ---- */}
      <Panel
        title="Arus Harian Selama Posko"
        action={labelPuncak && <Badge text="Garis putus = hari puncak" color={c.peak} />}
      >
        <div className="p-5 pt-4">
          {harian.length === 0 ? (
            <EmptyState
              text="Belum ada arus harian"
              hint="Kurva ini terbentuk sendiri begitu petugas mengirim catatan pertamanya."
            />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={harian} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gNataru" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.line} stopOpacity={0.42} />
                    <stop offset="100%" stopColor={c.line} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis dataKey="label" stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={c.tooltip}
                  labelStyle={c.tooltipLabel}
                  formatter={(v: any, n: any) => [angka(Number(v)), n === 'passengers' ? 'Penumpang' : 'Penerbangan']}
                />
                {/* Hari puncak hanya ditandai bila tanggalnya memang ada di
                    kurva; menandai tanggal tanpa catatan justru menyesatkan. */}
                {labelPuncak && (
                  <ReferenceLine x={labelPuncak} stroke={c.peak} strokeDasharray="5 5" strokeWidth={1.5} />
                )}
                <Area type="monotone" dataKey="passengers" stroke={c.line} strokeWidth={2.5} fill="url(#gNataru)" animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      {!loading && ev && !ev.is_active && (
        <InfoNote>
          Posko ini <strong>sudah ditutup</strong> — tautan petugas tidak lagi menerima kiriman baru.
          Catatan di bawah tetap dapat disunting dari sini bila ada koreksi.
        </InfoNote>
      )}

      <Panel
        title="Catatan Penerbangan"
        action={<Badge text={`${visible.length} dari ${data?.flights.length ?? 0} baris`} color="#38bdf8" />}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <div className="flex items-center gap-2">
            {([['semua', 'Semua'], ['arrival', 'Kedatangan'], ['departure', 'Keberangkatan']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setArah(k)}
                aria-pressed={arah === k}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                  arah === k ? 'bg-cyan-500/20 text-[var(--adm-accent)]' : 'bg-[var(--adm-hover)] text-[var(--adm-muted)] hover:text-[var(--adm-body)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="Cari nomor, maskapai, rute..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada catatan" hint="Catatan masuk lewat tautan petugas di lapangan." />
        ) : (
          <Table head={['Penerbangan', 'Tanggal & Jam', 'Rute', 'Penumpang', 'Load Factor', 'Petugas', 'Aksi']}>
            {visible.map((f) => (
              <Row key={f.id}>
                <Cell>
                  <div className="flex items-center gap-2">
                    {f.direction === 'arrival'
                      ? <PlaneLanding className="w-3.5 h-3.5 text-[var(--adm-accent)] flex-shrink-0" />
                      : <PlaneTakeoff className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--adm-fg)] text-[12.5px]">{f.flight_number}</p>
                      <p className="text-[var(--adm-muted)] text-[11.5px]">{f.airline}</p>
                    </div>
                  </div>
                </Cell>

                <Cell className="whitespace-nowrap">
                  <span className="tabular-nums">{String(f.flight_date).slice(0, 10)}</span>
                  <span className="block text-[11.5px] text-[var(--adm-dim)] tabular-nums">{String(f.flight_time).slice(0, 5)}</span>
                </Cell>

                <Cell>{f.route}</Cell>

                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] tabular-nums">{angka(f.pax_total)}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)] tabular-nums">
                    {f.pax_adult} dewasa · {f.pax_child} anak · {f.pax_infant} bayi
                  </span>
                </Cell>

                <Cell>
                  {f.load_factor != null ? (
                    <Badge
                      text={`${f.load_factor}%`}
                      color={f.load_factor >= 80 ? '#34d399' : f.load_factor >= 50 ? '#fbbf24' : '#94a3b8'}
                    />
                  ) : (
                    // Kosong berarti kapasitas kursi tak diisi, bukan penerbangan kosong.
                    <span className="text-[var(--adm-dim)]" title="Kapasitas kursi belum diisi">—</span>
                  )}
                </Cell>

                <Cell className="max-w-[180px]">
                  <span className="text-[11.5px] text-[var(--adm-muted)] line-clamp-2">{f.officer_name}</span>
                </Cell>

                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(f)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(f.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      <Modal
        open={editId !== null && form !== null}
        onClose={() => { setEditId(null); setForm(null); }}
        title="Ubah Catatan Penerbangan"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setEditId(null); setForm(null); }}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nomor Penerbangan" required value={form.flight_number} onChange={(v) => setForm({ ...form, flight_number: v })} />
              <Field label="Maskapai" required value={form.airline} onChange={(v) => setForm({ ...form, airline: v })} />
              <Field label="Tanggal" required type="date" value={form.flight_date} onChange={(v) => setForm({ ...form, flight_date: String(v) })} />
              <Field label="Jam" required value={form.flight_time} onChange={(v) => setForm({ ...form, flight_time: v })} placeholder="09:30" />
              <Field label="Rute" required value={form.route} onChange={(v) => setForm({ ...form, route: v })} />
              <Field label="Kapasitas Kursi" type="number" value={form.seat_capacity} onChange={(v) => setForm({ ...form, seat_capacity: String(v) })} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Dewasa" required type="number" value={form.pax_adult} onChange={(v) => setForm({ ...form, pax_adult: String(v) })} />
              <Field label="Anak" required type="number" value={form.pax_child} onChange={(v) => setForm({ ...form, pax_child: String(v) })} />
              <Field label="Bayi" required type="number" value={form.pax_infant} onChange={(v) => setForm({ ...form, pax_infant: String(v) })} />
            </div>

            <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
              Total penumpang dan load factor dihitung ulang oleh server dari angka di atas —
              keduanya tidak dapat diisi langsung, supaya totalnya tidak pernah menyimpang dari
              rinciannya.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Kargo (kg)" required type="number" value={form.cargo} onChange={(v) => setForm({ ...form, cargo: String(v) })} />
              <Field label="Bagasi (kg)" required type="number" value={form.baggage} onChange={(v) => setForm({ ...form, baggage: String(v) })} />
            </div>

            <Field label="Nama Petugas" required value={form.officer_name} onChange={(v) => setForm({ ...form, officer_name: v })} />
            <Field label="Catatan" type="textarea" rows={2} value={form.remarks} onChange={(v) => setForm({ ...form, remarks: v })} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Catatan penerbangan ini akan dihapus permanen dan keluar dari seluruh ringkasan. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
