'use client';

/**
 * Manajemen Informasi Serta-Merta — peringatan yang wajib disiarkan tanpa
 * diminta.
 *
 * Berbeda dari halaman PPID lain, isinya bukan dokumen resmi melainkan
 * maklumat keselamatan yang ditautkan ke pos media sosial bandara. Karena itu
 * tidak ada kategori maupun tanggal terbit — hanya judul, ringkasan, tautan,
 * dan label tombolnya.
 *
 * Nama medannya tetap berbahasa Indonesia (`uraian`, `keterangan`) mengikuti
 * kolom tabel warisan v1, supaya tidak ada penerjemahan bolak-balik antara
 * formulir, API, dan basis data.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { ImmediateInformation } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { Radio, Plus, Pencil, Trash2, RefreshCw, Megaphone, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  uraian: string;
  keterangan: string;
  link_url: string;
  link_text: string;
};

const EMPTY: FormState = { uraian: '', keterangan: '', link_url: '', link_text: 'Lihat Detail' };

export default function AdminImmediateInformationPage() {
  const [items, setItems] = useState<ImmediateInformation[]>([]);
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
    const res = await adminFetch<ImmediateInformation[]>('/immediate-information');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<ImmediateInformation[]>('/immediate-information');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((it) => !q || [it.uraian, it.keterangan].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    tanpaTautan: items.filter((it) => !it.link_url).length,
    terpotong: items.filter((it) => String(it.keterangan ?? '').trimEnd().endsWith('...')).length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (it: ImmediateInformation) => {
    setForm({
      uraian: it.uraian,
      keterangan: it.keterangan,
      link_url: it.link_url,
      link_text: it.link_text || 'Lihat Detail',
    });
    setEditId(it.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const body = { ...form, link_text: form.link_text || 'Lihat Detail' };

    const res = editId
      ? await adminFetch(`/immediate-information/${editId}`, { method: 'PUT', body })
      : await adminFetch('/immediate-information', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Maklumat diperbarui' : 'Maklumat ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/immediate-information/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Maklumat dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Radio}
        title="Informasi Serta-Merta"
        subtitle="Maklumat keselamatan yang wajib diumumkan tanpa menunggu permintaan"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Maklumat</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total Maklumat" value={stats.total} icon={Megaphone} accent="#fbbf24" />
        <StatCard label="Tanpa Tautan" value={stats.tanpaTautan} icon={AlertTriangle} accent="#fb7185" />
        <StatCard label="Keterangan Terpotong" value={stats.terpotong} icon={AlertTriangle} accent="#94a3b8" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Maklumat</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari maklumat..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada maklumat" hint="Tambahkan maklumat agar tampil di halaman Informasi Serta-Merta." />
        ) : (
          <Table head={['Judul & Keterangan', 'Label Tombol', 'Tautan', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell className="max-w-[520px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{it.uraian}</p>
                  <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5 line-clamp-2">{it.keterangan}</p>
                </Cell>
                <Cell>{it.link_text || 'Lihat Detail'}</Cell>
                <Cell>
                  {it.link_url ? (
                    <a href={it.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--adm-accent)] hover:text-[var(--adm-accent)] text-[11.5px] font-semibold">
                      <LinkIcon className="w-3.5 h-3.5" /> Buka
                    </a>
                  ) : (
                    <Badge text="Tautan kosong" color="#fb7185" />
                  )}
                </Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(it)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(it.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Maklumat' : 'Tambah Maklumat'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Maklumat" required value={form.uraian} onChange={(v) => setForm({ ...form, uraian: v })} placeholder="Bahaya Bercanda Tentang Bom" />
          <Field
            label="Keterangan" required type="textarea" rows={4}
            value={form.keterangan} onChange={(v) => setForm({ ...form, keterangan: v })}
            placeholder="Ringkasan singkat yang tampil pada kartu di halaman publik."
          />
          <Field label="Tautan Selengkapnya" required value={form.link_url} onChange={(v) => setForm({ ...form, link_url: v })} placeholder="https://www.instagram.com/p/..." />
          <Field label="Label Tombol" value={form.link_text} onChange={(v) => setForm({ ...form, link_text: v })} placeholder="Lihat Detail" />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Maklumat ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
