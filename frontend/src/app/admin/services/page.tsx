'use client';

/**
 * Manajemen Layanan Pengajuan.
 *
 * Modul ini berbeda dari halaman admin lain karena tiga kolomnya berisi larik,
 * bukan teks: `requirements`, `steps`, dan `pricing_info`. Kit `admin/ui`
 * belum punya penyunting larik, jadi dua komponen kecil di bawah menanggungnya
 * — keduanya komposisi tingkat halaman, bukan tabel atau modal tandingan.
 *
 * Persyaratan dan alur adalah teks layanan publik yang MENGIKAT pemohon.
 * Karena itu urutannya dapat digeser dan tiap baris disunting utuh, bukan
 * ditulis sebagai satu blok teks yang dipisah baris baru — pemisahan begitu
 * diam-diam mengubah isi ketika petugas menekan Enter di tengah kalimat.
 *
 * `submission_url` masih berisi lintasan dasbor v1 ("dashboard/tenant") yang
 * ikut mati saat cutover. Halaman publik memperlakukan lintasan semacam itu
 * sebagai "belum tersedia"; peringatannya ditampilkan di bawah isian.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import type { ServiceItem, ServiceRate } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  ClipboardList, Plus, Pencil, Trash2, RefreshCw, CheckCircle2, EyeOff, Wallet,
  ArrowUp, ArrowDown, X,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ================================================================
   Penyunting daftar teks (persyaratan, alur)
   ================================================================ */

function PenyuntingDaftar({
  label,
  keterangan,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  keterangan?: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const ubah = (i: number, nilai: string) => onChange(items.map((x, n) => (n === i ? nilai : x)));
  const hapus = (i: number) => onChange(items.filter((_, n) => n !== i));

  /** Geser satu baris; urutan alur pengajuan bermakna. */
  const geser = (i: number, arah: -1 | 1) => {
    const tujuan = i + arah;
    if (tujuan < 0 || tujuan >= items.length) return;

    const salinan = [...items];
    [salinan[i], salinan[tujuan]] = [salinan[tujuan], salinan[i]];
    onChange(salinan);
  };

  return (
    <div>
      <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
        {label} <span className="text-[var(--adm-dim)]">({items.length})</span>
      </label>
      {keterangan && <p className="-mt-1 mb-2 text-[11px] text-[var(--adm-dim)] leading-relaxed">{keterangan}</p>}

      <div className="space-y-2">
        {items.map((nilai, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-2.5 w-6 text-right text-[11px] font-bold text-[var(--adm-dim)] tabular-nums">{i + 1}.</span>

            <textarea
              value={nilai}
              onChange={(e) => ubah(i, e.target.value)}
              rows={2}
              placeholder={placeholder}
              className="flex-1 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3 py-2 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-cyan-400/50 transition-colors"
            />

            <div className="flex flex-col gap-1 mt-0.5">
              <button type="button" onClick={() => geser(i, -1)} disabled={i === 0} title="Naikkan" className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-muted)] hover:text-[var(--adm-accent)] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => geser(i, 1)} disabled={i === items.length - 1} title="Turunkan" className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-muted)] hover:text-[var(--adm-accent)] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                <ArrowDown className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => hapus(i)} title="Hapus baris" className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-muted)] hover:text-rose-300 flex items-center justify-center cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-accent)] hover:text-[var(--adm-accent)] cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah baris
      </button>
    </div>
  );
}

/* ================================================================
   Penyunting tarif
   ================================================================ */

