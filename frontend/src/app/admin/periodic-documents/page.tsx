'use client';

/**
 * Manajemen Informasi Berkala — dokumen yang wajib diumumkan rutin.
 *
 * Memakai `adminFetch`, bukan `adminUpload`: dokumennya tidak diunggah ke
 * bandara melainkan ditautkan ke Google Drive, jadi tidak ada berkas yang
 * dikirim.
 *
 * Kategori sengaja berupa isian bebas, bukan pilihan tertutup — di v1 petugas
 * menambah kelompok sendiri (Survey Kepuasan, LHKPN, Rencana Kinerja Anggaran,
 * ...) dan mengunci daftarnya di kode berarti mengembalikan kebebasan itu ke
 * tangan pengembang. Daftar kategori yang sudah ada disarankan lewat `datalist`
 * pada Field agar ejaannya tetap seragam.
 *
 * Dokumen yang tautannya kosong tetap ditampilkan dengan penanda: halaman
 * publik menyaringnya, jadi di sinilah satu-satunya tempat petugas bisa tahu.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { PeriodicDocument } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { CalendarClock, Plus, Pencil, Trash2, RefreshCw, FolderOpen, FileText, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  category: string;
  title: string;
  document_path: string;
  published_date: string;
  pejabat_name: string;
};

const EMPTY: FormState = {
  category: '', title: '', document_path: '', published_date: '', pejabat_name: '',
};

export default function AdminPeriodicDocumentsPage() {
  const [items, setItems] = useState<PeriodicDocument[]>([]);
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
    const res = await adminFetch<PeriodicDocument[]>('/periodic-documents');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  // Pemuatan pertama tidak lewat load(): `setLoading(true)` di dalamnya
  // berjalan serentak dengan badan efek dan memicu render berantai.
  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<PeriodicDocument[]>('/periodic-documents');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((d) => !q || [d.title, d.category, d.pejabat_name].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const kategoriAda = useMemo(
    () => Array.from(new Set(items.map((d) => d.category).filter(Boolean))).sort(),
    [items],
  );

  const stats = useMemo(() => ({
    total: items.length,
    kategori: kategoriAda.length,
    tanpaTautan: items.filter((d) => !d.document_path).length,
    lhkpn: items.filter((d) => d.pejabat_name).length,
  }), [items, kategoriAda]);

  const openCreate = () => { setForm({ ...EMPTY, category: kategoriAda[0] ?? '' }); setEditId(null); setOpen(true); };
  const openEdit = (d: PeriodicDocument) => {
    setForm({
      category: d.category,
      title: d.title,
      document_path: d.document_path,
      published_date: d.published_date ? String(d.published_date).slice(0, 10) : '',
      pejabat_name: d.pejabat_name ?? '',
    });
    setEditId(d.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const body = {
      category: form.category,
      title: form.title,
      document_path: form.document_path,
      published_date: form.published_date,
      pejabat_name: form.pejabat_name || null,
    };

    const res = editId
      ? await adminFetch(`/periodic-documents/${editId}`, { method: 'PUT', body })
      : await adminFetch('/periodic-documents', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Dokumen diperbarui' : 'Dokumen ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/periodic-documents/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Dokumen dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={CalendarClock}
        title="Informasi Berkala"
        subtitle="Dokumen yang wajib diumumkan secara rutin kepada publik"
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
        <StatCard label="Dokumen LHKPN" value={stats.lhkpn} icon={FileText} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Dokumen</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari dokumen..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada dokumen" hint="Tambahkan dokumen agar tampil di halaman Informasi Berkala." />
        ) : (
          <Table head={['Judul Dokumen', 'Kategori', 'Terbit', 'Dokumen', 'Aksi']}>
            {visible.map((d) => (
              <Row key={d.id}>
                <Cell className="max-w-[420px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{d.title}</p>
                  {d.pejabat_name && <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5">{d.pejabat_name}</p>}
                </Cell>
                <Cell><Badge text={d.category} color="#38bdf8" /></Cell>
                <Cell>{d.published_date ? String(d.published_date).slice(0, 10) : <span className="text-[var(--adm-dim)]">—</span>}</Cell>
                <Cell>
                  {d.document_path ? (
                    <a href={d.document_path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--adm-accent)] hover:text-[var(--adm-accent)] text-[11.5px] font-semibold">
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
          <Field
            label="Kategori" required
            value={form.category} onChange={(v) => setForm({ ...form, category: v })}
            placeholder="Laporan Keuangan"
          />
          {kategoriAda.length > 0 && (
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Kategori yang sudah dipakai: {kategoriAda.join(' · ')}
            </p>
          )}
          <Field
            label="Judul Dokumen" required type="textarea" rows={2}
            value={form.title} onChange={(v) => setForm({ ...form, title: v })}
            placeholder="Laporan Keuangan 2024"
          />
          <Field
            label="Tautan Dokumen" required
            value={form.document_path} onChange={(v) => setForm({ ...form, document_path: v })}
            placeholder="https://drive.google.com/file/d/.../view"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tanggal Terbit" required type="date" value={form.published_date} onChange={(v) => setForm({ ...form, published_date: v })} />
            <Field label="Nama Pejabat (khusus LHKPN)" value={form.pejabat_name} onChange={(v) => setForm({ ...form, pejabat_name: v })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Dokumen ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
