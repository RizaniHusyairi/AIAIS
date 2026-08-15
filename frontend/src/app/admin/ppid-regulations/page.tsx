'use client';

/**
 * Manajemen Regulasi PPID — dasar hukum keterbukaan informasi publik.
 *
 * Modul ini ada karena kemampuan menyunting daftar peraturan hanya dimiliki
 * panel admin v1, dan panel itu dimatikan saat cutover. Tanpa halaman ini,
 * setiap peraturan baru harus ditulis langsung ke basis data.
 *
 * Memakai `adminFetch`, bukan `adminUpload`: dokumen peraturan tidak pernah
 * diunggah ke bandara melainkan ditautkan ke Google Drive, sehingga tidak ada
 * berkas yang dikirim dan cukup JSON biasa.
 *
 * Peraturan yang tautannya kosong tetap ditampilkan dengan penanda, tidak
 * disembunyikan — halaman publik memang menyaringnya, jadi di sinilah
 * satu-satunya tempat petugas bisa melihat mana yang perlu dilengkapi.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { PpidRegulation } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { Scale, Plus, Pencil, Trash2, RefreshCw, Landmark, Gavel, LinkIcon, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Kelompok peraturan yang sah — harus sama persis dengan
 * PpidRegulation::CATEGORIES di backend, karena dipakai sebagai aturan
 * validasi di sana.
 *
 * Ejaan "Kementrian" mengikuti sumbernya di portal v1. Membetulkannya menjadi
 * "Kementerian" akan memecah peraturan lama dan baru menjadi dua kelompok
 * yang tampak berbeda di halaman publik.
 */
const CATEGORIES = [
  'Peraturan Undang-undang',
  'Peraturan Komisi Informasi Pusat',
  'Peraturan Kementrian Perhubungan Terkait Keterbukaan Informasi Publik',
];

/** Label ringkas untuk kolom tabel; nama resminya terlalu panjang. */
const CATEGORY_SHORT: Record<string, { label: string; color: string }> = {
  'Peraturan Undang-undang': { label: 'Undang-undang', color: '#38bdf8' },
  'Peraturan Komisi Informasi Pusat': { label: 'Komisi Informasi', color: '#34d399' },
  'Peraturan Kementrian Perhubungan Terkait Keterbukaan Informasi Publik': { label: 'Kemenhub', color: '#fbbf24' },
};

/** Bentuk isian modal. `published_date` selalu string agar cocok input date. */
type FormState = {
  category: string;
  title: string;
  document_link: string;
  published_date: string;
};

const EMPTY: FormState = {
  category: CATEGORIES[0], title: '', document_link: '', published_date: '',
};

export default function AdminPpidRegulationsPage() {
  const [items, setItems] = useState<PpidRegulation[]>([]);
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
    const res = await adminFetch<PpidRegulation[]>('/ppid-regulations');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  // Pemuatan pertama tidak memanggil load(): `setLoading(true)` di dalamnya
  // berjalan serentak dengan badan efek, yang memicu render berantai. Keadaan
  // awal sudah `loading`, jadi cukup menunggu hasilnya.
  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<PpidRegulation[]>('/ppid-regulations');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((r) => !q || [r.title, r.category].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    kelompok: new Set(items.map((r) => r.category)).size,
    tanpaTautan: items.filter((r) => !r.document_link).length,
    tanpaTanggal: items.filter((r) => !r.published_date).length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (r: PpidRegulation) => {
    setForm({ ...r, published_date: r.published_date ? String(r.published_date).slice(0, 10) : '' });
    setEditId(r.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    // `published_date` dikirim null bila kosong: backend menerimanya sebagai
    // nullable, sedangkan string kosong akan gagal aturan `date`.
    const body: Omit<FormState, 'published_date'> & { published_date: string | null } = {
      category: form.category,
      title: form.title,
      document_link: form.document_link,
      published_date: form.published_date || null,
    };

    const res = editId
      ? await adminFetch(`/ppid-regulations/${editId}`, { method: 'PUT', body })
      : await adminFetch('/ppid-regulations', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Peraturan diperbarui' : 'Peraturan ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/ppid-regulations/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Peraturan dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Scale}
        title="Regulasi PPID"
        subtitle="Dasar hukum penyelenggaraan keterbukaan informasi publik di lingkungan bandara"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Peraturan</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Peraturan" value={stats.total} icon={Gavel} accent="#38bdf8" />
        <StatCard label="Kelompok" value={stats.kelompok} icon={Landmark} accent="#34d399" />
        <StatCard label="Tanpa Tautan" value={stats.tanpaTautan} icon={AlertTriangle} accent="#fb7185" />
        <StatCard label="Tanpa Tanggal" value={stats.tanpaTanggal} icon={AlertTriangle} accent="#94a3b8" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Peraturan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari peraturan..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada peraturan" hint="Tambahkan dasar hukum agar tampil di halaman Regulasi PPID." />
        ) : (
          <Table head={['Judul Peraturan', 'Kelompok', 'Terbit', 'Dokumen', 'Aksi']}>
            {visible.map((r) => {
              const cat = CATEGORY_SHORT[r.category] ?? { label: r.category, color: '#94a3b8' };
              return (
                <Row key={r.id}>
                  <Cell className="max-w-[460px]">
                    <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{r.title}</p>
                  </Cell>
                  <Cell><Badge text={cat.label} color={cat.color} /></Cell>
                  <Cell>{r.published_date ? String(r.published_date).slice(0, 10) : <span className="text-[var(--adm-dim)]">—</span>}</Cell>
                  <Cell>
                    {r.document_link ? (
                      <a
                        href={r.document_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[var(--adm-accent)] hover:text-[var(--adm-accent)] text-[11.5px] font-semibold"
                      >
                        <LinkIcon className="w-3.5 h-3.5" /> Buka
                      </a>
                    ) : (
                      // Ditandai, bukan disembunyikan: halaman publik sudah
                      // menyaringnya, jadi hanya di sini petugas bisa tahu.
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
              );
            })}
          </Table>
        )}
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Peraturan' : 'Tambah Peraturan'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Kelompok Peraturan" required type="select"
            value={form.category} onChange={(v) => setForm({ ...form, category: v })}
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_SHORT[c]?.label ?? c }))}
          />
          <Field
            label="Judul Peraturan" required type="textarea" rows={3}
            value={form.title} onChange={(v) => setForm({ ...form, title: v })}
            placeholder="Undang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik"
          />
          <Field
            label="Tautan Dokumen" required
            value={form.document_link} onChange={(v) => setForm({ ...form, document_link: v })}
            placeholder="https://drive.google.com/file/d/.../view"
          />
          <Field
            label="Tanggal Terbit" type="date"
            value={form.published_date} onChange={(v) => setForm({ ...form, published_date: v })}
          />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Peraturan ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
