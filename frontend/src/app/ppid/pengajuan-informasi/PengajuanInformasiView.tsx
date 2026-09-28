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
 * isian tercermin langsung pada "pas permohonan" di samping formulir, dan
 * bukti pengajuan tampil sebagai boarding pass bertakik perforasi.
 *
 * Berkas ini hanya kerangka desktop. Perilaku formulir ada di
 * ./usePermohonan, isi langkahnya di ./langkah — keduanya dipakai bersama
 * layar PWA (app/app/ppid/permohonan) yang punya kerangkanya sendiri.
 */

import React, { Suspense, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import { useSetting } from '@/lib/settings';
import { Check, ArrowRight, ArrowLeft, Loader2, Search } from 'lucide-react';
import { Stepper } from './bagianFormulir';
import PasPermohonan, { AlurSesudah, KelengkapanRingkas } from './PasPermohonan';
import LacakPermohonan, { PembacaTiketTautan, useLacak } from './LacakPermohonan';
import { GalatUmum, IsiLangkah, KartuTiket, SYARAT } from './langkah';
import { usePermohonan } from './usePermohonan';
import TiketSaya from './TiketSaya';
import DialogTinggalkan from '@/components/ui/DialogTinggalkan';

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export default function PengajuanInformasiView() {
  const heroBg = useSetting('bg_ppid');
  const formTop = useRef<HTMLDivElement>(null);
  const p = usePermohonan(formTop);
  const lacak = useLacak();
  const lacakInput = useRef<HTMLInputElement>(null);

  /** Isi kolom lacak dengan tiket baru, langsung cari, lalu gulir ke sana. */
  /** Dibuka dari tautan di surel/WhatsApp bukti: langsung tampilkan statusnya. */
  const bukaTiketDariTautan = (tiket: string) => {
    lacak.cari(tiket, { simpan: true });
    setTimeout(() => document.getElementById('lacak')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  };

  const lacakSekarang = () => {
    if (!p.tiket) return;
    lacak.cari(p.tiket.ticket_number);
    document.getElementById('lacak')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => lacakInput.current?.focus({ preventScroll: true }), 500);
  };

  return (
    <div className="bg-slate-50">
      <Suspense fallback={null}>
        <PembacaTiketTautan onTiket={bukaTiketDariTautan} />
      </Suspense>

      <PpidHero
        title="Pengajuan"
        accent="Informasi Publik"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead="Setiap orang berhak memperoleh informasi publik. Ajukan permohonan Anda di halaman ini; PPID wajib menjawab dalam 10 hari kerja sejak permohonan diterima."
        bg={heroBg}
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
            {SYARAT.map((s, i) => {
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
        <div ref={formTop} className="scroll-mt-24" />

        <AnimatePresence mode="wait">
          {p.tiket ? (
            <motion.div
              key="tiket"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start"
            >
              <KartuTiket p={p} onLacak={lacakSekarang} />
              <AlurSesudah />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start"
            >
              <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-lg shadow-slate-300/20 overflow-hidden">
                <div className="px-5 sm:px-8 py-6 border-b border-slate-100">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Formulir Permohonan Informasi Publik
                  </h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Kolom bertanda <span className="text-rose-500 font-bold">*</span> wajib diisi.
                  </p>
                  <div className="mt-5">
                    <Stepper step={p.step} onPilih={p.keLangkah} />
                  </div>
                  <div className="mt-4 lg:hidden">
                    <KelengkapanRingkas form={p.form} />
                  </div>
                </div>

                <div className="px-5 sm:px-8 py-7">
                  <GalatUmum pesan={p.galatUmum} />
                  <IsiLangkah p={p} kelasAlur="lg:hidden" />
                </div>

                {/* Aksi */}
                <div className="px-5 sm:px-8 py-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => p.keLangkah(Math.max(0, p.step - 1))}
                    disabled={p.step === 0 || p.kirim}
                    className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer px-3 py-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                  </button>

                  <span className="hidden sm:block text-[11px] font-semibold text-slate-400">
                    Langkah {p.step + 1} dari 3
                  </span>

                  {p.step < 2 ? (
                    <motion.button
                      type="button"
                      onClick={p.maju}
                      whileTap={{ scale: 0.96 }}
                      className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] px-6 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors cursor-pointer"
                    >
                      Lanjut
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={p.submit}
                      disabled={p.kirim}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold text-[13px] px-6 py-3 rounded-full shadow-lg shadow-emerald-600/25 transition-colors cursor-pointer"
                    >
                      {p.kirim ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {p.kirim ? 'Mengirim…' : 'Kirim Permohonan'}
                    </motion.button>
                  )}
                </div>
              </div>

              <aside className="hidden lg:block sticky top-24" aria-label="Pratinjau permohonan">
                <PasPermohonan form={p.form} />
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ============================================================ */}
      {/*  PELACAKAN                                                   */}
      {/* ============================================================ */}
      <section id="lacak" className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-16 scroll-mt-24">
        <div className="max-w-3xl mx-auto space-y-5">
          <TiketSaya
            onPilih={(t) => {
              lacak.cari(t);
              lacakInput.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
          <LacakPermohonan ref={lacakInput} lacak={lacak} />
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
              <Search className="w-5 h-5 text-sky-200" />
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

      <DialogTinggalkan
        buka={!!p.penjaga.tujuan}
        onTetap={p.penjaga.tetap}
        onTinggalkan={p.penjaga.tinggalkan}
      />
    </div>
  );
}
