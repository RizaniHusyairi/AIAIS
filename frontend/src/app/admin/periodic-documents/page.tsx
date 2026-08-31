'use client';

/**
 * Manajemen Informasi Berkala — dokumen yang wajib diumumkan rutin.
 *
 * Memakai `adminFetch`, bukan `adminUpload`: dokumennya tidak diunggah ke
 * bandara melainkan ditautkan ke Google Drive, jadi tidak ada berkas yang
 * dikirim.
 *
 * Kategori DIPILIH, tidak diketik. Halaman publik mengelompokkan dokumen
 * persis dari string kategori, jadi satu salah ketik memunculkan dua akordeon
 * terpisah bagi pengunjung — dan dulu daftar kategori terpakai hanya dicetak
 * sebagai kalimat di bawah medannya, untuk dibaca lalu diketik ulang. Chip
 * "Kategori lain…" tetap membuka jalan menambah kelompok baru: daftarnya
 * menyeragamkan ejaan, bukan mengunci kelompok ke tangan pengembang.
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
import { Galat, IsianTautan, PilihKategori, tautanSah } from '@/components/admin/isian';
import { KATEGORI_BERKALA, gabungKategori } from '@/lib/ppidKategori';
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
  const [galat, setGalat] = useState<Record<string, string>>({});
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

  /* Kategori resmi portal v1 lebih dulu, disusul kategori tak terduga yang
     benar-benar ada di basis data — supaya tidak satu pun kelompok lama
     kehilangan tempatnya di daftar pilihan. */
  const pilihanKategori = useMemo(
    () => gabungKategori(KATEGORI_BERKALA, kategoriAda),
    [kategoriAda],
  );

  const isi = (k: keyof FormState, v: string) => {
    setForm((s) => ({ ...s, [k]: v }));
    setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
  };

  const stats = useMemo(() => ({
    total: items.length,
    kategori: kategoriAda.length,
    tanpaTautan: items.filter((d) => !d.document_path).length,
    lhkpn: items.filter((d) => d.pejabat_name).length,
  }), [items, kategoriAda]);

  // Kategori tidak lagi ditebak dari data: memilihnya kini satu klik, dan
  // isian yang terisi sendiri justru kerap ikut tersimpan tanpa diperiksa.
  const openCreate = () => { setForm(EMPTY); setGalat({}); setEditId(null); setOpen(true); };
  const openEdit = (d: PeriodicDocument) => {
    setForm({
      category: d.category,
      title: d.title,
      document_path: d.document_path,
      published_date: d.published_date ? String(d.published_date).slice(0, 10) : '',
      pejabat_name: d.pejabat_name ?? '',
    });
    setGalat({});
    setEditId(d.id);
    setOpen(true);
  };

  const periksa = () => {
    const g: Record<string, string> = {};
    if (!form.category.trim()) g.category = 'Kategori wajib dipilih.';
    if (!form.title.trim()) g.title = 'Judul dokumen wajib diisi.';
    if (!form.document_path.trim()) g.document_path = 'Tautan dokumen wajib diisi.';
    else if (!tautanSah(form.document_path.trim())) g.document_path = 'Tautan harus diawali http:// atau https://';
    if (!form.published_date) g.published_date = 'Tanggal terbit wajib diisi.';

    setGalat(g);
    return Object.keys(g).length === 0;
  };

  const save = async () => {
    if (!periksa()) {
      setToast({ text: 'Ada isian yang belum lengkap.', kind: 'error' });
      return;
    }

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
          <PilihKategori
            nilai={form.category}
            pilihan={pilihanKategori}
            onChange={(v) => isi('category', v)}
            galat={galat.category}
          />

          <div>
            <Field
              label="Judul Dokumen" required type="textarea" rows={2}
              value={form.title} onChange={(v) => isi('title', v)}
              placeholder="Laporan Keuangan 2024"
            />
            <Galat pesan={galat.title} />
          </div>

          <IsianTautan
            label="Tautan Dokumen" wajib
            nilai={form.document_path}
            onChange={(v) => isi('document_path', v)}
            placeholder="https://drive.google.com/file/d/.../view"
            hint="Tempel alamat berbagi Google Drive dokumennya."
            galat={galat.document_path}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Field label="Tanggal Terbit" required type="date" value={form.published_date} onChange={(v) => isi('published_date', v)} />
              <Galat pesan={galat.published_date} />
            </div>
            <Field label="Nama Pejabat (khusus LHKPN)" value={form.pejabat_name} onChange={(v) => isi('pejabat_name', v)} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Dokumen ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
