'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { DocumentItem } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { FileText, Plus, Pencil, Trash2, RefreshCw, Download, FolderOpen, HardDrive, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = ['Regulasi', 'Formulir', 'Laporan', 'Panduan', 'Siaran Pers', 'Lainnya'];
const FILE_TYPES = ['PDF', 'DOCX', 'XLSX', 'ZIP', 'JPG'];

const TYPE_COLOR: Record<string, string> = {
  PDF: '#fb7185', DOCX: '#38bdf8', XLSX: '#34d399', ZIP: '#fbbf24', JPG: '#a78bfa',
};

const EMPTY: Partial<DocumentItem> = {
  title: '', category: 'Regulasi', file_type: 'PDF', file_size: '', file_url: '',
};

export default function AdminDocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<Partial<DocumentItem>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<DocumentItem[]>('/documents');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((d) => !q || [d.title, d.category, d.file_type].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    downloads: items.reduce((a, d) => a + (d.download_count ?? 0), 0),
    cats: new Set(items.map((d) => d.category)).size,
    pdf: items.filter((d) => (d.file_type ?? '').toUpperCase() === 'PDF').length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (d: DocumentItem) => { setForm({ ...d }); setEditId(d.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const body = {
      title: form.title, category: form.category, file_type: form.file_type,
      file_size: form.file_size, file_url: form.file_url,
    };
    const res = editId
      ? await adminFetch(`/documents/${editId}`, { method: 'PUT', body })
      : await adminFetch('/documents', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Dokumen diperbarui' : 'Dokumen ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/documents/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Dokumen dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Manajemen Dokumen Publik"
        subtitle="Regulasi, formulir, dan publikasi yang dapat diunduh masyarakat melalui portal"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Dokumen</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Dokumen" value={stats.total} icon={FileText} accent="#fb7185" />
        <StatCard label="Total Unduhan" value={stats.downloads} icon={Download} accent="#22d3ee" />
        <StatCard label="Kategori" value={stats.cats} icon={FolderOpen} accent="#a78bfa" />
        <StatCard label="Berkas PDF" value={stats.pdf} icon={HardDrive} accent="#34d399" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Pusat Unduhan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari dokumen..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada dokumen" hint="Tambahkan dokumen agar dapat diunduh publik." />
        ) : (
          <Table head={['Judul Dokumen', 'Kategori', 'Tipe', 'Ukuran', 'Unduhan', 'Aksi']}>
            {visible.map((d) => (
              <Row key={d.id}>
                <Cell className="max-w-[340px]"><span className="font-bold text-[var(--adm-fg)] text-[12.5px] line-clamp-2">{d.title}</span></Cell>
                <Cell><Badge text={d.category} color="#38bdf8" /></Cell>
                <Cell><Badge text={(d.file_type ?? '-').toUpperCase()} color={TYPE_COLOR[(d.file_type ?? '').toUpperCase()] ?? '#94a3b8'} /></Cell>
                <Cell className="whitespace-nowrap">{d.file_size}</Cell>
                <Cell className="tabular-nums">{(d.download_count ?? 0).toLocaleString('id-ID')}</Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-[var(--adm-hover)] text-[var(--adm-body)] flex items-center justify-center transition-colors" title="Buka berkas">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
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
        title={editId ? 'Ubah Dokumen' : 'Tambah Dokumen Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Dokumen" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Peraturan Keselamatan Penerbangan 2024" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Kategori" required type="select" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <Field label="Tipe Berkas" required type="select" value={form.file_type} onChange={(v) => setForm({ ...form, file_type: v })} options={FILE_TYPES.map((t) => ({ value: t, label: t }))} />
            <Field label="Ukuran" required value={form.file_size} onChange={(v) => setForm({ ...form, file_size: v })} placeholder="2.4 MB" />
          </div>

          <Field label="URL Berkas" required value={form.file_url} onChange={(v) => setForm({ ...form, file_url: v })} placeholder="https://.../dokumen.pdf" />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Dokumen ini akan dihapus permanen dari pusat unduhan. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
