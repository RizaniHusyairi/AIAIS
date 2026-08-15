'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { NewsItem } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger, InfoNote,
} from '@/components/admin/ui';
import { Newspaper, Plus, Pencil, Trash2, RefreshCw, Star, Eye, FileEdit, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = ['Berita Utama', 'Pengumuman', 'Operasional', 'Layanan', 'Kegiatan', 'Fasilitas'];

const EMPTY: Partial<NewsItem> = {
  title: '', category: 'Berita Utama', excerpt: '', content: '',
  thumbnail: '', author: 'Humas UPBU APT Pranoto', is_featured: false, status: 'published' as any,
};

export default function AdminNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<Partial<NewsItem>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<NewsItem[]>('/news');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((n) => !q || [n.title, n.category, n.author].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    featured: items.filter((n) => n.is_featured).length,
    views: items.reduce((a, n) => a + (n.views_count ?? 0), 0),
    draft: items.filter((n) => (n as any).status === 'draft').length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (n: NewsItem) => { setForm({ ...n }); setEditId(n.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const body = {
      title: form.title, category: form.category, excerpt: form.excerpt, content: form.content,
      thumbnail: form.thumbnail || null, author: form.author || null,
      is_featured: !!form.is_featured, status: (form as any).status ?? 'published',
    };
    const res = editId
      ? await adminFetch(`/news/${editId}`, { method: 'PUT', body })
      : await adminFetch('/news', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Berita diperbarui' : 'Berita dipublikasikan', kind: 'success' });
      load();
    } else {
      setToast({ text: res.message, kind: 'error' });
    }
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/news/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Berita dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

  return (
    <>
      <PageHeader
        icon={Newspaper}
        title="Manajemen Berita & Artikel"
        subtitle="Kelola publikasi berita yang tampil di portal publik dan aplikasi mobile"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tulis Berita</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Artikel" value={stats.total} icon={Newspaper} accent="#a78bfa" />
        <StatCard label="Berita Utama" value={stats.featured} icon={Star} accent="#fbbf24" />
        <StatCard label="Total Dibaca" value={stats.views} icon={Eye} accent="#22d3ee" />
        <StatCard label="Draft" value={stats.draft} icon={FileEdit} accent="#94a3b8" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Artikel</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari judul / kategori / penulis..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada berita" hint="Klik “Tulis Berita” untuk membuat publikasi pertama." />
        ) : (
          <Table head={['Judul', 'Kategori', 'Penulis', 'Terbit', 'Dibaca', 'Aksi']}>
            {visible.map((n) => (
              <Row key={n.id}>
                <Cell className="max-w-[340px]">
                  <div className="flex items-start gap-2.5">
                    {n.thumbnail && <img src={n.thumbnail} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug line-clamp-2">{n.title}</p>
                      {n.is_featured && <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 mt-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Berita Utama</span>}
                    </div>
                  </div>
                </Cell>
                <Cell><Badge text={n.category} color="#a78bfa" /></Cell>
                <Cell className="max-w-[150px]"><span className="truncate block">{n.author}</span></Cell>
                <Cell className="whitespace-nowrap">{fmt(n.published_at)}</Cell>
                <Cell className="tabular-nums">{(n.views_count ?? 0).toLocaleString('id-ID')}</Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    <a href={`/news/${n.slug}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-[var(--adm-hover)] text-[var(--adm-body)] flex items-center justify-center transition-colors" title="Lihat di portal">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => openEdit(n)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(n.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        wide
        title={editId ? 'Ubah Berita' : 'Tulis Berita Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Publikasikan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Berita" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Peningkatan Fasilitas Terminal..." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kategori" required type="select" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <Field label="Penulis" value={form.author} onChange={(v) => setForm({ ...form, author: v })} placeholder="Humas UPBU APT Pranoto" />
          </div>

          <Field label="URL Gambar Sampul" value={form.thumbnail} onChange={(v) => setForm({ ...form, thumbnail: v })} placeholder="https://..." />
          {form.thumbnail && (
            <img src={form.thumbnail} alt="Pratinjau" className="w-full h-36 object-cover rounded-xl border border-[var(--adm-line)]" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          )}

          <Field label="Ringkasan" required type="textarea" rows={2} value={form.excerpt} onChange={(v) => setForm({ ...form, excerpt: v })} placeholder="Ringkasan singkat yang tampil di kartu berita..." />
          <Field label="Isi Berita (mendukung HTML)" required type="textarea" rows={9} value={form.content} onChange={(v) => setForm({ ...form, content: v })} placeholder="<p>Paragraf pertama...</p>&#10;<h2>Sub Judul</h2>&#10;<ul><li>Poin</li></ul>" />

          <InfoNote>
            Isi berita mendukung tag HTML seperti <code className="text-[var(--adm-accent)]">&lt;p&gt;</code>, <code className="text-[var(--adm-accent)]">&lt;h2&gt;</code>, <code className="text-[var(--adm-accent)]">&lt;ul&gt;&lt;li&gt;</code>, dan <code className="text-[var(--adm-accent)]">&lt;blockquote&gt;</code> — semuanya otomatis mendapat gaya bernuansa penerbangan di halaman publik.
          </InfoNote>

          <div className="flex flex-wrap gap-6 pt-1">
            <Field label="Jadikan Berita Utama" type="checkbox" value={!!form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} />
            <Field
              label="Status" type="select" className="w-40" value={(form as any).status ?? 'published'}
              onChange={(v) => setForm({ ...form, status: v } as any)}
              options={[{ value: 'published', label: 'Terbit' }, { value: 'draft', label: 'Draft' }]}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Artikel ini akan dihapus permanen dari portal publik dan aplikasi mobile. Lanjutkan?"
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
