'use client';

/**
 * Manajemen Destinasi Wisata.
 *
 * Memakai `adminUpload` karena modul ini menerima gambar: satu foto sampul
 * dan beberapa foto galeri. Keduanya sengaja dikirim lewat medan terpisah —
 * sampul selalu menggantikan yang lama, sedangkan galeri bertambah. Bila
 * disatukan, "ganti sampul" akan tidak sengaja menghapus galeri.
 *
 * Foto galeri dihapus satu per satu lewat endpoint tersendiri; tidak ada
 * pengiriman ulang seluruh daftar, supaya dua petugas yang menyunting
 * bersamaan tidak saling menimpa galeri.
 *
 * Galeri warisan v1 memuat entri berulang dan sebagian menunjuk berkas yang
 * tidak ada. Tabel menampilkan kedua angkanya — tersimpan dan benar-benar
 * tersaji — supaya selisihnya terlihat, bukan tersembunyi.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import type { TourismItem } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  MapPin, Plus, Pencil, Trash2, RefreshCw, Images, ImageOff, Eye, X,
} from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  name: string;
  slug: string;
  category: string;
  distance_km: string;
  duration: string;
  city: string;
  short_desc: string;
  description: string;
  highlights: string[];
  address: string;
  gmaps_url: string;
  status: 'published' | 'draft';
};

const EMPTY: FormState = {
  name: '', slug: '', category: '', distance_km: '', duration: '', city: '',
  short_desc: '', description: '', highlights: [], address: '', gmaps_url: '',
  status: 'draft',
};

export default function AdminTourismsPage() {
  const [items, setItems] = useState<TourismItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [sampul, setSampul] = useState<File | null>(null);
  const [galeriBaru, setGaleriBaru] = useState<File[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<TourismItem[]>('/tourisms');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<TourismItem[]>('/tourisms');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((t) => !q || [t.name, t.category, t.city, t.address].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const kategoriAda = useMemo(
    () => Array.from(new Set(items.map((t) => t.category).filter(Boolean))).sort(),
    [items],
  );

  const stats = useMemo(() => ({
    total: items.length,
    tayang: items.filter((t) => t.status === 'published').length,
    tanpaFoto: items.filter((t) => !t.has_cover).length,
    fotoHilang: items.reduce((n, t) => n + Math.max(0, (t.gallery?.length ?? 0) - t.gallery_urls.length), 0),
  }), [items]);

  const sunting = items.find((t) => t.id === editId) ?? null;

  const openCreate = () => {
    setForm({ ...EMPTY, category: kategoriAda[0] ?? '' });
    setSampul(null); setGaleriBaru([]); setEditId(null); setOpen(true);
  };

  const openEdit = (t: TourismItem) => {
    setForm({
      name: t.name,
      slug: t.slug,
      category: t.category,
      distance_km: t.distance_km != null ? String(t.distance_km) : '',
      duration: t.duration ?? '',
      city: t.city ?? '',
      short_desc: t.short_desc,
      description: t.description,
      highlights: t.highlights ?? [],
      address: t.address,
      gmaps_url: t.gmaps_url ?? '',
      status: t.status,
    });
    setSampul(null); setGaleriBaru([]); setEditId(t.id); setOpen(true);
  };

  const save = async () => {
    setSaving(true);

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('slug', form.slug);
    fd.append('category', form.category);
    fd.append('short_desc', form.short_desc);
    fd.append('description', form.description);
    fd.append('address', form.address);
    fd.append('status', form.status);
    if (form.distance_km) fd.append('distance_km', form.distance_km);
    if (form.duration) fd.append('duration', form.duration);
    if (form.city) fd.append('city', form.city);
    if (form.gmaps_url) fd.append('gmaps_url', form.gmaps_url);

    form.highlights
      .map((h) => h.trim())
      .filter(Boolean)
      .forEach((h) => fd.append('highlights[]', h));

    if (sampul) fd.append('cover', sampul);
    galeriBaru.forEach((f) => fd.append('gallery[]', f));

    const res = editId
      ? await adminUpload(`/tourisms/${editId}`, fd)
      : await adminUpload('/tourisms', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Destinasi diperbarui' : 'Destinasi ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const hapusFotoGaleri = async (t: TourismItem, path: string) => {
    const res = await adminFetch(`/tourisms/${t.id}/gallery`, { method: 'DELETE', body: { path } });
    setToast({ text: res.ok ? 'Foto galeri dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/tourisms/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Destinasi dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={MapPin}
        title="Destinasi Wisata"
        subtitle="Tempat wisata di sekitar bandara yang direkomendasikan kepada pengunjung"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Destinasi</Btn>
          </div>
        }
      />

      <InfoNote>
        Halaman wisata di portal publik masih menampilkan daftar bawaan berisi sepuluh destinasi,
        sedangkan di sini baru tercatat {items.length}. Peralihan dilakukan setelah seluruh
        destinasi dimasukkan berikut jarak, waktu tempuh, dan daya tariknya — agar tidak ada
        destinasi yang justru hilang dari pandangan pengunjung.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Destinasi" value={stats.total} icon={MapPin} accent="#38bdf8" />
        <StatCard label="Tayang" value={stats.tayang} icon={Eye} accent="#34d399" />
        <StatCard label="Tanpa Foto Sampul" value={stats.tanpaFoto} icon={ImageOff} accent="#fbbf24" />
        <StatCard label="Foto Galeri Hilang" value={stats.fotoHilang} icon={Images} accent="#fb7185" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Destinasi</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari destinasi..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada destinasi" hint="Tambahkan tempat wisata di sekitar bandara." />
        ) : (
          <Table head={['Destinasi', 'Kategori', 'Jarak', 'Foto', 'Status', 'Aksi']}>
            {visible.map((t) => {
              const hilang = Math.max(0, (t.gallery?.length ?? 0) - t.gallery_urls.length);

              return (
                <Row key={t.id}>
                  <Cell className="max-w-[300px]">
                    <p className="font-bold text-[var(--adm-fg)] text-[12.5px]">{t.name}</p>
                    <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5 font-mono">/tourism/{t.slug}</p>
                  </Cell>
                  <Cell><Badge text={t.category} color="#a78bfa" /></Cell>
                  <Cell>
                    {t.distance_km != null ? `${t.distance_km} km` : <span className="text-[var(--adm-dim)]">—</span>}
                    {t.duration && <span className="block text-[11px] text-[var(--adm-dim)]">{t.duration}</span>}
                  </Cell>
                  <Cell>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge text={t.has_cover ? 'Sampul ada' : 'Tanpa sampul'} color={t.has_cover ? '#34d399' : '#fbbf24'} />
                      <Badge text={`${t.gallery_urls.length} galeri`} color="#38bdf8" />
                      {hilang > 0 && <Badge text={`${hilang} hilang`} color="#fb7185" />}
                    </div>
                  </Cell>
                  <Cell><Badge text={t.status === 'published' ? 'Tayang' : 'Draf'} color={t.status === 'published' ? '#34d399' : '#64748b'} /></Cell>
                  <Cell>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(t.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Destinasi' : 'Tambah Destinasi'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Destinasi" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Desa Budaya Pampang" />
            <Field label="Slug" required value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="desa-budaya-pampang" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Kategori" required value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Budaya" />
            <Field label="Kota" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Samarinda" />
            <Field
              label="Status" required type="select"
              value={form.status} onChange={(v) => setForm({ ...form, status: v as 'published' | 'draft' })}
              options={[{ value: 'draft', label: 'Draf' }, { value: 'published', label: 'Tayang' }]}
            />
          </div>
          {kategoriAda.length > 0 && (
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">Kategori yang sudah dipakai: {kategoriAda.join(' · ')}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jarak dari Terminal (km)" type="number" value={form.distance_km} onChange={(v) => setForm({ ...form, distance_km: String(v) })} placeholder="23" />
            <Field label="Waktu Tempuh" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} placeholder="±45 menit" />
          </div>
          <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
            Keduanya perkiraan perjalanan darat pada lalu lintas normal — tulis apa adanya,
            jangan dibuat tampak lebih pasti daripada kenyataannya.
          </p>

          <Field label="Keterangan Singkat" required type="textarea" rows={2} value={form.short_desc} onChange={(v) => setForm({ ...form, short_desc: v })} />
          <Field label="Keterangan Lengkap" required type="textarea" rows={5} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Field label="Alamat" required type="textarea" rows={2} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Field label="Tautan Google Maps" value={form.gmaps_url} onChange={(v) => setForm({ ...form, gmaps_url: v })} placeholder="https://maps.app.goo.gl/..." />

          {/* Daya tarik singkat */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
              Daya Tarik <span className="text-[var(--adm-dim)]">({form.highlights.length})</span>
            </label>
            <div className="space-y-2">
              {form.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={h}
                    onChange={(e) => setForm({ ...form, highlights: form.highlights.map((x, n) => (n === i ? e.target.value : x)) })}
                    placeholder="Rumah adat Lamin Pemung Tawai"
                    className="flex-1 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3 py-2 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-cyan-400/50"
                  />
                  <button type="button" onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, n) => n !== i) })} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-muted)] hover:text-rose-300 flex items-center justify-center cursor-pointer" title="Hapus">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setForm({ ...form, highlights: [...form.highlights, ''] })} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-accent)] hover:text-[var(--adm-accent)] cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Tambah daya tarik
            </button>
          </div>

          {/* Foto */}
          <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">
                Foto Sampul {sunting?.has_cover && <span className="text-[var(--adm-dim)]">(sudah ada — unggah untuk mengganti)</span>}
              </label>
              <input
                type="file" accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setSampul(e.target.files?.[0] ?? null)}
                className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">Tambah Foto Galeri (maks 10 sekali unggah)</label>
              <input
                type="file" accept="image/jpeg,image/png,image/webp" multiple
                onChange={(e) => setGaleriBaru(Array.from(e.target.files ?? []))}
                className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
              />
              {galeriBaru.length > 0 && (
                <p className="mt-1.5 text-[11.5px] text-[var(--adm-accent)]">{galeriBaru.length} foto siap diunggah</p>
              )}
            </div>

            {sunting && sunting.gallery_urls.length > 0 && (
              <div>
                <p className="text-[11.5px] font-semibold text-[var(--adm-body)] mb-2">Galeri Saat Ini</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {sunting.gallery_urls.map((url, i) => (
                    <div key={url} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-20 object-cover rounded-lg ring-1 ring-white/10" />
                      <button
                        type="button"
                        onClick={() => hapusFotoGaleri(sunting, (sunting.gallery ?? [])[i] ?? '')}
                        title="Hapus foto ini"
                        className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Destinasi ini akan dihapus permanen berikut foto sampul dan seluruh foto galerinya. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
