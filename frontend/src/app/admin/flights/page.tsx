'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { adminFetch } from '@/lib/adminApi';
import { Flight } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { Plane, Plus, Pencil, Trash2, RefreshCw, PlaneTakeoff, PlaneLanding, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Terjadwal', color: '#34d399' },
  check_in: { label: 'Check-in Dibuka', color: '#818cf8' },
  boarding: { label: 'Boarding', color: '#22d3ee' },
  departed: { label: 'Berangkat', color: '#94a3b8' },
  landed: { label: 'Mendarat', color: '#94a3b8' },
  delayed: { label: 'Delay', color: '#fbbf24' },
  cancelled: { label: 'Batal', color: '#fb7185' },
};

const EMPTY: Partial<Flight> = {
  flight_number: '', airline: '', origin: '', destination: '', scheduled_time: '',
  estimated_time: '', terminal: 'Terminal Utama', gate: '', flight_type: 'departure',
  status: 'scheduled', remarks: '',
};

export default function AdminFlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'departure' | 'arrival'>('all');

  const [form, setForm] = useState<Partial<Flight>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchApi<{ flights: Flight[] }>('/flights');
    const raw: any = res.data;
    const list = Array.isArray(raw) ? raw : raw?.flights;
    setFlights(Array.isArray(list) ? list : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    return flights.filter((f) => {
      const byTab = tab === 'all' || f.flight_type === tab;
      const s = q.toLowerCase();
      const byQ = !q || [f.flight_number, f.airline, f.origin, f.destination].some((v) => String(v ?? '').toLowerCase().includes(s));
      return byTab && byQ;
    });
  }, [flights, q, tab]);

  const stats = useMemo(() => ({
    total: flights.length,
    dep: flights.filter((f) => f.flight_type === 'departure').length,
    arr: flights.filter((f) => f.flight_type === 'arrival').length,
    delayed: flights.filter((f) => f.status === 'delayed').length,
  }), [flights]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (f: Flight) => { setForm({ ...f }); setEditId(Number(f.id)); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const res = editId
      ? await adminFetch(`/flights/${editId}`, { method: 'PUT', body: form })
      : await adminFetch('/flights', { method: 'POST', body: form });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Penerbangan diperbarui' : 'Penerbangan ditambahkan', kind: 'success' });
      load();
    } else {
      setToast({ text: res.message, kind: 'error' });
    }
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/flights/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Penerbangan dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Plane}
        title="Manajemen Penerbangan"
        subtitle="Kelola jadwal keberangkatan & kedatangan yang tampil pada layar FIDS publik"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Penerbangan</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Jadwal" value={stats.total} icon={Plane} accent="#22d3ee" />
        <StatCard label="Keberangkatan" value={stats.dep} icon={PlaneTakeoff} accent="#3b82f6" />
        <StatCard label="Kedatangan" value={stats.arr} icon={PlaneLanding} accent="#34d399" />
        <StatCard label="Delay" value={stats.delayed} icon={AlertTriangle} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <div className="flex gap-2">
            {([['all', 'Semua'], ['departure', 'Keberangkatan'], ['arrival', 'Kedatangan']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`relative px-3.5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                  tab === v ? 'text-[var(--adm-accent)]' : 'text-[var(--adm-muted)] hover:text-[var(--adm-body)]'
                }`}
              >
                {tab === v && (
                  <motion.span layoutId="flight-tab" className="absolute inset-0 rounded-lg bg-cyan-500/12 border border-cyan-400/30" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="Cari nomor / maskapai / rute..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Tidak ada penerbangan" hint="Tambahkan jadwal baru atau ubah filter pencarian." />
        ) : (
          <Table head={['Nomor', 'Maskapai', 'Rute', 'Jadwal', 'Gate', 'Status', 'Aksi']}>
            {visible.map((f) => {
              const st = STATUS[f.status] ?? STATUS.scheduled;
              const isDep = f.flight_type === 'departure';
              return (
                <Row key={f.id}>
                  <Cell>
                    <span className="flex items-center gap-2">
                      {isDep ? <PlaneTakeoff className="w-4 h-4 text-[var(--adm-accent)]" /> : <PlaneLanding className="w-4 h-4 text-emerald-400" />}
                      <span className="font-bold text-[var(--adm-fg)]">{f.flight_number}</span>
                    </span>
                  </Cell>
                  <Cell>{f.airline}</Cell>
                  <Cell className="max-w-[260px]">
                    <span className="truncate block">{f.origin} → {f.destination}</span>
                  </Cell>
                  <Cell className="whitespace-nowrap font-mono">{f.scheduled_time}</Cell>
                  <Cell>{f.gate || '-'}</Cell>
                  <Cell><Badge text={st.label} color={st.color} /></Cell>
                  <Cell>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(f)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(Number(f.id))} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>

      {/* form */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        wide
        title={editId ? 'Ubah Data Penerbangan' : 'Tambah Penerbangan Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nomor Penerbangan" required value={form.flight_number} onChange={(v) => setForm({ ...form, flight_number: v })} placeholder="GA 539" />
          <Field label="Maskapai" required value={form.airline} onChange={(v) => setForm({ ...form, airline: v })} placeholder="Garuda Indonesia" />
          <Field label="Asal" required value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} placeholder="Samarinda (AAP)" />
          <Field label="Tujuan" required value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} placeholder="Jakarta (CGK)" />
          <Field label="Waktu Terjadwal" required value={form.scheduled_time} onChange={(v) => setForm({ ...form, scheduled_time: v })} placeholder="09:00 WITA" />
          <Field label="Perkiraan Waktu" value={form.estimated_time} onChange={(v) => setForm({ ...form, estimated_time: v })} placeholder="09:15 WITA" />
          <Field label="Terminal" required value={form.terminal} onChange={(v) => setForm({ ...form, terminal: v })} placeholder="Terminal Utama" />
          <Field label="Gate" value={form.gate} onChange={(v) => setForm({ ...form, gate: v })} placeholder="A5" />
          <Field
            label="Jenis" type="select" value={form.flight_type} onChange={(v) => setForm({ ...form, flight_type: v })}
            options={[{ value: 'departure', label: 'Keberangkatan' }, { value: 'arrival', label: 'Kedatangan' }]}
          />
          <Field
            label="Status" type="select" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
            options={Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))}
          />
          <Field className="sm:col-span-2" label="Catatan" type="textarea" rows={2} value={form.remarks} onChange={(v) => setForm({ ...form, remarks: v })} placeholder="On Time" />
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Jadwal penerbangan ini akan dihapus permanen dan langsung hilang dari layar FIDS publik. Lanjutkan?"
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
