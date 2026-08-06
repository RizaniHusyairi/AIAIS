'use client';

/**
 * SOP PPID — prosedur layanan informasi publik.
 *
 * Seluruh teks langkah dan tenggat berasal dari `lib/ppidData.ts`; lihat
 * provenans di sana. Berkas ini hanya presentasi.
 *
 * Gagasan tampilannya: ketiga prosedur adalah **urutan langkah dengan batas
 * waktu**, dan itu persis bentuk sebuah rencana penerbangan. Karena itu tiap
 * prosedur digambar sebagai satu rute — garis putus-putus menurun dengan
 * titik singgah bernomor, dan sebuah pesawat kecil yang merayap menyusuri
 * rute mengikuti posisi gulir. Tenggat resmi ditonjolkan sebagai lencana,
 * bukan diselipkan di tengah kalimat, karena angka itulah hak hukum pemohon.
 */

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import PpidHero from '@/components/ppid/PpidHero';
import ImageLightbox, { LightboxThumb, type LightboxImage } from '@/components/ui/ImageLightbox';
import { SOP_PENGANTAR, SOP_PROSEDUR, PPID_DASAR_HUKUM, type SopProcedure } from '@/lib/ppidData';
import {
  ListChecks, Plane, Clock, ArrowRight, ArrowDown, ShieldCheck, FileInput,
  MessageSquareWarning, Scale, Info,
} from 'lucide-react';

/* ================================================================
   Gerak
   ================================================================ */

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

/** Ikon per tahap, mengikuti urutan SOP_PROSEDUR. */
const TAHAP_ICONS = [FileInput, MessageSquareWarning, Scale];

/* ================================================================
   Rute satu prosedur
   ================================================================ */

/**
 * Daftar langkah bergaya rute penerbangan.
 *
 * Pesawatnya digerakkan oleh `useScroll` terhadap wadah daftar: saat wadah
 * bergerak melewati layar, `scrollYProgress` 0→1 dipetakan ke posisi vertikal
 * di sepanjang garis. Bila pengguna meminta gerak minimal, pesawat dipatok
 * diam di titik awal — animasinya hiasan, bukan pembawa informasi, jadi
 * mematikannya tidak menghilangkan apa pun.
 */
