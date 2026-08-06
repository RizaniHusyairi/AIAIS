'use client';

/**
 * Pengajuan Informasi Publik — formulir permohonan menurut UU 14/2008.
 *
 * Alurnya mengikuti aptpairport.id: syarat dulu, lalu formulir dua langkah
 * (berkas → identitas & rincian). Ditambah langkah tinjauan sebelum kirim dan
 * layar tiket sesudahnya, karena pemohon perlu bukti bahwa permohonannya
 * benar-benar tercatat.
 *
 * v1 memakai SurveyJS + jQuery dari CDN unpkg. Di sini formulirnya ditulis
 * langsung: portal ini harus tetap berfungsi di jaringan bandara tanpa
 * internet (lihat catatan pada lib/mapTiles.ts), dan dua pustaka dari CDN
 * membuat halaman ini mati total di sana.
 *
 * Nuansa penerbangan: langkah digambarkan sebagai titik singgah pada rute,
 * dan bukti pengajuan tampil sebagai boarding pass bertakik perforasi.
 */

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import { API_BASE_URL } from '@/lib/api';
import {
  FileText, Upload, IdCard, ClipboardList, Check, ArrowRight, ArrowLeft,
  ExternalLink, TriangleAlert, Ticket, Search, Clock, CircleCheck, Loader2,
  Info, Copy, X,
} from 'lucide-react';

/* ================================================================
   Konstanta — harus selaras dengan InformationRequestController
   ================================================================ */

const OBTAIN_METHODS = [
  'Melihat/Membaca/Mendengarkan/Mencatat',
  'Mendapatkan Copy Salinan (Hard Copy)',
];

const COPY_METHODS = ['Langsung', 'Kurir', 'Pos', 'Fax', 'Email', 'Whatsapp'];

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,application/pdf';

/** Template surat pernyataan milik bandara, sama seperti tautan di v1. */
const TEMPLATE_URL =
  'https://docs.google.com/document/d/1hdV1e_SkNHG5KNDiYxGXsX125EaGPZwN/edit?usp=sharing&ouid=116067769203631007023&rtpof=true&sd=true';

const LANGKAH = ['Berkas Syarat', 'Data & Permohonan', 'Tinjau & Kirim'];

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/* ================================================================
   Bentuk data
   ================================================================ */

type Form = {
  ktp: File | null;
  statement: File | null;
  request_from: string;
  name: string;
  address: string;
  occupation: string;
  npwp: string;
  phone: string;
  email: string;
  information_details: string;
  information_purpose: string;
  obtain_method: string[];
  copy_method: string[];
};

const KOSONG: Form = {
  ktp: null, statement: null, request_from: '',
  name: '', address: '', occupation: '', npwp: '', phone: '', email: '',
  information_details: '', information_purpose: '',
  obtain_method: [], copy_method: [],
};

type Tiket = {
  ticket_number: string;
  due_date: string;
  submitted_at?: string;
  response_working_days?: number;
};