function PenyuntingTarif({ items, onChange }: { items: ServiceRate[]; onChange: (v: ServiceRate[]) => void }) {
  const ubah = (i: number, kunci: keyof ServiceRate, nilai: string) =>
    onChange(items.map((x, n) => (n === i ? { ...x, [kunci]: nilai } : x)));

  return (
    <div>
      <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
        Tarif <span className="text-[var(--adm-dim)]">({items.length})</span>
      </label>
      <p className="-mt-1 mb-2 text-[11px] text-[var(--adm-dim)] leading-relaxed">
        Besaran ditulis apa adanya berikut satuannya, mis. &ldquo;Rp. 31.000/m²&rdquo; — satuannya
        berbeda antar layanan, jadi tidak diseragamkan.
      </p>

      <div className="space-y-2">
        {items.map((t, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              value={t.name}
              onChange={(e) => ubah(i, 'name', e.target.value)}
              placeholder="Terbuka tanpa AC"
              className="flex-1 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3 py-2 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-cyan-400/50"
            />
            <input
              value={t.price}
              onChange={(e) => ubah(i, 'price', e.target.value)}
              placeholder="Rp. 31.000/m²"
              className="w-44 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3 py-2 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-cyan-400/50"
            />
            <button type="button" onClick={() => onChange(items.filter((_, n) => n !== i))} title="Hapus tarif" className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-muted)] hover:text-rose-300 flex items-center justify-center cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...items, { name: '', price: '' }])}
        className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-accent)] hover:text-[var(--adm-accent)] cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah tarif
      </button>
    </div>
  );
}

/* ================================================================
   Halaman
   ================================================================ */

type FormState = {
  name: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  requirements: string[];
  steps: string[];
  pricing_info: ServiceRate[];
  submission_url: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: '', slug: '', title: '', summary: '', description: '',
  requirements: [], steps: [], pricing_info: [], submission_url: '', is_active: true,
};

/** Lintasan gaya v1 tidak dapat dibuka dari portal ini; lihat docblock. */
const lintasanWarisanV1 = (url: string) => {
  const v = url.trim();

  return v !== '' && !v.startsWith('http://') && !v.startsWith('https://') && !v.startsWith('/');
};

