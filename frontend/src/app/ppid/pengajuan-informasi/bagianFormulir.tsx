'use client';

/**
 * Potongan formulir permohonan informasi publik.
 *
 * Kolom dirangkai lewat `Field`, yang menyuntikkan `id`, `aria-invalid`, dan
 * `aria-describedby` ke isian di dalamnya. Tanpa itu pembaca layar hanya
 * membacakan label, dan pesan galat merah di bawahnya tidak pernah terdengar.
 * Setiap isian juga membawa `data-kolom` supaya view bisa memindahkan fokus
 * ke galat pertama setelah tombol Lanjut atau Kirim ditekan.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CircleCheck, FileText, TriangleAlert, Upload, X, type LucideIcon } from 'lucide-react';
import { ACCEPT, EKSTENSI_SAH, type Kolom } from './aturan';

export const LANGKAH = [
  { nama: 'Berkas Syarat', ket: 'KTP & asal surat' },
  { nama: 'Data & Permohonan', ket: 'Identitas & rincian' },
  { nama: 'Tinjau & Kirim', ket: 'Periksa lalu kirim' },
];

export const inputCls =
  // pr-10 menyisakan ruang bagi centang hijau di pojok kanan isian.
  'w-full pl-4 pr-10 py-3 bg-white rounded-xl ring-1 ring-slate-200 text-[13.5px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ' +
  'aria-[invalid=true]:ring-rose-300 aria-[invalid=true]:bg-rose-50/30';

function PesanGalat({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <motion.span
      id={id}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-semibold text-rose-600"
    >
      <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
      {children}
    </motion.span>
  );
}

export function Field({
  label, hint, error, ok = false, required = true, aside, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Kolom sudah disentuh dan lolos aturan — tampilkan centang hijau. */
  ok?: boolean;
  required?: boolean;
  /** Keterangan kecil di kanan label, mis. penghitung karakter. */
  aside?: React.ReactNode;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const id = useId();
  const idHint = `${id}-hint`;
  const idGalat = `${id}-galat`;
  const describedBy = [hint && idHint, error && idGalat].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="block text-[12.5px] font-bold text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>}
          {!required && <span className="ml-1.5 text-[10.5px] font-semibold text-slate-400">(opsional)</span>}
        </label>
        {aside}
      </div>
      {hint && <span id={idHint} className="block mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">{hint}</span>}
      <span className="relative block mt-2">
        {React.cloneElement(children, {
          id,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy,
          'aria-required': required || undefined,
        })}
        <AnimatePresence>
          {ok && !error && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="pointer-events-none absolute right-3 top-3 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"
              aria-hidden="true"
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {error && <PesanGalat id={idGalat}>{error}</PesanGalat>}
    </div>
  );
}

/** Penghitung karakter kecil untuk kolom uraian. */
export function Penghitung({ n, saran }: { n: number; saran: number }) {
  const cukup = n >= saran;
  return (
    <span className={`text-[10.5px] font-semibold tabular-nums ${cukup ? 'text-emerald-600' : 'text-slate-400'}`}>
      {n} karakter{!cukup && n > 0 ? ` · disarankan ≥ ${saran}` : ''}
    </span>
  );
}

