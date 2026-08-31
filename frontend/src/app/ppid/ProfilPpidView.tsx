'use client';

/**
 * Profil PPID — Pejabat Pengelola Informasi dan Dokumentasi.
 *
 * Teks tetapnya berasal dari `lib/ppidData.ts`; lihat provenans di sana.
 *
 * Tiga bagian TIDAK statis dan datang dari panel admin: SK Tim PPID, Video
 * Profil, dan Laporan Bulanan. SK dulu sebuah konstanta berisi tautan Google
 * Drive — menggantinya berarti menyunting kode dan merilis ulang portal,
 * padahal SK diperbarui tiap kali susunan tim berubah. Ketiganya dirakit di
 * `components/ppid/ProfilPpidSeksi`.
 *
 * Nuansa penerbangan dipakai sebagai bahasa visual, bukan hiasan acak:
 *   - Hero memakai `SkyParticles` yang sama dengan /flights.
 *   - Visi digambarkan sebagai "rencana terbang": satu garis rute yang
 *     ditarik saat masuk viewport, dengan empat pilar sebagai titik singgah.
 *   - Misi memakai penomoran bergaya nomor penerbangan.
 *   - Kartu dokumen memakai takik perforasi seperti boarding pass.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import ImageLightbox, { LightboxThumb, type LightboxImage } from '@/components/ui/ImageLightbox';
import { SeksiSkPpid, SeksiVideoPpid, PapanLaporanBulanan } from '@/components/ppid/ProfilPpidSeksi';
import {
  PPID_ORG, PPID_LATAR, PPID_VISI, PPID_VISI_PILAR, PPID_MISI, PPID_TUGAS,
  PPID_DOKUMEN, PPID_DASAR_HUKUM,
} from '@/lib/ppidData';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import type { PpidProfileDocument } from '@/types';
import { CONTACT } from '@/lib/airportProfile';
import {
  Quote, Target, ListChecks, FileText, ExternalLink,
  Eye, Users, Sparkles, ArrowRight, Radio, Mail, Phone, MapPin, Plane,
} from 'lucide-react';
import { useBahasa } from '@/lib/bahasa';
import { useTeks } from '@/lib/kamus';

/* ================================================================
   Gerak
   ================================================================ */

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const PILAR_ICONS = [Radio, Eye, Users, Sparkles];

