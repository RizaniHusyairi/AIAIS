'use client';

/**
 * Manajemen Profil PPID — SK Tim PPID, Laporan Bulanan, dan Video Profil.
 *
 * Ketiganya tampil pada satu halaman publik (`/ppid`), jadi ketiganya dikelola
 * dari satu layar. Sebelum modul ini ada, SK PPID adalah sebuah konstanta di
 * `lib/ppidData.ts`: menggantinya berarti menyunting kode dan merilis ulang
 * portal, padahal SK diperbarui setiap kali susunan tim berubah.
 *
 * Dokumen dikirim lewat `adminUpload`, bukan `adminFetch`: berkasnya boleh
 * diunggah sebagai PDF. Karena Laravel tidak mengurai multipart pada PUT,
 * pembaruan pun dikirim sebagai POST ke `/ppid-profile-documents/{id}` —
 * rutenya memang didaftarkan berpasangan untuk itu.
 *
 * Video Profil bukan tabel melainkan dua kunci pada `settings`, sama seperti
 * video profil beranda. Panelnya punya tombol simpan sendiri karena ia menulis
 * ke endpoint yang berbeda dari daftar dokumen di bawahnya.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import { API_BASE_URL } from '@/lib/api';
import { invalidateSettings, PPID_VIDEO_KEYS } from '@/lib/settings';
import { idYouTube } from '@/lib/tentang';
import { PpidProfileDocument } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import { Galat, IsianTautan, tautanSah } from '@/components/admin/isian';
import {
  ShieldCheck, Plus, Pencil, Trash2, RefreshCw, FileCheck2, FileClock, CalendarRange,
  PlayCircle, Scale, Link as LinkIcon, Star,
} from 'lucide-react';
import { motion } from 'framer-motion';

/** Harus sama persis dengan PpidProfileDocument::TYPES di backend. */
const TYPES = ['SK PPID', 'Laporan Bulanan'] as const;
type Jenis = (typeof TYPES)[number];

const JENIS_META: Record<Jenis, { label: string; color: string; icon: React.ElementType }> = {
  'SK PPID': { label: 'SK PPID', color: '#38bdf8', icon: Scale },
  'Laporan Bulanan': { label: 'Laporan Bulanan', color: '#a78bfa', icon: CalendarRange },
};

type FormState = {
  type: Jenis;
  title: string;
  document_number: string;
  description: string;
  published_date: string;
  document_link: string;
  is_current: boolean;
  is_active: boolean;
};

const EMPTY: FormState = {
  type: 'SK PPID', title: '', document_number: '', description: '',
  published_date: '', document_link: '', is_current: false, is_active: true,
};

