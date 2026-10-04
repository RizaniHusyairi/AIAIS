'use client';

/**
 * Panel "Galeri Foto" pada form berita.
 *
 * Galeri dikirim bersama form beritanya, bukan per foto: urutan, keterangan,
 * foto baru, dan foto yang dibuang baru berlaku ketika petugas menekan
 * Simpan. Dengan begitu tombol Batal benar-benar membatalkan semuanya, dan
 * berita tidak pernah tersimpan setengah galeri. Bentuk kirimannya disusun
 * `susunGaleri` di bawah — lihat `rencanaGaleri` pada NewsController.
 *
 * Gambar sengaja tidak disisipkan ke dalam isi berita: `img` tidak ada di
 * daftar putih `lib/htmlAman.ts`. Galeri tampil sebagai blok tersendiri
 * sesudah isi berita, kisi di desktop dan karusel di aplikasi mobile.
 */

import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImageOff, ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import type { NewsImage } from '@/types';
import { Field, Panel } from '@/components/admin/ui';

/** Sejalan dengan `NewsImage::MAX_PER_NEWS` dan aturan `gallery_files.*`. */
export const MAKS_FOTO = 12;
const MAKS_BERKAS = 5 * 1024 * 1024;
const TIPE_BERKAS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Satu foto dalam form: foto tersimpan (`id`) atau berkas baru (`berkas`).
 *
 * `kunci` hanya untuk React — id foto baru belum ada sampai disimpan.
 * `url` bernilai null bila berkas foto tersimpan sudah hilang dari cakram.
 */
export type FotoGaleri = {
  kunci: string;
  id?: number;
  berkas?: File;
  url: string | null;
  caption: string;
};

let urut = 0;
const kunciBaru = () => `baru-${Date.now()}-${urut++}`;

export function dariServer(images: NewsImage[] | undefined): FotoGaleri[] {
  return (images ?? []).map((f) => ({ kunci: `id-${f.id}`, id: f.id, url: f.url, caption: f.caption ?? '' }));
}

/** Tanda tangan galeri untuk mendeteksi perubahan yang belum disimpan. */
export function tandaGaleri(galeri: FotoGaleri[]): string {
  return JSON.stringify(galeri.map((f) => [f.id ?? f.kunci, f.caption]));
}

/** Tambahkan susunan galeri beserta berkas barunya ke kiriman form. */
export function susunGaleri(fd: FormData, galeri: FotoGaleri[]): void {
  let upload = 0;

  const susunan = galeri.map((f) => {
    const caption = f.caption.trim();
    if (f.id != null) return { id: f.id, caption };

    fd.append('gallery_files[]', f.berkas as File);

    return { upload: upload++, caption };
  });

  fd.append('gallery', JSON.stringify(susunan));
}

/** Lepaskan URL blob foto baru supaya peramban tidak menahan berkasnya. */
export function lepasPratinjau(foto: FotoGaleri): void {
  if (foto.berkas && foto.url) URL.revokeObjectURL(foto.url);
}