export default function ProfilPpidView() {
  const t = useTeks();
  const bahasa = useBahasa();
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

  const [dokumen, setDokumen] = useState<PpidProfileDocument[]>([]);
  const heroBg = useSetting('bg_ppid');
  const videoUrl = useSetting('ppid_video_url');
  const videoGambar = useSetting('ppid_video_gambar');

  useEffect(() => {
    let batal = false;

    fetchApi<PpidProfileDocument[]>('/ppid-profile-documents').then((res) => {
      if (batal) return;
      setDokumen(res.success && Array.isArray(res.data) ? res.data : []);
    });

    return () => { batal = true; };
  }, []);

  /* Satu permintaan, dua daftar. Penyaringannya di sisi klien seperti seluruh
     halaman publik portal ini. */
  const { skBerlaku, skRiwayat, laporanBulanan } = useMemo(() => {
    const sk = dokumen.filter((d) => d.type === 'SK PPID');

    // SK yang ditandai berlaku; bila belum ada yang ditandai, SK terbaru
    // dipakai sebagai cadangan supaya bagian ini tidak kosong tanpa sebab.
    const utama = sk.find((d) => d.is_current) ?? sk[0] ?? null;

    return {
      skBerlaku: utama,
      skRiwayat: sk.filter((d) => d.id !== utama?.id),
      laporanBulanan: dokumen.filter((d) => d.type === 'Laporan Bulanan'),
    };
  }, [dokumen]);

  return (
    <div className="bg-slate-50">
      <PpidHero
        eyebrow={t.ppid.eyebrow}
        title={t.ppid.judul}
        accent={t.ppid.aksen}
        subtitle={PPID_ORG}
        lead={`${t.ppid.leadAwal} ${PPID_DASAR_HUKUM}.`}
        bg={heroBg}
      >
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/ppid/sop"
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors"
          >
            <ListChecks className="w-4 h-4" />
            {t.ppid.lihatSop}
            <ArrowRight className="w-4 h-4" />
          </Link>
          {/* Tombol SK mengikuti SK yang berlaku, dan HILANG bila belum ada
              satu pun — tombol mati lebih buruk daripada tidak ada tombol. */}
          {skBerlaku?.has_document && skBerlaku.document_url && (
            <a
              href={skBerlaku.document_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white hover:bg-white/20 font-bold text-[13.5px] px-5 py-3 rounded-full transition-colors"
            >
              <FileText className="w-4 h-4" />
              {t.ppid.skTim}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Dokumen PPID adalah dokumen hukum berbahasa Indonesia; tidak
            diterjemahkan, dan itu dikatakan terus terang. */}
        {bahasa === 'en' && (
          <p className="mt-5 text-[12.5px] text-cyan-100/80 max-w-xl">{t.ppid.catatanIsi}</p>
        )}
      </PpidHero>

      {/* ============================================================ */}
      {/*  LATAR BELAKANG                                              */}
      {/* ============================================================ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="max-w-4xl mx-auto">
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Latar Belakang
          </motion.span>

          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Mengapa PPID Ada
          </motion.h2>

          {PPID_LATAR.map((p, i) => (
            <motion.p key={i} variants={rise} className="mt-4 text-[14.5px] text-slate-600 leading-[1.85]">
              {p}
            </motion.p>
          ))}
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  VIDEO PROFIL PPID                                           */}
      {/* ============================================================ */}
      <SeksiVideoPpid url={videoUrl} gambar={videoGambar} />

      {/* ============================================================ */}
      {/*  VISI — digambarkan sebagai rencana terbang                  */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-20">
        <FlightArc className="absolute inset-x-0 top-8 h-56 text-white/12" />
        <div className="absolute -bottom-24 -left-20 w-[26rem] h-[26rem] rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center max-w-3xl mx-auto">
            <motion.span variants={rise} className="inline-flex items-center gap-2 text-sky-200 text-[11px] font-bold uppercase tracking-[0.16em] bg-white/10 px-3 py-1 rounded-full">
              <Target className="w-3.5 h-3.5" />
              Visi
            </motion.span>

            <motion.div variants={rise} className="mt-6 relative">
              <Quote className="w-9 h-9 text-sky-300/40 mx-auto" aria-hidden="true" />
              <p className="mt-3 text-xl sm:text-2xl lg:text-[27px] font-bold text-white italic leading-snug">
                {PPID_VISI}
              </p>
            </motion.div>
          </motion.div>

          {/* Empat pilar sebagai titik singgah di sepanjang rute */}
          <div className="relative mt-14">
            {/* garis rute yang menghubungkan keempat kartu pada layar lebar */}
            <motion.span
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
              style={{ transformOrigin: 'left' }}
              className="hidden lg:block absolute top-7 left-[12%] right-[12%] h-px border-t-2 border-dashed border-white/25"
              aria-hidden="true"
            />

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {PPID_VISI_PILAR.map((p, i) => {
                const Icon = PILAR_ICONS[i] ?? Radio;
                return (
                  <motion.div key={p.title} variants={rise} whileHover={{ y: -6 }} className="relative">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-white/12 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center">
                      <Icon className="w-6 h-6 text-sky-200" />
                    </div>

                    <div className="mt-4 bg-white/[0.07] ring-1 ring-white/15 rounded-2xl p-5 h-full backdrop-blur-sm">
                      <h3 className="text-white font-black text-[15px] leading-snug">{p.title}</h3>
                      <p className="mt-2 text-[12.5px] text-blue-100/80 leading-relaxed">{p.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  MISI & TUGAS                                                */}
      {/* ============================================================ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Misi */}
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="lg:col-span-7">
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Misi
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Lima Langkah Mewujudkannya
          </motion.h2>

          <motion.ol variants={container} className="mt-7 space-y-3">
            {PPID_MISI.map((m, i) => (
              <motion.li
                key={i}
                variants={rise}
                whileHover={{ x: 5 }}
                className="group flex items-start gap-4 bg-white rounded-2xl ring-1 ring-slate-200/70 p-4 transition-shadow hover:shadow-lg hover:shadow-blue-900/5"
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-[13px] flex items-center justify-center tabular-nums shadow-sm shadow-blue-600/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-[13.5px] text-slate-700 leading-relaxed pt-1.5">{m}</p>
              </motion.li>
            ))}
          </motion.ol>
        </motion.div>

        {/* Tugas & Fungsi */}
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="lg:col-span-5">
          <motion.span variants={rise} className="inline-block text-teal-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-teal-50 px-3 py-1 rounded-full">
            Tugas & Fungsi
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Yang Dikerjakan PPID
          </motion.h2>

          <motion.ul variants={container} className="mt-7 space-y-3">
            {PPID_TUGAS.map((t, i) => (
              <motion.li
                key={i}
                variants={rise}
                className="flex items-start gap-3 bg-gradient-to-br from-teal-50/70 to-white rounded-2xl ring-1 ring-teal-100 p-4"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-teal-600/10 text-teal-700 flex items-center justify-center mt-0.5">
                  <Plane className="w-3.5 h-3.5 rotate-45" />
                </span>
                <p className="text-[13.5px] text-slate-700 leading-relaxed">{t}</p>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  SK TIM PPID — kartu boarding pass, kini berdata               */}
      {/* ============================================================ */}
      <SeksiSkPpid berlaku={skBerlaku} riwayat={skRiwayat} />

      {/* ============================================================ */}
      {/*  LAPORAN BULANAN                                             */}
      {/* ============================================================ */}
      <PapanLaporanBulanan laporan={laporanBulanan} />

      {/* ============================================================ */}
      {/*  DOKUMEN BERGAMBAR                                           */}
      {/* ============================================================ */}
      <section id="dokumen" className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-20">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.span variants={rise} className="inline-block text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            Dokumen Publik
          </motion.span>
          <motion.h2 variants={rise} className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Struktur, Maklumat & Biaya Layanan
          </motion.h2>
          <motion.p variants={rise} className="mt-2 text-[13.5px] text-slate-500 max-w-2xl leading-relaxed">
            Klik salah satu dokumen untuk memperbesar. Teks pada bagan berukuran kecil,
            jadi sebaiknya dibuka lebar.
          </motion.p>

          <motion.div variants={container} className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PPID_DOKUMEN.map((d) => (
              <motion.article
                key={d.slug}
                variants={rise}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-4 transition-shadow hover:shadow-xl hover:shadow-blue-900/5"
              >
                <LightboxThumb
                  image={{ src: d.src, title: d.title, desc: d.desc, alt: d.title }}
                  onOpen={setLightbox}
                />
                <h3 className="mt-4 text-[14.5px] font-black text-slate-900">{d.title}</h3>
                <p className="mt-1 text-[12.5px] text-slate-500 leading-relaxed">{d.desc}</p>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  AJAKAN — hubungi PPID                                       */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7"
            >
              <h2 className="text-3xl font-black text-white tracking-tight">Ingin Mengajukan Permohonan Informasi?</h2>
              <p className="mt-3 text-[14px] text-blue-100/85 leading-relaxed max-w-xl">
                Prosedur, formulir, dan batas waktu jawaban selengkapnya ada di halaman SOP PPID.
                Anda juga dapat menghubungi kami secara langsung.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/ppid/sop"
                  className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-950/20 transition-colors"
                >
                  <ListChecks className="w-4 h-4" />
                  SOP PPID
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/complaints"
                  className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white hover:bg-white/20 font-bold text-[13.5px] px-5 py-3 rounded-full transition-colors"
                >
                  Hubungi Kami
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="lg:col-span-5 bg-white/[0.07] ring-1 ring-white/15 rounded-3xl p-6 backdrop-blur-sm space-y-4"
            >
              {/* Sengaja dilabeli "Kontak Resmi Bandara", bukan "Kontak PPID".
                  Nomor dan surel ini adalah kontak umum bandara; halaman PPID
                  v1 tidak mencantumkan kontak khusus PPID, dan menyebutnya
                  demikian akan menyiratkan adanya meja layanan tersendiri yang
                  belum tentu ada. Ganti bila kontak PPID resmi diterbitkan. */}
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-sky-200">Kontak Resmi Bandara</p>

              <a href={`tel:${CONTACT.phoneHref}`} className="flex items-start gap-3 group">
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-sky-200" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-blue-200/70">Telepon</span>
                  <span className="block text-[13.5px] font-bold text-white group-hover:text-sky-200 transition-colors">{CONTACT.phone}</span>
                </span>
              </a>

              <a href={`mailto:${CONTACT.email}`} className="flex items-start gap-3 group">
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-sky-200" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-blue-200/70">Surel</span>
                  <span className="block text-[13px] font-bold text-white group-hover:text-sky-200 transition-colors break-all">{CONTACT.email}</span>
                </span>
              </a>

              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-sky-200" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-blue-200/70">Alamat</span>
                  <span className="block text-[12.5px] text-blue-50 leading-relaxed">{CONTACT.address}</span>
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
