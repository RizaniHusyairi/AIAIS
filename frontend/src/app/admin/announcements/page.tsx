'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Announcement } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { Megaphone, Plus, Pencil, Trash2, RefreshCw, Siren, CheckCircle2, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const PRIORITY: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Mendesak', color: '#fb7185' },
  high: { label: 'Tinggi', color: '#fbbf24' },
  medium: { label: 'Sedang', color: '#38bdf8' },
  low: { label: 'Rendah', color: '#94a3b8' },
};

const EMPTY: Partial<Announcement> & { valid_until?: string } = {
  title: '', content: '', priority: 'medium', target_audience: 'Penumpang', is_active: true, valid_until: '',
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<Announcement[]>('/announcements');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((a) => !q || [a.title, a.content, a.target_audience].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((a) => a.is_active).length,
    urgent: items.filter((a) => a.priority === 'urgent' || a.priority === 'high').length,
    inactive: items.filter((a) => !a.is_active).length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (a: any) => {
    setForm({ ...a, valid_until: a.valid_until ? String(a.valid_until).slice(0, 10) : '' });
    setEditId(a.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const body: any = {
      title: form.title, content: form.content, priority: form.priority,
      target_audience: form.target_audience || null, is_active: !!form.is_active,
    };
    if (form.valid_until) body.valid_until = form.valid_until;

    const res = editId
      ? await adminFetch(`/announcements/${editId}`, { method: 'PUT', body })
      : await adminFetch('/announcements', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Pengumuman diperbarui' : 'Pengumuman diterbitkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/announcements/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Pengumuman dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const toggle = async (a: Announcement) => {
    const res = await adminFetch(`/announcements/${a.id}`, { method: 'PUT', body: { is_active: !a.is_active } });
    setToast({ text: res.ok ? (a.is_active ? 'Pengumuman dinonaktifkan' : 'Pengumuman diaktifkan') : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Megaphone}
        title="Manajemen Pengumuman"
        subtitle="Informasi penting yang disiarkan kepada penumpang dan pengguna jasa bandara"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Buat Pengumuman</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pengumuman" value={stats.total} icon={Megaphone} accent="#fbbf24" />
        <StatCard label="Aktif Disiarkan" value={stats.active} icon={CheckCircle2} accent="#34d399" />
        <StatCard label="Prioritas Tinggi" value={stats.urgent} icon={Siren} accent="#fb7185" />
        <StatCard label="Nonaktif" value={stats.inactive} icon={EyeOff} accent="#94a3b8" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Pengumuman</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari pengumuman..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada pengumuman" hint="Buat pengumuman untuk disiarkan ke portal publik." />
        ) : (
          <Table head={['Judul & Isi', 'Prioritas', 'Sasaran', 'Status', 'Aksi']}>
            {visible.map((a) => {
              const p = PRIORITY[a.priority] ?? PRIORITY.medium;
              return (
                <Row key={a.id}>
                  <Cell className="max-w-[420px]">
                    <p className="font-bold text-[var(--adm-fg)] text-[12.5px]">{a.title}</p>
                    <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5 line-clamp-2">{a.content}</p>
                  </Cell>
                  <Cell><Badge text={p.label} color={p.color} /></Cell>
                  <Cell>{a.target_audience || 'Umum'}</Cell>
                  <Cell>
                    <button onClick={() => toggle(a)} className="cursor-pointer" title="Klik untuk mengubah status">
                      <Badge text={a.is_active ? 'Aktif' : 'Nonaktif'} color={a.is_active ? '#34d399' : '#64748b'} />
                    </button>
                  </Cell>
                  <Cell>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(a)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(a.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Pengumuman' : 'Buat Pengumuman Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Penyesuaian Jadwal Penerbangan..." />
          <Field label="Isi Pengumuman" required type="textarea" rows={5} value={form.content} onChange={(v) => setForm({ ...form, content: v })} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Prioritas" required type="select" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
              options={Object.entries(PRIORITY).map(([value, p]) => ({ value, label: p.label }))}
            />
            <Field label="Sasaran" value={form.target_audience} onChange={(v) => setForm({ ...form, target_audience: v })} placeholder="Penumpang" />
          </div>

          <Field label="Berlaku Sampai" type="date" value={form.valid_until} onChange={(v) => setForm({ ...form, valid_until: v })} />
          <Field label="Aktif disiarkan ke portal publik" type="checkbox" value={!!form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Pengumuman ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
