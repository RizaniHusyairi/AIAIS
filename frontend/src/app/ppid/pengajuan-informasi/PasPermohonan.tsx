'use client';

/**
 * Pratinjau "pas permohonan" di samping formulir, terisi seiring pemohon
 * mengetik, ditambah alur sesudah pengiriman.
 *
 * Tenggat dan tahapan diambil dari `SOP_PROSEDUR` (lib/ppidData.ts, data
 * berprovenans dari portal v1), BUKAN ditulis ulang di sini: angka-angka itu
 * hak hukum pemohon dan hanya boleh hidup di satu tempat.
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check, CircleDashed, Clock, Plane, Scale, Ticket } from 'lucide-react';
import { SOP_PROSEDUR } from '@/lib/ppidData';
import {
  ATURAN, HARI_KERJA_JAWABAN, KOLOM_WAJIB, fmtTanggal, hariIniWita, perluSalinan, tambahHariKerja, type Form,
} from './aturan';

const sop = (slug: string) => SOP_PROSEDUR.find((p) => p.slug === slug);

/** Tenggat resmi per tahap, dibaca dari SOP. */
export const TENGGAT = {
  jawaban: sop('permohonan')?.steps.find((s) => s.deadline)?.deadline ?? '',
  keberatan: sop('keberatan')?.steps[0]?.deadline ?? '',
};

function Baris({ label, value, isi }: { label: string; value: React.ReactNode; isi: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-0.5 text-[12.5px] font-bold truncate ${isi ? 'text-slate-800' : 'text-slate-300'}`}>
        {value}
      </p>
    </div>
  );
}

export function useKelengkapan(form: Form) {
  return useMemo(() => {
    const lengkap = KOLOM_WAJIB.filter((k) => !ATURAN[k](form)).length;
    return { lengkap, total: KOLOM_WAJIB.length, persen: Math.round((lengkap / KOLOM_WAJIB.length) * 100) };
  }, [form]);
}

export default function PasPermohonan({ form, tautanSop }: { form: Form; tautanSop?: string }) {
  const { lengkap, total, persen } = useKelengkapan(form);
  const perkiraan = useMemo(() => tambahHariKerja(hariIniWita(), HARI_KERJA_JAWABAN), []);
  const asal = form.request_from.trim();
  const nama = form.name.trim();
  // Hanya melihat/membaca: tidak ada salinan yang perlu dikirim.
  const tanpaSalinan = form.obtain_method.length > 0 && !perluSalinan(form.obtain_method);

  return (
    <div className="space-y-5">
      {/* ---------- Pas ---------- */}
      <div className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70 shadow-lg shadow-slate-300/20">
        <div className="bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">Pas Permohonan</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">PPID · AAP</p>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[9.5px] uppercase tracking-[0.18em] text-blue-200/80">Dari</p>
              <p className={`text-[15px] font-black truncate ${asal ? 'text-white' : 'text-white/35'}`}>
                {asal || 'Asal surat'}
              </p>
            </div>
            <div className="flex-1 flex items-center gap-1 text-sky-300" aria-hidden="true">
              <span className="flex-1 border-t border-dashed border-sky-300/50" />
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              >
                <Plane className="w-4 h-4" />
              </motion.span>
              <span className="flex-1 border-t border-dashed border-sky-300/50" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[9.5px] uppercase tracking-[0.18em] text-blue-200/80">Ke</p>
              <p className="text-[15px] font-black">PPID</p>
            </div>
          </div>
        </div>

        {/* takik perforasi */}
        <div className="relative h-0" aria-hidden="true">
          <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-slate-50" />
          <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-slate-50" />
          <span className="absolute inset-x-5 top-0 border-t-2 border-dashed border-slate-200" />
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <div className="col-span-2">
            <Baris label="Pemohon" value={nama || 'Nama lengkap'} isi={!!nama} />
          </div>
          <Baris label="Berkas KTP" value={form.ktp ? 'Terlampir ✓' : 'Belum ada'} isi={!!form.ktp} />
          <Baris label="Kontak" value={form.email.trim() || form.phone.trim() || 'Email / HP'} isi={!!(form.email.trim() || form.phone.trim())} />
          <Baris
            label="Cara memperoleh"
            value={form.obtain_method.length ? `${form.obtain_method.length} dipilih` : 'Belum dipilih'}
            isi={form.obtain_method.length > 0}
          />
          <Baris
            label="Salinan via"
            value={tanpaSalinan ? 'Tidak diperlukan' : form.copy_method.join(', ') || 'Belum dipilih'}
            isi={tanpaSalinan || form.copy_method.length > 0}
          />
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500">Kelengkapan</span>
            <span className={persen === 100 ? 'text-emerald-600' : 'text-blue-600'}>
              {lengkap}/{total} kolom wajib
            </span>
          </div>
          <div
            className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={persen}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kelengkapan formulir"
          >
            <motion.div
              className={`h-full rounded-full ${persen === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
              initial={false}
              animate={{ width: `${persen}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200/70 px-3.5 py-3">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                Perkiraan batas jawaban
              </p>
              <p className="mt-0.5 text-[14px] font-black text-slate-900">{fmtTanggal(perkiraan)}</p>
              <p className="text-[11px] text-slate-600 leading-snug">
                Bila dikirim hari ini · {TENGGAT.jawaban}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AlurSesudah tautanSop={tautanSop} />
    </div>
  );
}

/** Tiga hal yang terjadi setelah permohonan dikirim. */
export function AlurSesudah({ tipis = false, tautanSop = '/ppid/sop' }: { tipis?: boolean; tautanSop?: string }) {
  const tahap = [
    {
      icon: Ticket,
      judul: 'Nomor tiket terbit seketika',
      isi: 'Nomor ini adalah tanda bukti dan nomor pendaftaran permohonan Anda. Simpan baik-baik.',
    },
    {
      icon: Check,
      judul: 'PPID memproses dan menjawab',
      isi: `Permohonan dipenuhi, atau tidak dipenuhi disertai alasan. Batasnya ${TENGGAT.jawaban}.`,
    },
    {
      icon: Scale,
      judul: 'Belum sesuai? Ajukan keberatan',
      isi: `Keberatan diajukan kepada PPID ${TENGGAT.keberatan}.`,
    },
  ];

  return (
    <div className={tipis ? '' : 'rounded-3xl bg-white ring-1 ring-slate-200/70 p-5'}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Setelah Anda mengirim
      </p>
      <ol className="mt-3 space-y-0">
        {tahap.map((t, i) => {
          const Icon = t.icon;
          return (
            <li key={t.judul} className="relative flex gap-3 pb-4 last:pb-0">
              {i < tahap.length - 1 && (
                <span className="absolute left-[15px] top-8 bottom-0 border-l-2 border-dashed border-slate-200" aria-hidden="true" />
              )}
              <span className="relative w-8 h-8 rounded-full bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[12.5px] font-black text-slate-800 leading-snug">{t.judul}</p>
                <p className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">{t.isi}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <Link
        href={tautanSop}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800"
      >
        Baca SOP lengkap <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/** Bilah kelengkapan ringkas untuk layar sempit, tempat pas samping tidak muat. */
export function KelengkapanRingkas({ form }: { form: Form }) {
  const { lengkap, total, persen } = useKelengkapan(form);
  return (
    <div className="flex items-center gap-3">
      {persen === 100
        ? <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        : <CircleDashed className="w-4 h-4 text-blue-600 flex-shrink-0" />}
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${persen === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
          initial={false}
          animate={{ width: `${persen}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-slate-500 tabular-nums">{lengkap}/{total}</span>
    </div>
  );
}
