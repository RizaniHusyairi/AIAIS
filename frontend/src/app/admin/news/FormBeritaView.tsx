'use client';

/**
 * Form tulis/ubah berita.
 *
 * Halaman penuh, bukan modal: menulis berita adalah pekerjaan tersendiri yang
 * menuntut ruang untuk editor, gambar sampul, dan pratinjau sekaligus —
 * bukan lirikan sambil lalu dari daftar berita.
 *
 * Satu berkas melayani dua rute (`/admin/news/baru` dan `/admin/news/{id}`)
 * supaya keduanya tidak pernah berbeda medan, penjelasan, atau validasinya.
 *
 * Sasarannya petugas humas yang tidak menulis HTML. Karena itu setiap panel
 * menerangkan akibat isiannya di halaman publik, isi berita ditulis lewat
 * `EditorTeks` bertombol, dan pratinjau kartu di kanan memperlihatkan bentuk
 * jadinya sebelum apa pun tersimpan.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Newspaper, ArrowLeft, Save, Image as ImageIcon, UploadCloud, Trash2, Link2,
  Calendar, Star, Eye, EyeOff, AlertCircle, PenLine, AlignLeft, Send, ScanEye, X, ExternalLink,
} from 'lucide-react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import type { NewsItem } from '@/types';
import {
  PageHeader, Panel, Btn, ConfirmDialog, Field, InfoNote, Loading, EmptyState,
  Toast, ToastMsg,
} from '@/components/admin/ui';
import EditorTeks from '@/components/admin/EditorTeks';
import TampilanBerita from '@/components/berita/TampilanBerita';
import { teksPolos } from '@/lib/berita';

const CATEGORIES = ['Berita Utama', 'Pengumuman', 'Operasional', 'Layanan', 'Kegiatan', 'Fasilitas'];

/** Sejalan dengan `cover` pada `NewsController`. */
const MAKS_BERKAS = 5 * 1024 * 1024;
const TIPE_BERKAS = ['image/jpeg', 'image/png', 'image/webp'];

/** Panjang judul yang masih tampil utuh di kartu berita dan hasil pencarian. */
const JUDUL_IDEAL = 90;
const RINGKASAN_IDEAL = 180;

type Form = {
  title: string;
  category: string;
  author: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  is_featured: boolean;
  status: 'draft' | 'published';
};

const KOSONG: Form = {
  title: '',
  category: 'Berita Utama',
  author: 'Humas UPBU APT Pranoto',
  excerpt: '',
  content: '',
  thumbnail: '',
  is_featured: false,
  status: 'published',
};

/** Pesan sukses dititipkan ke halaman daftar, yang menampilkannya sesudah pindah. */
export const KUNCI_TOAST = 'aiais_toast_berita';

/**
 * Bentuk isian form menjadi `NewsItem` sementara untuk pratinjau.
 *
 * Form tidak memuat `slug`, `published_at`, maupun `views_count` — ketiganya
 * lahir di server saat berita disimpan — padahal halaman baca membacanya.
 * Nilainya dikarang seperlunya di sini, dan hanya hidup selama pratinjau
 * terbuka: tidak ada yang dikirim ke mana pun.
 *
 * Sampul WAJIB lewat `thumbnail_url`, bukan `thumbnail`. `gambarBerita`
 * memeriksa medan itu lebih dulu, dan sampul yang baru dipilih petugas masih
 * berupa URL blob yang hanya sampai ke layar lewat jalur tersebut.
 *
 * Isian kosong diganti teks penuntun supaya pratinjau tidak pernah terbuka
 * sebagai halaman kosong yang terbaca seperti rusak.
 */
function beritaContoh(form: Form, sampul: string): NewsItem {
  return {
    id: 0,
    slug: 'pratinjau',
    title: form.title.trim() || 'Judul berita akan tampil di sini',
    category: form.category,
    excerpt: form.excerpt.trim() || 'Ringkasan berita akan tampil di sini.',
    content: form.content.trim() || '<p>Isi berita akan tampil di sini.</p>',
    thumbnail: form.thumbnail,
    thumbnail_url: sampul || undefined,
    author: form.author.trim() || 'Humas UPBU APT Pranoto',
    views_count: 0,
    is_featured: form.is_featured,
    status: form.status,
    published_at: new Date().toISOString(),
  };
}

