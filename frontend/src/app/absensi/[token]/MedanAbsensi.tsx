'use client';

/**
 * Potongan isian layar daftar hadir.
 *
 * Dipisah dari `AbsensiForm` karena bentuknya ditentukan satu keadaan yang
 * sama: diisi dengan JEMPOL, sambil berdiri, di layar ponsel. Dari situ
 * turun tiga keputusan yang dipakai seluruh potongan di sini:
 *
 *  - **Sasaran sentuh besar.** Setiap isian dan pilihan setinggi ±60px.
 *    Pilihan jenis kelamin berupa dua kartu lebar, bukan tombol radio kecil
 *    yang harus dibidik.
 *  - **Umpan balik seketika.** Isian yang sudah benar diberi tanda centang
 *    hijau saat itu juga, dan kesalahan baru ditegur SESUDAH isiannya
 *    ditinggalkan — menegur orang yang baru mengetik huruf pertama hanya
 *    membuatnya ragu.
 *  - **Teks 16px pada setiap `<input>`.** Di bawah itu Safari iOS memperbesar
 *    halaman saat isian disentuh, dan tata letaknya bergeser ke samping.
 */

import React, { useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Mars, Venus, Handshake } from 'lucide-react';
import type { JenisKelamin } from '@/lib/absensiPerangkat';

/* ------------------------------------------------------------------ */
/*  Kartu seksi bernomor                                               */
/* ------------------------------------------------------------------ */

/**
 * Satu kelompok isian dengan nomor urut yang berubah menjadi centang begitu
 * seluruh isiannya benar. Peserta yang menggulir turun sambil mengisi dapat
 * melihat sekilas bagian mana yang masih kurang.
 */
