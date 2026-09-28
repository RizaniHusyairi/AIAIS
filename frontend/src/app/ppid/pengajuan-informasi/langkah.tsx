'use client';

/**
 * Isi tiap langkah formulir dan kartu tiket — dipakai bersama halaman
 * desktop dan layar PWA. Kerangka di sekelilingnya (pas samping, tab, bilah
 * aksi) milik masing-masing pemakai; isinya tidak boleh berbeda.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ChevronDown, Clock, Copy, IdCard, ClipboardList, Info, Lightbulb, Pencil,
  ShieldCheck, TriangleAlert, UserRound, Ticket, Send,
  Handshake, Truck, Mail, Printer, AtSign, MessageCircle,
} from 'lucide-react';
import {
  CARA_HARD, CARA_SOFT, COPY_METHODS, DUKUNGAN_SALINAN, KET_CARA, OBTAIN_METHODS,
  fmtTanggal, perluSalinan, rapikanTelepon, salinanDiizinkan,
} from './aturan';
import { CheckGroup, Field, FileField, Penghitung, inputCls } from './bagianFormulir';
import { AlurSesudah, TENGGAT } from './PasPermohonan';
import type { Permohonan } from './usePermohonan';

/** Persyaratan pengajuan; kartu desktop dan daftar ringkas PWA membaca ini. */
export const SYARAT = [
  {
    icon: IdCard,
    title: 'Scan Kartu Tanda Penduduk',
    desc: 'Berkas KTP dalam format PDF, JPG, atau PNG, berukuran maksimal 2 MB.',
  },
  {
    icon: ClipboardList,
    title: 'Mengisi Formulir',
    desc: 'Lengkapi identitas, rincian informasi yang diminta, dan tujuan penggunaannya.',
  },
  {
    icon: ShieldCheck,
    title: 'Tanpa Perlu Akun',
    desc: 'Permohonan dapat diajukan siapa saja tanpa mendaftar. Scan KTP disimpan tertutup dan hanya dibuka petugas PPID.',
  },
];

const IKON_SALINAN = {
  Langsung: Handshake, Kurir: Truck, Pos: Mail, Fax: Printer, Email: AtSign, Whatsapp: MessageCircle,
};

/** Panduan menulis rincian — nasihat umum, bukan contoh dokumen yang ada. */
const TIPS_RINCIAN = [
  'Sebutkan jenis informasi atau dokumennya (data, laporan, keputusan, dsb.).',
  'Cantumkan periode waktu yang dimaksud, mis. bulan atau tahun tertentu.',
  'Bila tahu, sebut unit kerja atau kegiatan yang terkait.',
  'Satu permohonan untuk satu pokok informasi agar mudah ditelusuri.',
];

const geser = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

const Subjudul = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{children}</p>
);

