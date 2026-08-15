'use client';

/**
 * Manajemen Informasi Setiap Saat — dokumen yang tersedia kapan pun diminta.
 *
 * Bentuknya sama dengan Informasi Berkala: `adminFetch` biasa karena
 * dokumennya berupa tautan luar, kategori bebas teks karena petugas yang
 * menentukan kelompoknya, dan dokumen bertautan kosong tetap ditampilkan
 * dengan penanda karena halaman publik menyaringnya.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { EvergreenInformation } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { DoorOpen, Plus, Pencil, Trash2, RefreshCw, FolderOpen, FileText, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  category: string;
  title: string;
  document_link: string;
  published_date: string;
};

const EMPTY: FormState = { category: '', title: '', document_link: '', published_date: '' };

export default function AdminEvergreenInformationPage() {
  const [items, setItems] = useState<EvergreenInformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<EvergreenInformation[]>('/evergreen-information');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<EvergreenInformation[]>('/evergreen-information');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((d) => !q || [d.title, d.category].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const kategoriAda = useMemo(
    () => Array.from(new Set(items.map((d) => d.category).filter(Boolean))).sort(),
    [items],
  );

  const stats = useMemo(() => ({
    total: items.length,
    kategori: kategoriAda.length,
    tanpaTautan: items.filter((d) => !d.document_link).length,
    tahunIni: items.filter((d) => String(d.published_date ?? '').startsWith(String(new Date().getFullYear()))).length,
  }), [items, kategoriAda]);

  const openCreate = () => { setForm({ ...EMPTY, category: kategoriAda[0] ?? '' }); setEditId(null); setOpen(true); };
  const openEdit = (d: EvergreenInformation) => {
    setForm({
      category: d.category,
      title: d.title,
      document_link: d.document_link,
      published_date: d.published_date ? String(d.published_date).slice(0, 10) : '',
    });
    setEditId(d.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const res = editId
      ? await adminFetch(`/evergreen-information/${editId}`, { method: 'PUT', body: form })
      : await adminFetch('/evergreen-information', { method: 'POST', body: form });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Dokumen diperbarui' : 'Dokumen ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/evergreen-information/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Dokumen dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={DoorOpen}
        title="Informasi Setiap Saat"
        subtitle="Dokumen yang wajib tersedia dan dapat diakses publik kapan pun diminta"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Dokumen</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Dokumen" value={stats.total} icon={FileText} accent="#38bdf8" />
        <StatCard label="Kategori" value={stats.kategori} icon={FolderOpen} accent="#34d399" />
        <StatCard label="Tanpa Tautan" value={stats.tanpaTautan} icon={AlertTriangle} accent="#fb7185" />
        <StatCard label="Terbit Tahun Ini" value={stats.tahunIni} icon={FileText} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Dokumen</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari dokumen..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada dokumen" hint="Tambahkan dokumen agar tampil di halaman Informasi Setiap Saat." />
        ) : (
          <Table head={['Judul Dokumen', 'Kategori', 'Terbit', 'Dokumen', 'Aksi']}>
            {visible.map((d) => (
              <Row key={d.id}>
                <Cell className="max-w-[420px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{d.title}</p>
                </Cell>
                <Cell><Badge text={d.category} color="#34d399" /></Cell>
                <Cell>{d.published_date ? String(d.published_date).slice(0, 10) : <span className="text-[var(--adm-dim)]">—</span>}</Cell>
                <Cell>
                  {d.document_link ? (
                    <a href={d.document_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--adm-accent)] hover:text-[var(--adm-accent)] text-[11.5px] font-semibold">
                      <LinkIcon className="w-3.5 h-3.5" /> Buka
                    </a>
                  ) : (
                    <Badge text="Tautan kosong" color="#fb7185" />
                  )}
                </Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(d)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(d.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Dokumen' : 'Tambah Dokumen'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Kategori" required value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Profil Bandara" />
          {kategoriAda.length > 0 && (
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Kategori yang sudah dipakai: {kategoriAda.join(' · ')}
            </p>
          )}
          <Field label="Judul Dokumen" required type="textarea" rows={2} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label="Tautan Dokumen" required value={form.document_link} onChange={(v) => setForm({ ...form, document_link: v })} placeholder="https://drive.google.com/file/d/.../view" />
          <Field label="Tanggal Terbit" required type="date" value={form.published_date} onChange={(v) => setForm({ ...form, published_date: v })} />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Dokumen ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
