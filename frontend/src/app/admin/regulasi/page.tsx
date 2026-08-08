'use client';

/**
 * Manajemen Regulasi — Surat Keputusan & Surat Edaran.
 *
 * Berkas surat dapat diunggah langsung (PDF) atau dirujuk lewat tautan; jalur
 * kedua dipakai untuk surat yang berkasnya masih dilayani portal v1. Karena
 * unggahan memakai multipart, penyimpanan lewat `adminUpload` (POST) — bukan
 * `adminFetch` yang selalu men-JSON-kan badan permintaan.
 *
 * Surat yang berkasnya hilang tetap tampil di sini dan ditandai "Berkas
 * hilang"; halaman publik menyaringnya supaya tautannya tidak berujung 404.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import type { Letter } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import { Scale, Plus, Pencil, Trash2, RefreshCw, ExternalLink, Gavel, Landmark, FileWarning, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

const TYPES: { value: Letter['type']; label: string }[] = [
  { value: 'keputusan', label: 'Surat Keputusan' },
  { value: 'edaran', label: 'Surat Edaran' },
];

const TYPE_COLOR: Record<string, string> = { keputusan: '#38bdf8', edaran: '#34d399' };
const TYPE_LABEL: Record<string, string> = { keputusan: 'Keputusan', edaran: 'Edaran' };

type Form = { type: Letter['type']; number: string; title: string; issue_date: string; file_url: string };

const EMPTY: Form = { type: 'keputusan', number: '', title: '', issue_date: '', file_url: '' };

/** `issue_date` datang sebagai ISO penuh; input date hanya menerima YYYY-MM-DD. */
const toDateInput = (v?: string) => String(v ?? '').slice(0, 10);

export default function AdminRegulasiPage() {
  const [items, setItems] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<Form>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<Letter[]>('/letters');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((l) => !q || [l.title, l.number, TYPE_LABEL[l.type]].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    keputusan: items.filter((l) => l.type === 'keputusan').length,
    edaran: items.filter((l) => l.type === 'edaran').length,
    hilang: items.filter((l) => !l.has_file).length,
  }), [items]);

  const openCreate = () => {
    setForm(EMPTY);
    setFile(null);
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (l: Letter) => {
    setForm({
      type: l.type,
      number: l.number,
      title: l.title,
      issue_date: toDateInput(l.issue_date),
      // Tautan luar boleh disunting; lintasan berkas di cakram tidak, karena
      // menyuntingnya sebagai teks hanya akan memutus rujukan berkasnya.
      file_url: /^https?:\/\//.test(l.file_path) ? l.file_path : '',
    });
    setFile(null);
    setEditId(l.id);
    setOpen(true);
  };

  const save = async () => {
    if (!editId && !file && !form.file_url.trim()) {
      setToast({ text: 'Unggah berkas PDF surat atau isi tautan berkasnya.', kind: 'error' });
      return;
    }

    setSaving(true);

    const body = new FormData();
    body.append('type', form.type);
    body.append('number', form.number);
    body.append('title', form.title);
    body.append('issue_date', form.issue_date);
    if (file) body.append('file', file);
    else if (form.file_url.trim()) body.append('file_url', form.file_url.trim());

    const res = await adminUpload<Letter>(editId ? `/letters/${editId}` : '/letters', body);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Surat diperbarui' : 'Surat ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/letters/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Surat dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Scale}
        title="Manajemen Regulasi"
        subtitle="Surat Keputusan dan Surat Edaran yang tayang pada menu Regulasi portal"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Surat</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Surat" value={stats.total} icon={Scale} accent="#818cf8" />
        <StatCard label="Surat Keputusan" value={stats.keputusan} icon={Gavel} accent="#38bdf8" />
        <StatCard label="Surat Edaran" value={stats.edaran} icon={Landmark} accent="#34d399" />
        <StatCard label="Berkas Hilang" value={stats.hilang} icon={FileWarning} accent="#fb7185" />
      </motion.div>

      {stats.hilang > 0 && (
        <InfoNote>
          {stats.hilang} surat berkasnya tidak ditemukan sehingga disembunyikan dari halaman publik.
          Unggah ulang berkasnya lewat tombol ubah, atau hapus baris tersebut.
        </InfoNote>
      )}

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/8">
          <h2 className="text-[13.5px] font-bold text-white">Daftar Surat</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari judul atau nomor surat..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada surat" hint="Tambahkan Surat Keputusan atau Surat Edaran agar tayang di portal." />
        ) : (
          <Table head={['Judul Surat', 'Jenis', 'Nomor', 'Tanggal Terbit', 'Berkas', 'Aksi']}>
            {visible.map((l) => (
              <Row key={l.id}>
                <Cell className="max-w-[340px]"><span className="font-bold text-white text-[12.5px] line-clamp-2">{l.title}</span></Cell>
                <Cell><Badge text={TYPE_LABEL[l.type] ?? l.type} color={TYPE_COLOR[l.type] ?? '#94a3b8'} /></Cell>
                <Cell className="whitespace-nowrap">{l.number}</Cell>
                <Cell className="whitespace-nowrap tabular-nums">
                  {toDateInput(l.issue_date).split('-').reverse().join('/')}
                </Cell>
                <Cell>
                  {l.has_file
                    ? <Badge text="Tersedia" color="#34d399" />
                    : <Badge text="Berkas hilang" color="#fb7185" />}
                </Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    {l.file_url && (
                      <a href={l.file_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors" title="Buka berkas">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => openEdit(l)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(l.id)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Surat' : 'Tambah Surat Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Judul Surat"
            required
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            placeholder="Penetapan Dokumen Standar Pelayanan Jasa Kebandarudaraan"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="Jenis Surat"
              required
              type="select"
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v as Letter['type'] })}
              options={TYPES}
            />
            <Field
              label="Nomor Surat"
              required
              value={form.number}
              onChange={(v) => setForm({ ...form, number: v })}
              placeholder="AU.108/8121/APTP/2025"
            />
            <Field
              label="Tanggal Terbit"
              required
              type="date"
              value={form.issue_date}
              onChange={(v) => setForm({ ...form, issue_date: v })}
            />
          </div>

          {/* unggah berkas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Berkas Surat (PDF)
            </label>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <Btn variant="ghost" onClick={() => fileInput.current?.click()}>
                <Upload className="w-4 h-4" /> Pilih Berkas
              </Btn>
              <span className="text-[12px] text-slate-400 truncate max-w-[280px]">
                {file ? file.name : editId ? 'Biarkan kosong bila berkasnya tidak diganti.' : 'Belum ada berkas dipilih.'}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">Format PDF, maksimal 20 MB.</p>
          </div>

          <Field
            label="Atau Tautan Berkas"
            value={form.file_url}
            onChange={(v) => setForm({ ...form, file_url: v })}
            placeholder="https://aptpairport.id/uploads/.../surat.pdf"
          />
          <p className="-mt-2 text-[11px] text-slate-500">
            Dipakai untuk surat yang berkasnya masih tersimpan di portal lama. Bila berkas diunggah,
            tautan ini diabaikan.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Surat ini beserta berkasnya akan dihapus permanen dari portal. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
