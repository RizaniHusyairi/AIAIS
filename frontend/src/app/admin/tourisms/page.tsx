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
  FileText, Navigation, Camera, CheckCircle2, Circle, ExternalLink, Save,
} from 'lucide-react';
import { motion } from 'framer-motion';

const KATEGORI_WISATA = ['Budaya', 'Alam', 'Religi', 'Belanja', 'Rekreasi'] as const;
const MAKS_FOTO_MB = 5;
const MAKS_GALERI_SEKALI_UNGGAH = 10;

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

type FormErrors = Partial<Record<keyof FormState | 'cover' | 'gallery', string>>;

const EMPTY: FormState = {
  name: '', slug: '', category: '', distance_km: '', duration: '', city: '',
  short_desc: '', description: '', highlights: [], address: '', gmaps_url: '',
  status: 'draft',
};

function buatSlug(nilai: string) {
  return nilai
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function urlSah(nilai: string) {
  if (!nilai.trim()) return true;
  try {
    const url = new URL(nilai);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function usePratinjauBerkas(berkas: File | File[] | null) {
  const urls = useMemo(() => {
    const daftar = berkas == null ? [] : Array.isArray(berkas) ? berkas : [berkas];
    return daftar.map((file) => URL.createObjectURL(file));
  }, [berkas]);

  useEffect(() => {
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [urls]);

  return urls;
}

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
  const [slugOtomatis, setSlugOtomatis] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
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

  const stats = useMemo(() => ({
    total: items.length,
    tayang: items.filter((t) => t.status === 'published').length,
    tanpaFoto: items.filter((t) => !t.has_cover).length,
    fotoHilang: items.reduce((n, t) => n + Math.max(0, (t.gallery?.length ?? 0) - t.gallery_urls.length), 0),
  }), [items]);

  const sunting = items.find((t) => t.id === editId) ?? null;
  const pratinjauSampulBaru = usePratinjauBerkas(sampul)[0] ?? null;
  const pratinjauGaleriBaru = usePratinjauBerkas(galeriBaru);

  const pemeriksaan = useMemo(() => [
    { label: 'Identitas dan kategori terisi', siap: !!form.name.trim() && !!form.slug.trim() && !!form.category },
    { label: 'Lokasi dan perkiraan perjalanan terisi', siap: !!form.address.trim() && !!form.city.trim() && !!form.distance_km && !!form.duration.trim() },
    { label: 'Keterangan singkat dan lengkap terisi', siap: !!form.short_desc.trim() && !!form.description.trim() },
    { label: 'Memiliki minimal satu daya tarik', siap: form.highlights.some((h) => h.trim()) },
    { label: 'Memiliki foto sampul', siap: !!sampul || !!sunting?.has_cover },
  ], [form, sampul, sunting?.has_cover]);

  const jumlahSiap = pemeriksaan.filter((item) => item.siap).length;

  const openCreate = () => {
    setForm({ ...EMPTY, category: 'Budaya' });
    setSampul(null); setGaleriBaru([]); setEditId(null); setErrors({});
    setSlugOtomatis(true); setOpen(true);
  };

  const openEdit = (t: TourismItem) => {
    setForm({
      name: t.name,
      slug: t.slug,
      category: KATEGORI_WISATA.find((kategori) => kategori.toLowerCase() === t.category.toLowerCase()) ?? '',
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
    setSampul(null); setGaleriBaru([]); setEditId(t.id); setErrors({});
    setSlugOtomatis(false); setOpen(true);
  };

  const ubahNama = (name: string) => {
    setForm((lama) => ({ ...lama, name, slug: slugOtomatis ? buatSlug(name) : lama.slug }));
    setErrors((lama) => ({ ...lama, name: undefined, slug: undefined }));
  };

  const validasi = (status: FormState['status']) => {
    const berikut: FormErrors = {};
    const wajib = (kunci: keyof FormState, pesan: string) => {
      const nilai = form[kunci];
      if (typeof nilai === 'string' && !nilai.trim()) berikut[kunci] = pesan;
    };

    wajib('name', 'Nama destinasi wajib diisi.');
    wajib('slug', 'Slug wajib diisi.');
    wajib('category', 'Pilih salah satu kategori wisata.');
    wajib('short_desc', 'Keterangan singkat wajib diisi.');
    wajib('description', 'Keterangan lengkap wajib diisi.');
    wajib('address', 'Alamat destinasi wajib diisi.');

    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) berikut.slug = 'Gunakan huruf kecil, angka, dan tanda hubung saja.';
    if (form.category && !KATEGORI_WISATA.includes(form.category as typeof KATEGORI_WISATA[number])) berikut.category = 'Kategori tidak dikenali oleh tampilan publik.';
    if (form.distance_km && (!Number.isFinite(Number(form.distance_km)) || Number(form.distance_km) < 0)) berikut.distance_km = 'Jarak harus berupa angka nol atau lebih.';
    if (!urlSah(form.gmaps_url)) berikut.gmaps_url = 'Masukkan tautan lengkap yang diawali http:// atau https://.';
    if (sampul && sampul.size > MAKS_FOTO_MB * 1024 * 1024) berikut.cover = `Ukuran foto sampul maksimal ${MAKS_FOTO_MB} MB.`;
    if (galeriBaru.length > MAKS_GALERI_SEKALI_UNGGAH) berikut.gallery = `Maksimal ${MAKS_GALERI_SEKALI_UNGGAH} foto sekali unggah.`;
    if (galeriBaru.some((file) => file.size > MAKS_FOTO_MB * 1024 * 1024)) berikut.gallery = `Ukuran setiap foto galeri maksimal ${MAKS_FOTO_MB} MB.`;

    if (status === 'published') {
      if (!form.city.trim()) berikut.city = 'Kota/kawasan perlu diisi sebelum ditayangkan.';
      if (!form.distance_km) berikut.distance_km = 'Jarak perlu diisi sebelum ditayangkan.';
      if (!form.duration.trim()) berikut.duration = 'Waktu tempuh perlu diisi sebelum ditayangkan.';
      if (!form.highlights.some((h) => h.trim())) berikut.highlights = 'Tambahkan minimal satu daya tarik sebelum ditayangkan.';
    }

    setErrors(berikut);
    return Object.keys(berikut).length === 0;
  };

  const save = async (status: FormState['status']) => {
    if (!validasi(status)) {
      setToast({ text: 'Periksa kembali kolom yang ditandai pada form.', kind: 'error' });
      return;
    }

    setSaving(true);

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('slug', form.slug);
    fd.append('category', form.category);
    fd.append('short_desc', form.short_desc);
    fd.append('description', form.description);
    fd.append('address', form.address);
    fd.append('status', status);
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
      setToast({
        text: status === 'published'
          ? (editId ? 'Destinasi diperbarui dan ditayangkan' : 'Destinasi ditambahkan dan ditayangkan')
          : (editId ? 'Perubahan disimpan sebagai draf' : 'Destinasi disimpan sebagai draf'),
        kind: 'success',
      });
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
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn variant="ghost" onClick={() => save('draft')} disabled={saving}>
              <Save className="w-4 h-4" /> Simpan Draf
            </Btn>
            <Btn onClick={() => save('published')} disabled={saving}>
              <Eye className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan & Tayangkan'}
            </Btn>
          </>
        }
      >
        <div className="space-y-5">
          {Object.keys(errors).length > 0 && (
            <div role="alert" className="rounded-xl border border-[var(--adm-danger-line)] bg-[var(--adm-danger-soft)] px-4 py-3">
              <p className="text-[12.5px] font-bold text-[var(--adm-danger)]">Form belum dapat disimpan</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-body)]">Periksa kolom yang ditandai merah di bawah.</p>
            </div>
          )}

          <BagianForm icon={FileText} title="1. Identitas Destinasi" description="Nama, kategori, dan identitas sistem yang digunakan untuk mengenali destinasi.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama Destinasi" required value={form.name} onChange={ubahNama} placeholder="Desa Budaya Pampang" maxLength={255} error={errors.name} />
              <Field
                label="Kategori" required type="select" value={form.category}
                onChange={(v) => { setForm({ ...form, category: v }); setErrors({ ...errors, category: undefined }); }}
                options={[{ value: '', label: 'Pilih kategori' }, ...KATEGORI_WISATA.map((kategori) => ({ value: kategori, label: kategori }))]}
                hint="Kategori menentukan warna, ikon, dan penyaringan di halaman publik."
                error={errors.category}
              />
            </div>
            <Field
              label="Slug" required value={form.slug}
              onChange={(v) => { setSlugOtomatis(false); setForm({ ...form, slug: buatSlug(v) }); setErrors({ ...errors, slug: undefined }); }}
              placeholder="desa-budaya-pampang" maxLength={125}
              hint={slugOtomatis ? 'Dibuat otomatis dari nama. Anda tetap dapat mengubahnya.' : `Identitas sistem: ${form.slug || 'belum diisi'}`}
              error={errors.slug}
            />
          </BagianForm>

          <BagianForm icon={Navigation} title="2. Lokasi & Perjalanan" description="Informasi praktis untuk memperkirakan perjalanan darat dari terminal bandara.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Kota / Kawasan" value={form.city} onChange={(v) => { setForm({ ...form, city: v }); setErrors({ ...errors, city: undefined }); }} placeholder="Samarinda Utara" maxLength={100} error={errors.city} />
              <Field label="Jarak dari Terminal" type="number" value={form.distance_km} onChange={(v) => { setForm({ ...form, distance_km: String(v) }); setErrors({ ...errors, distance_km: undefined }); }} placeholder="23" min={0} max={9999} step={0.1} hint="Dalam kilometer." error={errors.distance_km} />
              <Field label="Waktu Tempuh" value={form.duration} onChange={(v) => { setForm({ ...form, duration: v }); setErrors({ ...errors, duration: undefined }); }} placeholder="±45 menit" maxLength={50} error={errors.duration} />
            </div>
            <Field label="Alamat Lengkap" required type="textarea" rows={2} value={form.address} onChange={(v) => { setForm({ ...form, address: v }); setErrors({ ...errors, address: undefined }); }} placeholder="Nama jalan, kelurahan, kecamatan, kota/kabupaten" maxLength={1000} error={errors.address} />
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <Field label="Tautan Google Maps" value={form.gmaps_url} onChange={(v) => { setForm({ ...form, gmaps_url: v }); setErrors({ ...errors, gmaps_url: undefined }); }} placeholder="https://maps.app.goo.gl/..." maxLength={1000} hint="Salin tautan lokasi atau pin destinasi dari Google Maps." error={errors.gmaps_url} />
              {form.gmaps_url && urlSah(form.gmaps_url) && (
                <a href={form.gmaps_url} target="_blank" rel="noopener noreferrer" className="mb-0.5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--adm-line)] bg-[var(--adm-hover)] px-4 text-[12px] font-bold text-[var(--adm-body)] hover:text-[var(--adm-accent)]">
                  <ExternalLink className="w-3.5 h-3.5" /> Uji Tautan
                </a>
              )}
            </div>
            <p className="text-[11.5px] leading-relaxed text-[var(--adm-dim)]">Jarak dan waktu tempuh adalah perkiraan pada lalu lintas normal, bukan angka yang dijamin.</p>
          </BagianForm>

          <BagianForm icon={FileText} title="3. Informasi untuk Pengunjung" description="Tuliskan manfaat dan pengalaman yang benar-benar tersedia di destinasi.">
            <Field label="Keterangan Singkat" required type="textarea" rows={2} value={form.short_desc} onChange={(v) => { setForm({ ...form, short_desc: v }); setErrors({ ...errors, short_desc: undefined }); }} placeholder="Ringkasan 1–2 kalimat yang tampil pada kartu destinasi." maxLength={1000} hint="Gunakan kalimat langsung dan mudah dipindai." error={errors.short_desc} />
            <Field label="Keterangan Lengkap" required type="textarea" rows={5} value={form.description} onChange={(v) => { setForm({ ...form, description: v }); setErrors({ ...errors, description: undefined }); }} placeholder="Jelaskan suasana, aktivitas, waktu kunjungan, dan hal penting bagi wisatawan." maxLength={20000} hint="Hindari klaim yang belum dapat dipastikan atau informasi promosi berlebihan." error={errors.description} />

            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <label className="text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider">Daya Tarik</label>
                <span className="text-[11px] text-[var(--adm-dim)]">{form.highlights.filter((h) => h.trim()).length}/12 butir</span>
              </div>
              <p className="mb-2 text-[11px] leading-relaxed text-[var(--adm-dim)]">Satu daya tarik per baris, misalnya “Pertunjukan tari setiap Minggu”.</p>
              <div className="space-y-2">
                {form.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={h} maxLength={200}
                      onChange={(e) => { setForm({ ...form, highlights: form.highlights.map((x, n) => (n === i ? e.target.value : x)) }); setErrors({ ...errors, highlights: undefined }); }}
                      placeholder={`Daya tarik ${i + 1}`}
                      className={`flex-1 bg-[var(--adm-inset)] border rounded-xl px-3 py-2 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none ${errors.highlights ? 'border-[var(--adm-danger)]' : 'border-[var(--adm-line)] focus:border-[var(--adm-accent-line)]'}`}
                    />
                    <span className="w-12 text-right text-[10.5px] tabular-nums text-[var(--adm-dim)]">{h.length}/200</span>
                    <button type="button" onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, n) => n !== i) })} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-muted)] hover:text-rose-300 flex items-center justify-center cursor-pointer" title="Hapus daya tarik">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.highlights && <p className="mt-1.5 text-[11px] text-[var(--adm-danger)]">{errors.highlights}</p>}
              <button type="button" disabled={form.highlights.length >= 12} onClick={() => setForm({ ...form, highlights: [...form.highlights, ''] })} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-accent)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> Tambah daya tarik
              </button>
            </div>
          </BagianForm>

          <BagianForm icon={Camera} title="4. Foto Destinasi" description="Gunakan foto asli yang tajam dan tidak memuat materi berhak cipta tanpa izin.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">Foto Sampul</label>
                <div className="aspect-video overflow-hidden rounded-xl border border-[var(--adm-line)] bg-[var(--adm-inset)]">
                  {(pratinjauSampulBaru || sunting?.cover_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pratinjauSampulBaru || sunting?.cover_url || ''} alt="Pratinjau foto sampul" className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--adm-dim)]"><ImageOff className="w-6 h-6" /><span className="text-[11.5px]">Belum ada foto sampul</span></div>
                  )}
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setSampul(e.target.files?.[0] ?? null); setErrors({ ...errors, cover: undefined }); }} className="mt-2 block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] cursor-pointer" />
                <p className={`mt-1.5 text-[11px] ${errors.cover ? 'text-[var(--adm-danger)]' : 'text-[var(--adm-dim)]'}`}>{errors.cover || 'JPG, PNG, atau WebP · maksimal 5 MB · rasio mendatar disarankan.'}</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">Tambah Foto Galeri</label>
                <div className="grid grid-cols-3 gap-2 min-h-24 rounded-xl border border-dashed border-[var(--adm-line)] bg-[var(--adm-inset)] p-2">
                  {pratinjauGaleriBaru.length === 0 ? (
                    <div className="col-span-3 flex items-center justify-center text-[11.5px] text-[var(--adm-dim)]">Belum ada foto baru dipilih</div>
                  ) : pratinjauGaleriBaru.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt={`Pratinjau galeri baru ${i + 1}`} className="h-20 w-full rounded-lg object-cover" />
                  ))}
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { setGaleriBaru(Array.from(e.target.files ?? [])); setErrors({ ...errors, gallery: undefined }); }} className="mt-2 block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] cursor-pointer" />
                <p className={`mt-1.5 text-[11px] ${errors.gallery ? 'text-[var(--adm-danger)]' : 'text-[var(--adm-dim)]'}`}>{errors.gallery || `${galeriBaru.length} foto baru dipilih · maksimal 10 foto, masing-masing 5 MB.`}</p>
              </div>
            </div>

            {sunting && sunting.gallery_urls.length > 0 && (
              <div>
                <p className="text-[11.5px] font-semibold text-[var(--adm-body)] mb-2">Galeri Saat Ini ({sunting.gallery_urls.length})</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {sunting.gallery_urls.map((url, i) => (
                    <div key={url} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-20 object-cover rounded-lg ring-1 ring-white/10" />
                      <button type="button" onClick={() => hapusFotoGaleri(sunting, (sunting.gallery ?? [])[i] ?? '')} title="Hapus foto ini" className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </BagianForm>

          <BagianForm icon={CheckCircle2} title="5. Pemeriksaan & Publikasi" description="Pastikan informasi siap dibaca pengunjung sebelum menayangkannya.">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--adm-inset)] p-3.5">
              <div>
                <p className="text-[12.5px] font-bold text-[var(--adm-fg)]">Kelengkapan {jumlahSiap}/{pemeriksaan.length}</p>
                <p className="mt-0.5 text-[11px] text-[var(--adm-dim)]">Foto sampul disarankan, tetapi destinasi tetap dapat disimpan sebagai draf tanpa foto.</p>
              </div>
              <span className="text-[22px] font-black tabular-nums text-[var(--adm-accent)]">{Math.round((jumlahSiap / pemeriksaan.length) * 100)}%</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pemeriksaan.map((item) => (
                <div key={item.label} className="flex items-start gap-2 text-[11.5px] text-[var(--adm-body)]">
                  {item.siap ? <CheckCircle2 className="mt-0.5 w-4 h-4 flex-shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 w-4 h-4 flex-shrink-0 text-[var(--adm-dim)]" />}
                  {item.label}
                </div>
              ))}
            </div>
            <p className="text-[11.5px] leading-relaxed text-[var(--adm-dim)]"><strong className="text-[var(--adm-body)]">Simpan Draf</strong> menyimpan pekerjaan tanpa menampilkannya kepada pengunjung. <strong className="text-[var(--adm-body)]">Simpan & Tayangkan</strong> memeriksa data penting lalu langsung memublikasikannya.</p>
          </BagianForm>
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

function BagianForm({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--adm-line)] bg-[var(--adm-hover)]/40 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--adm-accent-line)] bg-[var(--adm-accent-soft)] text-[var(--adm-accent)]">
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <h4 className="text-[13px] font-bold text-[var(--adm-fg)]">{title}</h4>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--adm-dim)]">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