export default function AdminServicesPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
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
    const res = await adminFetch<ServiceItem[]>('/services');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<ServiceItem[]>('/services');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((x) => !q || [x.name, x.slug, x.title].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    aktif: items.filter((x) => x.is_active).length,
    nonaktif: items.filter((x) => !x.is_active).length,
    bertarif: items.filter((x) => x.has_pricing).length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (s: ServiceItem) => {
    setForm({
      name: s.name,
      slug: s.slug,
      title: s.title,
      summary: s.summary ?? '',
      description: s.description ?? '',
      requirements: s.requirements ?? [],
      steps: s.steps ?? [],
      pricing_info: s.pricing_info ?? [],
      submission_url: s.submission_url ?? '',
      is_active: s.is_active,
    });
    setEditId(s.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);

    // Baris kosong dibuang di sini, bukan ditolak validasi: petugas kerap
    // menekan "Tambah baris" lalu berubah pikiran, dan menggagalkan seluruh
    // penyimpanan karenanya hanya menjengkelkan.
    const bersih = (a: string[]) => a.map((x) => x.trim()).filter(Boolean);

    const body = {
      name: form.name,
      slug: form.slug,
      title: form.title,
      summary: form.summary || null,
      description: form.description || null,
      requirements: bersih(form.requirements),
      steps: bersih(form.steps),
      pricing_info: form.pricing_info.filter((t) => t.name.trim() && t.price.trim()),
      submission_url: form.submission_url || null,
      is_active: form.is_active,
    };

    const res = editId
      ? await adminFetch(`/services/${editId}`, { method: 'PUT', body })
      : await adminFetch('/services', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Layanan diperbarui' : 'Layanan ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/services/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Layanan dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Layanan Pengajuan"
        subtitle="Persyaratan, alur, dan tarif layanan yang tayang di menu Layanan"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Layanan</Btn>
          </div>
        }
      />

      <InfoNote>
        Formulir pengajuan daring belum ada di portal ini — seluruhnya masih menunjuk dasbor
        portal lama. Selama alamatnya belum diganti lintasan portal ini, halaman publik
        menampilkan &ldquo;Formulir daring segera tersedia&rdquo; alih-alih tombol yang berujung
        halaman kosong.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Layanan" value={stats.total} icon={ClipboardList} accent="#38bdf8" />
        <StatCard label="Tampil di Portal" value={stats.aktif} icon={CheckCircle2} accent="#34d399" />
        <StatCard label="Disembunyikan" value={stats.nonaktif} icon={EyeOff} accent="#94a3b8" />
        <StatCard label="Bertarif" value={stats.bertarif} icon={Wallet} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Layanan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari layanan..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada layanan" hint="Tambahkan layanan agar tampil pada menu Layanan portal." />
        ) : (
          <Table head={['Nama & Slug', 'Isi', 'Formulir', 'Status', 'Aksi']}>
            {visible.map((s) => (
              <Row key={s.id}>
                <Cell className="max-w-[320px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px]">{s.name}</p>
                  <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5 font-mono">/layanan/{s.slug}</p>
                </Cell>

                <Cell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge text={`${s.requirements?.length ?? 0} syarat`} color="#38bdf8" />
                    <Badge text={`${s.steps?.length ?? 0} tahap`} color="#a78bfa" />
                    {s.has_pricing && <Badge text={`${s.pricing_info?.length ?? 0} tarif`} color="#fbbf24" />}
                  </div>
                </Cell>

                <Cell>
                  {!s.submission_url ? (
                    <span className="text-[var(--adm-dim)]">—</span>
                  ) : lintasanWarisanV1(s.submission_url) ? (
                    <Badge text="Portal lama" color="#fbbf24" />
                  ) : (
                    <Badge text="Tersedia" color="#34d399" />
                  )}
                </Cell>

                <Cell><Badge text={s.is_active ? 'Tampil' : 'Disembunyikan'} color={s.is_active ? '#34d399' : '#64748b'} /></Cell>

                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(s.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Layanan' : 'Tambah Layanan'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Layanan" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Tenant" />
            <Field label="Slug" required value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="tenant" />
          </div>
          <p className="-mt-2 text-[11px] text-[var(--adm-dim)]">
            Slug menjadi alamat halamannya: /layanan/<span className="font-mono">{form.slug || 'slug'}</span>.
            Huruf kecil, angka, dan tanda hubung saja. Mengubahnya memutus tautan yang sudah tersebar.
          </p>

          <Field label="Judul Halaman" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Syarat & Ketentuan Pengajuan Tenant" />
          <Field label="Ringkasan" type="textarea" rows={2} value={form.summary} onChange={(v) => setForm({ ...form, summary: v })} placeholder="Satu kalimat untuk kartu daftar dan hasil pencarian." />
          <Field label="Paragraf Pembuka" type="textarea" rows={4} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <PenyuntingDaftar
            label="Persyaratan"
            keterangan="Berkas yang wajib disiapkan pemohon. Ini teks yang mengikat — tulis persis seperti ketentuan resminya."
            items={form.requirements}
            onChange={(v) => setForm({ ...form, requirements: v })}
            placeholder="Kartu Tanda Penduduk (KTP)"
          />

          <PenyuntingDaftar
            label="Alur Pengajuan"
            keterangan="Berurut. Pakai panah untuk menggeser tahapan."
            items={form.steps}
            onChange={(v) => setForm({ ...form, steps: v })}
            placeholder="Mengajukan surat permohonan kepada Kabandara"
          />

          <PenyuntingTarif items={form.pricing_info} onChange={(v) => setForm({ ...form, pricing_info: v })} />

          <Field
            label="Alamat Formulir Pengajuan"
            value={form.submission_url}
            onChange={(v) => setForm({ ...form, submission_url: v })}
            placeholder="/pengajuan/tenant"
          />
          {lintasanWarisanV1(form.submission_url) && (
            <p className="-mt-2 text-[11.5px] text-amber-300/90 leading-relaxed">
              Alamat ini bergaya portal lama dan tidak dapat dibuka dari portal ini. Halaman
              publiknya akan berkata &ldquo;Formulir daring segera tersedia&rdquo; sampai diganti
              lintasan portal ini (diawali <span className="font-mono">/</span>) atau URL penuh.
            </p>
          )}

          <Field label="Tampilkan di portal publik" type="checkbox" value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Layanan ini akan dihapus permanen berikut persyaratan, alur, dan tarifnya. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