export default function PanelGaleri({
  galeri, ubah, onGalat,
}: {
  galeri: FotoGaleri[];
  ubah: (berikut: (g: FotoGaleri[]) => FotoGaleri[]) => void;
  onGalat: (pesan: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [seret, setSeret] = useState(false);
  const penuh = galeri.length >= MAKS_FOTO;

  const tambah = (daftar: FileList | null | undefined) => {
    if (!daftar?.length) return;

    const sisa = MAKS_FOTO - galeri.length;
    const diterima: FotoGaleri[] = [];
    let ditolak = 0;

    for (const f of Array.from(daftar)) {
      if (!TIPE_BERKAS.includes(f.type) || f.size > MAKS_BERKAS) {
        ditolak++;
        continue;
      }
      if (diterima.length >= sisa) break;

      diterima.push({ kunci: kunciBaru(), berkas: f, url: URL.createObjectURL(f), caption: '' });
    }

    if (ditolak) onGalat(`${ditolak} berkas dilewati: foto harus JPG, PNG, atau WEBP dan maksimal 5 MB.`);
    else if (daftar.length > diterima.length) onGalat(`Galeri paling banyak ${MAKS_FOTO} foto; sebagian foto tidak ditambahkan.`);

    if (diterima.length) ubah((g) => [...g, ...diterima]);
    if (input.current) input.current.value = '';
  };

  const geser = (i: number, arah: -1 | 1) =>
    ubah((g) => {
      const j = i + arah;
      if (j < 0 || j >= g.length) return g;

      const salin = [...g];
      [salin[i], salin[j]] = [salin[j], salin[i]];

      return salin;
    });

  const buang = (i: number) =>
    ubah((g) => {
      lepasPratinjau(g[i]);

      return g.filter((_, k) => k !== i);
    });

  const isiKeterangan = (i: number, caption: string) =>
    ubah((g) => g.map((f, k) => (k === i ? { ...f, caption } : f)));

  return (
    <Panel title="Galeri Foto">
      <div className="p-5 space-y-4">
        <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
          Foto pendukung yang tampil sebagai galeri di bawah isi berita — pengunjung dapat membukanya
          layar penuh. Urutan di sini adalah urutan tampil. Paling banyak {MAKS_FOTO} foto, masing-masing
          maksimal 5 MB — unggah langsung dari kamera, foto otomatis dikecilkan agar ringan dibuka di
          ponsel. Keterangan foto juga dibacakan pembaca layar bagi tunanetra, jadi tulislah apa yang
          tampak di foto.
        </p>

        {galeri.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {galeri.map((f, i) => (
              <li key={f.kunci} className="rounded-xl border border-[var(--adm-line)] overflow-hidden bg-[var(--adm-hover)]">
                <div className="relative aspect-[4/3] bg-slate-900/40">
                  {f.url ? (
                    <img src={f.url} alt={f.caption || `Foto ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-center px-4">
                      <ImageOff className="w-6 h-6 text-rose-400" />
                      <span className="text-[11px] font-semibold text-rose-300">Berkas foto hilang dari server</span>
                      <span className="text-[10px] text-[var(--adm-muted)]">Tidak tampil di portal. Buang lalu unggah ulang.</span>
                    </div>
                  )}

                  <span className="absolute top-2 left-2 min-w-6 h-6 px-1.5 rounded-md bg-slate-900/75 text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                    {i + 1}
                  </span>
                  {!f.id && (
                    <span className="absolute top-2 right-2 h-6 px-2 rounded-md bg-[var(--adm-accent)] text-white text-[10px] font-bold flex items-center">
                      Baru
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-2.5">
                  <Field
                    label="Keterangan foto"
                    value={f.caption}
                    onChange={(v) => isiKeterangan(i, String(v))}
                    placeholder="Petugas memandu penumpang menuju titik kumpul"
                    maxLength={255}
                  />

                  <div className="flex items-center gap-1.5">
                    <TombolKecil label="Geser ke depan" onClick={() => geser(i, -1)} disabled={i === 0}>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </TombolKecil>
                    <TombolKecil label="Geser ke belakang" onClick={() => geser(i, 1)} disabled={i === galeri.length - 1}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </TombolKecil>
                    <button
                      type="button"
                      onClick={() => buang(i)}
                      className="ml-auto h-8 px-3 rounded-lg text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Buang
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={penuh}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!penuh) setSeret(true); }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => { e.preventDefault(); setSeret(false); if (!penuh) tambah(e.dataTransfer.files); }}
          className={`w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors ${
            galeri.length ? 'py-5' : 'py-10'
          } ${
            penuh
              ? 'border-[var(--adm-line)] opacity-50 cursor-not-allowed'
              : seret
                ? 'border-[var(--adm-accent)] bg-[var(--adm-accent-soft)] cursor-pointer'
                : 'border-[var(--adm-line)] hover:border-[var(--adm-accent-line)] hover:bg-[var(--adm-hover)] cursor-pointer'
          }`}
        >
          {galeri.length ? (
            <ImagePlus className="w-6 h-6 text-[var(--adm-accent)]" />
          ) : (
            <UploadCloud className="w-7 h-7 text-[var(--adm-accent)]" />
          )}
          <span className="text-[12px] font-semibold text-[var(--adm-fg)]">
            {penuh ? `Galeri sudah ${MAKS_FOTO} foto` : galeri.length ? 'Tambah foto lagi' : 'Seret beberapa foto ke sini'}
          </span>
          {!penuh && (
            <span className="text-[10.5px] text-[var(--adm-muted)]">
              atau klik untuk memilih — boleh beberapa sekaligus ({galeri.length}/{MAKS_FOTO})
            </span>
          )}
        </button>

        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => tambah(e.target.files)}
        />
      </div>
    </Panel>
  );
}

function TombolKecil({
  label, onClick, disabled, children,
}: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg border border-[var(--adm-line)] text-[var(--adm-body)] hover:bg-[var(--adm-hover)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}