function RouteTimeline({ steps }: { steps: SopProcedure['steps'] }) {
  const trackRef = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start 75%', 'end 65%'],
  });

  const planeTop = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const trailScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <ol ref={trackRef} className="relative space-y-4 pl-12 sm:pl-14">
      {/* garis rute dasar */}
      <span
        className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 border-l-2 border-dashed border-slate-200"
        aria-hidden="true"
      />

      {/* jejak yang sudah dilewati, ikut mengisi seiring gulir */}
      <motion.span
        style={{ scaleY: reduceMotion ? 1 : trailScale, transformOrigin: 'top' }}
        className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 border-l-2 border-blue-500/70"
        aria-hidden="true"
      />

      {/* pesawat yang menyusuri rute */}
      {!reduceMotion && (
        <motion.span
          style={{ top: planeTop }}
          className="absolute left-[9px] sm:left-[13px] -mt-3 w-5 h-5 rounded-full bg-blue-600 shadow-lg shadow-blue-600/40 flex items-center justify-center z-10"
          aria-hidden="true"
        >
          <Plane className="w-3 h-3 text-white rotate-[135deg]" />
        </motion.span>
      )}

      {steps.map((s, i) => (
        <motion.li
          key={i}
          variants={rise}
          className="relative bg-white rounded-2xl ring-1 ring-slate-200/70 p-4 sm:p-5 transition-shadow hover:shadow-lg hover:shadow-blue-900/5"
        >
          {/* titik singgah bernomor */}
          <span className="absolute -left-12 sm:-left-14 top-4 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm flex items-center justify-center">
            <span className="text-[13px] sm:text-[15px] font-black text-blue-600 tabular-nums">
              {i + 1}
            </span>
          </span>

          <p className="text-[13.5px] text-slate-700 leading-[1.8]">{s.text}</p>

          {s.deadline && (
            <p className="mt-3 inline-flex items-start gap-1.5 bg-amber-50 text-amber-800 ring-1 ring-amber-200 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold leading-snug">
              <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
              {s.deadline}
            </p>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

/* ================================================================
   Kartu prosedur
   ================================================================ */

function ProcedureCard({
  proc,
  onOpenImage,
}: {
  proc: SopProcedure;
  onOpenImage: (image: LightboxImage) => void;
}) {
  const Icon = TAHAP_ICONS[proc.order - 1] ?? ListChecks;

  return (
    <motion.section
      id={proc.slug}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.08 }}
      className="scroll-mt-28"
    >
      {/* Kepala kartu, bergaya boarding pass */}
      <motion.div
        variants={rise}
        className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] text-white"
      >
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 px-6 py-6">
          <div className="w-14 h-14 rounded-2xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-sky-200" />
          </div>

          <div className="min-w-0 flex-1">
            {/* "nomor penerbangan" prosedur */}
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.18em] text-sky-200 bg-white/10 px-2 py-0.5 rounded">
              SOP&nbsp;·&nbsp;{String(proc.order).padStart(2, '0')}
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl font-black leading-tight">{proc.title}</h2>
            <p className="mt-1.5 text-[13px] text-blue-100/80 leading-relaxed max-w-2xl">{proc.lead}</p>
          </div>

          {/* takik perforasi + tenggat utama */}
          <div className="hidden sm:block self-stretch border-l-2 border-dashed border-white/25 relative">
            <span className="absolute -top-[26px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
            <span className="absolute -bottom-[26px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
          </div>

          <div className="flex-shrink-0 sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200/80">
              {proc.headlineLabel}
            </p>
            <p className="mt-1 text-2xl sm:text-[26px] font-black text-white leading-none tabular-nums">
              {proc.headline}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Isi kartu */}
      <div className="bg-slate-50/70 rounded-b-3xl ring-1 ring-slate-200/70 border-t-0 px-5 sm:px-7 py-7 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-blue-600 mb-4 pl-12 sm:pl-14">
            Alur Langkah
          </p>
          <RouteTimeline steps={proc.steps} />
        </div>

        <motion.div variants={rise} className="lg:col-span-5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-blue-600 mb-4">
            Bagan Resmi
          </p>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-3">
            <LightboxThumb
              image={{
                src: proc.image,
                title: proc.title,
                desc: proc.lead,
                alt: proc.imageAlt,
              }}
              onOpen={onOpenImage}
              ratio="aspect-video"
            />
            <p className="mt-3 px-1 text-[12px] text-slate-500 leading-relaxed">
              Bagan alur resmi PPID Bandar Udara A.P.T. Pranoto. Klik untuk memperbesar.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ================================================================
   Halaman
   ================================================================ */

export default function SopPpidView() {
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

  return (
    <div className="bg-slate-50">
      <PpidHero title="SOP" accent="PPID" lead={SOP_PENGANTAR} />

      {/* ============================================================ */}
      {/*  PETA TAHAP — bergaya penerbangan lanjutan (connecting)      */}
      {/* ============================================================ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Peta Tahapan
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Tiga Tahap Layanan Informasi
          </motion.h2>
          <motion.p variants={rise} className="mt-2 text-[13.5px] text-slate-500 max-w-2xl leading-relaxed">
            Sebagian besar permohonan selesai di tahap pertama. Tahap berikutnya hanya
            ditempuh bila jawaban dirasa belum sesuai.
          </motion.p>

          <div className="relative mt-9">
            {/* garis penghubung antartahap pada layar lebar */}
            <motion.span
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
              style={{ transformOrigin: 'left' }}
              className="hidden md:block absolute top-[34px] left-[16%] right-[16%] h-px border-t-2 border-dashed border-slate-300"
              aria-hidden="true"
            />

            <motion.div variants={container} className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
              {SOP_PROSEDUR.map((p, i) => {
                const Icon = TAHAP_ICONS[i] ?? ListChecks;
                return (
                  <motion.a
                    key={p.slug}
                    href={`#${p.slug}`}
                    variants={rise}
                    whileHover={{ y: -6 }}
                    className="group relative text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
                  >
                    <span className="relative z-10 w-[68px] h-[68px] mx-auto rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm flex items-center justify-center transition-all group-hover:ring-blue-300 group-hover:shadow-lg group-hover:shadow-blue-900/10">
                      <Icon className="w-7 h-7 text-blue-600" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-sm tabular-nums">
                        {p.order}
                      </span>
                    </span>

                    <div className="mt-4 bg-white rounded-2xl ring-1 ring-slate-200/70 p-5 h-full transition-shadow group-hover:shadow-lg group-hover:shadow-blue-900/5">
                      <h3 className="text-[14.5px] font-black text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                        {p.title}
                      </h3>
                      <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">{p.lead}</p>

                      <p className="mt-4 inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 ring-1 ring-amber-200 rounded-full px-2.5 py-1 text-[11px] font-bold">
                        <Clock className="w-3 h-3" />
                        {p.headline}
                      </p>

                      <p className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Lihat alurnya <ArrowDown className="w-3 h-3" />
                      </p>
                    </div>
                  </motion.a>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  PROSEDUR                                                    */}
      {/* ============================================================ */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-16 space-y-12">
        {SOP_PROSEDUR.map((p) => (
          <ProcedureCard key={p.slug} proc={p} onOpenImage={setLightbox} />
        ))}
      </div>

      {/* ============================================================ */}
      {/*  DASAR HUKUM                                                 */}
      {/* ============================================================ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="flex items-start gap-4 bg-blue-50/60 ring-1 ring-blue-100 rounded-2xl px-5 py-4"
        >
          <span className="w-9 h-9 rounded-xl bg-white ring-1 ring-blue-100 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-blue-600" />
          </span>
          <p className="text-[12.5px] text-slate-600 leading-relaxed">
            Seluruh tenggat waktu pada halaman ini mengacu pada{' '}
            <strong className="text-slate-800 font-bold">{PPID_DASAR_HUKUM}</strong>.
            Hari yang dimaksud adalah <em>hari kerja</em>, bukan hari kalender.
          </p>
        </motion.div>
      </section>

      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