/**
 * Hamparan pratinjau — halaman baca yang sungguhan, di atas form.
 *
 * Memakai lapisan layar penuh, bukan `Modal` dari kit admin: modal itu mentok
 * di 768px, sedangkan tata letak halaman baca baru menampilkan rel dan kolom
 * sampingnya pada 1280px ke atas. Pratinjau yang dipaksa sempit justru
 * menyesatkan.
 *
 * Wadahnya sengaja TIDAK memakai `overflow-x-hidden`: `overflow-x` selain
 * `visible` mematikan `position: sticky` bagi seluruh keturunannya, dan kolom
 * "Rute Baca" akan tergulir keluar layar.
 */
function HamparanPratinjau({
  form, sampul, onTutup,
}: { form: Form; sampul: string; onTutup: () => void }) {
  // Gulir badan dikunci selama hamparan terbuka supaya halaman form di
  // baliknya tidak ikut bergerak saat pratinjau digulir.
  useEffect(() => {
    const semula = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const padaTombol = (e: KeyboardEvent) => { if (e.key === 'Escape') onTutup(); };
    window.addEventListener('keydown', padaTombol);

    return () => {
      document.body.style.overflow = semula;
      window.removeEventListener('keydown', padaTombol);
    };
  }, [onTutup]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau halaman berita"
      // `overscroll-contain` menahan gulir agar tidak merambat ke halaman form
      // begitu pratinjau mencapai ujungnya — mengunci `body` saja tidak cukup
      // bila cangkang admin ternyata bergulir di dalam div, bukan di badan.
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-[#f6f8fc]"
    >
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 bg-[#0b1428] border-b border-white/10">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 font-mono">
          <ScanEye className="w-4 h-4" /> Pratinjau · tampilan pengunjung
        </span>

        <span className="hidden sm:block text-[11px] text-white/45">
          Belum tersimpan — tutup pratinjau lalu tekan Simpan untuk menerbitkannya.
        </span>

        <button
          onClick={onTutup}
          className="ml-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[12px] font-bold px-4 py-2 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" /> Tutup Pratinjau
        </button>
      </div>

      <TampilanBerita artikel={beritaContoh(form, sampul)} daftar={[]} pratinjau />
    </div>
  );
}

function Galat({ pesan }: { pesan?: string }) {
  if (!pesan) return null;

  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {pesan}
    </p>
  );
}

/** Penghitung karakter; menguning saat isian melewati panjang yang masih tampil utuh. */
function Hitung({ panjang, ideal }: { panjang: number; ideal: number }) {
  return (
    <span className={`text-[10.5px] tabular-nums ${panjang > ideal ? 'text-amber-400' : 'text-[var(--adm-muted)]'}`}>
      {panjang}/{ideal}
    </span>
  );
}

export default function FormBeritaView({ id }: { id?: number }) {
  const router = useRouter();
  const ubah = id != null;

  const [form, setForm] = useState<Form>(KOSONG);
  const [awal, setAwal] = useState<Form>(KOSONG);
  const [docKey, setDocKey] = useState(0);

  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjauBerkas, setPratinjauBerkas] = useState<string>('');
  const [modeUrl, setModeUrl] = useState(false);
  const [seret, setSeret] = useState(false);

  const [galat, setGalat] = useState<Record<string, string>>({});
  const [memuat, setMemuat] = useState(ubah);
  const [tidakAda, setTidakAda] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [tanyaKeluar, setTanyaKeluar] = useState(false);
  const [bukaPratinjau, setBukaPratinjau] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);

  const inputBerkas = useRef<HTMLInputElement>(null);
  const kotak = useRef<HTMLDivElement>(null);

  /* ---------- muat data (mode ubah) ---------- */

  useEffect(() => {
    if (!ubah) return;

    let batal = false;

    (async () => {
      // Belum ada endpoint admin untuk satu berita; daftarnya sudah memuat
      // seluruh medan yang dibutuhkan form ini.
      const res = await adminFetch<NewsItem[]>('/news');
      if (batal) return;

      const item = (Array.isArray(res.data) ? res.data : []).find((n) => n.id === id);
      if (!item) {
        setTidakAda(true);
        setMemuat(false);
        return;
      }

      const isi: Form = {
        title: item.title ?? '',
        category: item.category ?? CATEGORIES[0],
        author: item.author ?? '',
        excerpt: item.excerpt ?? '',
        content: item.content ?? '',
        thumbnail: item.thumbnail ?? '',
        is_featured: !!item.is_featured,
        status: item.status ?? 'published',
      };

      setForm(isi);
      setAwal(isi);
      setDocKey((k) => k + 1);
      // Berita peninggalan v1 memakai URL penuh; medan URL dibuka agar
      // petugas melihat dari mana gambarnya berasal.
      setModeUrl(/^https?:\/\//i.test(isi.thumbnail));
      setMemuat(false);
    })();

    return () => { batal = true; };
  }, [id, ubah]);

  /* ---------- pratinjau berkas ---------- */

  // Alamat pratinjau dibuat di penangan pemilihan berkas; di sini ia hanya
  // dicabut kembali supaya peramban tidak menahan berkasnya di memori.
  useEffect(() => {
    if (!pratinjauBerkas) return;

    return () => URL.revokeObjectURL(pratinjauBerkas);
  }, [pratinjauBerkas]);

  /* ---------- cegah tulisan hilang ---------- */

  const kotor = useMemo(
    () => !!berkas || JSON.stringify(form) !== JSON.stringify(awal),
    [form, awal, berkas],
  );

  useEffect(() => {
    if (!kotor) return;

    const jaga = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', jaga);

    return () => window.removeEventListener('beforeunload', jaga);
  }, [kotor]);

  /* ---------- isian ---------- */

  const isi = useCallback(<K extends keyof Form>(kunci: K, nilai: Form[K]) => {
    setForm((f) => ({ ...f, [kunci]: nilai }));
    setGalat((g) => (g[kunci] ? { ...g, [kunci]: '' } : g));
  }, []);

  const pilihBerkas = (f: File | null | undefined) => {
    if (!f) return;

    if (!TIPE_BERKAS.includes(f.type)) {
      setToast({ text: 'Gambar sampul harus berformat JPG, PNG, atau WEBP', kind: 'error' });
      return;
    }
    if (f.size > MAKS_BERKAS) {
      setToast({ text: 'Ukuran gambar sampul maksimal 5 MB', kind: 'error' });
      return;
    }

    setBerkas(f);
    setPratinjauBerkas(URL.createObjectURL(f));
    setModeUrl(false);
  };

  const hapusSampul = () => {
    setBerkas(null);
    setPratinjauBerkas('');
    isi('thumbnail', '');
    if (inputBerkas.current) inputBerkas.current.value = '';
  };

  /* ---------- simpan ---------- */

  const periksa = (): boolean => {
    const g: Record<string, string> = {};

    if (!form.title.trim()) g.title = 'Judul berita wajib diisi.';
    if (!form.category) g.category = 'Kategori wajib dipilih.';
    if (!form.excerpt.trim()) g.excerpt = 'Ringkasan wajib diisi — kalimat inilah yang tampil di kartu berita.';

    // Editor menyisakan markah kosong (mis. `<p><br></p>`) saat semua teks
    // dihapus, jadi yang diperiksa isi terbacanya, bukan panjang HTML-nya.
    if (!teksPolos(form.content)) g.content = 'Isi berita wajib diisi.';

    setGalat(g);

    if (Object.keys(g).length) {
      kotak.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setToast({ text: 'Ada isian yang belum lengkap. Periksa tanda merah di bawah.', kind: 'error' });
      return false;
    }

    return true;
  };

  const simpan = async () => {
    if (!periksa()) return;

    setMenyimpan(true);

    // Selalu multipart: gambar sampul tidak dapat dikirim sebagai JSON, dan
    // memakai dua jalur kirim hanya membuat dua perilaku yang harus dijaga.
    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('category', form.category);
    fd.append('excerpt', form.excerpt.trim());
    fd.append('content', form.content);
    fd.append('author', form.author.trim());
    fd.append('status', form.status);
    fd.append('is_featured', form.is_featured ? '1' : '0');

    // Saat ada berkas baru, server yang menentukan lintasannya — nilai lama
    // tidak ikut dikirim supaya tidak menimpa hasil unggahan.
    if (berkas) fd.append('cover', berkas);
    else fd.append('thumbnail', form.thumbnail.trim());

    const res = ubah ? await adminUpload(`/news/${id}`, fd) : await adminUpload('/news', fd);
    setMenyimpan(false);

    if (!res.ok) {
      setToast({ text: res.message, kind: 'error' });
      return;
    }

    setAwal(form);
    setBerkas(null);
    sessionStorage.setItem(
      KUNCI_TOAST,
      ubah ? 'Berita diperbarui' : form.status === 'draft' ? 'Draft berita disimpan' : 'Berita dipublikasikan',
    );
    router.push('/admin/news');
  };

  const kembali = () => (kotor ? setTanyaKeluar(true) : router.push('/admin/news'));

  /* ---------- tampilan ---------- */

  const sampul = pratinjauBerkas || form.thumbnail;

  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (memuat) return <Loading text="Memuat berita..." />;

  if (tidakAda) {
    return (
      <Panel>
        <EmptyState text="Berita tidak ditemukan" hint="Mungkin sudah dihapus petugas lain." />
        <div className="px-5 pb-5">
          <Link href="/admin/news"><Btn variant="ghost"><ArrowLeft className="w-4 h-4" /> Kembali ke daftar</Btn></Link>
        </div>
      </Panel>
    );
  }

  return (
    <div ref={kotak} className="space-y-5">
      <PageHeader
        icon={Newspaper}
        title={ubah ? 'Ubah Berita' : 'Tulis Berita Baru'}
        subtitle={
          ubah
            ? 'Perubahan langsung tampil di portal publik dan aplikasi mobile setelah disimpan.'
            : 'Isi dari atas ke bawah. Pratinjau di sebelah kanan memperlihatkan bentuk jadinya.'
        }
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={kembali}><ArrowLeft className="w-4 h-4" /> Kembali</Btn>
            <Btn variant="ghost" onClick={() => setBukaPratinjau(true)}>
              <ScanEye className="w-4 h-4" /> Pratinjau
            </Btn>
            <Btn onClick={simpan} disabled={menyimpan}>
              {menyimpan ? (
                'Menyimpan...'
              ) : ubah ? (
                <><Save className="w-4 h-4" /> Simpan Perubahan</>
              ) : form.status === 'draft' ? (
                <><Save className="w-4 h-4" /> Simpan Draft</>
              ) : (
                <><Send className="w-4 h-4" /> Publikasikan</>
              )}
            </Btn>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        {/* ================= KIRI: tulisan ================= */}
        <div className="space-y-5 min-w-0">
          <Panel title="Identitas Berita">
            <div className="p-5 space-y-4">
              <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
                Bagian ini menentukan bagaimana berita dikenali pembaca dan mesin pencari.
              </p>

              <div>
                <Field
                  label="Judul Berita"
                  required
                  value={form.title}
                  onChange={(v) => isi('title', v)}
                  placeholder="Terminal Bandara APT Pranoto Tambah Ruang Tunggu Baru"
                />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="text-[10.5px] text-[var(--adm-muted)]">
                    Tulis seperti judul koran: langsung ke pokok kejadian.
                  </span>
                  <Hitung panjang={form.title.length} ideal={JUDUL_IDEAL} />
                </div>
                <Galat pesan={galat.title} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Field
                    label="Kategori"
                    required
                    type="select"
                    value={form.category}
                    onChange={(v) => isi('category', v)}
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                  <p className="mt-1.5 text-[10.5px] text-[var(--adm-muted)]">Dipakai pengunjung untuk menyaring daftar berita.</p>
                  <Galat pesan={galat.category} />
                </div>

                <div>
                  <Field
                    label="Penulis"
                    value={form.author}
                    onChange={(v) => isi('author', v)}
                    placeholder="Humas UPBU APT Pranoto"
                  />
                  <p className="mt-1.5 text-[10.5px] text-[var(--adm-muted)]">Nama unit, bukan nama perorangan.</p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Ringkasan">
            <div className="p-5 space-y-3">
              <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
                Satu sampai dua kalimat pembuka. Inilah yang muncul di kartu berita, beranda,
                aplikasi mobile, dan cuplikan hasil pencarian Google — bukan paragraf pertama isi berita.
              </p>

              <div>
                <Field
                  label="Ringkasan Berita"
                  required
                  type="textarea"
                  rows={3}
                  value={form.excerpt}
                  onChange={(v) => isi('excerpt', v)}
                  placeholder="Bandara APT Pranoto Samarinda menambah kapasitas ruang tunggu untuk mengantisipasi lonjakan penumpang musim liburan."
                />
                <div className="mt-1.5 flex justify-end">
                  <Hitung panjang={form.excerpt.length} ideal={RINGKASAN_IDEAL} />
                </div>
                <Galat pesan={galat.excerpt} />
              </div>
            </div>
          </Panel>

          <Panel title="Isi Berita">
            <div className="p-5 space-y-3">
              <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
                Tulis seperti biasa, lalu rapikan dengan tombol di atas kotak tulisan.
                Tidak perlu mengetik kode apa pun.
              </p>

              <EditorTeks value={form.content} onChange={(v) => isi('content', v)} docId={docKey} />
              <Galat pesan={galat.content} />

              <InfoNote>
                Gunakan <b>Judul Bagian</b> untuk memecah tulisan panjang, dan <b>Daftar Berpoin</b> untuk
                rincian — keduanya membuat berita jauh lebih mudah dibaca di layar ponsel. Gambar tambahan
                belum dapat disisipkan di dalam tulisan; satu gambar sampul di sebelah kanan sudah cukup.
              </InfoNote>
            </div>
          </Panel>
        </div>

        {/* ================= KANAN: sampul, publikasi, pratinjau ================= */}
        <div className="space-y-5 lg:sticky lg:top-5">
          <Panel title="Gambar Sampul">
            <div className="p-5 space-y-3">
              <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
                Foto utama berita. Bentuk mendatar (16:9) paling pas. Maksimal 5 MB, format JPG, PNG, atau WEBP.
              </p>

              {sampul ? (
                <div className="relative group">
                  <img
                    src={sampul}
                    alt="Pratinjau sampul"
                    className="w-full aspect-video object-cover rounded-xl border border-[var(--adm-line)]"
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.25')}
                  />
                  <button
                    type="button"
                    onClick={hapusSampul}
                    title="Hapus gambar sampul"
                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-slate-900/70 text-white hover:bg-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputBerkas.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
                  onDragLeave={() => setSeret(false)}
                  onDrop={(e) => { e.preventDefault(); setSeret(false); pilihBerkas(e.dataTransfer.files?.[0]); }}
                  className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer ${
                    seret
                      ? 'border-[var(--adm-accent)] bg-[var(--adm-accent-soft)]'
                      : 'border-[var(--adm-line)] hover:border-[var(--adm-accent-line)] hover:bg-[var(--adm-hover)]'
                  }`}
                >
                  <UploadCloud className="w-7 h-7 text-[var(--adm-accent)]" />
                  <span className="text-[12px] font-semibold text-[var(--adm-fg)]">Seret foto ke sini</span>
                  <span className="text-[10.5px] text-[var(--adm-muted)]">atau klik untuk memilih dari komputer</span>
                </button>
              )}

              <input
                ref={inputBerkas}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pilihBerkas(e.target.files?.[0])}
              />

              {sampul && (
                <button
                  type="button"
                  onClick={() => inputBerkas.current?.click()}
                  className="w-full h-9 rounded-xl border border-[var(--adm-line)] text-[11.5px] font-semibold text-[var(--adm-body)] hover:bg-[var(--adm-hover)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" /> Ganti gambar
                </button>
              )}

              {modeUrl ? (
                <Field
                  label="Alamat gambar (URL)"
                  value={form.thumbnail}
                  onChange={(v) => { setBerkas(null); setPratinjauBerkas(''); isi('thumbnail', v); }}
                  placeholder="https://..."
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setModeUrl(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--adm-accent)] hover:underline cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" /> atau tempel alamat gambar
                </button>
              )}
            </div>
          </Panel>

          <Panel title="Publikasi">
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  {([
                    { nilai: 'published' as const, label: 'Terbit', ikon: Eye },
                    { nilai: 'draft' as const, label: 'Draft', ikon: EyeOff },
                  ]).map((s) => (
                    <button
                      key={s.nilai}
                      type="button"
                      onClick={() => isi('status', s.nilai)}
                      className={`flex-1 h-10 rounded-xl border text-[12px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        form.status === s.nilai
                          ? 'border-[var(--adm-accent-line)] bg-[var(--adm-accent-soft)] text-[var(--adm-accent)]'
                          : 'border-[var(--adm-line)] text-[var(--adm-body)] hover:bg-[var(--adm-hover)]'
                      }`}
                    >
                      <s.ikon className="w-4 h-4" /> {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-[var(--adm-muted)] leading-relaxed">
                  {form.status === 'published'
                    ? 'Terbit: langsung dapat dibaca pengunjung portal dan aplikasi mobile.'
                    : 'Draft: tersimpan di panel admin saja, belum terlihat pengunjung.'}
                </p>
              </div>

              <div className="pt-1 border-t border-[var(--adm-line)] space-y-2">
                <div className="pt-3">
                  <Field
                    label="Jadikan Berita Utama"
                    type="checkbox"
                    value={form.is_featured}
                    onChange={(v) => isi('is_featured', v)}
                  />
                </div>
                <p className="text-[10.5px] text-[var(--adm-muted)] leading-relaxed">
                  Berita utama tampil besar di bagian atas halaman berita dan di beranda portal.
                </p>
              </div>
            </div>
          </Panel>

          {/* Replika kartu berita publik — sengaja memakai warna terang portal,
              bukan warna panel admin, supaya yang terlihat memang hasil jadinya. */}
          <Panel title="Pratinjau di Portal">
            <div className="p-5 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="h-[120px] bg-slate-100 flex items-center justify-center overflow-hidden">
                  {sampul ? (
                    <img src={sampul} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-slate-300" />
                  )}
                </div>
                <div className="p-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5">
                      {form.category}
                    </span>
                    {form.is_featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Berita Utama
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" /> {tanggal}
                  </p>
                  <h3 className="mt-1.5 font-bold text-slate-900 text-[13.5px] leading-snug line-clamp-2">
                    {form.title || 'Judul berita akan tampil di sini'}
                  </h3>
                  <p className="mt-1.5 text-slate-500 text-[11.5px] leading-relaxed line-clamp-3">
                    {form.excerpt || 'Ringkasan berita akan tampil di sini.'}
                  </p>
                </div>
              </div>

              <p className="flex items-center gap-1.5 text-[10.5px] text-[var(--adm-muted)]">
                <PenLine className="w-3.5 h-3.5" /> Inilah bentuk berita di daftar dan beranda.
              </p>

              <button
                onClick={() => setBukaPratinjau(true)}
                className="w-full h-9 rounded-xl border border-[var(--adm-accent-line)] bg-[var(--adm-accent-soft)] text-[11.5px] font-bold text-[var(--adm-accent)] hover:brightness-110 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Lihat halaman penuh
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {/* Tombol simpan kedua di kaki halaman: tulisan panjang membuat tombol di
          kepala halaman tergulung jauh ke atas. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl adm-glass px-5 py-4"
      >
        <p className="flex items-center gap-2 text-[11.5px] text-[var(--adm-muted)]">
          <AlignLeft className="w-4 h-4" />
          {kotor ? 'Ada perubahan yang belum disimpan.' : 'Semua perubahan tersimpan.'}
        </p>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={kembali}>Batal</Btn>
          <Btn onClick={simpan} disabled={menyimpan}>
            <Save className="w-4 h-4" /> {menyimpan ? 'Menyimpan...' : ubah ? 'Simpan Perubahan' : 'Simpan Berita'}
          </Btn>
        </div>
      </motion.div>

      <ConfirmDialog
        open={tanyaKeluar}
        onCancel={() => setTanyaKeluar(false)}
        onConfirm={() => router.push('/admin/news')}
        message="Ada perubahan yang belum disimpan. Tinggalkan halaman ini dan buang perubahannya?"
      />

      {bukaPratinjau && (
        <HamparanPratinjau form={form} sampul={sampul} onTutup={() => setBukaPratinjau(false)} />
      )}

      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  );
}