export function GalatUmum({ pesan }: { pesan: string | null }) {
  return (
    <AnimatePresence>
      {pesan && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-5 flex items-start gap-2.5 bg-rose-50 ring-1 ring-rose-200 text-rose-700 rounded-xl px-4 py-3 text-[12.5px] font-semibold"
          role="alert"
        >
          <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-px" />
          {pesan}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function LangkahBerkas({ p }: { p: Permohonan }) {
  const { form, errors } = p;
  return (
    <motion.div key="s0" {...geser} className="space-y-6">
      <FileField
        label="Scan Kartu Tanda Penduduk (KTP)"
        hint="Pastikan seluruh isi KTP terbaca jelas. Berkas disimpan tertutup dan hanya dibuka petugas PPID."
        error={errors.ktp}
        file={form.ktp}
        kolom="ktp"
        onPick={p.pilihKtp}
      />

      <Field
        label="Surat Permintaan Informasi dari"
        hint="Nama instansi atau organisasi pengaju. Tulis “Individu” bila atas nama pribadi."
        error={errors.request_from}
        ok={p.lolos('request_from')}
        aside={
          !form.request_from.trim() ? (
            <button
              type="button"
              onClick={p.isiIndividu}
              className="flex-shrink-0 whitespace-nowrap text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
            >
              <UserRound className="inline w-3 h-3 mr-1 -mt-px" />
              Isi “Individu”
            </button>
          ) : undefined
        }
      >
        <input
          type="text"
          data-kolom="request_from"
          value={form.request_from}
          onChange={(e) => p.set('request_from', e.target.value)}
          onBlur={() => p.sentuh('request_from')}
          placeholder="Contoh: PT. XYZ / Individu"
          className={inputCls}
        />
      </Field>
    </motion.div>
  );
}

/** Mengapa sebuah cara salinan tidak dapat dicentang. */
function alasanNonaktif(metode: string, caraMemperoleh: string[]): string {
  if (caraMemperoleh.length === 0) return 'Pilih cara memperoleh dulu';
  if (!perluSalinan(caraMemperoleh)) return 'Tidak diperlukan';
  if (DUKUNGAN_SALINAN[CARA_HARD].includes(metode)) return 'Khusus hard copy';
  if (DUKUNGAN_SALINAN[CARA_SOFT].includes(metode)) return 'Khusus soft copy';
  return 'Tidak sesuai';
}

function LangkahData({ p }: { p: Permohonan }) {
  const { form, errors, set, sentuh, lolos } = p;

  const sudahPilihCara = form.obtain_method.length > 0;
  const izin = salinanDiizinkan(form.obtain_method);
  const perlu = izin.length > 0;
  const nonaktifSalinan = Object.fromEntries(
    COPY_METHODS.filter((m) => !izin.includes(m)).map((m) => [m, alasanNonaktif(m, form.obtain_method)]),
  );
  const catatanSalinan = !sudahPilihCara ? (
    <span className="inline-flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-blue-500" />Pilih cara memperoleh informasi terlebih dahulu.</span>
  ) : !perlu ? (
    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold"><Check className="w-3.5 h-3.5" />Melihat/membaca tidak memerlukan salinan — bagian ini boleh dilewati.</span>
  ) : p.salinanDilepas.length > 0 ? (
    <span className="inline-flex items-start gap-1.5 text-amber-700 font-semibold">
      <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
      {p.salinanDilepas.join(', ')} dilepas karena tidak sesuai dengan cara memperoleh yang dipilih.
    </span>
  ) : null;
  const [tipsBuka, setTipsBuka] = useState(false);

  return (
    <motion.div key="s1" {...geser} className="space-y-6">
      <Subjudul>Identitas Pemohon</Subjudul>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Nama Lengkap" error={errors.name} ok={lolos('name')}>
          <input type="text" data-kolom="name" value={form.name}
            onChange={(e) => set('name', e.target.value)} onBlur={() => sentuh('name')}
            placeholder="Nama sesuai KTP" className={inputCls} autoComplete="name" />
        </Field>

        <Field label="Pekerjaan" error={errors.occupation} ok={lolos('occupation')}>
          <input type="text" data-kolom="occupation" value={form.occupation}
            onChange={(e) => set('occupation', e.target.value)} onBlur={() => sentuh('occupation')}
            placeholder="Contoh: Wiraswasta" className={inputCls} autoComplete="organization-title" />
        </Field>
      </div>

      <Field label="Alamat" error={errors.address} ok={lolos('address')}>
        <textarea data-kolom="address" value={form.address}
          onChange={(e) => set('address', e.target.value)} onBlur={() => sentuh('address')}
          rows={2} placeholder="Alamat lengkap" className={`${inputCls} resize-y`} autoComplete="street-address" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field label="Nomor NPWP" required={false} error={errors.npwp}>
          <input type="text" data-kolom="npwp" value={form.npwp}
            onChange={(e) => set('npwp', e.target.value)}
            placeholder="00.000.000.0-000.000" className={inputCls} inputMode="numeric" />
        </Field>

        <Field label="Nomor HP/WA" error={errors.phone} ok={lolos('phone')}>
          <input type="tel" data-kolom="phone" value={form.phone}
            onChange={(e) => set('phone', e.target.value)} onBlur={() => sentuh('phone')}
            placeholder="0812 3456 7890" className={inputCls} autoComplete="tel" inputMode="tel" />
        </Field>

        <Field label="Email" error={errors.email} ok={lolos('email')}>
          <input type="email" data-kolom="email" value={form.email}
            onChange={(e) => set('email', e.target.value)} onBlur={() => sentuh('email')}
            placeholder="nama@contoh.id" className={inputCls} autoComplete="email" inputMode="email" />
        </Field>
      </div>
      {/* Satu catatan untuk sebaris kolom: petunjuk di tiap kolom
          membuat tinggi labelnya berbeda dan isiannya tidak sejajar. */}
      <p className="-mt-3 text-[11.5px] text-slate-500 leading-relaxed">
        Nomor HP/WA 10–13 digit, boleh ditulis berspasi atau bertanda hubung. HP dan email
        dipakai PPID untuk menghubungi Anda.
      </p>

      <div className="pt-2"><Subjudul>Informasi yang Dimohon</Subjudul></div>

      <div>
        <Field
          label="Rincian Informasi yang Dibutuhkan"
          error={errors.information_details}
          ok={lolos('information_details')}
          aside={<Penghitung n={form.information_details.trim().length} saran={30} />}
        >
          <textarea data-kolom="information_details" value={form.information_details}
            onChange={(e) => set('information_details', e.target.value)} onBlur={() => sentuh('information_details')}
            rows={4} placeholder="Jelaskan informasi yang Anda butuhkan secara rinci"
            className={`${inputCls} resize-y`} />
        </Field>

        <button
          type="button"
          onClick={() => setTipsBuka((b) => !b)}
          aria-expanded={tipsBuka}
          className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Tips menulis rincian yang jelas
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${tipsBuka ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {tipsBuka && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <ul className="mt-2 rounded-xl bg-amber-50/70 ring-1 ring-amber-200/70 px-4 py-3 space-y-1.5">
                {TIPS_RINCIAN.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-relaxed">
                    <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Field
        label="Tujuan Penggunaan Informasi"
        error={errors.information_purpose}
        ok={lolos('information_purpose')}
        aside={<Penghitung n={form.information_purpose.trim().length} saran={20} />}
      >
        <textarea data-kolom="information_purpose" value={form.information_purpose}
          onChange={(e) => set('information_purpose', e.target.value)} onBlur={() => sentuh('information_purpose')}
          rows={3} placeholder="Jelaskan tujuan penggunaan informasi"
          className={`${inputCls} resize-y`} />
      </Field>

      <CheckGroup
        label="Cara Memperoleh Informasi"
        options={OBTAIN_METHODS}
        value={form.obtain_method}
        error={errors.obtain_method}
        cols="grid-cols-1"
        keterangan={KET_CARA}
        kolom="obtain_method"
        onToggle={(v) => p.toggle('obtain_method', v)}
      />

      <div>
        <CheckGroup
          label="Cara Mendapat Salinan Informasi"
          options={COPY_METHODS}
          value={form.copy_method}
          error={errors.copy_method}
          cols="grid-cols-2 sm:grid-cols-3"
          ikon={IKON_SALINAN}
          nonaktif={nonaktifSalinan}
          wajib={!sudahPilihCara || perlu}
          catatan={catatanSalinan}
          kolom="copy_method"
          onToggle={(v) => p.toggle('copy_method', v)}
        />
        <AnimatePresence>
          {p.tujuanSalinan.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-blue-50/70 ring-1 ring-blue-100 px-4 py-3">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-px" />
                <ul className="text-[11.5px] text-slate-600 leading-relaxed space-y-0.5 min-w-0 break-words">
                  {p.tujuanSalinan.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Sakelar hidup/mati bergaya iOS; `role="switch"` supaya terbaca pembaca layar. */
function Sakelar({ nyala, onUbah, label }: { nyala: boolean; onUbah: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={nyala}
      aria-label={label}
      onClick={() => onUbah(!nyala)}
      className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        nyala ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
        animate={{ x: nyala ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

/**
 * Pilihan kanal salinan bukti. Ditaruh di langkah tinjau, bukan di samping
 * kolom kontak, supaya pemohon melihat alamat tujuannya persis seperti yang
 * akan dipakai — dan menyetujuinya — tepat sebelum menekan Kirim.
 */
function KirimBuktiKe({ p }: { p: Permohonan }) {
  const { form, set } = p;
  const kanal = [
    { kunci: 'kabar_email' as const, ikon: Mail, nama: 'Email', tujuan: form.email.trim() },
    { kunci: 'kabar_whatsapp' as const, ikon: MessageCircle, nama: 'WhatsApp', tujuan: rapikanTelepon(form.phone) },
  ];

  return (
    <div className="rounded-2xl ring-1 ring-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Kirim Salinan Bukti ke</p>
      </div>
      <div className="divide-y divide-dashed divide-slate-200 px-4">
        {kanal.map((k) => {
          const Ikon = k.ikon;
          const nyala = form[k.kunci];
          return (
            <div key={k.kunci} className="flex items-center gap-3 py-3">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${nyala ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                <Ikon className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-slate-800">{k.nama}</p>
                <p className="text-[11.5px] text-slate-500 truncate">{k.tujuan || '—'}</p>
              </div>
              <Sakelar nyala={nyala} onUbah={(v) => set(k.kunci, v)} label={`Kirim salinan bukti lewat ${k.nama}`} />
            </div>
          );
        })}
      </div>
      <p className="px-4 pb-3 text-[11px] text-slate-400 leading-relaxed">
        Berisi nomor tiket, batas jawaban, dan tautan pelacakan — tanpa rincian permohonan.
        Pesan WhatsApp dikirim melalui layanan gateway pihak ketiga.
      </p>
    </div>
  );
}

function LangkahTinjau({ p, tampilkanAlur, tautanSop }: { p: Permohonan; tampilkanAlur: string; tautanSop?: string }) {
  const { form } = p;
  const kelompok: { judul: string; langkah: number; baris: { label: string; value: string }[] }[] = [
    {
      judul: 'Berkas Syarat',
      langkah: 0,
      baris: [
        { label: 'Scan KTP', value: form.ktp?.name ?? '' },
        { label: 'Surat permintaan dari', value: form.request_from },
      ],
    },
    {
      judul: 'Identitas Pemohon',
      langkah: 1,
      baris: [
        { label: 'Nama lengkap', value: form.name },
        { label: 'Pekerjaan', value: form.occupation },
        { label: 'Alamat', value: form.address },
        { label: 'Nomor NPWP', value: form.npwp },
        { label: 'Nomor HP/WA', value: rapikanTelepon(form.phone) },
        { label: 'Email', value: form.email },
      ],
    },
    {
      judul: 'Permohonan',
      langkah: 1,
      baris: [
        { label: 'Rincian informasi', value: form.information_details },
        { label: 'Tujuan penggunaan', value: form.information_purpose },
        { label: 'Cara memperoleh', value: form.obtain_method.join(', ') },
        {
          label: 'Cara mendapat salinan',
          value: perluSalinan(form.obtain_method) ? form.copy_method.join(', ') : 'Tidak diperlukan',
        },
      ],
    },
  ];

  return (
    <motion.div key="s2" {...geser} className="space-y-5">
      <p className="text-[13px] text-slate-500 leading-relaxed">
        Periksa kembali isian Anda. Setelah dikirim, permohonan tidak dapat diubah
        sendiri — perubahan harus disampaikan kepada petugas PPID.
      </p>

      {kelompok.map((g) => (
        <div key={g.judul} className="rounded-2xl ring-1 ring-slate-200 overflow-hidden">
          <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{g.judul}</p>
            <button
              type="button"
              onClick={() => p.keLangkah(g.langkah)}
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <Pencil className="w-3 h-3" /> Ubah
            </button>
          </div>
          <dl className="divide-y divide-dashed divide-slate-200 px-4">
            {g.baris.map((r) => (
              <div key={r.label} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5">
                <dt className="sm:w-48 flex-shrink-0 text-[12px] font-bold text-slate-500">{r.label}</dt>
                <dd className={`text-[13px] min-w-0 whitespace-pre-line break-words ${r.value ? 'text-slate-800' : 'text-slate-400'}`}>
                  {r.value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <KirimBuktiKe p={p} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <p className="flex items-start gap-2.5 bg-amber-50 ring-1 ring-amber-200/70 text-slate-600 rounded-xl px-4 py-3 text-[12px] leading-relaxed">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-px" />
          <span>
            Bila dikirim hari ini, PPID menjawab paling lambat{' '}
            <b className="text-slate-900">{fmtTanggal(p.perkiraan)}</b>.
          </span>
        </p>
        <p className="flex items-start gap-2.5 bg-blue-50/70 ring-1 ring-blue-100 text-slate-600 rounded-xl px-4 py-3 text-[12px] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-px" />
          Berkas KTP Anda disimpan pada penyimpanan tertutup dan hanya dapat dibuka
          petugas PPID.
        </p>
      </div>

      {/* Alur sesudah kirim, bagi tata letak yang tidak punya pas samping. */}
      <div className={`${tampilkanAlur} rounded-2xl ring-1 ring-slate-200 p-4`}>
        <AlurSesudah tipis tautanSop={tautanSop} />
      </div>
    </motion.div>
  );
}

/**
 * Isi langkah aktif, beranimasi geser.
 * `kelasAlur` mengatur kapan alur sesudah-kirim tampil di langkah tinjau,
 * mis. `lg:hidden` bila tata letak lebar sudah memuatnya di pas samping.
 */
export function IsiLangkah({ p, kelasAlur, tautanSop }: { p: Permohonan; kelasAlur: string; tautanSop?: string }) {
  return (
    <AnimatePresence mode="wait">
      {p.step === 0 && <LangkahBerkas key="s0" p={p} />}
      {p.step === 1 && <LangkahData key="s1" p={p} />}
      {p.step === 2 && <LangkahTinjau key="s2" p={p} tampilkanAlur={kelasAlur} tautanSop={tautanSop} />}
    </AnimatePresence>
  );
}

/** Bukti pengajuan bergaya boarding pass. */
export function KartuTiket({ p, onLacak }: { p: Permohonan; onLacak: () => void }) {
  const { tiket, disalin } = p;
  if (!tiket) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70 shadow-xl shadow-slate-300/25">
      <div className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] px-6 sm:px-8 py-7 text-white">
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
            className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0"
          >
            <Check className="w-6 h-6 text-white" />
          </motion.span>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-sky-200">Permohonan Tercatat</p>
            <h2 className="mt-0.5 text-xl sm:text-2xl font-black leading-tight">
              Terima kasih, permohonan Anda sudah kami terima
            </h2>
          </div>
        </div>
      </div>

      {/* takik perforasi */}
      <div className="relative h-0" aria-hidden="true">
        <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-slate-50" />
        <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-slate-50" />
        <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-slate-200" />
      </div>

      <div className="px-6 sm:px-8 py-7 space-y-5">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Nomor Tiket</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-wider select-all break-all">
              {tiket.ticket_number}
            </p>
            <button
              type="button"
              onClick={p.salinTiket}
              className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                disalin === 'ya' ? 'bg-emerald-100 text-emerald-700'
                : disalin === 'gagal' ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {disalin === 'ya' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {disalin === 'ya' ? 'Tersalin' : disalin === 'gagal' ? 'Salin manual' : 'Salin'}
            </button>
            <span className="sr-only" aria-live="polite">
              {disalin === 'ya' ? 'Nomor tiket tersalin ke papan klip.' : disalin === 'gagal' ? 'Gagal menyalin; pilih nomor tiket lalu salin secara manual.' : ''}
            </span>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">
            Simpan nomor ini — misalnya dengan tangkapan layar. Anda memerlukannya untuk melacak status permohonan.
          </p>

          {(tiket.kabar?.email || tiket.kabar?.whatsapp) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-3 flex items-start gap-2.5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200/70 px-4 py-3"
            >
              <Send className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 text-[12px] text-slate-600 leading-relaxed">
                <p className="font-bold text-emerald-800">Salinan bukti sedang dikirim</p>
                <ul className="mt-0.5 space-y-0.5 break-words">
                  {tiket.kabar?.email && <li>Email → {tiket.tujuan?.email}</li>}
                  {tiket.kabar?.whatsapp && <li>WhatsApp → {tiket.tujuan?.phone}</li>}
                </ul>
                <p className="mt-1 text-[11px] text-slate-500">Biasanya tiba dalam beberapa menit. Periksa juga folder spam.</p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dashed border-slate-200">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Diterima</p>
            <p className="mt-1 text-[13.5px] font-bold text-slate-800">{fmtTanggal(tiket.submitted_at)}</p>
          </div>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Batas Jawaban PPID</p>
            <p className="mt-1 text-[13.5px] font-bold text-slate-800">{fmtTanggal(tiket.due_date)}</p>
            <p className="text-[11px] text-slate-500">{TENGGAT.jawaban}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={onLacak}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] px-5 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            Lacak Sekarang
          </button>
          <button
            type="button"
            onClick={p.ajukanLagi}
            className="inline-flex items-center gap-2 bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13px] px-5 py-3 rounded-full transition-colors cursor-pointer"
          >
            Ajukan Permohonan Lain
          </button>
        </div>
      </div>
    </div>
  );
}
