'use client';

/**
 * Permohonan Informasi Publik di dalam PWA.
 *
 * KERANGKANYA SENDIRI, ATURANNYA BERSAMA. Dulu layar ini sekadar menaruh view
 * desktop di dalam kerangka aplikasi, karena menyalin wizard beserta aturan
 * UU 14/2008-nya berarti dua salinan yang pasti menyimpang. Kini perilaku
 * formulir hidup di `usePermohonan`, aturannya di `aturan.ts`, dan isi tiap
 * langkah di `langkah.tsx` — semuanya di app/ppid/pengajuan-informasi dan
 * dipakai kedua kerangka. Yang ditulis di sini hanya bentuk aplikasinya:
 *
 *  - kepala bergradien dengan cincin kelengkapan dan perkiraan batas jawaban,
 *  - tab Ajukan | Lacak (pemohon yang kembali biasanya hanya ingin melacak),
 *  - bilah aksi yang menempel di bawah, dalam jangkauan ibu jari,
 *  - di `md` ke atas, pas permohonan menemani formulir sebagai kolom kedua.
 *
 * Tidak ada daftar konstan baru di sini: persyaratan dan tenggat dibaca dari
 * berkas bersama, yang tenggatnya bersumber `lib/ppidData.ts`.
 */

import React, { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Clock, Loader2, Plane, Search,
  Send, ShieldCheck, Ticket, UserRoundCheck,
} from 'lucide-react';
import { StatusBar, AppHeader, Segmented } from '@/components/pwa/ui';
import { HARI_KERJA_JAWABAN, fmtTanggal } from '@/app/ppid/pengajuan-informasi/aturan';
import { LANGKAH, Stepper } from '@/app/ppid/pengajuan-informasi/bagianFormulir';
import PasPermohonan, { AlurSesudah, useKelengkapan } from '@/app/ppid/pengajuan-informasi/PasPermohonan';
import LacakPermohonan, { PembacaTiketTautan, useLacak } from '@/app/ppid/pengajuan-informasi/LacakPermohonan';
import { GalatUmum, IsiLangkah, KartuTiket, SYARAT } from '@/app/ppid/pengajuan-informasi/langkah';
import { usePermohonan } from '@/app/ppid/pengajuan-informasi/usePermohonan';
import TiketSaya from '@/app/ppid/pengajuan-informasi/TiketSaya';
import { useTiketSaya } from '@/lib/tiketSaya';
import DialogTinggalkan from '@/components/ui/DialogTinggalkan';

type Tab = 'ajukan' | 'lacak';

const SOP_PWA = '/app/ppid/sop';

