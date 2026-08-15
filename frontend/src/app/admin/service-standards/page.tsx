'use client';

/**
 * Manajemen Standar Pelayanan — dokumen tolok ukur pelayanan publik.
 *
 * Memakai `adminUpload`, bukan `adminFetch`: dokumennya boleh diunggah sebagai
 * PDF. Karena Laravel tidak mengurai multipart pada PUT, pembaruan pun dikirim
 * sebagai POST ke `/service-standards/{id}` — rutenya memang didaftarkan
 * berpasangan untuk itu.
 *
 * Petugas dapat memilih salah satu dari dua cara memasok dokumen: mengunggah
 * berkas, atau menempelkan tautan ke penyimpanan luar. Menyimpan salah satunya
 * mengosongkan yang lain, supaya tidak pernah ada dua sumber yang berbeda isi
 * untuk satu dokumen.
 *
 * Dokumen yang BELUM terbit tetap boleh dicatat dan tetap tampil di halaman
 * publik dengan penanda "belum tersedia" — keberadaan ketiga jenis dokumen ini
 * wajib diumumkan menurut UU 25/2009.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import { ServiceStandard } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import { ClipboardList, Plus, Pencil, Trash2, RefreshCw, FileCheck2, FileClock, EyeOff, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

/** Harus sama persis dengan ServiceStandard::TYPES di backend. */
const TYPES = ['Standar Pelayanan', 'Maklumat Pelayanan', 'Survei Kepuasan Masyarakat'];

type FormState = {
  type: string;
  title: string;
  document_number: string;
  description: string;
  published_date: string;
  document_link: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  type: TYPES[0], title: '', document_number: '', description: '',
  published_date: '', document_link: '', is_active: true,
};

export default function AdminServiceStandardsPage() {
  const [items, setItems] = useState<ServiceStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<ServiceStandard[]>('/service-standards');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<ServiceStandard[]>('/service-standards');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((d) => !q || [d.title, d.type, d.document_number].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    tersedia: items.filter((d) => d.has_document).length,
    belum: items.filter((d) => !d.has_document).length,
    nonaktif: items.filter((d) => !d.is_active).length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setBerkas(null); setEditId(null); setOpen(true); };
  const openEdit = (d: ServiceStandard) => {
    setForm({
      type: d.type,
      title: d.title,
      document_number: d.document_number ?? '',
      description: d.description ?? '',
      published_date: d.published_date ? String(d.published_date).slice(0, 10) : '',
      // Hanya tautan luar yang boleh disunting sebagai teks; berkas unggahan
      // diganti dengan mengunggah ulang.
      document_link: d.document_url && !d.document_url.startsWith('/') ? d.document_url : '',
      is_active: d.is_active,
    });
    setBerkas(null);
    setEditId(d.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);

    const fd = new FormData();
    fd.append('type', form.type);
    fd.append('title', form.title);
    fd.append('document_number', form.document_number);
    fd.append('description', form.description);
    fd.append('published_date', form.published_date);
    fd.append('is_active', form.is_active ? '1' : '0');

    if (berkas) {
      fd.append('file', berkas);
    } else {
      // Dikirim meski kosong: string kosong adalah cara menarik kembali
      // dokumen yang sebelumnya tertaut.
      fd.append('document_link', form.document_link);
    }

    const res = editId
      ? await adminUpload(`/service-standards/${editId}`, fd)
      : await adminUpload('/service-standards', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Dokumen diperbarui' : 'Dokumen ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/service-standards/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Dokumen dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Standar Pelayanan"
        subtitle="Standar, Maklumat, dan Survei Kepuasan Masyarakat sesuai UU 25/2009"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Dokumen</Btn>
          </div>
        }
      />

      <InfoNote>
        Tautan dokumen warisan portal lama sebelumnya menunjuk alamat contoh yang
        berujung halaman tidak ditemukan, sehingga dikosongkan. Unggah berkasnya
        atau isi tautan yang sebenarnya agar tombol unduh muncul di halaman publik.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Dokumen" value={stats.total} icon={ClipboardList} accent="#38bdf8" />
        <StatCard label="Berkas Tersedia" value={stats.tersedia} icon={FileCheck2} accent="#34d399" />
        <StatCard label="Belum Terbit" value={stats.belum} icon={FileClock} accent="#fbbf24" />
        <StatCard label="Nonaktif" value={stats.nonaktif} icon={EyeOff} accent="#94a3b8" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Dokumen</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari dokumen..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada dokumen" hint="Tambahkan Standar, Maklumat, atau hasil Survei Kepuasan Masyarakat." />
        ) : (
          <Table head={['Judul & Nomor', 'Jenis', 'Terbit', 'Dokumen', 'Status', 'Aksi']}>
            {visible.map((d) => (
              <Row key={d.id}>
                <Cell className="max-w-[380px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{d.title}</p>
                  {d.document_number && <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5">{d.document_number}</p>}
                </Cell>
                <Cell><Badge text={d.type} color="#38bdf8" /></Cell>
                <Cell>{d.published_date ? String(d.published_date).slice(0, 10) : <span className="text-[var(--adm-dim)]">—</span>}</Cell>
                <Cell>
                  {d.has_document ? (
                    <a href={d.document_url!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--adm-accent)] hover:text-[var(--adm-accent)] text-[11.5px] font-semibold">
                      <LinkIcon className="w-3.5 h-3.5" /> Buka
                    </a>
                  ) : (
                    <Badge text="Belum terbit" color="#fbbf24" />
                  )}
                </Cell>
                <Cell><Badge text={d.is_active ? 'Tampil' : 'Nonaktif'} color={d.is_active ? '#34d399' : '#64748b'} /></Cell>
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
            label="Jenis Dokumen" required type="select"
            value={form.type} onChange={(v) => setForm({ ...form, type: v })}
            options={TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Field label="Judul Dokumen" required type="textarea" rows={2} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nomor Dokumen" value={form.document_number} onChange={(v) => setForm({ ...form, document_number: v })} placeholder="SK.01/APTP/2026" />
            <Field label="Tanggal Terbit" required type="date" value={form.published_date} onChange={(v) => setForm({ ...form, published_date: v })} />
          </div>

          <Field label="Keterangan" type="textarea" rows={3} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-3">
            <p className="text-[12px] font-bold text-[var(--adm-body)]">Sumber Dokumen</p>
            <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
              Pilih salah satu. Mengunggah berkas akan menggantikan tautan yang tersimpan,
              begitu pula sebaliknya. Kosongkan keduanya bila dokumennya memang belum terbit.
            </p>

            <div>
              <label className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">Unggah Berkas (PDF, maks 20 MB)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
                className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
              />
            </div>

            <Field
              label="atau Tautan Dokumen"
              value={form.document_link}
              onChange={(v) => setForm({ ...form, document_link: v })}
              placeholder="https://drive.google.com/file/d/.../view"
            />
          </div>

          <Field label="Tampilkan di halaman publik" type="checkbox" value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Dokumen ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