export default function AdminProfilPpidPage() {
  /* ---------------- Video Profil (settings) ---------------- */
  const [video, setVideo] = useState<Record<string, string>>({ ppid_video_url: '', ppid_video_gambar: '' });
  const [videoAwal, setVideoAwal] = useState<Record<string, string>>({ ppid_video_url: '', ppid_video_gambar: '' });
  const [simpanVideo, setSimpanVideo] = useState(false);

  /* ---------------- Dokumen ---------------- */
  const [items, setItems] = useState<PpidProfileDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [berkas, setBerkas] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<PpidProfileDocument[]>('/ppid-profile-documents');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  // Pemuatan pertama tidak lewat load(): `setLoading(true)` di dalamnya
  // berjalan serentak dengan badan efek dan memicu render berantai.
  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<PpidProfileDocument[]>('/ppid-profile-documents');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    // Setelan dibaca dari endpoint publik GET /settings, seperti /admin/appearance.
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/settings`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        const j = await r.json();
        if (batal || !j?.data) return;

        const isi: Record<string, string> = {};
        PPID_VIDEO_KEYS.forEach((k) => { isi[k] = j.data[k] ?? ''; });
        setVideo(isi);
        setVideoAwal(isi);
      } catch {
        // Setelan gagal dibaca bukan alasan menahan seluruh halaman.
      }
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((d) => !q || [d.title, d.type, d.document_number].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    sk: items.filter((d) => d.type === 'SK PPID').length,
    laporan: items.filter((d) => d.type === 'Laporan Bulanan').length,
    tanpaDokumen: items.filter((d) => !d.has_document).length,
    nonaktif: items.filter((d) => !d.is_active).length,
  }), [items]);

  const videoKotor = PPID_VIDEO_KEYS.some((k) => (video[k] ?? '') !== (videoAwal[k] ?? ''));
  const kodeVideo = idYouTube(video.ppid_video_url ?? '');

  const simpanSetelanVideo = async () => {
    const url = (video.ppid_video_url ?? '').trim();

    // Katakan sekarang, bukan setelah halaman publik menampilkan pemutar mati.
    if (url && !idYouTube(url)) {
      setToast({ text: 'Tautan video harus berupa alamat YouTube yang sah.', kind: 'error' });
      return;
    }

    setSimpanVideo(true);
    const res = await adminFetch<Record<string, string>>('/settings', { method: 'POST', body: video });
    setSimpanVideo(false);

    if (res.ok) {
      setVideoAwal(video);
      invalidateSettings();
      setToast({ text: 'Video profil PPID disimpan', kind: 'success' });
    } else setToast({ text: res.message, kind: 'error' });
  };

  const isi = (k: keyof FormState, v: unknown) => {
    setForm((s) => ({ ...s, [k]: v }));
    setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
  };

  const openCreate = () => {
    setForm(EMPTY);
    setGalat({});
    setBerkas(null);
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (d: PpidProfileDocument) => {
    setForm({
      type: d.type,
      title: d.title,
      document_number: d.document_number ?? '',
      description: d.description ?? '',
      published_date: d.published_date ? String(d.published_date).slice(0, 10) : '',
      // Hanya tautan luar yang dipulihkan ke isian; berkas unggahan punya
      // lintasannya sendiri dan tidak boleh tampil sebagai teks yang dapat
      // disunting.
      document_link: /^https?:\/\//.test(String(d.document_url ?? '')) && !d.document_url?.includes('/storage/')
        ? String(d.document_url)
        : '',
      is_current: d.is_current,
      is_active: d.is_active,
    });
    setGalat({});
    setBerkas(null);
    setEditId(d.id);
    setOpen(true);
  };

  const periksa = () => {
    const g: Record<string, string> = {};
    if (!form.title.trim()) g.title = 'Judul dokumen wajib diisi.';
    if (!form.published_date) g.published_date = 'Tanggal dokumen wajib diisi.';

    const tautan = form.document_link.trim();
    if (!berkas && tautan && !tautanSah(tautan)) {
      g.document_link = 'Tautan harus diawali http:// atau https://';
    }

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
    fd.append('type', form.type);
    fd.append('title', form.title.trim());
    fd.append('document_number', form.document_number.trim());
    fd.append('description', form.description.trim());
    fd.append('published_date', form.published_date);
    fd.append('is_current', form.type === 'SK PPID' && form.is_current ? '1' : '0');
    fd.append('is_active', form.is_active ? '1' : '0');

    if (berkas) {
      fd.append('file', berkas);
    } else {
      // Dikirim meski kosong: string kosong adalah cara menarik kembali
      // dokumen yang sebelumnya tertaut.
      fd.append('document_link', form.document_link.trim());
    }

    const res = editId
      ? await adminUpload(`/ppid-profile-documents/${editId}`, fd)
      : await adminUpload('/ppid-profile-documents', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Dokumen diperbarui' : 'Dokumen ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/ppid-profile-documents/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Dokumen dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title="Profil PPID"
        subtitle="SK Tim PPID, Laporan Bulanan, dan Video Profil yang tampil di halaman /ppid"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Dokumen</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="SK PPID" value={stats.sk} icon={Scale} accent="#38bdf8" />
        <StatCard label="Laporan Bulanan" value={stats.laporan} icon={CalendarRange} accent="#a78bfa" />
        <StatCard label="Belum Ada Dokumen" value={stats.tanpaDokumen} icon={FileClock} accent="#fbbf24" />
        <StatCard label="Tidak Tayang" value={stats.nonaktif} icon={FileCheck2} accent="#94a3b8" />
      </motion.div>

      {/* ============ VIDEO PROFIL PPID ============ */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] inline-flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-[var(--adm-accent)]" /> Video Profil PPID
          </h2>
          <div className="flex items-center gap-2">
            {videoKotor && <Badge text="Belum disimpan" color="#fbbf24" />}
            <Btn onClick={simpanSetelanVideo} disabled={simpanVideo || !videoKotor}>
              {simpanVideo ? 'Menyimpan...' : videoKotor ? 'Simpan Video' : 'Tersimpan'}
            </Btn>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
          <div className="space-y-4">
            <Field
              label="Tautan Video YouTube"
              value={video.ppid_video_url ?? ''}
              onChange={(v) => setVideo({ ...video, ppid_video_url: v })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <Field
              label="Gambar Sampul"
              value={video.ppid_video_gambar ?? ''}
              onChange={(v) => setVideo({ ...video, ppid_video_gambar: v })}
              placeholder="https://... atau /ppid/sampul-video.jpg"
            />
            <InfoNote>
              Dikosongkan berarti bagian video <span className="text-[var(--adm-accent)] font-semibold">tidak dirender sama sekali</span> di
              halaman publik — bukan pemutar kosong. Pemutar YouTube baru dimuat setelah pengunjung menekan tombol putar,
              sehingga yang tidak menontonnya tidak ikut terlacak.
            </InfoNote>
          </div>

          {/* Pratinjau sampul; pemutarnya sendiri tidak disematkan di panel. */}
          <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-3">
            <p className="text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-2">Pratinjau Sampul</p>
            {video.ppid_video_gambar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.ppid_video_gambar}
                alt="Sampul video profil PPID"
                className="w-full aspect-video object-cover rounded-lg border border-[var(--adm-line)]"
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.25')}
              />
            ) : (
              <div className="w-full aspect-video rounded-lg border-2 border-dashed border-[var(--adm-line)] flex items-center justify-center text-[11.5px] text-[var(--adm-muted)] text-center px-3">
                Belum ada sampul
              </div>
            )}
            <p className="mt-2 text-[11px] text-[var(--adm-dim)]">
              {video.ppid_video_url
                ? kodeVideo
                  ? <>Kode video dikenali: <code className="text-[var(--adm-accent)]">{kodeVideo}</code></>
                  : <span className="text-rose-400">Tautan bukan alamat YouTube yang sah.</span>
                : 'Belum ada video.'}
            </p>
          </div>
        </div>
      </Panel>

      {/* ============ DAFTAR DOKUMEN ============ */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Dokumen Profil PPID</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari judul / nomor..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada dokumen" hint="Tambahkan SK Tim PPID atau laporan bulanan agar tampil di halaman Profil PPID." />
        ) : (
          <Table head={['Dokumen', 'Jenis', 'Tanggal', 'Berkas', 'Status', 'Aksi']}>
            {visible.map((d) => {
              const meta = JENIS_META[d.type] ?? { label: d.type, color: '#94a3b8', icon: Scale };
              const Icon = meta.icon;

              return (
                <Row key={d.id}>
                  <Cell className="max-w-[380px]">
                    <div className="flex items-start gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--adm-fg)] text-[12.5px] leading-snug">{d.title}</p>
                        {d.document_number && <p className="text-[var(--adm-muted)] text-[11px] mt-0.5">{d.document_number}</p>}
                      </div>
                    </div>
                  </Cell>

                  <Cell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge text={meta.label} color={meta.color} />
                      {d.is_current && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                          <Star className="w-3 h-3" /> Berlaku
                        </span>
                      )}
                    </div>
                  </Cell>

                  <Cell className="whitespace-nowrap">
                    {String(d.published_date ?? '').slice(0, 10) || <span className="text-[var(--adm-dim)]">—</span>}
                  </Cell>

                  <Cell>
                    {d.has_document && d.document_url ? (
                      <a
                        href={d.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[var(--adm-accent)] text-[11.5px] font-semibold"
                      >
                        <LinkIcon className="w-3.5 h-3.5" /> Buka
                      </a>
                    ) : (
                      <Badge text="Belum ada" color="#fbbf24" />
                    )}
                  </Cell>

                  <Cell>
                    <Badge text={d.is_active ? 'Tayang' : 'Disembunyikan'} color={d.is_active ? '#34d399' : '#94a3b8'} />
                  </Cell>

                  <Cell>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(d)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(d.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
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
        wide
        title={editId ? 'Ubah Dokumen Profil PPID' : 'Tambah Dokumen Profil PPID'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-5">
          {/* Jenis menentukan medan mana yang bermakna berikutnya, jadi ia
              dipilih dari kartu — bukan dari daftar gulung yang isinya baru
              terlihat setelah dibuka. */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-2">
              Jenis Dokumen <span className="text-[var(--adm-danger)]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => {
                const m = JENIS_META[t];
                const Icon = m.icon;
                const aktif = form.type === t;

                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => isi('type', t)}
                    className={`rounded-xl px-3 py-3 flex items-center gap-2.5 transition-colors cursor-pointer ring-1 ${
                      aktif ? 'bg-[var(--adm-hover)]' : 'ring-[var(--adm-line)] hover:bg-[var(--adm-hover)]'
                    }`}
                    style={aktif ? { boxShadow: `inset 0 0 0 1px ${m.color}` } : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ color: m.color }} />
                    <span className={`text-[12px] font-semibold ${aktif ? '' : 'text-[var(--adm-body)]'}`} style={aktif ? { color: m.color } : undefined}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Field
              label="Judul Dokumen" required type="textarea" rows={2}
              value={form.title} onChange={(v) => isi('title', v)}
              placeholder={form.type === 'SK PPID' ? 'SK Tim Pejabat Pengelola Informasi dan Dokumentasi (PPID)' : 'Laporan Bulanan Layanan Informasi Publik'}
            />
            <Galat pesan={galat.title} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={form.type === 'SK PPID' ? 'Nomor SK' : 'Nomor Dokumen'}
              value={form.document_number} onChange={(v) => isi('document_number', v)}
              placeholder="mis. SK.01/PPID/2026"
            />
            <div>
              <Field
                label={form.type === 'SK PPID' ? 'Tanggal Penetapan' : 'Tanggal Terbit'} required type="date"
                value={form.published_date} onChange={(v) => isi('published_date', v)}
              />
              <Galat pesan={galat.published_date} />
            </div>
          </div>

          <Field label="Keterangan" type="textarea" rows={3} value={form.description} onChange={(v) => isi('description', v)} />

          <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-3">
            <p className="text-[12px] font-bold text-[var(--adm-body)]">Sumber Dokumen</p>
            <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
              Pilih salah satu. Mengunggah berkas akan menggantikan tautan yang tersimpan, begitu pula sebaliknya.
              Kosongkan keduanya bila dokumennya memang belum terbit — keberadaannya tetap diumumkan dengan penanda.
            </p>

            <div>
              <label className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-1.5">Unggah Berkas (PDF, maks 20 MB)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
                className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
              />
            </div>

            {!berkas && (
              <IsianTautan
                label="atau Tautan Dokumen"
                nilai={form.document_link}
                onChange={(v) => isi('document_link', v)}
                placeholder="https://drive.google.com/file/d/.../view"
                galat={galat.document_link}
              />
            )}
          </div>

          <div className="space-y-3">
            {form.type === 'SK PPID' && (
              <div>
                <Field label="SK yang sedang berlaku" type="checkbox" value={form.is_current} onChange={(v) => isi('is_current', v)} />
                <p className="mt-1.5 text-[11px] text-[var(--adm-dim)] leading-relaxed">
                  Menyalakannya otomatis mematikan penanda pada SK lain — hanya boleh ada satu SK yang berlaku.
                  SK lama tetap tersimpan sebagai riwayat dan tetap dapat dibuka pengunjung.
                </p>
              </div>
            )}

            <Field label="Tayang di halaman publik" type="checkbox" value={form.is_active} onChange={(v) => isi('is_active', v)} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Dokumen ini akan dihapus permanen beserta berkasnya. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
