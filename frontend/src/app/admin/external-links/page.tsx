'use client';

/**
 * Manajemen Tautan Terkait — portal pemerintah di luar aptpairport.id.
 *
 * Memakai `adminFetch`: tidak ada berkas yang diunggah, hanya alamat dan
 * keterangan.
 *
 * Kelompok berupa isian bebas, bukan pilihan tertutup, karena petugas yang
 * menentukannya. Halaman publik memberi tiap kelompok hiasan dan kalimat
 * pengantar berdasarkan NAMA kelompoknya — jadi mengganti ejaan nama kelompok
 * membuatnya jatuh ke tampilan bawaan. Peringatan itu ditampilkan di bawah
 * isian agar petugas tahu sebelum menyimpan.
 *
 * Tautan nonaktif tetap ditampilkan dengan penanda; halaman publik yang
 * menyaringnya.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { ExternalLink as ExternalLinkData } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import { Globe, Plus, Pencil, Trash2, RefreshCw, Layers, CheckCircle2, EyeOff, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  name: string;
  url: string;
  description: string;
  icon: string;
  group: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: '', url: '', description: '', icon: '', group: '', sort_order: '0', is_active: true,
};

export default function AdminExternalLinksPage() {
  const [items, setItems] = useState<ExternalLinkData[]>([]);
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
    const res = await adminFetch<ExternalLinkData[]>('/external-links');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<ExternalLinkData[]>('/external-links');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((l) => !q || [l.name, l.group, l.description, l.url].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const kelompokAda = useMemo(
    () => Array.from(new Set(items.map((l) => l.group).filter(Boolean))).sort(),
    [items],
  );

  const stats = useMemo(() => ({
    total: items.length,
    aktif: items.filter((l) => l.is_active).length,
    nonaktif: items.filter((l) => !l.is_active).length,
    kelompok: kelompokAda.length,
  }), [items, kelompokAda]);

  const openCreate = () => { setForm({ ...EMPTY, group: kelompokAda[0] ?? '' }); setEditId(null); setOpen(true); };
  const openEdit = (l: ExternalLinkData) => {
    setForm({
      name: l.name,
      url: l.url,
      description: l.description ?? '',
      icon: l.icon ?? '',
      group: l.group,
      sort_order: String(l.sort_order ?? 0),
      is_active: l.is_active,
    });
    setEditId(l.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const body = {
      name: form.name,
      url: form.url,
      description: form.description || null,
      icon: form.icon || null,
      group: form.group,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const res = editId
      ? await adminFetch(`/external-links/${editId}`, { method: 'PUT', body })
      : await adminFetch('/external-links', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Tautan diperbarui' : 'Tautan ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/external-links/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Tautan dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const toggle = async (l: ExternalLinkData) => {
    const res = await adminFetch(`/external-links/${l.id}`, { method: 'PUT', body: { is_active: !l.is_active } });
    setToast({ text: res.ok ? (l.is_active ? 'Tautan disembunyikan' : 'Tautan ditampilkan') : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Globe}
        title="Tautan Terkait"
        subtitle="Portal resmi pemerintah yang ditautkan dari halaman Tautan Terkait"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Tautan</Btn>
          </div>
        }
      />

      <InfoNote>
        Menu navigasi dan footer portal masih memakai daftar tautan bawaan, belum
        mengambil dari sini. Perubahan di halaman ini baru terlihat pada halaman
        Tautan Terkait.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Tautan" value={stats.total} icon={Globe} accent="#38bdf8" />
        <StatCard label="Ditampilkan" value={stats.aktif} icon={CheckCircle2} accent="#34d399" />
        <StatCard label="Disembunyikan" value={stats.nonaktif} icon={EyeOff} accent="#94a3b8" />
        <StatCard label="Kelompok" value={stats.kelompok} icon={Layers} accent="#a78bfa" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Tautan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari tautan..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada tautan" hint="Tambahkan portal yang perlu ditautkan dari halaman Tautan Terkait." />
        ) : (
          <Table head={['Nama & Keterangan', 'Kelompok', 'Urutan', 'Alamat', 'Status', 'Aksi']}>
            {visible.map((l) => (
              <Row key={l.id}>
                <Cell className="max-w-[380px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px]">{l.name}</p>
                  {l.description && <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5 line-clamp-2">{l.description}</p>}
                </Cell>
                <Cell><Badge text={l.group} color="#a78bfa" /></Cell>
                <Cell>{l.sort_order}</Cell>
                <Cell>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--adm-accent)] hover:text-[var(--adm-accent)] text-[11.5px] font-semibold">
                    <LinkIcon className="w-3.5 h-3.5" /> Buka
                  </a>
                </Cell>
                <Cell>
                  <button onClick={() => toggle(l)} className="cursor-pointer" title="Klik untuk mengubah status">
                    <Badge text={l.is_active ? 'Tampil' : 'Disembunyikan'} color={l.is_active ? '#34d399' : '#64748b'} />
                  </button>
                </Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(l)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(l.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Tautan' : 'Tambah Tautan'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Portal" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="SP4N-LAPOR!" />
          <Field label="Alamat (URL)" required value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://lapor.go.id/" />
          <Field label="Keterangan" type="textarea" rows={2} value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Satu kalimat tentang kegunaan portal ini." />

          <Field label="Kelompok" required value={form.group} onChange={(v) => setForm({ ...form, group: v })} placeholder="Layanan Pengaduan & Informasi Publik" />
          {kelompokAda.length > 0 && (
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Kelompok yang sudah dipakai: {kelompokAda.join(' · ')}. Halaman publik mengenali
              hiasan kelompok dari namanya, jadi tulis persis sama bila ingin tampilannya seragam.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Urutan Tampil" type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: String(v) })} />
            <Field label="Kelas Ikon (warisan v1)" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} placeholder="bi-megaphone-fill" />
          </div>

          <Field label="Tampilkan di halaman publik" type="checkbox" value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Tautan ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