const LABEL_STATUS: Record<string, { text: string; cls: string }> = {
  submitted: { text: 'Diterima, menunggu diproses', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  in_progress: { text: 'Sedang diproses', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  fulfilled: { text: 'Sudah dijawab', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { text: 'Ditolak dengan alasan', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

const fmtTanggal = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

/* ================================================================
   Bagian kecil
   ================================================================ */

function Field({
  label, hint, error, required = true, children,
}: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-bold text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>}
      </span>
      {hint && <span className="block mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">{hint}</span>}
      <span className="block mt-2">{children}</span>
      {error && (
        <span className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-semibold text-rose-600">
          <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          {error}
        </span>
      )}
    </label>
  );
}

const inputCls =
  'w-full px-4 py-3 bg-white rounded-xl ring-1 ring-slate-200 text-[13.5px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

function FileField({
  label, hint, error, file, onPick,
}: {
  label: string; hint: string; error?: string; file: File | null; onPick: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <Field label={label} hint={hint} error={error}>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="sr-only"
        aria-label={label}
      />

      {file ? (
        <span className="flex items-center gap-3 bg-emerald-50 ring-1 ring-emerald-200 rounded-xl px-4 py-3">
          <CircleCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-slate-800 truncate">{file.name}</span>
            <span className="block text-[11px] text-slate-500">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </span>
          <button
            type="button"
            onClick={() => { onPick(null); if (ref.current) ref.current.value = ''; }}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white ring-1 ring-emerald-200 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label={`Hapus berkas ${label}`}
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
          Pilih berkas (JPG, PNG, atau PDF · maks. 2 MB)
        </button>
      )}
    </Field>
  );
}

function CheckGroup({
  label, options, value, error, cols = 'sm:grid-cols-2', onToggle,
}: {
  label: string; options: string[]; value: string[]; error?: string;
  cols?: string; onToggle: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[12.5px] font-bold text-slate-700">
        {label}<span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>
      </legend>

      <div className={`mt-2 grid grid-cols-1 ${cols} gap-2`}>
        {options.map((opt) => {
          const on = value.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 cursor-pointer ring-1 transition-colors ${
                on ? 'bg-blue-50 ring-blue-300' : 'bg-white ring-slate-200 hover:ring-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(opt)}
                className="sr-only"
              />
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ring-1 transition-colors ${
                  on ? 'bg-blue-600 ring-blue-600 text-white' : 'bg-white ring-slate-300 text-transparent'
                }`}
                aria-hidden="true"
              >
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="text-[12.5px] text-slate-700 leading-snug">{opt}</span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-semibold text-rose-600">
          <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Titik singgah langkah, bergaya rute penerbangan. */
function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Tahapan pengisian">
      {LANGKAH.map((nama, i) => {
        const selesai = i < step;
        const aktif = i === step;
        return (
          <React.Fragment key={nama}>
            <li className="flex items-center gap-2 min-w-0" aria-current={aktif ? 'step' : undefined}>
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-black transition-colors ${
                  selesai ? 'bg-emerald-500 text-white'
                  : aktif ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-200 text-slate-500'
                }`}
              >
                {selesai ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className={`hidden sm:block text-[12px] font-bold truncate ${aktif ? 'text-slate-900' : 'text-slate-400'}`}>
                {nama}
              </span>
            </li>
            {i < LANGKAH.length - 1 && (
              <li aria-hidden="true" className="flex-1 border-t-2 border-dashed border-slate-200 min-w-[1rem]" />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

/* ================================================================
   Halaman
   ================================================================ */

export default function PengajuanInformasiView() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(KOSONG);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kirim, setKirim] = useState(false);
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [tiket, setTiket] = useState<Tiket | null>(null);
  const formTop = useRef<HTMLDivElement>(null);

  // Pelacakan
  const [lacak, setLacak] = useState('');
  const [lacakMuat, setLacakMuat] = useState(false);
  const [lacakHasil, setLacakHasil] = useState<any>(null);
  const [lacakGalat, setLacakGalat] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  };

  const toggle = (k: 'obtain_method' | 'copy_method', v: string) =>
    set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v]);

  /** Validasi sisi klien; aturannya menyalin validator di backend. */
  const cekBerkas = (f: File | null, label: string): string | undefined => {
    if (!f) return `${label} wajib diunggah.`;
    if (f.size > MAX_FILE_BYTES) return `Ukuran ${label.toLowerCase()} tidak boleh melebihi 2MB.`;
    if (!ACCEPT.split(',').includes(f.type)) return `${label} harus berformat JPG, PNG, atau PDF.`;
    return undefined;
  };

  const validasi = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};

    if (s === 0) {
      const a = cekBerkas(form.ktp, 'Scan KTP');
      if (a) e.ktp = a;
      const b = cekBerkas(form.statement, 'Surat pernyataan');
      if (b) e.statement = b;
      if (!form.request_from.trim()) e.request_from = 'Asal surat permintaan wajib diisi.';
    }

    if (s === 1) {
      if (!form.name.trim()) e.name = 'Nama lengkap wajib diisi.';
      if (!form.address.trim()) e.address = 'Alamat wajib diisi.';
      if (!form.occupation.trim()) e.occupation = 'Pekerjaan wajib diisi.';
      if (!form.npwp.trim()) e.npwp = 'Nomor NPWP wajib diisi.';
      if (!form.phone.trim()) e.phone = 'Nomor HP/WA wajib diisi.';
      else if (!/^\+?\d{10,13}$/.test(form.phone.trim())) e.phone = 'Nomor HP/WA tidak valid (10–13 digit).';
      if (!form.email.trim()) e.email = 'Email wajib diisi.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Email tidak valid.';
      if (!form.information_details.trim()) e.information_details = 'Rincian informasi wajib diisi.';
      if (!form.information_purpose.trim()) e.information_purpose = 'Tujuan penggunaan informasi wajib diisi.';
      if (form.obtain_method.length === 0) e.obtain_method = 'Cara memperoleh informasi wajib dipilih.';
      if (form.copy_method.length === 0) e.copy_method = 'Cara mendapat salinan informasi wajib dipilih.';
    }

    return e;
  };

  const maju = () => {
    const e = validasi(step);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setStep((s) => s + 1);
    formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const mundur = () => {
    setStep((s) => Math.max(0, s - 1));
    formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    const e = { ...validasi(0), ...validasi(1) };
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setStep(Object.keys(validasi(0)).length > 0 ? 0 : 1);
      return;
    }

    setKirim(true);
    setGalatUmum(null);

    try {
      const fd = new FormData();
      fd.append('ktp', form.ktp!);
      fd.append('statement', form.statement!);
      (['request_from', 'name', 'address', 'occupation', 'npwp', 'phone', 'email',
        'information_details', 'information_purpose'] as const)
        .forEach((k) => fd.append(k, form[k].trim()));
      form.obtain_method.forEach((v) => fd.append('obtain_method[]', v));
      form.copy_method.forEach((v) => fd.append('copy_method[]', v));

      const res = await fetch(`${API_BASE_URL}/information-requests`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const json = await res.json();

      if (res.ok && json?.data?.ticket_number) {
        setTiket(json.data);
        setForm(KOSONG);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (res.status === 422 && json?.errors) {
        // Galat dari server dipetakan kembali ke kolomnya; kunci larik
        // seperti "copy_method.0" dikembalikan ke "copy_method".
        const map: Record<string, string> = {};
        Object.entries(json.errors as Record<string, string[]>).forEach(([k, v]) => {
          map[k.split('.')[0]] = v[0];
        });
        setErrors(map);
        setStep(map.ktp || map.statement || map.request_from ? 0 : 1);
        setGalatUmum('Periksa kembali isian yang ditandai.');
        return;
      }

      setGalatUmum(json?.message || 'Permohonan tidak dapat dikirim. Silakan coba lagi.');
    } catch {
      setGalatUmum('Server tidak dapat dihubungi. Periksa koneksi Anda lalu coba lagi.');
    } finally {
      setKirim(false);
    }
  };

  const cariTiket = async () => {
    const t = lacak.trim().toUpperCase();
    if (!t) return;
    setLacakMuat(true);
    setLacakGalat(null);
    setLacakHasil(null);
    try {
      const res = await fetch(`${API_BASE_URL}/information-requests/track/${encodeURIComponent(t)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok && json?.data) setLacakHasil(json.data);
      else setLacakGalat(json?.message || 'Nomor tiket tidak ditemukan.');
    } catch {
      setLacakGalat('Server tidak dapat dihubungi.');
    } finally {
      setLacakMuat(false);
    }
  };

  const ringkasan = useMemo(() => ([
    { label: 'Surat permintaan dari', value: form.request_from },
    { label: 'Nama lengkap', value: form.name },
    { label: 'Alamat', value: form.address },
    { label: 'Pekerjaan', value: form.occupation },
    { label: 'Nomor NPWP', value: form.npwp },
    { label: 'Nomor HP/WA', value: form.phone },
    { label: 'Email', value: form.email },
    { label: 'Rincian informasi', value: form.information_details },
    { label: 'Tujuan penggunaan', value: form.information_purpose },
    { label: 'Cara memperoleh', value: form.obtain_method.join(', ') },
    { label: 'Cara mendapat salinan', value: form.copy_method.join(', ') },
  ]), [form]);

  return (
    <div className="bg-slate-50">
      <PpidHero
        title="Pengajuan"
        accent="Informasi Publik"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead="Setiap orang berhak memperoleh informasi publik. Ajukan permohonan Anda di halaman ini; PPID wajib menjawab dalam 10 hari kerja sejak permohonan diterima."
      />

      {/* ============================================================ */}
      {/*  SYARAT                                                      */}
      {/* ============================================================ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Sebelum Mengisi
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Persyaratan Pengajuan
          </motion.h2>

          <motion.div variants={container} className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: IdCard,
                title: 'Scan Kartu Tanda Penduduk',
                desc: 'Berkas KTP dalam format PDF, JPG, atau PNG, berukuran maksimal 2 MB.',
              },
              {
                icon: FileText,
                title: 'Surat Pernyataan Pertanggung Jawaban',
                desc: 'Isi dan tanda tangani templat resmi, lalu unggah hasil pindaiannya.',
                link: { href: TEMPLATE_URL, label: 'Unduh Templat' },
              },
              {
                icon: ClipboardList,
                title: 'Mengisi Formulir',
                desc: 'Lengkapi identitas, rincian informasi yang diminta, dan tujuan penggunaannya.',
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.title} variants={rise} whileHover={{ y: -5 }} className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-5 transition-shadow hover:shadow-lg hover:shadow-blue-900/5">
                  <div className="flex items-start gap-3">
                    <span className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-[#0b1e5b] text-white text-[12px] font-black flex items-center justify-center flex-shrink-0 ml-auto relative overflow-hidden">
                      <span className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[14.5px] font-black text-slate-900 leading-snug">{s.title}</h3>
                  <p className="mt-1.5 text-[12.5px] text-slate-500 leading-relaxed">{s.desc}</p>
                  {s.link && (
                    <a
                      href={s.link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {s.link.label}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  FORMULIR / TIKET                                            */}
      {/* ============================================================ */}
      <section id="formulir" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14 scroll-mt-24">
        <div ref={formTop} />

        <AnimatePresence mode="wait">
          {tiket ? (
            /* ---------- Bukti pengajuan, bergaya boarding pass ---------- */
            <motion.div
              key="tiket"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <div className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70 shadow-xl shadow-slate-300/25">
                <div className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] px-6 sm:px-8 py-7 text-white">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-white" />
                    </span>
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-sky-200">
                        Permohonan Tercatat
                      </p>
                      <h2 className="mt-0.5 text-xl sm:text-2xl font-black leading-tight">
                        Terima kasih, permohonan Anda sudah kami terima
                      </h2>
                    </div>
                  </div>
                </div>

                {/* takik perforasi */}
                <div className="relative h-0">
                  <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-slate-50" />
                  <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-slate-50" />
                  <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-slate-200" />
                </div>

                <div className="px-6 sm:px-8 py-7 space-y-5">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Nomor Tiket
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-wider">
                        {tiket.ticket_number}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(tiket.ticket_number)}
                        className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11.5px] font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Salin
                      </button>
                    </div>
                    <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">
                      Simpan nomor ini. Anda memerlukannya untuk melacak status permohonan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dashed border-slate-200">
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Diterima</p>
                      <p className="mt-1 text-[13.5px] font-bold text-slate-800">{fmtTanggal(tiket.submitted_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Batas Jawaban PPID
                      </p>
                      <p className="mt-1 text-[13.5px] font-bold text-slate-800">{fmtTanggal(tiket.due_date)}</p>
                      <p className="text-[11px] text-slate-500">
                        {tiket.response_working_days ?? 10} hari kerja, dapat diperpanjang 7 hari kerja
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <a
                      href="#lacak"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] px-5 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors"
                    >
                      <Ticket className="w-4 h-4" />
                      Lacak Permohonan
                    </a>
                    <button
                      type="button"
                      onClick={() => { setTiket(null); setStep(0); }}
                      className="inline-flex items-center gap-2 bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13px] px-5 py-3 rounded-full transition-colors cursor-pointer"
                    >
                      Ajukan Permohonan Lain
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ---------- Formulir ---------- */
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
              <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-lg shadow-slate-300/20 overflow-hidden">
                <div className="px-5 sm:px-8 py-6 border-b border-slate-100">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Formulir Permohonan Informasi Publik
                  </h2>
                  <div className="mt-5">
                    <Stepper step={step} />
                  </div>
                </div>

                <div className="px-5 sm:px-8 py-7">
                  {galatUmum && (
                    <p className="mb-5 flex items-start gap-2.5 bg-rose-50 ring-1 ring-rose-200 text-rose-700 rounded-xl px-4 py-3 text-[12.5px] font-semibold" role="alert">
                      <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-px" />
                      {galatUmum}
                    </p>
                  )}

                  <AnimatePresence mode="wait">
                    {step === 0 && (
                      <motion.div
                        key="s0"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        className="space-y-6"
                      >
                        <FileField
                          label="Scan Kartu Tanda Penduduk (KTP)"
                          hint="Format PDF, JPG, atau PNG. Maksimal 2 MB."
                          error={errors.ktp}
                          file={form.ktp}
                          onPick={(f) => set('ktp', f)}
                        />

                        <FileField
                          label="Surat Pernyataan Pertanggung Jawaban"
                          hint="Unggah surat yang sudah diisi dan ditandatangani."
                          error={errors.statement}
                          file={form.statement}
                          onPick={(f) => set('statement', f)}
                        />

                        <Field
                          label="Surat Permintaan Informasi dari"
                          hint="Nama instansi atau organisasi pengaju. Tulis “Individu” bila atas nama pribadi."
                          error={errors.request_from}
                        >
                          <input
                            type="text"
                            value={form.request_from}
                            onChange={(e) => set('request_from', e.target.value)}
                            placeholder="Contoh: PT. XYZ / Individu"
                            className={inputCls}
                          />
                        </Field>
                      </motion.div>
                    )}

                    {step === 1 && (
                      <motion.div
                        key="s1"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <Field label="Nama Lengkap" error={errors.name}>
                            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                              placeholder="Nama sesuai KTP" className={inputCls} autoComplete="name" />
                          </Field>

                          <Field label="Pekerjaan" error={errors.occupation}>
                            <input type="text" value={form.occupation} onChange={(e) => set('occupation', e.target.value)}
                              placeholder="Contoh: Wiraswasta" className={inputCls} />
                          </Field>
                        </div>

                        <Field label="Alamat" error={errors.address}>
                          <textarea value={form.address} onChange={(e) => set('address', e.target.value)}
                            rows={2} placeholder="Alamat lengkap" className={`${inputCls} resize-y`} autoComplete="street-address" />
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          <Field label="Nomor NPWP" error={errors.npwp}>
                            <input type="text" value={form.npwp} onChange={(e) => set('npwp', e.target.value)}
                              placeholder="00.000.000.0-000.000" className={inputCls} />
                          </Field>

                          <Field label="Nomor HP/WA" hint="10–13 digit" error={errors.phone}>
                            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                              placeholder="08123456789" className={inputCls} autoComplete="tel" />
                          </Field>

                          <Field label="Email" error={errors.email}>
                            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                              placeholder="nama@contoh.id" className={inputCls} autoComplete="email" />
                          </Field>
                        </div>

                        <Field label="Rincian Informasi yang Dibutuhkan" error={errors.information_details}>
                          <textarea value={form.information_details} onChange={(e) => set('information_details', e.target.value)}
                            rows={4} placeholder="Jelaskan informasi yang Anda butuhkan secara rinci"
                            className={`${inputCls} resize-y`} />
                        </Field>

                        <Field label="Tujuan Penggunaan Informasi" error={errors.information_purpose}>
                          <textarea value={form.information_purpose} onChange={(e) => set('information_purpose', e.target.value)}
                            rows={3} placeholder="Jelaskan tujuan penggunaan informasi"
                            className={`${inputCls} resize-y`} />
                        </Field>

                        <CheckGroup
                          label="Cara Memperoleh Informasi"
                          options={OBTAIN_METHODS}
                          value={form.obtain_method}
                          error={errors.obtain_method}
                          onToggle={(v) => toggle('obtain_method', v)}
                        />

                        <CheckGroup
                          label="Cara Mendapat Salinan Informasi"
                          options={COPY_METHODS}
                          value={form.copy_method}
                          error={errors.copy_method}
                          cols="sm:grid-cols-3"
                          onToggle={(v) => toggle('copy_method', v)}
                        />
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="s2"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                      >
                        <p className="text-[13px] text-slate-500 leading-relaxed">
                          Periksa kembali isian Anda. Setelah dikirim, permohonan tidak dapat diubah
                          sendiri — perubahan harus disampaikan kepada petugas PPID.
                        </p>

                        <dl className="mt-5 divide-y divide-dashed divide-slate-200">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3">
                            <dt className="sm:w-56 flex-shrink-0 text-[12px] font-bold text-slate-500">Berkas</dt>
                            <dd className="text-[13px] text-slate-800 min-w-0">
                              <span className="block truncate">KTP — {form.ktp?.name ?? '—'}</span>
                              <span className="block truncate">Surat pernyataan — {form.statement?.name ?? '—'}</span>
                            </dd>
                          </div>

                          {ringkasan.map((r) => (
                            <div key={r.label} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3">
                              <dt className="sm:w-56 flex-shrink-0 text-[12px] font-bold text-slate-500">{r.label}</dt>
                              <dd className="text-[13px] text-slate-800 min-w-0 whitespace-pre-line break-words">
                                {r.value || '—'}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        <p className="mt-5 flex items-start gap-2.5 bg-blue-50/70 ring-1 ring-blue-100 text-slate-600 rounded-xl px-4 py-3 text-[12px] leading-relaxed">
                          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-px" />
                          Berkas KTP dan surat pernyataan Anda disimpan pada penyimpanan tertutup dan
                          hanya dapat dibuka petugas PPID. Keduanya tidak pernah dapat diakses publik.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Aksi */}
                <div className="px-5 sm:px-8 py-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={mundur}
                    disabled={step === 0 || kirim}
                    className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer px-3 py-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                  </button>

                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={maju}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] px-6 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors cursor-pointer"
                    >
                      Lanjut
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submit}
                      disabled={kirim}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-[13px] px-6 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors cursor-pointer"
                    >
                      {kirim ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {kirim ? 'Mengirim…' : 'Kirim Permohonan'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ============================================================ */}
      {/*  PELACAKAN                                                   */}
      {/* ============================================================ */}
      <section id="lacak" className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-16 scroll-mt-24">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl ring-1 ring-slate-200/70 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5 text-blue-600" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Lacak Permohonan</h2>
              <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
                Masukkan nomor tiket yang Anda terima saat mengirim permohonan.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={lacak}
                onChange={(e) => setLacak(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') cariTiket(); }}
                placeholder="PIP-20260802-XXXX"
                aria-label="Nomor tiket permohonan"
                className={`${inputCls} pl-10 font-mono tracking-wider uppercase`}
              />
            </div>
            <button
              type="button"
              onClick={cariTiket}
              disabled={lacakMuat || !lacak.trim()}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[13px] px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              {lacakMuat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Lacak
            </button>
          </div>

          <div aria-live="polite">
            {lacakGalat && (
              <p className="mt-4 flex items-start gap-2.5 bg-rose-50 ring-1 ring-rose-200 text-rose-700 rounded-xl px-4 py-3 text-[12.5px] font-semibold">
                <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-px" />
                {lacakGalat}
              </p>
            )}

            {lacakHasil && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 bg-slate-50 rounded-2xl ring-1 ring-slate-200 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[15px] font-black text-slate-900 tracking-wider">
                    {lacakHasil.ticket_number}
                  </p>
                  <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-full ring-1 ${
                    (LABEL_STATUS[lacakHasil.status] ?? LABEL_STATUS.submitted).cls
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {(LABEL_STATUS[lacakHasil.status] ?? LABEL_STATUS.submitted).text}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12.5px]">
                  <div>
                    <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Diterima</dt>
                    <dd className="mt-0.5 font-bold text-slate-800">{fmtTanggal(lacakHasil.submitted_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Batas Jawaban</dt>
                    <dd className="mt-0.5 font-bold text-slate-800">
                      {fmtTanggal(lacakHasil.due_date)}
                      {lacakHasil.is_extended && (
                        <span className="ml-2 text-[11px] font-semibold text-amber-700">diperpanjang</span>
                      )}
                    </dd>
                  </div>
                </dl>

                {lacakHasil.admin_response && (
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Tanggapan PPID
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-line">
                      {lacakHasil.admin_response}
                    </p>
                    {lacakHasil.response_link && (
                      <a
                        href={lacakHasil.response_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800"
                      >
                        Buka Dokumen Jawaban
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TAUTAN SILANG                                               */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-sky-200" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Cek Dulu Sebelum Mengajukan</h2>
              <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-xl">
                Sebagian informasi sudah terbuka tanpa permohonan. Menengoknya lebih dulu bisa
                menghemat waktu Anda.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/ppid/informasi-setiap-saat" className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white hover:bg-white/20 font-bold text-[13.5px] px-5 py-3 rounded-full transition-colors">
              Informasi Setiap Saat
            </Link>
            <Link href="/ppid/sop" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors">
              Lihat SOP <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
