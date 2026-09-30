'use client';

/**
 * Panel "Dokumen Bergambar" pada /admin/profil-ppid — Struktur Organisasi,
 * Maklumat Pelayanan, Standar Biaya Layanan, dan kartu lain yang ditambahkan
 * petugas. Sebelumnya ketiganya konstanta `PPID_DOKUMEN` di `lib/ppidData.ts`,
 * jadi mengganti bagan berarti menimpa berkas di repo dan merilis ulang.
 *
 * Dipisah dari page.tsx karena ia daftar tersendiri dengan endpoint, modal,
 * dan dialog hapusnya sendiri; halaman induknya sudah memikul dua panel lain.
 *
 * Baris yang gambarnya hilang TETAP tampil di sini dengan penanda, meskipun
 * halaman publik menyaringnya — petugas perlu tahu kartu mana yang lenyap.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import { PpidImageDocument } from '@/types';
import {
  Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, InfoNote,
} from '@/components/admin/ui';
import { Galat, IsianTautan, tautanSah } from '@/components/admin/isian';
import { Images, Plus, Pencil, Trash2 } from 'lucide-react';

type FormState = {
  title: string;
  description: string;
  sort_order: string;
  image_link: string;
  is_active: boolean;
};

const EMPTY: FormState = { title: '', description: '', sort_order: '', image_link: '', is_active: true };

/** Tautan berbagi Drive/Docs adalah halaman penampil, bukan berkas gambar. */
export const tautanDrive = (url: string) => /^https?:\/\/(drive|docs)\.google\.com\//i.test(url.trim());

