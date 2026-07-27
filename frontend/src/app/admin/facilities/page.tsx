'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Facility } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger, InfoNote,
} from '@/components/admin/ui';
import { Building2, Plus, Pencil, Trash2, RefreshCw, CheckCircle2, WrenchIcon, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = ['Umum', 'Ibadah', 'Kesehatan', 'Anak & Keluarga', 'Disabilitas', 'Konektivitas', 'Keamanan', 'Lainnya'];

const EMPTY: Partial<Facility> = {
  name: '', category: 'Umum', location_description: '', icon: '', description: '', is_operational: true,
};

export default function AdminFacilitiesPage() {
  const [items, setItems] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<Partial<Facility>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<Facility[]>('/facilities');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((f) => !q || [f.name, f.category, f.location_description].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((f) => f.is_operational).length,
    down: items.filter((f) => !f.is_operational).length,
    cats: new Set(items.map((f) => f.category)).size,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (f: Facility) => { setForm({ ...f }); setEditId(f.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const body = {
      name: form.name, category: form.category, location_description: form.location_description,
      icon: form.icon || null, description: form.description || null, is_operational: !!form.is_operational,
    };
    const res = editId
      ? await adminFetch(`/facilities/${editId}`, { method: 'PUT', body })
      : await adminFetch('/facilities', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Fasilitas diperbarui' : 'Fasilitas ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/facilities/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Fasilitas dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const toggle = async (f: Facility) => {
    const res = await adminFetch(`/facilities/${f.id}`, { method: 'PUT', body: { is_operational: !f.is_operational } });
    setToast({ text: res.ok ? 'Status fasilitas diperbarui' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Building2}
        title="Manajemen Fasilitas Bandara"
        subtitle="Daftar fasilitas terminal yang ditampilkan pada portal dan peta bandara di aplikasi"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Fasilitas</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Fasilitas" value={stats.total} icon={Building2} accent="#34d399" />
        <StatCard label="Beroperasi" value={stats.active} icon={CheckCircle2} accent="#22d3ee" />
        <StatCard label="Perbaikan" value={stats.down} icon={WrenchIcon} accent="#fbbf24" />
        <StatCard label="Kategori" value={stats.cats} icon={LayoutGrid} accent="#a78bfa" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/8">
          <h2 className="text-[13.5px] font-bold text-white">Daftar Fasilitas</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari fasilitas / lokasi..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada fasilitas" hint="Tambahkan fasilitas terminal agar tampil di portal publik." />
        ) : (
          <Table head={['Fasilitas', 'Kategori', 'Lokasi', 'Status', 'Aksi']}>
            {visible.map((f) => (
              <Row key={f.id}>
                <Cell className="max-w-[280px]">
                  <p className="font-bold text-white text-[12.5px]">{f.name}</p>
                  {f.description && <p className="text-slate-400 text-[11.5px] mt-0.5 line-clamp-1">{f.description}</p>}
                </Cell>
                <Cell><Badge text={f.category} color="#34d399" /></Cell>
                <Cell className="max-w-[230px]"><span className="truncate block">{f.location_description}</span></Cell>
                <Cell>
                  <button onClick={() => toggle(f)} className="cursor-pointer" title="Klik untuk mengubah status">
                    <Badge text={f.is_operational ? 'Beroperasi' : 'Perbaikan'} color={f.is_operational ? '#34d399' : '#fbbf24'} />
                  </button>
                </Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(f)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(f.id)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Fasilitas' : 'Tambah Fasilitas Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Fasilitas" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Musholla Utama" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kategori" required type="select" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <Field label="Nama Ikon" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} placeholder="moon-star" />
          </div>

          <Field label="Lokasi" required value={form.location_description} onChange={(v) => setForm({ ...form, location_description: v })} placeholder="Lantai 1, dekat area kedatangan" />
          <Field label="Deskripsi" type="textarea" rows={3} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <InfoNote>Nama ikon mengikuti pustaka <span className="text-cyan-300 font-semibold">Lucide</span> (contoh: <code className="text-cyan-300">wifi</code>, <code className="text-cyan-300">moon-star</code>, <code className="text-cyan-300">baby</code>). Dikosongkan pun tetap aman.</InfoNote>

          <Field label="Sedang beroperasi" type="checkbox" value={!!form.is_operational} onChange={(v) => setForm({ ...form, is_operational: v })} />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Fasilitas ini akan dihapus permanen dari portal publik. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
