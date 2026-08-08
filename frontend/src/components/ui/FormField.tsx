'use client';

/**
 * Primitif formulir publik.
 *
 * Polanya berasal dari `app/ppid/pengajuan-informasi/PengajuanInformasiView.tsx`
 * — halaman formulir paling matang di portal ini — dan diangkat ke sini
 * karena Pusat Bantuan memakainya di dua tempat sekaligus (halaman web dan
 * layar PWA). Halaman pengajuan informasi sengaja TIDAK diubah: ia bekerja,
 * aturan berkasnya berbeda (PDF/KTP ke cakram privat), dan menyentuhnya
 * hanya menambah risiko tanpa menambah manfaat.
 */

import React, { useRef } from 'react';
import { TriangleAlert, CircleCheck, Upload, X } from 'lucide-react';

export const inputCls =
  'w-full px-4 py-3 bg-white rounded-xl ring-1 ring-slate-200 text-[13.5px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

export function Field({
  label, hint, error, required = true, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-bold text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>}
      </span>

      {hint && <span className="block mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">{hint}</span>}

      <span className="block mt-2">{children}</span>

      {/* Galat menempel pada medannya, bukan satu spanduk di atas formulir:
          pengunjung harus tahu KOLOM MANA yang bermasalah. */}
      {error && (
        <span className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-semibold text-rose-600">
          <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * Pemilih gambar dengan pratinjau.
 *
 * Khusus gambar — lampiran pengaduan adalah bukti keadaan lapangan (fasilitas
 * rusak, antrean menumpuk), dan pratinjau membuat pengunjung sadar foto mana
 * yang benar-benar terkirim sebelum menekan tombol.
 */
export function ImageField({
  label, hint, error, file, onPick, required = false,
}: {
  label: string;
  hint: string;
  error?: string;
  file: File | null;
  onPick: (f: File | null) => void;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // URL objek dilepas saat berkasnya berganti; tanpa itu setiap pemilihan
  // ulang meninggalkan blob yang tidak pernah dibebaskan.
  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const bersihkan = () => {
    onPick(null);
    if (ref.current) ref.current.value = '';
  };

  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="sr-only"
        aria-label={label}
      />

      {file ? (
        <span className="flex items-center gap-3 bg-emerald-50 ring-1 ring-emerald-200 rounded-xl p-3">
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal, bukan aset yang bisa dioptimalkan */
            <img src={preview} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <CircleCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          )}

          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-slate-800 truncate">{file.name}</span>
            <span className="block text-[11px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</span>
          </span>

          <button
            type="button"
            onClick={bersihkan}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white ring-1 ring-emerald-200 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label={`Hapus ${label}`}
          >
            <X className="w-4 h-4" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-2.5 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl px-4 py-6 text-[13px] font-semibold text-slate-500 hover:text-blue-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Upload className="w-4 h-4" />
          Pilih foto (JPG, PNG, atau WEBP · maks. 5 MB)
        </button>
      )}
    </Field>
  );
}