export default function PanelDokumenGambar() {
  const [items, setItems] = useState<PpidImageDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [gambarLama, setGambarLama] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    const res = await adminFetch<PpidImageDocument[]>('/ppid-image-documents');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<PpidImageDocument[]>('/ppid-image-documents');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  // URL objek pratinjau lama dilepas tiap kali berkas berganti, supaya memori
  // tidak menumpuk selama petugas mencoba beberapa gambar.
  const pilihBerkas = (f: File | null) => {
    setPratinjau((lama) => {
      if (lama) URL.revokeObjectURL(lama);
      return f ? URL.createObjectURL(f) : null;
    });
    setBerkas(f);
  };

  const hilang = useMemo(() => items.filter((d) => !d.has_image).length, [items]);

  const isi = (k: keyof FormState, v: unknown) => {
    setForm((s) => ({ ...s, [k]: v }));
    setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
  };

  const bukaForm = (d: PpidImageDocument | null) => {
    setForm(d ? {
      title: d.title,
      description: d.description ?? '',
      sort_order: String(d.sort_order ?? ''),
      // Hanya URL luar yang dipulihkan ke isian; berkas unggahan dan aset
      // statis bawaan bukan teks yang pantas disunting petugas.
      image_link: /^https?:\/\//.test(d.image_path ?? '') ? String(d.image_path) : '',
      is_active: d.is_active,
    } : EMPTY);
    setGambarLama(d?.image_url ?? null);
    setGalat({});
    pilihBerkas(null);
    setEditId(d?.id ?? null);
    setOpen(true);
  };

  const periksa = () => {
    const g: Record<string, string> = {};
    if (!form.title.trim()) g.title = 'Judul dokumen wajib diisi.';

    const tautan = form.image_link.trim();
    if (!berkas && tautan) {
      if (!tautanSah(tautan)) g.image_link = 'Tautan harus diawali http:// atau https://';
      else if (tautanDrive(tautan)) g.image_link = 'Tautan Google Drive bukan alamat gambar. Unduh gambarnya lalu unggah di sini.';
    }
    if (!editId && !berkas && !tautan) g.file = 'Unggah gambar atau isi tautannya.';
    if (editId && !berkas && !tautan && !gambarLama) g.file = 'Gambar lama hilang — unggah penggantinya.';

    setGalat(g);
    return Object.keys(g).length === 0;
  };

  const save = async () => {
    if (!periksa()) {
      setToast({ text: 'Ada isian yang belum lengkap.', kind: 'error' });
      return;
    }

    setSaving(true);

    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('description', form.description.trim());
    if (form.sort_order !== '') fd.append('sort_order', form.sort_order);
    fd.append('is_active', form.is_active ? '1' : '0');

    // Tautan hanya dikirim bila diisi: mengosongkannya bukan cara menghapus
    // gambar — kartu tanpa gambar tidak punya arti. Hapus kartunya saja.
    if (berkas) fd.append('file', berkas);
    else if (form.image_link.trim()) fd.append('image_link', form.image_link.trim());

    const res = editId
      ? await adminUpload(`/ppid-image-documents/${editId}`, fd)
      : await adminUpload('/ppid-image-documents', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Dokumen bergambar diperbarui' : 'Dokumen bergambar ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/ppid-image-documents/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Dokumen bergambar dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const gambarForm = pratinjau ?? (form.image_link.trim() && tautanSah(form.image_link) && !tautanDrive(form.image_link) ? form.image_link.trim() : gambarLama);

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] inline-flex items-center gap-2">
            <Images className="w-4 h-4 text-[var(--adm-accent)]" /> Dokumen Bergambar
            {hilang > 0 && <Badge text={`${hilang} gambar hilang`} color="#fbbf24" />}
          </h2>
          <Btn onClick={() => bukaForm(null)}><Plus className="w-4 h-4" /> Tambah Gambar</Btn>
        </div>

        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState text="Belum ada dokumen bergambar" hint="Tambahkan bagan struktur, maklumat, atau standar biaya agar tampil di bagian Dokumen Publik /ppid." />
        ) : (
          <Table head={['Gambar', 'Dokumen', 'Urutan', 'Status', 'Aksi']}>
            {items.map((d) => (
              <Row key={d.id}>
                <Cell>
                  {d.has_image && d.image_url ? (
                    <a href={d.image_url} target="_blank" rel="noopener noreferrer" title="Buka gambar">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.image_url} alt="" className="w-24 aspect-[4/3] object-cover rounded-lg border border-[var(--adm-line)] bg-white" />
                    </a>
                  ) : (
                    <div className="w-24 aspect-[4/3] rounded-lg border-2 border-dashed border-amber-400/50 flex items-center justify-center text-[10.5px] text-amber-300 text-center px-1">
                      Gambar hilang
                    </div>
                  )}
                </Cell>

                <Cell className="max-w-[380px]">
                  <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{d.title}</p>
                  {d.description && <p className="text-[var(--adm-muted)] text-[11px] mt-0.5 leading-relaxed">{d.description}</p>}
                </Cell>

                <Cell className="tabular-nums">{d.sort_order}</Cell>

                <Cell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge text={d.is_active ? 'Tayang' : 'Disembunyikan'} color={d.is_active ? '#34d399' : '#94a3b8'} />
                    {!d.has_image && <Badge text="Tidak tampil" color="#fbbf24" />}
                  </div>
                </Cell>

                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => bukaForm(d)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
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
        wide
        title={editId ? 'Ubah Dokumen Bergambar' : 'Tambah Dokumen Bergambar'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <Field label="Judul" required value={form.title} onChange={(v) => isi('title', v)} placeholder="mis. Struktur Organisasi PPID" maxLength={255} />
            <Galat pesan={galat.title} />
          </div>

          <Field label="Keterangan" type="textarea" rows={2} value={form.description} onChange={(v) => isi('description', v)} maxLength={1000} />

          <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_200px] gap-4">
            <div className="space-y-3">
              <p className="text-[12px] font-bold text-[var(--adm-body)]">Gambar</p>
              <div>
                <label className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">Unggah Gambar (JPG, PNG, WEBP, maks 10 MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => { pilihBerkas(e.target.files?.[0] ?? null); setGalat((g) => ({ ...g, file: '' })); }}
                  className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
                />
                <Galat pesan={galat.file} />
              </div>

              {!berkas && (
                <IsianTautan
                  label="atau Tautan Gambar Langsung"
                  nilai={form.image_link}
                  onChange={(v) => isi('image_link', v)}
                  placeholder="https://.../gambar.jpg"
                  galat={galat.image_link}
                  hint="Bukan tautan Google Drive — unduh gambarnya lalu unggah."
                />
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-2">Pratinjau</p>
              {gambarForm ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gambarForm} alt="" className="w-full aspect-[4/3] object-contain rounded-lg border border-[var(--adm-line)] bg-white" />
              ) : (
                <div className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-[var(--adm-line)] flex items-center justify-center text-[11px] text-[var(--adm-muted)]">
                  Belum ada gambar
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <Field
              label="Urutan" type="number" min={0} max={9999}
              value={form.sort_order} onChange={(v) => isi('sort_order', String(v))}
              hint={editId ? undefined : 'Kosongkan untuk meletakkannya paling belakang.'}
            />
            <Field label="Tayang di halaman publik" type="checkbox" value={form.is_active} onChange={(v) => isi('is_active', v)} />
          </div>

          <InfoNote>
            Bagan struktur kerap memuat foto dan NIP pegawai. Nama dan jabatan pejabat wajib diumumkan, tetapi
            pastikan data pribadi staf lain sudah disensor sebelum gambar diunggah.
          </InfoNote>
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Dokumen bergambar ini akan dihapus permanen beserta berkasnya. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
