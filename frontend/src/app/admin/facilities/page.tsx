'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import { FACILITY_CATEGORIES } from '@/lib/facilityMeta';
import { Facility } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger, InfoNote,
} from '@/components/admin/ui';
import {
  Building2, Plus, Pencil, Trash2, RefreshCw, CheckCircle2, WrenchIcon,
  ImageOff, UploadCloud,
} from 'lucide-react';
import { motion } from 'framer-motion';

const TIPE_BERKAS = ['image/jpeg', 'image/png', 'image/webp'];
const MAKS_BERKAS = 5 * 1024 * 1024;   // 5 MB, sama dengan batas di backend

const EMPTY: Partial<Facility> = {
  name: '', category: 'Umum', location_description: '', icon: '', description: '',
  image_path: '', is_operational: true,
};

export default function AdminFacilitiesPage() {
  const [items, setItems] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<Partial<Facility>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjauBerkas, setPratinjauBerkas] = useState('');
  const inputBerkas = useRef<HTMLInputElement>(null);

  /* Alamat pratinjau dibuat di `pilihBerkas`; di sini ia hanya dibebaskan saat
     berganti atau saat halaman ditinggalkan, supaya blob tidak menumpuk. */
  useEffect(() => {
    if (!pratinjauBerkas) return;
    return () => URL.revokeObjectURL(pratinjauBerkas);
  }, [pratinjauBerkas]);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<Facility[]>('/facilities');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((f) => !q || [f.name, f.category, f.location_description].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((f) => f.is_operational).length,
    down: items.filter((f) => !f.is_operational).length,
    tanpaFoto: items.filter((f) => !f.image_url).length,
  }), [items]);

  /* Kategori bawaan digabung dengan yang benar-benar ada di data, supaya nilai
     tak terduga peninggalan v1 tidak lenyap dari pilihan saat disunting. */
  const kategoriPilihan = useMemo(
    () => [...new Set([...FACILITY_CATEGORIES, ...items.map((f) => f.category).filter(Boolean)])],
    [items],
  );

  const bersihkanBerkas = () => {
    setBerkas(null);
    setPratinjauBerkas('');
    if (inputBerkas.current) inputBerkas.current.value = '';
  };

  const openCreate = () => { setForm(EMPTY); setEditId(null); bersihkanBerkas(); setOpen(true); };

  /* `{ ...f }` membawa serta `image_path` — termasuk lintasan warisan v1 —
     sehingga form dapat mengirimkannya kembali apa adanya saat disimpan. */
  const openEdit = (f: Facility) => { setForm({ ...f }); setEditId(f.id); bersihkanBerkas(); setOpen(true); };

  const pilihBerkas = (f: File | null | undefined) => {
    if (!f) return;
    if (!TIPE_BERKAS.includes(f.type)) {
      setToast({ text: 'Foto fasilitas harus berformat JPG, PNG, atau WEBP', kind: 'error' });
      return;
    }
    if (f.size > MAKS_BERKAS) {
      setToast({ text: 'Ukuran foto fasilitas maksimal 5 MB', kind: 'error' });
      return;
    }
    setBerkas(f);
    setPratinjauBerkas(URL.createObjectURL(f));
  };

  /* Dikosongkan, bukan dihapus dari objek: backend membedakan "" (kosongkan
     fotonya) dari kunci yang memang tidak dikirim (jangan diapa-apakan). */
  const hapusGambar = () => {
    bersihkanBerkas();
    setForm({ ...form, image_path: '', image_url: null });
  };

  const save = async () => {
    setSaving(true);

    /* Multipart tidak mengenal null: isian opsional dikirim sebagai string
       kosong, dan backend yang menyetarakannya jadi null. Semua kunci selalu
       dikirim — termasuk `image_path` — supaya mengosongkan sebuah isian benar
       benar mengosongkannya, dan supaya lintasan foto warisan v1 pulang utuh
       ketika petugas hanya menyunting hal lain. Boolean dikirim '1'/'0': aturan
       `boolean` Laravel tidak mengenali 'true'/'false'.

       `details` sengaja tidak ikut dikirim. Form ini belum menyuntingnya, dan
       mengirim larik kosong akan menghapus butir keterangan warisan v1. */
    const fd = new FormData();
    fd.append('name', (form.name ?? '').trim());
    fd.append('category', form.category ?? '');
    fd.append('location_description', (form.location_description ?? '').trim());
    fd.append('icon', (form.icon ?? '').trim());
    fd.append('description', (form.description ?? '').trim());
    fd.append('is_operational', form.is_operational ? '1' : '0');
    fd.append('image_path', form.image_path ?? '');
    if (berkas) fd.append('image', berkas);

    const res = editId
      ? await adminUpload<Facility>(`/facilities/${editId}`, fd)
      : await adminUpload<Facility>('/facilities', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Fasilitas diperbarui' : 'Fasilitas ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/facilities/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Fasilitas dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const toggle = async (f: Facility) => {
    const res = await adminFetch(`/facilities/${f.id}`, { method: 'PUT', body: { is_operational: !f.is_operational } });
    setToast({ text: res.ok ? 'Status fasilitas diperbarui' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  /* Pratinjau berkas baru menang atas foto yang terpasang. `image_url` sudah
     bernilai null bila lintasannya tidak ditemukan di cakram mana pun — itu
     ditampilkan sebagai catatan, bukan sebagai <img src=""> yang membuat
     peramban memuat ulang halaman sebagai gambar. */
  const gambar = pratinjauBerkas || form.image_url || '';
  const lintasanYatim = !pratinjauBerkas && !!form.image_path && !form.image_url;

  return (
    <>
      <PageHeader
        icon={Building2}
        title="Manajemen Fasilitas Bandara"
        subtitle="Daftar fasilitas terminal yang ditampilkan pada portal dan peta bandara di aplikasi"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Fasilitas</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Fasilitas" value={stats.total} icon={Building2} accent="#34d399" />
        <StatCard label="Beroperasi" value={stats.active} icon={CheckCircle2} accent="#22d3ee" />
        <StatCard label="Perbaikan" value={stats.down} icon={WrenchIcon} accent="#fbbf24" />
        <StatCard label="Tanpa Foto" value={stats.tanpaFoto} icon={ImageOff} accent="#a78bfa" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Fasilitas</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari fasilitas / lokasi..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada fasilitas" hint="Tambahkan fasilitas terminal agar tampil di portal publik." />
        ) : (
          <Table head={['Fasilitas', 'Kategori', 'Lokasi', 'Status', 'Aksi']}>
            {visible.map((f) => (
              <Row key={f.id}>
                <Cell className="max-w-[300px]">
                  <div className="flex items-start gap-2.5">
                    {f.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.image_url} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      /* Penanda kuning saat kolomnya terisi tapi berkasnya tak
                         ditemukan — petugas perlu tahu mana yang bermasalah,
                         bukan sekadar mana yang belum berfoto. */
                      <span
                        className="w-11 h-11 rounded-lg bg-[var(--adm-hover)] flex items-center justify-center flex-shrink-0"
                        title={f.image_path ? 'Berkas foto tidak ditemukan di penyimpanan' : 'Belum ada foto'}
                      >
                        <ImageOff className={`w-4 h-4 ${f.image_path ? 'text-amber-300' : 'text-[var(--adm-dim)]'}`} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{f.name}</p>
                      {f.description && <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5 line-clamp-1">{f.description}</p>}
                    </div>
                  </div>
                </Cell>
                <Cell><Badge text={f.category} color="#34d399" /></Cell>
                <Cell className="max-w-[230px]"><span className="truncate block">{f.location_description}</span></Cell>
                <Cell>
                  <button onClick={() => toggle(f)} className="cursor-pointer" title="Klik untuk mengubah status">
                    <Badge text={f.is_operational ? 'Beroperasi' : 'Perbaikan'} color={f.is_operational ? '#34d399' : '#fbbf24'} />
                  </button>
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
        title={editId ? 'Ubah Fasilitas' : 'Tambah Fasilitas Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Fasilitas" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Musholla Utama" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kategori" required type="select" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={kategoriPilihan.map((c) => ({ value: c, label: c }))} />
            <Field label="Nama Ikon" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} placeholder="moon-star" />
          </div>

          <Field label="Lokasi" required value={form.location_description} onChange={(v) => setForm({ ...form, location_description: v })} placeholder="Lantai 1, dekat area kedatangan" />
          <Field label="Deskripsi" type="textarea" rows={3} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-3">
            <label className="block text-[11.5px] font-semibold text-[var(--adm-body)]">
              Foto Fasilitas <span className="text-[var(--adm-dim)]">(opsional — JPG/PNG/WEBP, maks 5 MB)</span>
            </label>

            {gambar ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gambar}
                  alt="Pratinjau foto fasilitas"
                  className="w-full aspect-video object-cover rounded-xl border border-[var(--adm-line)]"
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.25')}
                />
                <button
                  type="button"
                  onClick={hapusGambar}
                  title="Hapus foto"
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-slate-900/70 text-white hover:bg-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--adm-line)] flex flex-col items-center justify-center gap-1.5 text-center px-4">
                <UploadCloud className="w-7 h-7 text-[var(--adm-accent)]" />
                <span className="text-[11.5px] text-[var(--adm-muted)]">Belum ada foto — kartu publik memakai ikon kategori.</span>
              </div>
            )}

            {lintasanYatim && (
              <p className="text-[11px] text-amber-300 leading-relaxed">
                Berkas foto lama tidak ditemukan di penyimpanan mana pun
                (<code className="text-[var(--adm-accent)]">{form.image_path}</code>). Unggah penggantinya atau hapus rujukannya.
              </p>
            )}

            <input
              ref={inputBerkas}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => pilihBerkas(e.target.files?.[0])}
              className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
            />
          </div>

          <InfoNote>Nama ikon mengikuti pustaka <span className="text-[var(--adm-accent)] font-semibold">Lucide</span> (contoh: <code className="text-[var(--adm-accent)]">wifi</code>, <code className="text-[var(--adm-accent)]">moon-star</code>, <code className="text-[var(--adm-accent)]">baby</code>). Dikosongkan pun tetap aman.</InfoNote>

          <Field label="Sedang beroperasi" type="checkbox" value={!!form.is_operational} onChange={(v) => setForm({ ...form, is_operational: v })} />
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Fasilitas ini akan dihapus permanen dari portal publik. Lanjutkan?" />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