export function KartuSeksi({
  nomor,
  judul,
  keterangan,
  selesai,
  children,
}: {
  nomor: number;
  judul: string;
  keterangan?: string;
  selesai: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white ring-1 ring-slate-200 p-4 sm:p-5">
      <header className="flex items-center gap-3 mb-4">
        <span
          className={`relative w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-colors duration-300 ${
            selesai ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {selesai ? (
              <motion.span
                key="centang"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              >
                <Check className="w-4 h-4" strokeWidth={3} />
              </motion.span>
            ) : (
              <motion.span key="nomor" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                {nomor}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-black text-slate-900 leading-tight">{judul}</h2>
          {keterangan && <p className="text-[11.5px] text-slate-500 leading-snug">{keterangan}</p>}
        </div>
      </header>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Isian teks berlabel mengambang                                     */
/* ------------------------------------------------------------------ */

/**
 * Isian teks dengan label yang naik ke atas saat disentuh.
 *
 * Label mengambang dipilih karena layar ponsel sempit: label di atas isian
 * memakan satu baris sendiri untuk setiap medan, sedangkan placeholder saja
 * menghilang begitu peserta mulai mengetik — dan ia lupa sedang mengisi apa.
 */
export function MedanTeks({
  label,
  icon: Icon,
  value,
  onChange,
  valid,
  galat,
  petunjuk,
  opsional = false,
  placeholder,
  autoFocus,
  ...input
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (nilai: string) => void;
  /** Benar bila isiannya sudah dapat diterima; memunculkan centang hijau. */
  valid: boolean;
  /** Teguran, ditampilkan hanya sesudah isian ditinggalkan. */
  galat?: string | null;
  /** Keterangan kecil di bawah isian; boleh berubah mengikuti isinya. */
  petunjuk?: React.ReactNode;
  opsional?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
} & Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'autoComplete' | 'autoCapitalize' | 'maxLength' | 'required' | 'enterKeyHint'
>) {
  const id = useId();
  const [fokus, setFokus] = useState(false);
  const [disentuh, setDisentuh] = useState(false);

  const terangkat = fokus || value !== '';
  const tegur = disentuh && !fokus && !!galat;

  const bingkai = tegur
    ? 'ring-2 ring-rose-300 bg-rose-50/40'
    : fokus
      ? 'ring-2 ring-blue-500 bg-white shadow-[0_10px_30px_-14px_rgba(37,99,235,0.55)]'
      : valid
        ? 'ring-1 ring-emerald-200 bg-white'
        : 'ring-1 ring-slate-200 bg-white';

  const lencana = tegur
    ? 'bg-rose-100 text-rose-500'
    : fokus
      ? 'bg-blue-600 text-white'
      : valid
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-slate-100 text-slate-400';

  return (
    <div>
      <label
        htmlFor={id}
        className={`relative flex items-center gap-3 rounded-2xl pl-2.5 pr-3.5 cursor-text transition-all duration-200 ${bingkai}`}
      >
        <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${lencana}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>

        <span className="relative flex-1 min-w-0 h-[62px]">
          <span
            className={`pointer-events-none absolute left-0 right-0 truncate transition-all duration-200 ${
              terangkat
                ? `top-2.5 text-[10.5px] font-black uppercase tracking-[0.12em] ${fokus ? 'text-blue-600' : 'text-slate-400'}`
                : 'top-1/2 -translate-y-1/2 text-[15px] font-semibold text-slate-400'
            }`}
          >
            {label}
            {opsional && <span className="normal-case tracking-normal font-semibold"> · opsional</span>}
          </span>
          <input
            id={id}
            {...input}
            autoFocus={autoFocus}
            value={value}
            placeholder={terangkat ? placeholder : ''}
            aria-invalid={tegur || undefined}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFokus(true)}
            onBlur={() => {
              setFokus(false);
              setDisentuh(true);
            }}
            /* Gaya sebaris, bukan `outline-none`: cincin `:focus-visible`
               global di globals.css berada di luar lapisan Tailwind dan selalu
               menang atas kelas utilitas. Fokusnya tetap terlihat — bingkai
               isian di atas menyala biru selama `fokus`. */
            style={{ outline: 'none' }}
            className="absolute inset-x-0 bottom-2 w-full bg-transparent text-[16px] font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal"
          />
        </span>

        <AnimatePresence>
          {valid && !tegur && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </label>

      {(tegur || petunjuk) && (
        <p
          role={tegur ? 'alert' : undefined}
          className={`mt-1.5 px-1 text-[11.5px] leading-relaxed ${tegur ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}
        >
          {tegur ? galat : petunjuk}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pilihan jenis kelamin                                              */
/* ------------------------------------------------------------------ */

const JENIS_KELAMIN: { kode: JenisKelamin; label: string; icon: React.ElementType }[] = [
  { kode: 'L', label: 'Laki-laki', icon: Mars },
  { kode: 'P', label: 'Perempuan', icon: Venus },
];

/**
 * Dua kartu pilihan, dengan sorotan yang meluncur ke kartu yang dipilih.
 *
 * Warnanya SAMA untuk keduanya — biru portal, bukan biru-merah muda. Yang
 * membedakan pilihan adalah label dan ikonnya; warna hanya menandai mana yang
 * sedang terpilih.
 *
 * Berperilaku sebagai `radiogroup` sungguhan: tombol panah berpindah pilihan,
 * dan hanya satu kartu yang dapat dicapai lewat Tab.
 */
export function PilihJenisKelamin({
  value,
  onChange,
}: {
  value: JenisKelamin | null;
  onChange: (nilai: JenisKelamin) => void;
}) {
  const geser = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;

    e.preventDefault();
    const berikut = value === 'L' ? 'P' : 'L';
    onChange(berikut);
    document.getElementById(`jk-${berikut}`)?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Jenis kelamin" className="grid grid-cols-2 gap-2.5" onKeyDown={geser}>
      {JENIS_KELAMIN.map(({ kode, label, icon: Icon }, i) => {
        const aktif = value === kode;

        return (
          <motion.button
            key={kode}
            id={`jk-${kode}`}
            type="button"
            role="radio"
            aria-checked={aktif}
            tabIndex={aktif || (value === null && i === 0) ? 0 : -1}
            onClick={() => onChange(kode)}
            whileTap={{ scale: 0.96 }}
            className={`relative overflow-hidden rounded-2xl px-3 py-3.5 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-shadow ${
              aktif ? 'shadow-lg shadow-blue-600/25' : 'ring-1 ring-slate-200 bg-white hover:ring-blue-300'
            }`}
          >
            {aktif && (
              <motion.span
                layoutId="jk-sorot"
                className="absolute inset-0 bg-gradient-to-br from-blue-600 to-sky-500"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}

            {/* Ikon DI ATAS label, bukan di sampingnya: kartu ini hanya
                ±146px di ponsel 375px, dan "Perempuan" terpotong bila
                harus berbagi baris dengan ikon. */}
            <span className="relative flex flex-col items-start gap-2">
              <span
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  aktif ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className={`block text-[14.5px] font-black leading-tight ${aktif ? 'text-white' : 'text-slate-800'}`}>
                  {label}
                </span>
                <span className={`block text-[10.5px] font-semibold ${aktif ? 'text-blue-100' : 'text-slate-400'}`}>
                  {aktif ? 'Dipilih' : 'Ketuk memilih'}
                </span>
              </span>
            </span>

            <AnimatePresence>
              {aktif && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.08 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center"
                >
                  <Check className="w-3 h-3" strokeWidth={3.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sakelar "hadir mewakili"                                           */
/* ------------------------------------------------------------------ */

/**
 * Sakelar yang membuka isian pihak yang diwakili.
 *
 * Disembunyikan di balik sakelar, bukan dipajang sebagai isian opsional
 * biasa: kebanyakan peserta hadir atas namanya sendiri, dan isian kosong yang
 * selalu terlihat mengundang diisi asal-asalan — "-", "saya sendiri", nama
 * sendiri — yang lalu tercetak di daftar hadir.
 */
export function SakelarMewakili({
  aktif,
  onToggle,
  children,
}: {
  aktif: boolean;
  onToggle: (aktif: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl transition-colors duration-200 ${
        aktif ? 'bg-blue-50/70 ring-1 ring-blue-200' : 'bg-slate-50 ring-1 ring-slate-200'
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={aktif}
        onClick={() => onToggle(!aktif)}
        className="w-full flex items-center gap-3 pl-2.5 pr-3.5 py-2.5 text-left cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            aktif ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'
          }`}
        >
          <Handshake className="w-[18px] h-[18px]" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-bold text-slate-800 leading-tight">Hadir mewakili orang lain?</span>
          <span className="block text-[11px] text-slate-500 leading-snug">Misalnya diutus pimpinan atau instansi Anda</span>
        </span>

        {/* Lintasan sakelar; kenopnya meluncur lewat animasi tata letak. */}
        <span
          className={`flex-shrink-0 w-12 h-7 rounded-full p-1 flex transition-colors duration-200 ${
            aktif ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
          }`}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 600, damping: 32 }}
            className="w-5 h-5 rounded-full bg-white shadow-sm"
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {aktif && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2.5 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Nomor telepon                                                      */
/* ------------------------------------------------------------------ */

/**
 * Rapikan nomor menjadi kelompok angka selagi diketik: "0812 3456 7890",
 * atau "+62 812 3456 7890". Hanya tampilan — backend menormalkan ulang
 * nomornya sendiri, jadi spasi di sini tidak pernah memengaruhi pencocokan.
 */
export function rapikanNomor(mentah: string): string {
  const plus = mentah.trimStart().startsWith('+');
  const angka = mentah.replace(/\D/g, '').slice(0, 15);

  if (plus) {
    const kode = angka.slice(0, 2);
    const sisa = angka.slice(2);
    const kelompok = sisa ? [sisa.slice(0, 3), ...(sisa.slice(3).match(/.{1,4}/g) ?? [])] : [];

    return ['+' + kode, ...kelompok].join(' ');
  }

  return (angka.match(/.{1,4}/g) ?? []).join(' ');
}

/**
 * Jumlah angka nomor menurut aturan backend (`Attendance::normalkanNomor`):
 * awalan negara `62` disamakan dengan `0`. Batasnya juga sama — 8 sampai 15.
 */
export function jumlahAngkaNomor(nomor: string): number {
  const angka = nomor.replace(/\D/g, '');

  return angka.startsWith('62') ? angka.length - 1 : angka.length;
}

export const NOMOR_MIN = 8;
export const NOMOR_MAKS = 15;
