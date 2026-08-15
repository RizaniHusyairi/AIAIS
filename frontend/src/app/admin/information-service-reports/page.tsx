'use client';

/**
 * Manajemen Laporan Layanan Informasi — laporan tahunan penyelenggaraan PPID.
 *
 * Halaman ini sengaja dibuat lebih dulu daripada halaman publiknya. Tabel
 * warisan v1 baru memuat laporan 2024, sedangkan halaman publik yang tayang
 * hari ini juga menampilkan laporan 2025 dari daftar yang ditulis di kode.
 * Mengalihkan halaman publik ke API sekarang justru menghilangkan laporan yang
 * sudah terbit — jadi urutannya dibalik: lengkapi datanya dari sini, baru
 * halaman publiknya menyusul.
 *
 * Satu laporan per tahun; backend menolak tahun ganda, karena tahun yang sama
 * hampir pasti berarti laporan lama hendak diperbarui.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { InformationServiceReport } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import { FileBarChart, Plus, Pencil, Trash2, RefreshCw, CalendarRange, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  title: string;
  publication_year: string;
  document_link: string;
};

const EMPTY: FormState = { title: '', publication_year: '', document_link: '' };

export default function AdminInformationServiceReportsPage() {
  const [items, setItems] = useState<InformationServiceReport[]>([]);
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
    const res = await adminFetch<InformationServiceReport[]>('/information-service-reports');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<InformationServiceReport[]>('/information-service-reports');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((r) => !q || [r.title, String(r.publication_year)].some((v) => v.toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => {
    const tahun = items.map((r) => r.publication_year).filter(Boolean);
    return {
      total: items.length,
      rentang: tahun.length ? `${Math.min(...tahun)}–${Math.max(...tahun)}` : '—',
      tanpaTautan: items.filter((r) => !r.document_link).length,
    };
  }, [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (r: InformationServiceReport) => {
    setForm({ title: r.title, publication_year: String(r.publication_year ?? ''), document_link: r.document_link });
    setEditId(r.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const body = {
      title: form.title,
      publication_year: Number(form.publication_year),
      document_link: form.document_link,
    };

    const res = editId
      ? await adminFetch(`/information-service-reports/${editId}`, { method: 'PUT', body })
      : await adminFetch('/information-service-reports', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Laporan diperbarui' : 'Laporan ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/information-service-reports/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Laporan dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={FileBarChart}
        title="Laporan Layanan Informasi"
        subtitle="Laporan tahunan penyelenggaraan layanan informasi publik"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Laporan</Btn>
          </div>
        }
      />

      <InfoNote>
        Halaman publik Laporan Layanan Informasi masih menampilkan daftar bawaan dan
        belum mengambil dari sini. Peralihan dilakukan setelah seluruh laporan yang
        sudah terbit dimasukkan, agar tidak ada laporan yang justru hilang dari
        pandangan pengunjung.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total Laporan" value={stats.total} icon={FileBarChart} accent="#38bdf8" />
        <StatCard label="Rentang Tahun" value={stats.rentang} icon={CalendarRange} accent="#34d399" />
        <StatCard label="Tanpa Tautan" value={stats.tanpaTautan} icon={AlertTriangle} accent="#fb7185" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Laporan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari laporan..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada laporan" hint="Tambahkan laporan tahunan PPID yang sudah terbit." />
        ) : (
          <Table head={['Judul Laporan', 'Tahun', 'Dokumen', 'Aksi']}>
            {visible.map((r) => (
              <Row key={r.id}>
                <Cell className="max-w-[460px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{r.title}</p>
                </Cell>
                <Cell><Badge text={String(r.publication_year)} color="#38bdf8" /></Cell>
                <Cell>
                  {r.document_link ? (
                    <a href={r.document_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--adm-accent)] hover:text-[var(--adm-accent)] text-[11.5px] font-semibold">
                      <LinkIcon className="w-3.5 h-3.5" /> Buka
                    </a>
                  ) : (
                    <Badge text="Tautan kosong" color="#fb7185" />
                  )}
                </Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(r.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Laporan' : 'Tambah Laporan'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Laporan" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Laporan Tahunan PPID 2025" />
          <Field label="Tahun Laporan" required type="number" value={form.publication_year} onChange={(v) => setForm({ ...form, publication_year: v })} placeholder="2025" />
          <Field label="Tautan Dokumen" required value={form.document_link} onChange={(v) => setForm({ ...form, document_link: v })} placeholder="https://drive.google.com/file/d/.../view" />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Laporan ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
