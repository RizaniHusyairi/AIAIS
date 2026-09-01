'use client';

/**
 * Tiga bagian berdata pada halaman Profil PPID: SK Tim PPID, Video Profil,
 * dan daftar Laporan Bulanan.
 *
 * Ketiganya dipisahkan dari `ProfilPpidView` karena hanya ketiganya yang
 * mengambil isinya dari API; sisa halaman itu tetap presentasi murni atas
 * `lib/ppidData.ts`.
 *
 * CATATAN GERAK. Isi bagian-bagian ini lahir SETELAH data tiba, jadi daftarnya
 * memakai `animate`, bukan `whileInView`. Pengamat viewport milik pembungkus
 * sudah selesai menyala saat bagian ini masuk layar — yaitu ketika isinya masih
 * berupa rangka pemuatan — dan elemen yang menyusul kemudian tidak lagi
 * kebagian varian "show". Itu persis yang pernah membuat papan dokumen di
 * `/ppid/standar-pelayanan` tampil kosong padahal datanya ada.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoProfil from '@/components/home/VideoProfil';
import { FlightArc } from '@/components/ppid/PpidHero';
import { formatTanggal } from '@/lib/kamus';
import { useBahasa } from '@/lib/bahasa';
import type { PpidProfileDocument } from '@/types';
import {
  Scale, ExternalLink, ChevronDown, BadgeCheck, Hash, CalendarDays,
  FileClock, PlayCircle, CalendarRange, FileText,
} from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

/* ================================================================
   1. SK Tim PPID
   ================================================================ */