export function FileField({
  label, hint, error, file, kolom, onPick,
}: {
  label: string; hint: string; error?: string; file: File | null; kolom: Kolom;
  onPick: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const idGalat = useId();
  const [seret, setSeret] = useState(false);

  // Pratinjau lokal supaya pemohon yakin berkas yang dipilih memang KTP-nya.
  // Berkas tidak meninggalkan peramban sebelum tombol Kirim ditekan.
  const pratinjau = useMemo(
    () => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => () => { if (pratinjau) URL.revokeObjectURL(pratinjau); }, [pratinjau]);

  const jatuhkan = (e: React.DragEvent) => {
    e.preventDefault();
    setSeret(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  };

  return (
    <div>
      <p className="text-[12.5px] font-bold text-slate-700">
        {label}<span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>
      </p>
      <p className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">{hint}</p>

      <input
        ref={ref}
        type="file"
        accept={`${ACCEPT},${EKSTENSI_SAH.map((e) => `.${e}`).join(',')}`}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="mt-2">
        <AnimatePresence mode="wait" initial={false}>
          {file ? (
            <motion.div
              key="ada"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="flex items-center gap-3 bg-emerald-50 ring-1 ring-emerald-200 rounded-xl p-3"
            >
              {pratinjau ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob lokal, bukan aset yang perlu dioptimasi
                <img src={pratinjau} alt="" className="w-16 h-11 rounded-lg object-cover ring-1 ring-emerald-200 flex-shrink-0" />
              ) : (
                <span className="w-16 h-11 rounded-lg bg-white ring-1 ring-emerald-200 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
                  <CircleCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </span>
                <span className="block text-[11px] text-slate-500">
                  {(file.size / 1024).toFixed(0)} KB ·{' '}
                  <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Ganti berkas
                  </button>
                </span>
              </span>
              <button
                type="button"
                data-kolom={kolom}
                onClick={() => { onPick(null); if (ref.current) ref.current.value = ''; }}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-white ring-1 ring-emerald-200 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label={`Hapus berkas ${label}`}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="kosong"
              type="button"
              data-kolom={kolom}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => ref.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
              onDragLeave={() => setSeret(false)}
              onDrop={jatuhkan}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? idGalat : undefined}
              aria-label={`${label}: pilih berkas`}
              className={`w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-7 text-[13px] font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                seret
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : error
                    ? 'border-rose-300 bg-rose-50/40 text-rose-600'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 text-slate-500 hover:text-blue-700'
              }`}
            >
              <motion.span
                animate={seret ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
                className="w-10 h-10 rounded-full bg-white ring-1 ring-slate-200 flex items-center justify-center"
              >
                <Upload className="w-4 h-4" />
              </motion.span>
              {seret ? (
                <span>Lepaskan berkas di sini</span>
              ) : (
                <>
                  {/* Ponsel tidak mengenal seret-lepas; cukup ajak mengetuk. */}
                  <span className="sm:hidden">Ketuk untuk memilih berkas</span>
                  <span className="hidden sm:inline">Seret berkas ke sini atau klik untuk memilih</span>
                </>
              )}
              <span className="text-[11px] font-medium text-slate-400">JPG, PNG, atau PDF · maks. 2 MB</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {error && <PesanGalat id={idGalat}>{error}</PesanGalat>}
    </div>
  );
}

export function CheckGroup({
  label, options, value, error, cols = 'grid-cols-1 sm:grid-cols-2', ikon, keterangan, nonaktif,
  wajib = true, catatan, kolom, onToggle,
}: {
  label: string; options: string[]; value: string[]; error?: string;
  cols?: string; ikon?: Record<string, LucideIcon>;
  /** Teks kecil di bawah label tiap pilihan. */
  keterangan?: Record<string, string>;
  /** Pilihan yang tidak dapat dicentang, beserta alasannya. */
  nonaktif?: Record<string, string>;
  wajib?: boolean;
  /** Pesan di bawah judul kelompok, mis. mengapa semua pilihan nonaktif. */
  catatan?: React.ReactNode;
  kolom: Kolom;
  onToggle: (v: string) => void;
}) {
  const idGalat = useId();
  // Fokus galat jatuh ke pilihan pertama yang masih bisa dicentang.
  const pertamaAktif = options.find((o) => !nonaktif?.[o]);

  return (
    <fieldset aria-describedby={error ? idGalat : undefined}>
      <legend className="text-[12.5px] font-bold text-slate-700">
        {label}
        {wajib
          ? <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>
          : <span className="ml-1.5 text-[10.5px] font-semibold text-slate-400">(tidak diperlukan)</span>}
        <span className="ml-1.5 text-[10.5px] font-semibold text-slate-400">boleh lebih dari satu</span>
      </legend>

      <AnimatePresence initial={false}>
        {catatan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 text-[11.5px] text-slate-500 leading-relaxed">{catatan}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`mt-2 grid ${cols} gap-2`}>
        {options.map((opt) => {
          const on = value.includes(opt);
          const alasan = nonaktif?.[opt];
          const mati = !!alasan && !on;
          const Ikon = ikon?.[opt];
          const ket = mati ? alasan : keterangan?.[opt];
          return (
            <motion.label
              key={opt}
              whileTap={mati ? undefined : { scale: 0.98 }}
              animate={{ opacity: mati ? 0.5 : 1 }}
              title={mati ? alasan : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 ${
                mati ? 'bg-slate-50 ring-slate-200 cursor-not-allowed'
                : on ? 'bg-blue-50 ring-blue-300 cursor-pointer'
                : error ? 'bg-white ring-rose-200 cursor-pointer'
                : 'bg-white ring-slate-200 hover:ring-slate-300 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={mati}
                onChange={() => onToggle(opt)}
                data-kolom={opt === pertamaAktif ? kolom : undefined}
                className="sr-only"
              />
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ring-1 transition-colors ${
                  on ? 'bg-blue-600 ring-blue-600 text-white'
                  : mati ? 'bg-slate-100 ring-slate-200 text-transparent'
                  : 'bg-white ring-slate-300 text-transparent'
                }`}
                aria-hidden="true"
              >
                <Check className="w-3.5 h-3.5" />
              </span>
              {Ikon && <Ikon className={`w-4 h-4 flex-shrink-0 ${on ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true" />}
              <span className="min-w-0">
                <span className={`block text-[12.5px] leading-snug ${mati ? 'text-slate-400' : 'text-slate-700'}`}>{opt}</span>
                {ket && <span className="block mt-0.5 text-[10.5px] text-slate-400 leading-snug">{ket}</span>}
              </span>
            </motion.label>
          );
        })}
      </div>

      {error && <PesanGalat id={idGalat}>{error}</PesanGalat>}
    </fieldset>
  );
}

/**
 * Titik singgah langkah, bergaya rute penerbangan. Langkah yang sudah
 * dilewati dapat diklik untuk kembali; melompat ke depan tetap lewat tombol
 * Lanjut supaya validasinya tidak terlewati.
 */
export function Stepper({ step, onPilih, ringkas = false }: {
  step: number;
  onPilih: (i: number) => void;
  /** Hanya titik, tanpa label — bila nama langkah aktif sudah tertulis di dekatnya. */
  ringkas?: boolean;
}) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Tahapan pengisian">
      {LANGKAH.map((l, i) => {
        const selesai = i < step;
        const aktif = i === step;
        return (
          <React.Fragment key={l.nama}>
            <li className="min-w-0" aria-current={aktif ? 'step' : undefined}>
              <button
                type="button"
                onClick={() => selesai && onPilih(i)}
                disabled={!selesai}
                className={`flex items-center gap-2 min-w-0 text-left rounded-full pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  selesai ? 'cursor-pointer group' : 'cursor-default'
                }`}
                aria-label={selesai ? `Kembali ke langkah ${i + 1}: ${l.nama}` : `Langkah ${i + 1}: ${l.nama}`}
              >
                <motion.span
                  layout
                  animate={aktif ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-black transition-colors ${
                    selesai ? 'bg-emerald-500 text-white group-hover:bg-emerald-600'
                    : aktif ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {selesai ? <Check className="w-4 h-4" /> : i + 1}
                </motion.span>
                <span className={ringkas ? 'sr-only' : 'hidden sm:block min-w-0'}>
                  <span className={`block text-[12px] font-bold truncate ${aktif ? 'text-slate-900' : selesai ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400'}`}>
                    {l.nama}
                  </span>
                  <span className="block text-[10.5px] text-slate-400 truncate">{l.ket}</span>
                </span>
              </button>
            </li>
            {i < LANGKAH.length - 1 && (
              <li aria-hidden="true" className="relative flex-1 min-w-[1rem] h-0.5">
                <span className="absolute inset-0 border-t-2 border-dashed border-slate-200" />
                <motion.span
                  className="absolute left-0 top-0 h-0.5 bg-emerald-400 origin-left"
                  initial={false}
                  animate={{ width: selesai ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
