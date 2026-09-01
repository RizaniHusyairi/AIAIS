'use client';

/**
 * Manajemen Slide Informasi — papan pengumuman bergambar pada beranda.
 *
 * Memakai `adminUpload`, bukan `adminFetch`: isi sebuah slide HANYA gambarnya.
 * Karena Laravel tidak mengurai multipart pada PUT, pembaruan pun dikirim
 * sebagai POST ke `/info-slides/{id}` — rutenya memang didaftarkan berpasangan
 * untuk itu.
 *
 * Slide yang gambarnya tidak dapat dibuka TETAP ditampilkan di sini dengan
 * penanda kuning, meskipun halaman beranda menyaringnya. Petugas perlu tahu
 * mana yang perlu diunggah ulang; menyembunyikannya justru membuat slide itu
 * hilang tanpa jejak dari kedua sisi.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import { fetchSettings, invalidateSettings } from '@/lib/settings';
import { InfoSlide } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, StatCard, InfoNote, stagger, Field,
} from '@/components/admin/ui';
import { Galat, IsianTautan, tautanSah } from '@/components/admin/isian';
import {
  ImageIcon, Plus, Pencil, Trash2, RefreshCw, Eye, EyeOff, ImageOff, UploadCloud,
  Link as LinkIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';

const TIPE_BERKAS = ['image/jpeg', 'image/png', 'image/webp'];
const MAKS_BERKAS = 5 * 1024 * 1024;   // 5 MB, sama dengan batas di backend

export default function AdminInfoSlidesPage() {
  const [items, setItems] = useState<InfoSlide[]>([]);
  const [loading, setLoading] = useState(true);

  const [link, setLink] = useState('');
  const [lebar, setLebar] = useState('1400');
  const [tinggi, setTinggi] = useState('525');
  const [ukuranTersimpan, setUkuranTersimpan] = useState({ lebar: '1400', tinggi: '525' });
  const [menyimpanUkuran, setMenyimpanUkuran] = useState(false);
  const [tampil, setTampil] = useState(true);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState('');
  const inputBerkas = useRef<HTMLInputElement>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [gambarKini, setGambarKini] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  /* Alamat pratinjau dibuat di `pilihBerkas`; di sini ia hanya dibebaskan saat
     berganti atau saat halaman ditinggalkan, supaya blob tidak menumpuk. */
  useEffect(() => {
    if (!pratinjau) return;
    return () => URL.revokeObjectURL(pratinjau);
  }, [pratinjau]);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<InfoSlide[]>('/info-slides');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  // Pemuatan pertama tidak lewat load(): `setLoading(true)` di dalamnya
  // berjalan serentak dengan badan efek dan memicu render berantai.
  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<InfoSlide[]>('/info-slides');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  useEffect(() => {
    fetchSettings(true).then((settings) => {
      const berikutnya = {
        lebar: settings.info_slide_width || '1400',
        tinggi: settings.info_slide_height || '525',
      };
      setLebar(berikutnya.lebar);
      setTinggi(berikutnya.tinggi);
      setUkuranTersimpan(berikutnya);
    });
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    tampil: items.filter((s) => s.is_visible).length,
    disembunyikan: items.filter((s) => !s.is_visible).length,
    hilang: items.filter((s) => !s.has_image).length,
  }), [items]);

  const bersihkanBerkas = () => {
    setBerkas(null);
    setPratinjau('');
    if (inputBerkas.current) inputBerkas.current.value = '';
  };

  const bukaForm = (s?: InfoSlide) => {
    setLink(s?.link_url ?? '');
    setTampil(s ? s.is_visible : true);
    setGambarKini(s?.image_url ?? null);
    setEditId(s ? s.id : null);
    setGalat({});
    bersihkanBerkas();
    setOpen(true);
  };

  const pilihBerkas = (f: File | null | undefined) => {
    if (!f) return;

    if (!TIPE_BERKAS.includes(f.type)) {
      setToast({ text: 'Slide harus berformat JPG, PNG, atau WEBP', kind: 'error' });
      return;
    }
    if (f.size > MAKS_BERKAS) {
      setToast({ text: 'Ukuran gambar slide maksimal 5 MB', kind: 'error' });
      return;
    }

    setBerkas(f);
    setPratinjau(URL.createObjectURL(f));
    setGalat((g) => ({ ...g, image: '' }));
  };

  const periksa = () => {
    const g: Record<string, string> = {};

    // Slide baru wajib bergambar — tanpa gambar ia tidak punya isi sama sekali.
    if (!editId && !berkas) g.image = 'Gambar slide wajib diunggah.';

    const t = link.trim();
    if (t && !tautanSah(t)) g.link_url = 'Tautan harus diawali http:// atau https://';


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
    fd.append('link_url', link.trim());
    fd.append('is_visible', tampil ? '1' : '0');
    if (berkas) fd.append('image', berkas);

    const res = editId
      ? await adminUpload<InfoSlide>(`/info-slides/${editId}`, fd)
      : await adminUpload<InfoSlide>('/info-slides', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Slide diperbarui' : 'Slide ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/info-slides/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Slide dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const toggle = async (s: InfoSlide) => {
    const res = await adminFetch(`/info-slides/${s.id}`, { method: 'PUT', body: { is_visible: !s.is_visible } });
    setToast({ text: res.ok ? 'Status slide diperbarui' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const simpanUkuran = async () => {
    const nilaiLebar = Number(lebar);
    const nilaiTinggi = Number(tinggi);

    if (!Number.isInteger(nilaiLebar) || nilaiLebar < 320 || nilaiLebar > 1400) {
      setToast({ text: 'Lebar harus berupa angka bulat antara 320–1.400 px.', kind: 'error' });
      return;
    }
    if (!Number.isInteger(nilaiTinggi) || nilaiTinggi < 160 || nilaiTinggi > 900) {
      setToast({ text: 'Tinggi harus berupa angka bulat antara 160–900 px.', kind: 'error' });
      return;
    }

    setMenyimpanUkuran(true);
    const res = await adminFetch<Record<string, string>>('/settings', {
      method: 'POST',
      body: { info_slide_width: lebar, info_slide_height: tinggi },
    });
    setMenyimpanUkuran(false);

    if (res.ok) {
      setUkuranTersimpan({ lebar, tinggi });
      invalidateSettings();
      setToast({ text: 'Ukuran seluruh slide berhasil diperbarui', kind: 'success' });
    } else {
      setToast({ text: res.message, kind: 'error' });
    }
  };

  const gambarForm = pratinjau || gambarKini || '';

  return (
    <>
      <PageHeader
        icon={ImageIcon}
        title="Slide Informasi"
        subtitle="Papan pengumuman bergambar yang tampil pada beranda portal"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={() => bukaForm()}><Plus className="w-4 h-4" /> Tambah Slide</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Slide" value={stats.total} icon={ImageIcon} accent="#38bdf8" />
        <StatCard label="Tampil di Beranda" value={stats.tampil} icon={Eye} accent="#34d399" />
        <StatCard label="Disembunyikan" value={stats.disembunyikan} icon={EyeOff} accent="#94a3b8" />
        <StatCard label="Gambar Hilang" value={stats.hilang} icon={ImageOff} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--adm-line)] px-5 py-3.5">
          <div>
            <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Ukuran Seluruh Slide</h2>
            <p className="mt-0.5 text-[11.5px] text-[var(--adm-muted)]">Pengaturan ini berlaku seragam untuk semua gambar pada carousel beranda.</p>
          </div>
          <Btn
            onClick={simpanUkuran}
            disabled={menyimpanUkuran || (lebar === ukuranTersimpan.lebar && tinggi === ukuranTersimpan.tinggi)}
          >
            {menyimpanUkuran ? 'Menyimpan...' : 'Simpan Ukuran'}
          </Btn>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Field
              label="Lebar Semua Slide (px)"
              type="number"
              value={lebar}
              onChange={(v) => setLebar(String(v))}
              min={320}
              max={1400}
              step={1}
              required
              hint="Maksimal 1.400 px; otomatis mengecil di layar sempit."
            />
            <Field
              label="Tinggi Semua Slide (px)"
              type="number"
              value={tinggi}
              onChange={(v) => setTinggi(String(v))}
              min={160}
              max={900}
              step={1}
              required
              hint="Berlaku sebagai tinggi dan rasio seluruh gambar."
            />
          </div>

          <div className="flex min-h-48 items-center justify-center rounded-xl bg-[var(--adm-hover)] p-4 ring-1 ring-[var(--adm-line)]">
            <div
              className="relative w-full max-w-full overflow-hidden rounded-xl bg-gradient-to-br from-cyan-950 to-blue-950 ring-1 ring-cyan-400/20"
              style={{
                maxWidth: `${Math.max(Number(lebar) || 1400, 1)}px`,
                aspectRatio: `${Math.max(Number(lebar) || 1400, 1)} / ${Math.max(Number(tinggi) || 525, 1)}`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <ImageIcon className="mx-auto h-7 w-7 text-cyan-300" />
                  <p className="mt-2 text-xs font-bold text-white">Pratinjau kanvas seluruh slide</p>
                  <p className="mt-1 font-mono text-[10.5px] text-cyan-200">{lebar || 0} × {tinggi || 0} px</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Slide</h2>
          <span className="text-[11.5px] text-[var(--adm-muted)]">Slide terbaru tampil lebih dulu di beranda</span>
        </div>

        <div className="p-5">
          <InfoNote>
            Satu slide adalah <span className="text-[var(--adm-accent)] font-semibold">selembar gambar</span> — tidak ada judul
            maupun teks di atasnya, persis seperti papan pengumuman portal lama. Lebar dan tinggi tampilannya dapat
            diatur untuk menyesuaikan komposisi gambar. Tautan bersifat opsional: bila diisi, slide dapat diklik.
          </InfoNote>

          {loading ? (
            <Loading />
          ) : items.length === 0 ? (
            <EmptyState text="Belum ada slide" hint="Tambahkan slide agar papan pengumuman muncul di beranda." />
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((s) => (
                <motion.div
                  key={s.id}
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                  className="rounded-xl overflow-hidden bg-[var(--adm-inset)] ring-1 ring-[var(--adm-line)]"
                >
                  <div className="relative bg-[var(--adm-hover)]" style={{ aspectRatio: `${Number(lebar) || 1400} / ${Number(tinggi) || 525}` }}>
                    {s.has_image && s.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      /* Penanda kuning, bukan disembunyikan: beranda memang
                         menyaringnya, jadi di sinilah satu-satunya tempat
                         petugas dapat mengetahuinya. */
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-center px-4">
                        <ImageOff className="w-7 h-7 text-amber-300" />
                        <span className="text-[11px] text-amber-300">Berkas gambar tidak ditemukan</span>
                        <code className="text-[10px] text-[var(--adm-dim)] break-all">{s.image_path}</code>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <button onClick={() => toggle(s)} className="cursor-pointer" title="Klik untuk mengubah status">
                        <Badge text={s.is_visible ? 'Tampil' : 'Disembunyikan'} color={s.is_visible ? '#34d399' : '#94a3b8'} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      {s.link_url ? (
                        <a
                          href={s.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate text-[11.5px] font-semibold text-[var(--adm-accent)]"
                        >
                          <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{s.link_url}</span>
                        </a>
                      ) : (
                        <span className="mt-0.5 block text-[11.5px] text-[var(--adm-dim)]">Tanpa tautan</span>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => bukaForm(s)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(s.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Slide' : 'Tambah Slide'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-3">
            <label className="block text-[11.5px] font-semibold text-[var(--adm-body)]">
              Gambar Slide <span className="text-[var(--adm-dim)]">(JPG/PNG/WEBP, maks 5 MB)</span>
            </label>

            {gambarForm ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gambarForm}
                alt="Pratinjau slide"
                className="w-full object-cover rounded-xl border border-[var(--adm-line)]"
                style={{ aspectRatio: `${Math.max(Number(lebar) || 1400, 1)} / ${Math.max(Number(tinggi) || 525, 1)}` }}
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.25')}
              />
            ) : (
              <div
                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--adm-line)] px-4 text-center"
                style={{ aspectRatio: `${Math.max(Number(lebar) || 1400, 1)} / ${Math.max(Number(tinggi) || 525, 1)}` }}
              >
                <UploadCloud className="w-7 h-7 text-[var(--adm-accent)]" />
                <span className="text-[11.5px] text-[var(--adm-muted)]">Belum ada gambar dipilih.</span>
              </div>
            )}

            <input
              ref={inputBerkas}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => pilihBerkas(e.target.files?.[0])}
              className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
            />

            {editId && !berkas && (
              <p className="text-[11px] text-[var(--adm-dim)]">Biarkan kosong bila gambarnya tidak diganti.</p>
            )}

            <Galat pesan={galat.image} />
          </div>

          <IsianTautan
            label="Tautan Slide (opsional)"
            nilai={link}
            onChange={(v) => { setLink(v); setGalat((g) => (g.link_url ? { ...g, link_url: '' } : g)); }}
            placeholder="https://..."
            hint="Dikosongkan berarti slide hanya tampil sebagai gambar, tidak dapat diklik."
            galat={galat.link_url}
          />

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={tampil}
              onClick={() => setTampil((v) => !v)}
              className={`w-11 h-6 rounded-full p-0.5 flex-shrink-0 transition-colors ${tampil ? 'bg-gradient-to-r from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] shadow-md' : 'bg-[var(--adm-line)]'}`}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 620, damping: 32 }}
                className="block w-5 h-5 rounded-full bg-white shadow"
                style={{ marginLeft: tampil ? 20 : 0 }}
              />
            </button>
            <span className="text-[12.5px] text-[var(--adm-body)] font-medium">Tampilkan di beranda</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Slide ini akan dihapus permanen beserta gambarnya. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
