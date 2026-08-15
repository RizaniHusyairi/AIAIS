'use client';

/**
 * Manajemen Pertanyaan yang Sering Diajukan.
 *
 * Jawaban disimpan sebagai HTML — di v1 diketik lewat editor teks kaya, dan
 * penebalan pada informasi penting (jam operasional, jenis identitas yang
 * diterima) memang bagian dari isinya. Di sini penyuntingannya memakai area
 * teks biasa berisi HTML mentah, bukan editor WYSIWYG: memasang editor penuh
 * berarti menambah dependensi besar untuk sepuluh pertanyaan yang jarang
 * berubah, dan HTML-nya sederhana — paragraf, penebalan, daftar.
 *
 * Pratayangnya dirender lewat `SafeHtml`, komponen yang sama dengan halaman
 * publik. Jadi yang dilihat petugas persis yang akan dilihat pengunjung,
 * termasuk bila ada markah yang tersaring keluar.
 *
 * Kategori berupa isian bebas — petugas yang menentukannya, dan halaman publik
 * membangun daftar penyaringnya dari data.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import SafeHtml from '@/components/SafeHtml';
import type { FaqItem, ServiceItem } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  HelpCircle, Plus, Pencil, Trash2, RefreshCw, Star, EyeOff, Layers, Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  question: string;
  answer: string;
  category: string;
  service_id: string;
  sort_order: string;
  is_featured: boolean;
  is_active: boolean;
};

const EMPTY: FormState = {
  question: '', answer: '<p></p>', category: '', service_id: '',
  sort_order: '0', is_featured: false, is_active: true,
};

/** Buang markah, sisakan teks — untuk ringkasan di tabel. */
const teksSaja = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export default function AdminFaqsPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [layanan, setLayanan] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [pratayang, setPratayang] = useState(true);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<FaqItem[]>('/faqs');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const [faq, svc] = await Promise.all([
        adminFetch<FaqItem[]>('/faqs'),
        adminFetch<ServiceItem[]>('/services'),
      ]);
      if (batal) return;

      setItems(Array.isArray(faq.data) ? faq.data : []);
      setLayanan(Array.isArray(svc.data) ? svc.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((f) => !q || [f.question, f.category, teksSaja(f.answer)].some((v) => v.toLowerCase().includes(s)));
  }, [items, q]);

  const kategoriAda = useMemo(
    () => Array.from(new Set(items.map((f) => f.category).filter(Boolean))).sort(),
    [items],
  );

  const stats = useMemo(() => ({
    total: items.length,
    tampil: items.filter((f) => f.is_active).length,
    penting: items.filter((f) => f.is_featured).length,
    kategori: kategoriAda.length,
  }), [items, kategoriAda]);

  const openCreate = () => { setForm({ ...EMPTY, category: kategoriAda[0] ?? '' }); setEditId(null); setOpen(true); };
  const openEdit = (f: FaqItem) => {
    setForm({
      question: f.question,
      answer: f.answer,
      category: f.category,
      service_id: f.service_id ? String(f.service_id) : '',
      sort_order: String(f.sort_order ?? 0),
      is_featured: f.is_featured,
      is_active: f.is_active,
    });
    setEditId(f.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const body = {
      question: form.question,
      answer: form.answer,
      category: form.category,
      service_id: form.service_id ? Number(form.service_id) : null,
      sort_order: Number(form.sort_order) || 0,
      is_featured: form.is_featured,
      is_active: form.is_active,
    };

    const res = editId
      ? await adminFetch(`/faqs/${editId}`, { method: 'PUT', body })
      : await adminFetch('/faqs', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Pertanyaan diperbarui' : 'Pertanyaan ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/faqs/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Pertanyaan dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={HelpCircle}
        title="Pertanyaan Sering Diajukan"
        subtitle="Jawaban yang tayang di halaman FAQ dan menjadi lapis pertama Pusat Bantuan"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Pertanyaan</Btn>
          </div>
        }
      />

      <InfoNote>
        Jawaban ditulis dalam HTML sederhana — <code>&lt;p&gt;</code>, <code>&lt;strong&gt;</code>,
        <code>&lt;ul&gt;/&lt;li&gt;</code>. Markah di luar daftar yang diizinkan akan tersaring
        sebelum tayang; pratayang di bawah isian menunjukkan hasil sebenarnya.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pertanyaan" value={stats.total} icon={HelpCircle} accent="#38bdf8" />
        <StatCard label="Tampil di Portal" value={stats.tampil} icon={Eye} accent="#34d399" />
        <StatCard label="Ditandai Penting" value={stats.penting} icon={Star} accent="#fbbf24" />
        <StatCard label="Kategori" value={stats.kategori} icon={Layers} accent="#a78bfa" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Pertanyaan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari pertanyaan atau jawaban..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada pertanyaan" hint="Tambahkan pertanyaan agar tampil di halaman FAQ." />
        ) : (
          <Table head={['Pertanyaan & Jawaban', 'Kategori', 'Urutan', 'Status', 'Aksi']}>
            {visible.map((f) => (
              <Row key={f.id}>
                <Cell className="max-w-[460px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{f.question}</p>
                  <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5 line-clamp-2">{teksSaja(f.answer)}</p>
                </Cell>
                <Cell><Badge text={f.category} color="#a78bfa" /></Cell>
                <Cell>{f.sort_order}</Cell>
                <Cell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge text={f.is_active ? 'Tampil' : 'Disembunyikan'} color={f.is_active ? '#34d399' : '#64748b'} />
                    {f.is_featured && <Badge text="Penting" color="#fbbf24" />}
                  </div>
                </Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(f)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(f.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Pertanyaan' : 'Tambah Pertanyaan'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Pertanyaan" required type="textarea" rows={2} value={form.question} onChange={(v) => setForm({ ...form, question: v })} placeholder="Berapa jam operasional Bandara A.P.T. Pranoto?" />

          <Field
            label="Jawaban (HTML)" required type="textarea" rows={7}
            value={form.answer} onChange={(v) => setForm({ ...form, answer: v })}
            placeholder="<p>Jam operasional bandara pukul <strong>07.00 - 20.00 WITA</strong>.</p>"
          />

          <div>
            <button
              type="button"
              onClick={() => setPratayang((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-accent)] hover:text-[var(--adm-accent)] cursor-pointer"
            >
              {pratayang ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {pratayang ? 'Sembunyikan pratayang' : 'Tampilkan pratayang'}
            </button>

            {pratayang && (
              <div className="mt-2 rounded-xl bg-white px-4 py-3 text-slate-800 text-[13px] leading-relaxed faq-answer">
                {/* Dirender dengan komponen yang sama persis dengan halaman
                    publik, jadi markah yang tersaring keluar juga terlihat
                    di sini — bukan kejutan setelah disimpan. */}
                <SafeHtml html={form.answer} />
              </div>
            )}
          </div>

          <Field label="Kategori" required value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Fasilitas Bandara" />
          {kategoriAda.length > 0 && (
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Kategori yang sudah dipakai: {kategoriAda.join(' · ')}. Halaman publik menyusun
              penyaringnya dari daftar ini, jadi tulis persis sama bila ingin bergabung.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Terkait Layanan" type="select"
              value={form.service_id} onChange={(v) => setForm({ ...form, service_id: String(v) })}
              options={[{ value: '', label: '— Tidak terkait —' }, ...layanan.map((s) => ({ value: String(s.id), label: s.name }))]}
            />
            <Field label="Urutan Tampil" type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: String(v) })} />
          </div>

          <Field label="Tandai sebagai pertanyaan penting" type="checkbox" value={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} />
          <Field label="Tampilkan di portal publik" type="checkbox" value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Pertanyaan ini akan dihapus permanen. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
