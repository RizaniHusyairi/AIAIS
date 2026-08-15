'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Tenant } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { Store, Plus, Pencil, Trash2, RefreshCw, UtensilsCrossed, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORY: Record<string, { label: string; color: string }> = {
  food_beverage: { label: 'Makanan & Minuman', color: '#fb7185' },
  retail: { label: 'Retail', color: '#a78bfa' },
  lounge: { label: 'Lounge', color: '#fbbf24' },
  transportation: { label: 'Transportasi', color: '#38bdf8' },
  services: { label: 'Layanan', color: '#34d399' },
};

const EMPTY: Partial<Tenant> & { is_active?: boolean } = {
  name: '', category: 'food_beverage', location: '', operating_hours: '',
  contact_phone: '', image: '', description: '', is_active: true,
};

export default function AdminTenantsPage() {
  const [items, setItems] = useState<Tenant[]>([]);
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
    const res = await adminFetch<Tenant[]>('/tenants');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((t) => !q || [t.name, t.location, t.description].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    fnb: items.filter((t) => t.category === 'food_beverage').length,
    retail: items.filter((t) => t.category === 'retail').length,
    active: items.filter((t: any) => t.is_active !== false).length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (t: Tenant) => { setForm({ ...t }); setEditId(t.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const body = {
      name: form.name, category: form.category, location: form.location,
      operating_hours: form.operating_hours, contact_phone: form.contact_phone || null,
      image: form.image || null, description: form.description || null, is_active: form.is_active !== false,
    };
    const res = editId
      ? await adminFetch(`/tenants/${editId}`, { method: 'PUT', body })
      : await adminFetch('/tenants', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Tenant diperbarui' : 'Tenant ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/tenants/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Tenant dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Store}
        title="Manajemen Tenant & Resto"
        subtitle="Direktori tenant komersial yang tampil pada portal dan aplikasi mobile bandara"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Tenant</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Tenant" value={stats.total} icon={Store} accent="#38bdf8" />
        <StatCard label="Makanan & Minuman" value={stats.fnb} icon={UtensilsCrossed} accent="#fb7185" />
        <StatCard label="Retail" value={stats.retail} icon={ShoppingBag} accent="#a78bfa" />
        <StatCard label="Aktif" value={stats.active} icon={CheckCircle2} accent="#34d399" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Direktori Tenant</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari tenant / lokasi..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada tenant" hint="Tambahkan tenant agar tampil di direktori publik." />
        ) : (
          <Table head={['Tenant', 'Kategori', 'Lokasi', 'Jam Operasi', 'Kontak', 'Aksi']}>
            {visible.map((t) => {
              const c = CATEGORY[t.category] ?? { label: t.category, color: '#94a3b8' };
              return (
                <Row key={t.id}>
                  <Cell className="max-w-[250px]">
                    <div className="flex items-center gap-2.5">
                      {t.image && <img src={t.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--adm-fg)] text-[12.5px] truncate">{t.name}</p>
                        {t.description && <p className="text-[var(--adm-muted)] text-[11px] truncate">{t.description}</p>}
                      </div>
                    </div>
                  </Cell>
                  <Cell><Badge text={c.label} color={c.color} /></Cell>
                  <Cell className="max-w-[180px]"><span className="truncate block">{t.location}</span></Cell>
                  <Cell className="whitespace-nowrap">{t.operating_hours}</Cell>
                  <Cell>{t.contact_phone || '-'}</Cell>
                  <Cell>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(t.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Tenant' : 'Tambah Tenant Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Tenant" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Kopi Nusantara" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Kategori" required type="select" value={form.category} onChange={(v) => setForm({ ...form, category: v })}
              options={Object.entries(CATEGORY).map(([value, c]) => ({ value, label: c.label }))}
            />
            <Field label="Jam Operasional" required value={form.operating_hours} onChange={(v) => setForm({ ...form, operating_hours: v })} placeholder="06.00 - 21.00 WITA" />
            <Field label="Lokasi" required value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="Lantai 2, area keberangkatan" />
            <Field label="Telepon" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} placeholder="0541 123456" />
          </div>

          <Field label="URL Gambar" value={form.image} onChange={(v) => setForm({ ...form, image: v })} placeholder="https://..." />
          <Field label="Deskripsi" type="textarea" rows={3} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Field label="Tenant aktif" type="checkbox" value={form.is_active !== false} onChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Tenant ini akan dihapus permanen dari direktori publik. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