/** Satu baris riwayat SK, tampil di dalam penyingkap. */
function BarisRiwayat({ sk }: { sk: PpidProfileDocument }) {
  const bahasa = useBahasa();

  return (
    <motion.li
      variants={rise}
      className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-2xl ring-1 ring-slate-200/70 px-5 py-4"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold text-slate-800 leading-snug">{sk.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
          {sk.document_number && (
            <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{sk.document_number}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />{formatTanggal(sk.published_date, bahasa)}
          </span>
        </div>
      </div>

      {sk.has_document && sk.document_url ? (
        <a
          href={sk.document_url}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-600 hover:underline"
        >
          Lihat <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ) : (
        <span className="flex-shrink-0 text-[11.5px] font-semibold text-slate-400">Berkas belum tersedia</span>
      )}
    </motion.li>
  );
}

export function SeksiSkPpid({ berlaku, riwayat }: { berlaku: PpidProfileDocument | null; riwayat: PpidProfileDocument[] }) {
  const bahasa = useBahasa();
  const [bukaRiwayat, setBukaRiwayat] = useState(false);

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-16">
      {berlaku ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="relative bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-lg shadow-slate-300/25 overflow-hidden"
        >
          {/* pita aksen */}
          <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-600 to-sky-400" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pl-7 pr-6 py-7">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Scale className="w-6 h-6 text-blue-600" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-blue-600">Dokumen Penetapan</p>
                {berlaku.is_current && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                    <BadgeCheck className="w-3 h-3" /> Berlaku
                  </span>
                )}
              </div>

              <h3 className="mt-1.5 text-[16px] font-black text-slate-900 leading-snug">{berlaku.title}</h3>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
                {berlaku.document_number && (
                  <span className="inline-flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{berlaku.document_number}</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />{formatTanggal(berlaku.published_date, bahasa)}
                </span>
              </div>

              {berlaku.description && (
                <p className="mt-2 text-[13px] text-slate-500 leading-relaxed max-w-2xl">{berlaku.description}</p>
              )}
            </div>

            {/* takik perforasi seperti boarding pass */}
            <span className="hidden sm:block self-stretch border-l-2 border-dashed border-slate-200 relative">
              <span className="absolute -top-3 -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
              <span className="absolute -bottom-3 -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
            </span>

            {/* Tombol hanya ada bila berkasnya benar-benar ada. Tombol unduh
                yang berujung 404 pada dokumen penetapan lebih buruk daripada
                mengaku belum tersedia. */}
            {berlaku.has_document && berlaku.document_url ? (
              <a
                href={berlaku.document_url}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] px-5 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors"
              >
                Lihat Dokumen
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="flex-shrink-0 inline-flex items-center gap-2 bg-slate-100 text-slate-500 font-bold text-[13px] px-5 py-3 rounded-full">
                <FileClock className="w-4 h-4" /> Berkas belum tersedia
              </span>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 px-6 py-10 text-center">
          <p className="text-[13.5px] font-bold text-slate-700">Belum ada SK Tim PPID yang ditayangkan.</p>
          <p className="mt-1 text-[12.5px] text-slate-500">Dokumen penetapan akan tampil di sini setelah diunggah petugas.</p>
        </div>
      )}

      {/* Riwayat SK — tertutup secara bawaan supaya SK yang berlaku tetap
          jadi yang pertama terbaca, tanpa menghilangkan SK lama dari portal. */}
      {riwayat.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setBukaRiwayat((v) => !v)}
            aria-expanded={bukaRiwayat}
            className="inline-flex items-center gap-2 text-[12.5px] font-bold text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            <motion.span animate={{ rotate: bukaRiwayat ? 180 : 0 }} transition={{ type: 'spring', stiffness: 340, damping: 26 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.span>
            Riwayat SK ({riwayat.length})
          </button>

          <AnimatePresence initial={false}>
            {bukaRiwayat && (
              <motion.div
                key="riwayat"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 30, opacity: { duration: 0.18 } }}
                className="overflow-hidden"
              >
                <motion.ul variants={container} initial="hidden" animate="show" className="mt-3 space-y-3">
                  {riwayat.map((sk) => <BarisRiwayat key={sk.id} sk={sk} />)}
                </motion.ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

/* ================================================================
   2. Video Profil PPID
   ================================================================ */

/**
 * Bagian video. Tidak dirender sama sekali bila belum ada tautannya —
 * pemutar kosong hanya menjanjikan sesuatu yang tidak ada.
 *
 * Pemutarnya memakai `VideoProfil` yang sama dengan beranda, bukan salinan:
 * seluruh jaminan privasinya bergantung pada iframe YouTube yang hanya lahir
 * sesudah tombol putar ditekan.
 */
export function SeksiVideoPpid({ url, gambar }: { url: string; gambar: string }) {
  if (!url.trim()) return null;

  const sampul = gambar.trim() || '/ppid/struktur-ppid.jpg';

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-8 lg:gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
            <PlayCircle className="w-3.5 h-3.5" /> Video Profil
          </span>
          <h2 className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
            Mengenal PPID Bandara
          </h2>
          <p className="mt-3 text-[13.5px] text-slate-500 leading-relaxed max-w-xl">
            Sekilas layanan informasi publik bandara: siapa yang mengelolanya, informasi apa saja
            yang tersedia, dan bagaimana cara mengajukan permohonannya.
          </p>
          <p className="mt-4 text-[12px] text-slate-400 leading-relaxed max-w-xl">
            Pemutar YouTube baru dimuat setelah Anda menekan tombol putar, sehingga menjelajah
            halaman ini tidak membuat Anda ikut terlacak.
          </p>
        </motion.div>

        {/* Bingkai gelap membawa nuansa langit ke bagian yang terang ini tanpa
            menjadikan seluruh pitanya gelap — bagian Visi tepat di bawah sudah
            berupa pita gelap, dan dua pita gelap berdempet terbaca sebagai
            sambungan yang keliru, bukan sebagai rancangan. */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
          className="relative rounded-[28px] p-2.5 bg-gradient-to-br from-[#0b1e5b] via-blue-800 to-sky-600 shadow-2xl shadow-blue-950/25"
        >
          <FlightArc className="absolute inset-x-0 -top-2 w-full h-24 text-white/20 pointer-events-none" d="M-20 150 Q 420 40 1020 120" />

          <div className="relative rounded-[20px] overflow-hidden ring-1 ring-white/15">
            <VideoProfil
              gambar={sampul}
              videoUrl={url}
              caption="Profil Bandara"
              tinggiKelas="aspect-video h-auto"
              captionHref="/ppid"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}


/* ================================================================
   3. Daftar Laporan Bulanan
   ================================================================ */

/**
 * Rekapitulasi layanan informasi publik.
 *
 * Namanya "Laporan Bulanan", tetapi PPID bandara menerbitkan seluruh bulan
 * sebagai satu dokumen — karena itu seksi ini daftar dokumen, bukan papan dua
 * belas bulan. Papan lama memaksa sebelas kotak permanen bertuliskan "belum
 * terbit" untuk laporan yang sebenarnya sudah lengkap.
 */
export function PapanLaporanBulanan({ laporan }: { laporan: PpidProfileDocument[] }) {
  const bahasa = useBahasa();

  return (
    <section id="laporan-bulanan" className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-20 scroll-mt-24">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
        <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1 rounded-full">
          <CalendarRange className="w-3.5 h-3.5" /> Laporan Bulanan
        </span>
        <h2 className="mt-3 text-3xl font-black text-slate-900 tracking-tight">Laporan Bulanan PPID</h2>
        <p className="mt-2 text-[13.5px] text-slate-500 max-w-2xl leading-relaxed">
          Rekapitulasi layanan informasi publik. Dokumen yang keberadaannya sudah
          dicatat tetapi berkasnya belum terbit tetap ditampilkan apa adanya.
        </p>
      </motion.div>

      {laporan.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white ring-1 ring-slate-200/70 px-6 py-10 text-center">
          <p className="text-[13.5px] font-bold text-slate-700">Belum ada laporan yang ditayangkan.</p>
          <p className="mt-1 text-[12.5px] text-slate-500">Laporan akan tampil di sini setelah diunggah petugas.</p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {laporan.map((doc) => {
            const bisaDibuka = doc.has_document && !!doc.document_url;

            return (
              <motion.article
                key={doc.id}
                variants={rise}
                whileHover={bisaDibuka ? { y: -5 } : undefined}
                className="group relative flex flex-col h-full overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 pl-6 pr-5 py-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-blue-900/5"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-sky-400" />

                <h3 className="text-[15px] font-black text-slate-900 leading-snug">{doc.title}</h3>

                {/* Nomor dan tanggal satu baris: keduanya keterangan pendek, dan
                    menumpuknya membuat kartu tinggi tanpa menambah kejelasan. */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
                  {doc.document_number && (
                    <span className="inline-flex items-center gap-1.5">
                      <Hash className="w-3 h-3 flex-shrink-0" />{doc.document_number}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3 flex-shrink-0" />{formatTanggal(doc.published_date, bahasa)}
                  </span>
                </div>

                {/* `mt-auto` merapatkan aksi ke dasar kartu supaya sederet kartu
                    berjudul sepanjang apa pun tetap sebaris tombolnya. */}
                <div className="mt-auto pt-4">
                  {bisaDibuka ? (
                    <a
                      href={doc.document_url as string}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" /> Lihat Laporan
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-600">
                      <FileClock className="w-3.5 h-3.5 flex-shrink-0" /> Berkas belum tersedia
                    </span>
                  )}
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
