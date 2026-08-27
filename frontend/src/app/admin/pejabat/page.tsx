'use client';

/**
 * Manajemen Pejabat Bandara.
 *
 * Memakai `adminUpload` karena modul ini menerima foto resmi kedinasan;
 * `adminFetch` selalu men-JSON-kan badan permintaan sehingga tidak dapat
 * membawa berkas. Pengubahan pun lewat POST `/officials/{id}` — peramban tidak
 * dapat mengirim multipart lewat PUT.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PELINDUNGAN DATA PRIBADI — UU 27/2022
 *
 * Formulir di bawah SENGAJA TIDAK MEMILIKI isian pendidikan, NIP, pangkat/
 * golongan, tanggal lahir, agama, alamat, maupun nomor identitas. Tabelnya pun
 * tidak punya kolomnya. Riwayat pendidikan pernah ada pada data pejabat portal
 * ini dan dicabut secara sadar — jangan menambahkannya kembali tanpa membaca
 * catatan pada migrasi `create_officials_table` lebih dulu.
 *
 * Yang ada di sini semuanya melekat pada JABATAN dan justru wajib diumumkan
 * menurut UU 14/2008.
 * ────────────────────────────────────────────────────────────────────────
 *
 * Pejabat yang belum berfoto dan yang belum tayang tetap ditampilkan di sini
 * dengan penanda, bukan disembunyikan: hanya di halaman inilah petugas dapat
 * mengetahui bahwa ada barisnya yang belum lengkap.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import type { OfficialItem } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  UserRound, Plus, Pencil, Trash2, RefreshCw, ImageOff, Eye, EyeOff, X, ArrowUp, ArrowDown,
} from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  slug: string;
  name: string;
  title: string;
  short_title: string;
  position_history: string[];
  awards: string[];
  sort_order: string;
  is_published: 'ya' | 'tidak';
};

const EMPTY: FormState = {
  slug: '', name: '', title: '', short_title: '',
  position_history: [], awards: [], sort_order: '', is_published: 'ya',
};

export default function AdminPejabatPage() {
  const [items, setItems] = useState<OfficialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [foto, setFoto] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<OfficialItem[]>('/officials');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<OfficialItem[]>('/officials');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((p) => !q || [p.name, p.title, p.short_title, p.slug].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    tayang: items.filter((p) => p.is_published).length,
    tanpaFoto: items.filter((p) => !p.has_photo).length,
    tanpaRiwayat: items.filter((p) => (p.position_history?.length ?? 0) === 0).length,
  }), [items]);

  const sunting = items.find((p) => p.id === editId) ?? null;

  const openCreate = () => {
    setForm({ ...EMPTY, sort_order: String(items.length) });
    setFoto(null); setEditId(null); setOpen(true);
  };

  const openEdit = (p: OfficialItem) => {
    setForm({
      slug: p.slug,
      name: p.name,
      title: p.title,
      short_title: p.short_title,
      position_history: p.position_history ?? [],
      awards: p.awards ?? [],
      sort_order: String(p.sort_order),
      is_published: p.is_published ? 'ya' : 'tidak',
    });
    setFoto(null); setEditId(p.id); setOpen(true);
  };

  const save = async () => {
    setSaving(true);

    const fd = new FormData();
    fd.append('slug', form.slug);
    fd.append('name', form.name);
    fd.append('title', form.title);
    fd.append('short_title', form.short_title);
    fd.append('is_published', form.is_published === 'ya' ? '1' : '0');
    if (form.sort_order !== '') fd.append('sort_order', form.sort_order);

    // Baris kosong dibuang lebih dulu — daftar riwayat yang memuat entri
    // kosong akan tampil sebagai butir tanpa teks di halaman publik.
    form.position_history.map((h) => h.trim()).filter(Boolean).forEach((h) => fd.append('position_history[]', h));
    form.awards.map((a) => a.trim()).filter(Boolean).forEach((a) => fd.append('awards[]', a));

    if (foto) fd.append('photo', foto);

    const res = editId
      ? await adminUpload<OfficialItem>(`/officials/${editId}`, fd)
      : await adminUpload<OfficialItem>('/officials', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Data pejabat diperbarui' : 'Pejabat ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  /**
   * Geser urutan tampil.
   *
   * Yang dikirim hanya kedua baris yang bertukar, bukan seluruh daftar —
   * dua petugas yang menyunting bersamaan tidak saling menimpa urutan.
   */
  const geser = async (p: OfficialItem, arah: -1 | 1) => {
    const urut = [...items].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const i = urut.findIndex((x) => x.id === p.id);
    const tetangga = urut[i + arah];
    if (!tetangga) return;

    const a = await adminFetch(`/officials/${p.id}`, { method: 'PUT', body: { sort_order: tetangga.sort_order } });
    const b = await adminFetch(`/officials/${tetangga.id}`, { method: 'PUT', body: { sort_order: p.sort_order } });

    if (a.ok && b.ok) load();
    else setToast({ text: !a.ok ? a.message : b.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/officials/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Pejabat dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={UserRound}
        title="Pejabat Bandara"
        subtitle="Nama, nomenklatur jabatan, riwayat jabatan, dan penghargaan kedinasan"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Pejabat</Btn>
          </div>
        }
      />

      <InfoNote>
        Halaman ini hanya memuat keterangan yang melekat pada jabatan — nama, nomenklatur,
        foto resmi kedinasan, riwayat jabatan, dan penghargaan. Jangan menambahkan pendidikan,
        NIP, pangkat, tanggal lahir, atau nomor identitas: semuanya data pribadi menurut
        UU 27/2022, dan riwayat pendidikan sudah pernah dicabut dari portal ini secara sadar.
        Urutan baris menentukan urutan tampil di beranda dan halaman profil — Kepala Kantor
        harus berada di urutan pertama.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pejabat" value={stats.total} icon={UserRound} accent="#38bdf8" />
        <StatCard label="Tayang" value={stats.tayang} icon={Eye} accent="#34d399" />
        <StatCard label="Tanpa Foto" value={stats.tanpaFoto} icon={ImageOff} accent="#fbbf24" hint="Tetap tampil di publik" />
        <StatCard label="Tanpa Riwayat Jabatan" value={stats.tanpaRiwayat} icon={X} accent="#fb7185" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Pejabat</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari nama atau jabatan..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada pejabat" hint="Tambahkan pejabat struktural bandara." />
        ) : (
          <Table head={['Urutan', 'Pejabat', 'Jabatan', 'Riwayat', 'Status', 'Aksi']}>
            {visible.map((p, i) => (
              <Row key={p.id}>
                <Cell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-[var(--adm-muted)] w-5">{p.sort_order}</span>
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => geser(p, -1)} disabled={i === 0} className="w-6 h-5 rounded bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer" title="Naikkan">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => geser(p, 1)} disabled={i === visible.length - 1} className="w-6 h-5 rounded bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer" title="Turunkan">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </Cell>

                <Cell className="max-w-[280px]">
                  <div className="flex items-center gap-2.5">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name} className="w-9 h-11 rounded-lg object-contain object-bottom bg-[var(--adm-inset)] flex-shrink-0" />
                    ) : (
                      <span className="w-9 h-11 rounded-lg bg-[var(--adm-inset)] flex items-center justify-center flex-shrink-0">
                        <ImageOff className="w-3.5 h-3.5 text-[var(--adm-dim)]" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--adm-fg)] text-[12.5px]">{p.name}</p>
                      <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5 font-mono">{p.slug}</p>
                    </div>
                  </div>
                </Cell>

                <Cell className="max-w-[260px]">
                  <p className="text-[12px] text-[var(--adm-body)]">{p.short_title}</p>
                  <p className="text-[11px] text-[var(--adm-dim)] mt-0.5">{p.title}</p>
                </Cell>

                <Cell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge text={`${p.position_history?.length ?? 0} jabatan`} color={(p.position_history?.length ?? 0) > 0 ? '#38bdf8' : '#fb7185'} />
                    <Badge text={`${p.awards?.length ?? 0} penghargaan`} color="#a78bfa" />
                  </div>
                </Cell>

                <Cell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge text={p.is_published ? 'Tayang' : 'Disembunyikan'} color={p.is_published ? '#34d399' : '#64748b'} />
                    {!p.has_photo && <Badge text="Tanpa foto" color="#fbbf24" />}
                  </div>
                </Cell>

                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(p.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        title={editId ? 'Ubah Data Pejabat' : 'Tambah Pejabat'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Lengkap & Gelar" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="I Kadek Yuli Sastrawan, S.Ikom., S.SiT." />
            <Field label="Slug" required value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="kadek" />
          </div>
          <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
            Tulis nama beserta gelar persis seperti pada dokumen resmi — jangan dirapikan.
            Slug hanya huruf, angka, dan tanda hubung; dipakai sebagai kunci tetap, jadi
            sebaiknya tidak diubah setelah dipakai.
          </p>

          <Field label="Nomenklatur Jabatan Lengkap" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Kepala Seksi Teknik dan Operasi" />
          <Field label="Jabatan Ringkas" required value={form.short_title} onChange={(v) => setForm({ ...form, short_title: v })} placeholder="Kasi Teknik & Operasi" />
          <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
            Yang ringkas dipakai kartu dan carousel yang sempit; yang lengkap dipakai
            halaman profil dan dialog.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Urutan Tampil" type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: String(v) })} placeholder="0" />
            <Field
              label="Status" required type="select"
              value={form.is_published} onChange={(v) => setForm({ ...form, is_published: v as 'ya' | 'tidak' })}
              options={[{ value: 'ya', label: 'Tayang' }, { value: 'tidak', label: 'Disembunyikan' }]}
            />
          </div>
          <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
            Angka terkecil tampil lebih dulu. Kepala Kantor harus berada di urutan pertama —
            halaman profil menandai entri teratas sebagai kepala kantor.
          </p>

          {/* Riwayat jabatan */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
              Riwayat Jabatan <span className="text-[var(--adm-dim)]">({form.position_history.length})</span>
            </label>
            <div className="space-y-2">
              {form.position_history.map((h, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={h}
                    onChange={(e) => setForm({ ...form, position_history: form.position_history.map((x, n) => (n === i ? e.target.value : x)) })}
                    placeholder="Kepala Seksi Pelayanan Bandara Juwata Tarakan (2018-2025)"
                    className="flex-1 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3 py-2 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-cyan-400/50"
                  />
                  <button type="button" onClick={() => setForm({ ...form, position_history: form.position_history.filter((_, n) => n !== i) })} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-muted)] hover:text-rose-300 flex items-center justify-center cursor-pointer" title="Hapus">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setForm({ ...form, position_history: [...form.position_history, ''] })} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-accent)] hover:text-[var(--adm-accent)] cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Tambah riwayat jabatan
            </button>
          </div>

          {/* Penghargaan */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
              Penghargaan Kedinasan <span className="text-[var(--adm-dim)]">({form.awards.length})</span>
            </label>
            <div className="space-y-2">
              {form.awards.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={a}
                    onChange={(e) => setForm({ ...form, awards: form.awards.map((x, n) => (n === i ? e.target.value : x)) })}
                    placeholder="Satya Lancana Karya Satya 20 Tahun (2018)"
                    className="flex-1 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3 py-2 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-cyan-400/50"
                  />
                  <button type="button" onClick={() => setForm({ ...form, awards: form.awards.filter((_, n) => n !== i) })} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-muted)] hover:text-rose-300 flex items-center justify-center cursor-pointer" title="Hapus">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setForm({ ...form, awards: [...form.awards, ''] })} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--adm-accent)] hover:text-[var(--adm-accent)] cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Tambah penghargaan
            </button>
          </div>

          {/* Foto */}
          <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
            <label className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">
              Foto Resmi {sunting?.has_photo && <span className="text-[var(--adm-dim)]">(sudah ada — unggah untuk mengganti)</span>}
            </label>
            <input
              type="file" accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
            />
            <p className="mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Potret setengah badan berlatar transparan (PNG), rata tepi bawah kanvas —
              kartu di beranda dan halaman profil menyembunyikan tepi bawah foto di balik
              batas kartunya. Maksimal 5 MB.
            </p>

            {sunting?.photo_url && (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sunting.photo_url} alt={sunting.name} className="w-16 h-20 rounded-lg object-contain object-bottom bg-[var(--adm-inset)]" />
                <p className="text-[11.5px] text-[var(--adm-muted)]">Foto yang tayang sekarang.</p>
              </div>
            )}
          </div>

          {!editId && (
            <p className="text-[11.5px] text-[var(--adm-muted)] flex items-start gap-1.5">
              <EyeOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Pejabat tanpa foto tetap tampil di halaman publik — nama dan jabatan wajib
              diumumkan menurut UU 14/2008. Pakai status “Disembunyikan” bila memang belum
              boleh diumumkan.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Data pejabat ini akan dihapus permanen berikut foto yang pernah diunggah. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
