'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/adminApi';
import { NewsItem } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { KUNCI_TOAST } from './FormBeritaView';
import { gambarBerita } from '@/lib/berita';
import { Newspaper, Plus, Pencil, Trash2, RefreshCw, Star, Eye, FileEdit, ExternalLink, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<NewsItem[]>('/news');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Pesan sukses dititipkan halaman form sebelum berpindah ke sini.
  useEffect(() => {
    const pesan = sessionStorage.getItem(KUNCI_TOAST);
    if (!pesan) return;

    sessionStorage.removeItem(KUNCI_TOAST);
    setToast({ text: pesan, kind: 'success' });
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((n) => !q || [n.title, n.category, n.author].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    featured: items.filter((n) => n.is_featured).length,
    views: items.reduce((a, n) => a + (n.views_count ?? 0), 0),
    draft: items.filter((n) => n.status === 'draft').length,
  }), [items]);

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
            <Link href="/admin/news/baru"><Btn><Plus className="w-4 h-4" /> Tulis Berita</Btn></Link>
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
            {visible.map((n) => {
              const sampul = gambarBerita(n);

              return (
                <Row key={n.id}>
                  <Cell className="max-w-[340px]">
                    <div className="flex items-start gap-2.5">
                      {sampul ? (
                        <img src={sampul} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <span className="w-11 h-11 rounded-lg bg-[var(--adm-hover)] flex items-center justify-center flex-shrink-0" title="Belum ada gambar sampul">
                          <ImageOff className="w-4 h-4 text-[var(--adm-dim)]" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug line-clamp-2">{n.title}</p>
                        <div className="flex items-center gap-2.5 mt-1">
                          {n.is_featured && <span className="inline-flex items-center gap-1 text-[10px] text-amber-300"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Berita Utama</span>}
                          {n.status === 'draft' && <span className="inline-flex items-center gap-1 text-[10px] text-[var(--adm-muted)]"><FileEdit className="w-3 h-3" /> Draft</span>}
                        </div>
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
                      <Link href={`/admin/news/${n.id}`} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => setDelId(n.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