/** Cincin kelengkapan kolom wajib. */
function Cincin({ persen }: { persen: number }) {
  const r = 22;
  const keliling = 2 * Math.PI * r;
  return (
    <div className="relative w-14 h-14 flex-shrink-0" role="img" aria-label={`Kelengkapan ${persen} persen`}>
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
        <motion.circle
          cx="28" cy="28" r={r} fill="none"
          stroke={persen === 100 ? '#34d399' : '#7dd3fc'}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={keliling}
          initial={false}
          animate={{ strokeDashoffset: keliling * (1 - persen / 100) }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-black text-white tabular-nums">
        {persen === 100 ? <Check className="w-5 h-5 text-emerald-300" /> : `${persen}%`}
      </span>
    </div>
  );
}

export default function PermohonanInformasiScreen() {
  const formTop = useRef<HTMLDivElement>(null);
  const p = usePermohonan(formTop);
  const lacak = useLacak();
  const tiketSaya = useTiketSaya();
  const lacakInput = useRef<HTMLInputElement>(null);
  const puncak = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('ajukan');
  const [syaratBuka, setSyaratBuka] = useState(false);
  const { lengkap, total, persen } = useKelengkapan(p.form);

  const gantiTab = (t: Tab) => {
    setTab(t);
    puncak.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Dibuka dari tautan di surel/WhatsApp bukti: langsung ke tab Lacak. */
  const bukaTiketDariTautan = (tiket: string) => {
    lacak.cari(tiket, { simpan: true });
    setTab('lacak');
  };

  const lacakSekarang = () => {
    if (!p.tiket) return;
    lacak.cari(p.tiket.ticket_number);
    gantiTab('lacak');
    setTimeout(() => lacakInput.current?.focus({ preventScroll: true }), 450);
  };

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      <Suspense fallback={null}>
        <PembacaTiketTautan onTiket={bukaTiketDariTautan} />
      </Suspense>

      {/* ---------------------------------------------------------- */}
      {/*  Kepala                                                    */}
      {/* ---------------------------------------------------------- */}
      <div ref={puncak} className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#2563eb] text-white rounded-b-[2rem]">
        <StatusBar />
        <AppHeader title="Permohonan Informasi" tone="light" />

        <div className="relative px-5 pb-6">
          <p className="text-blue-200 text-[11.5px] font-semibold">UU 14/2008 · Keterbukaan Informasi Publik</p>
          <h2 className="mt-1 text-[20px] font-black leading-tight">
            {p.tiket ? 'Permohonan Anda tercatat' : 'Ajukan & lacak permohonan informasi'}
          </h2>

          <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm p-3.5">
            {p.tiket ? (
              <span className="w-14 h-14 rounded-full bg-emerald-500/90 flex items-center justify-center flex-shrink-0">
                <Check className="w-7 h-7" />
              </span>
            ) : (
              <Cincin persen={persen} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">
                {p.tiket ? 'Batas jawaban PPID' : 'Perkiraan batas jawaban'}
              </p>
              <p className="text-[16px] font-black leading-tight">
                {fmtTanggal(p.tiket ? p.tiket.due_date : p.perkiraan)}
              </p>
              <p className="mt-0.5 text-[11px] text-blue-100/80 leading-snug">
                {p.tiket
                  ? `Tiket ${p.tiket.ticket_number}`
                  : `${lengkap}/${total} kolom wajib · ${HARI_KERJA_JAWABAN} hari kerja bila dikirim hari ini`}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { icon: Clock, t: `Dijawab ≤ ${HARI_KERJA_JAWABAN} hari kerja` },
              { icon: UserRoundCheck, t: 'Tanpa akun' },
              { icon: ShieldCheck, t: 'KTP disimpan tertutup' },
            ].map(({ icon: I, t }) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10.5px] font-semibold text-blue-50">
                <I className="w-3 h-3" /> {t}
              </span>
            ))}
          </div>
        </div>

        <motion.span
          className="absolute right-4 top-16 text-white/10"
          animate={{ x: [0, 8, 0], y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <Plane className="w-28 h-28 -rotate-12" />
        </motion.span>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  Tab                                                        */}
      {/* ---------------------------------------------------------- */}
      <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-xl px-4 py-3">
        <Segmented<Tab>
          layoutId="seg-permohonan"
          value={tab}
          onChange={gantiTab}
          options={[
            { value: 'ajukan', label: 'Ajukan', icon: <Send className="w-3.5 h-3.5" /> },
            // Jumlah tiket tersimpan ikut di label, supaya pemohon yang kembali
            // tahu riwayatnya menunggu di tab ini.
            { value: 'lacak', label: tiketSaya.length ? `Lacak Tiket (${tiketSaya.length})` : 'Lacak Tiket', icon: <Ticket className="w-3.5 h-3.5" /> },
          ]}
        />
      </div>

      <div className="flex-1 px-4 pb-6">
        <AnimatePresence mode="wait">
          {tab === 'lacak' ? (
            /* ---------------------- Lacak ---------------------- */
            <motion.div
              key="lacak"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="mx-auto w-full max-w-2xl space-y-3"
            >
              <TiketSaya
                onPilih={(t) => {
                  lacak.cari(t);
                  lacakInput.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
              <LacakPermohonan ref={lacakInput} lacak={lacak} tautanKeberatan={SOP_PWA} />
              <p className="flex items-start gap-2.5 rounded-2xl bg-white ring-1 ring-slate-200/70 px-4 py-3 text-[11.5px] text-slate-500 leading-relaxed">
                <Search className="w-4 h-4 text-blue-600 flex-shrink-0 mt-px" />
                Nomor tiket berawalan <b className="font-mono text-slate-700">PIP-</b> dan tertera
                pada bukti pengajuan. Huruf kecil otomatis dijadikan kapital.
              </p>
            </motion.div>
          ) : p.tiket ? (
            /* ---------------------- Tiket ---------------------- */
            <motion.div
              key="tiket"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto w-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start"
            >
              <div ref={formTop} className="scroll-mt-20">
                <KartuTiket p={p} onLacak={lacakSekarang} />
              </div>
              <AlurSesudah tautanSop={SOP_PWA} />
            </motion.div>
          ) : (
            /* ---------------------- Formulir ---------------------- */
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="mx-auto w-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start"
            >
              <div className="min-w-0 space-y-3">
                <div ref={formTop} className="scroll-mt-20" />

                {/* Yang perlu disiapkan — ringkas, bisa dibuka */}
                {p.step === 0 && (
                  <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSyaratBuka((b) => !b)}
                      aria-expanded={syaratBuka}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
                    >
                      <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-black text-slate-800">Yang perlu disiapkan</span>
                        <span className="block text-[11px] text-slate-500">{SYARAT.length} hal · ketuk untuk melihat</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${syaratBuka ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {syaratBuka && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100"
                        >
                          {SYARAT.map((s) => {
                            const I = s.icon;
                            return (
                              <li key={s.title} className="flex gap-3 px-4 py-3 border-b border-dashed border-slate-100 last:border-0">
                                <I className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="text-[12.5px] font-bold text-slate-800">{s.title}</p>
                                  <p className="text-[11.5px] text-slate-500 leading-relaxed">{s.desc}</p>
                                </div>
                              </li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 shadow-sm shadow-slate-200/60 overflow-hidden">
                  <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[15px] font-black text-slate-900">{LANGKAH[p.step]?.nama}</p>
                      <p className="text-[11px] font-bold text-slate-400 tabular-nums">Langkah {p.step + 1}/3</p>
                    </div>
                    <div className="mt-3">
                      <Stepper step={p.step} onPilih={p.keLangkah} ringkas />
                    </div>
                  </div>

                  <div className="px-4 py-5">
                    <GalatUmum pesan={p.galatUmum} />
                    <IsiLangkah p={p} kelasAlur="md:hidden" tautanSop={SOP_PWA} />
                  </div>
                </div>

                {p.step === 0 && (
                  <Link
                    href="/app/ppid/setiap-saat"
                    className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-slate-200/70 px-4 py-3 active:bg-slate-50"
                  >
                    <span className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Search className="w-4 h-4 text-emerald-600" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-black text-slate-800">Cek dulu sebelum mengajukan</span>
                      <span className="block text-[11px] text-slate-500">Sebagian informasi sudah terbuka tanpa permohonan</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}
              </div>

              <aside className="hidden md:block sticky top-20" aria-label="Pratinjau permohonan">
                <PasPermohonan form={p.form} tautanSop={SOP_PWA} />
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  Bilah aksi — menempel di dasar wilayah gulir, dalam        */}
      {/*  jangkauan ibu jari, di atas bilah navigasi bawah.          */}
      {/* ---------------------------------------------------------- */}
      {tab === 'ajukan' && !p.tiket && (
        // max-md:pr-[76px]: tombol Aksesibilitas global melayang `fixed` tepat
        // di ketinggian bilah ini selama bilah navigasi bawah ada (< md);
        // ruangnya disisakan supaya tidak menutupi tombol utama.
        <div className="sticky bottom-0 z-20 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl px-4 max-md:pr-[76px] py-3">
          <div className="mx-auto flex max-w-[1120px] items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => p.keLangkah(Math.max(0, p.step - 1))}
              disabled={p.step === 0 || p.kirim}
              className="w-12 h-12 rounded-full ring-1 ring-slate-200 bg-white flex items-center justify-center text-slate-600 disabled:opacity-35 flex-shrink-0"
              aria-label="Langkah sebelumnya"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>

            {p.step < 2 ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={p.maju}
                className="flex-1 h-12 rounded-full bg-blue-600 active:bg-blue-700 text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                <span>Lanjut<span className="hidden sm:inline"> ke {LANGKAH[p.step + 1]?.nama}</span></span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={p.submit}
                disabled={p.kirim}
                className="flex-1 h-12 rounded-full bg-emerald-600 active:bg-emerald-700 disabled:opacity-70 text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
              >
                {p.kirim ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {p.kirim ? 'Mengirim…' : 'Kirim Permohonan'}
              </motion.button>
            )}
          </div>
        </div>
      )}

      <DialogTinggalkan
        buka={!!p.penjaga.tujuan}
        onTetap={p.penjaga.tetap}
        onTinggalkan={p.penjaga.tinggalkan}
      />
    </div>
  );
}
