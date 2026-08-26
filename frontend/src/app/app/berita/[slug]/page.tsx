'use client';

/**
 * Layar baca satu berita di aplikasi — inilah yang dilihat pengunjung ponsel.
 *
 * Proksi mobile melempar `/news/{slug}` ke sini, jadi layar ini yang menanggung
 * sebagian besar pembaca. Perhitungannya dibagi dengan layar desktop lewat
 * `lib/berita.ts`, dan bahasa visualnya sengaja sama: hero sinematik dengan
 * papan informasi bergaya FIDS, lembar artikel yang menaikinya, sub judul
 * bernomor titik lintasan, dan penutup bergaya papan keberangkatan.
 *
 * Yang berbeda hanyalah hal-hal yang memang harus berbeda di ponsel: daftar isi
 * jadi lembar bawah yang terjangkau satu ibu jari, dan bilah bagikan menempel
 * di kaki layar alih-alih tinggal di margin kiri.
 *
 * Kemajuan baca terikat pada wadah yang benar-benar bergulir. Cangkang aplikasi
 * menggulir di dalam sebuah `div`, bukan di jendela — mengikatnya ke `window`
 * membuat pesawatnya diam di tempat.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import SafeHtml from '@/components/SafeHtml';
import { fetchApi } from '@/lib/api';
import { urlAbsolut } from '@/lib/seo';
import { NewsItem } from '@/types';
import { StatusBar, listContainer, listItem } from '@/components/pwa/ui';
import {
  bacaDaftarIsi, gambarBerita, judulKe, tanggalPendek, terkait, tetangga, waktuBaca,
  type Bagian,
} from '@/lib/berita';
import {
  ChevronLeft, Plane, Clock, Eye, Check, Link2, MessageCircle,
  ArrowRight, ArrowLeft, ListTree, ArrowUp, Compass, Newspaper, Sparkles, ChevronRight, PenLine,
} from 'lucide-react';

export default function BeritaDetailScreen() {
  const params = useParams();
  const slug = String(params?.slug ?? '');
  const kurangiGerak = useReducedMotion();

  const [artikel, setArtikel] = useState<NewsItem | null>(null);
  const [daftar, setDaftar] = useState<NewsItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [tersalin, setTersalin] = useState(false);
  const [bukaRute, setBukaRute] = useState(false);

  const akarRef = useRef<HTMLDivElement>(null);
  const badanRef = useRef<HTMLDivElement>(null);
  const [bagian, setBagian] = useState<Bagian[]>([]);

  /* ---------- kemajuan baca ---------- */

  // Ditulis langsung ke DOM lewat `ref`, sama seperti halaman desktop —
  // alasannya di `lib/gulirBaca.ts`.
  const isiBilahRef = useRef<HTMLSpanElement>(null);
  const pesawatRef = useRef<HTMLSpanElement>(null);

  /** Wadah yang benar-benar menggulir; cangkang aplikasi menggulir di dalam div. */
  const cariPenggulir = useCallback((): HTMLElement | null => {
    let simpul: HTMLElement | null = akarRef.current?.parentElement ?? null;

    while (simpul) {
      const oy = getComputedStyle(simpul).overflowY;
      if (oy === 'auto' || oy === 'scroll') return simpul;
      simpul = simpul.parentElement;
    }

    return null;
  }, []);

  useEffect(() => {
    if (!akarRef.current) return;

    const simpul = cariPenggulir();

    const hitung = () => {
      const maks = simpul
        ? simpul.scrollHeight - simpul.clientHeight
        : document.body.scrollHeight - window.innerHeight;
      const posisi = simpul ? simpul.scrollTop : window.scrollY;
      const v = maks > 0 ? Math.min(1, Math.max(0, posisi / maks)) : 0;

      if (isiBilahRef.current) isiBilahRef.current.style.transform = `scaleX(${v})`;
      if (pesawatRef.current) pesawatRef.current.style.left = `${v * 100}%`;
    };

    const sasaran: HTMLElement | Window = simpul ?? window;
    hitung();
    sasaran.addEventListener('scroll', hitung, { passive: true });
    window.addEventListener('resize', hitung);

    return () => {
      sasaran.removeEventListener('scroll', hitung);
      window.removeEventListener('resize', hitung);
    };
  }, [artikel, cariPenggulir]);

  /* ---------- data ---------- */

  useEffect(() => {
    let batal = false;

    (async () => {
      setMemuat(true);

      const [detail, senarai] = await Promise.all([
        fetchApi<NewsItem>(`/news/${slug}`),
        fetchApi<NewsItem[]>('/news'),
      ]);

      if (batal) return;

      setArtikel(detail.success && detail.data?.title ? detail.data : null);
      setDaftar(senarai.success && Array.isArray(senarai.data) ? senarai.data : []);
      setMemuat(false);
    })();

    return () => { batal = true; };
  }, [slug]);

  useEffect(() => {
    if (!artikel) return;

    setBagian(bacaDaftarIsi(badanRef.current));
  }, [artikel]);

  const salinTaut = useCallback(async (taut: string) => {
    try {
      await navigator.clipboard.writeText(taut);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      /* peramban tanpa izin papan klip: tombol sekadar tidak berubah */
    }
  }, []);

  const lain = useMemo(() => (artikel ? terkait(daftar, artikel, 6) : []), [daftar, artikel]);
  const { sebelumnya, selanjutnya } = useMemo(() => tetangga(daftar, slug), [daftar, slug]);

  // Judul dialamatkan lewat posisi, bukan `id` — lihat `bacaDaftarIsi`.
  const lompat = (indeks: number) => {
    setBukaRute(false);
    judulKe(badanRef.current, indeks)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const keAwal = () => (cariPenggulir() ?? window).scrollTo({ top: 0, behavior: 'smooth' });

  if (memuat) return <SedangMemuat />;
  if (!artikel) return <TidakDitemukan />;

  const sampul = gambarBerita(artikel);
  const menitBaca = waktuBaca(artikel.content);

  // Yang dibagikan adalah URL kanonis portal, bukan lintasan aplikasi: tautan
  // `/app/berita/...` yang beredar di WhatsApp membawa penerimanya ke cangkang
  // aplikasi, bukan ke halaman berita yang bisa dibuka siapa pun.
  const taut = urlAbsolut(`/news/${artikel.slug}`);

  return (
    <div ref={akarRef} className="min-h-full bg-[#f6f8fc]">
      {/* Kemajuan baca — lintasan penerbangan */}
      <div className="sticky top-0 z-40 h-[3px] bg-slate-200/70">
        <span
          ref={isiBilahRef}
          className="block h-full origin-left scale-x-0 bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-400"
        />
        <span ref={pesawatRef} className="absolute -top-[7px] -ml-2 left-0">
          <Plane className="w-3.5 h-3.5 text-blue-600 fill-blue-600 rotate-45" />
        </span>
      </div>

      {/* ===== HERO ===== */}
      <header className="relative min-h-[430px] h-[62vh] max-h-[560px] overflow-hidden bg-[#050d1f] flex flex-col -mt-[3px]">
        {sampul ? (
          <motion.img
            initial={{ scale: 1.16 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            src={sampul}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#123a6b_0%,#050d1f_65%)]" />
        )}

        <div className="absolute inset-0 bg-[#050d1f]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050d1f] via-[#050d1f]/72 to-transparent" />

        <div className="absolute top-16 left-[8%] w-36 h-14 bg-white/10 blur-2xl rounded-full pointer-events-none" style={{ animation: 'cloudDrift 11s ease-in-out infinite alternate' }} />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden>
          <motion.path
            d="M-10 300 Q 150 170 410 250"
            fill="none"
            stroke="rgba(125,211,252,0.32)"
            strokeWidth="1.5"
            strokeDasharray="5 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        </svg>

        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-7 top-[30%] pointer-events-none"
        >
          <motion.div
            animate={kurangiGerak ? {} : { y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          >
            <Plane className="w-8 h-8 text-cyan-300/90 rotate-[18deg] drop-shadow-[0_6px_18px_rgba(34,211,238,0.45)]" />
          </motion.div>
        </motion.div>

        {/* Bilah atas */}
        <div className="relative z-10">
          <StatusBar />
          <div className="flex items-center justify-between px-4 pt-1">
            <Link href="/app/berita" aria-label="Kembali ke daftar berita">
              <motion.span
                whileTap={{ scale: 0.88 }}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.span>
            </Link>

            {bagian.length > 1 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setBukaRute(true)}
                className="h-10 px-3.5 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center gap-2 text-white text-[11px] font-bold uppercase tracking-[0.12em]"
              >
                <ListTree className="w-4 h-4 text-cyan-300" /> Rute
              </motion.button>
            )}
          </div>
        </div>

        {/* Judul & papan informasi */}
        <div className="relative z-10 mt-auto px-4 pb-9">
          <PapanFids artikel={artikel} menitBaca={menitBaca} />

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3.5 text-[25px] font-black text-white leading-[1.13] tracking-[-0.02em] text-balance drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]"
          >
            {artikel.title}
          </motion.h1>
        </div>
      </header>

      {/* ===== LEMBAR ARTIKEL ===== */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 250, damping: 28 }}
        className="relative z-20 -mt-6 bg-white rounded-t-[1.75rem] shadow-[0_-18px_44px_-24px_rgba(9,17,36,0.5)] pb-8"
      >
        <div className="flex justify-center pt-3.5">
          <span className="w-12 h-1.5 rounded-full bg-slate-200" aria-hidden />
        </div>

        <motion.div variants={listContainer} initial="hidden" animate="show" className="px-4 pt-5 space-y-6">
          <motion.div variants={listItem} className="relative pl-4 border-l-[3px] border-blue-600">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-blue-700 font-mono mb-1.5">Ringkasan</p>
            <p className="text-slate-700 text-[14.5px] leading-[1.7] font-medium">{artikel.excerpt}</p>
          </motion.div>

          {/* Isi artikel disaring lebih dulu — lihat components/SafeHtml.tsx. */}
          <motion.div variants={listItem} ref={badanRef}>
            <SafeHtml
              className="article-content article-content--majalah text-[15px] leading-[1.85]"
              html={artikel.content}
            />
          </motion.div>

          {/* Sobekan tiket — penanda tulisannya sudah habis */}
          <motion.div variants={listItem} className="relative rounded-2xl bg-[#f6f8fc] border border-slate-200 px-4 py-4 space-y-2">
            <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-r border-slate-200" aria-hidden />
            <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-l border-slate-200" aria-hidden />

            <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">Selesai dibaca</p>
            <p className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5 text-blue-600" /> {artikel.author}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-600" /> {menitBaca} menit</span>
              <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-600" /> {(artikel.views_count ?? 0).toLocaleString('id-ID')}</span>
            </p>
          </motion.div>

          {/* Bagikan */}
          <motion.div variants={listItem} className="flex gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${artikel.title} — ${taut}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white text-[13px] font-bold py-3 rounded-2xl active:scale-95 transition-transform"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button
              onClick={() => salinTaut(taut)}
              className={`flex-1 flex items-center justify-center gap-2 text-[13px] font-bold py-3 rounded-2xl border transition-colors active:scale-95 ${
                tersalin ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {tersalin ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {tersalin ? 'Tersalin' : 'Salin Link'}
            </button>
          </motion.div>

          {(sebelumnya || selanjutnya) && (
            <motion.div variants={listItem} className="grid grid-cols-1 gap-2">
              {selanjutnya && <KartuTetangga berita={selanjutnya} arah="selanjutnya" />}
              {sebelumnya && <KartuTetangga berita={sebelumnya} arah="sebelumnya" />}
            </motion.div>
          )}

          <motion.button
            variants={listItem}
            onClick={keAwal}
            className="w-full py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <ArrowUp className="w-3.5 h-3.5" /> Ke awal artikel
          </motion.button>
        </motion.div>
      </motion.div>

      {/* ===== PAPAN KEBERANGKATAN ===== */}
      {lain.length > 0 && <PapanKeberangkatan daftar={lain} />}

      <AnimatePresence>
        {bukaRute && <LembarRuteBaca bagian={bagian} onTutup={() => setBukaRute(false)} onLompat={lompat} />}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Metadata bergaya papan informasi penerbangan. */
function PapanFids({ artikel, menitBaca }: { artikel: NewsItem; menitBaca: number }) {
  const kolom = [
    { label: 'Kategori', nilai: artikel.category, sorot: true },
    { label: 'Terbit', nilai: tanggalPendek(artikel.published_at) },
    { label: 'Baca', nilai: `${menitBaca} Mnt` },
  ];

  return (
    <motion.div
      initial="sembunyi"
      animate="tampil"
      variants={{ tampil: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } } }}
      className="flex flex-wrap items-center gap-x-5 gap-y-2 border-l-2 border-cyan-400/70 pl-3"
    >
      {artikel.is_featured && (
        <motion.span
          variants={{ sembunyi: { opacity: 0, y: 8 }, tampil: { opacity: 1, y: 0 } }}
          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-300 bg-amber-400/15 border border-amber-300/30 px-2 py-0.5 rounded-full"
        >
          <Sparkles className="w-2.5 h-2.5" /> Utama
        </motion.span>
      )}

      {kolom.map((k) => (
        <motion.div key={k.label} variants={{ sembunyi: { opacity: 0, y: 8 }, tampil: { opacity: 1, y: 0 } }}>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/40 font-mono">{k.label}</p>
          <p className={`text-[11.5px] font-bold tracking-wide font-mono ${k.sorot ? 'text-cyan-300' : 'text-white/90'}`}>
            {k.nilai}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function KartuTetangga({ berita, arah }: { berita: NewsItem; arah: 'sebelumnya' | 'selanjutnya' }) {
  const maju = arah === 'selanjutnya';

  return (
    <Link
      href={`/app/berita/${berita.slug}`}
      className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-slate-200 active:scale-[0.98] transition-transform"
    >
      {!maju && <ArrowLeft className="w-4 h-4 text-blue-600 flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 font-mono">
          {maju ? 'Berita selanjutnya' : 'Berita sebelumnya'}
        </p>
        <p className="text-[12.5px] font-bold text-slate-900 line-clamp-2 leading-snug mt-0.5">{berita.title}</p>
      </div>
      {maju && <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0" />}
    </Link>
  );
}

/**
 * Berita lainnya sebagai papan keberangkatan.
 *
 * Bentuk daftar, bukan kartu bergulir mendatar: judulnya terbaca utuh, dan
 * enam berita muat dalam ruang yang dulu hanya memuat dua setengah kartu.
 */
function PapanKeberangkatan({ daftar }: { daftar: NewsItem[] }) {
  return (
    <section className="bg-[#0b1428] px-4 py-9">
      <div className="flex items-end justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-400 font-mono">
            Papan Keberangkatan
          </p>
          <h2 className="text-white text-[18px] font-black tracking-tight mt-0.5">Berita Berikutnya</h2>
        </div>

        <Link href="/app/berita" className="text-[11px] text-cyan-300 font-bold flex items-center gap-0.5 flex-shrink-0">
          Semua <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ul>
        {daftar.map((n, i) => (
          <motion.li
            key={n.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
          >
            <Link
              href={`/app/berita/${n.slug}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5 border-b border-white/[0.07] active:bg-white/[0.05] px-1 -mx-1 rounded-lg transition-colors"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] mb-1">
                  <span className="text-white/35 tabular-nums">{tanggalPendek(n.published_at)}</span>
                  <span className="text-cyan-300/70 truncate">{n.category}</span>
                </span>
                <span className="block text-white font-bold text-[13.5px] leading-snug line-clamp-2">
                  {n.title}
                </span>
              </span>

              <span className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-white/40 flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Daftar isi sebagai lembar yang muncul dari bawah.
 *
 * Di ponsel tidak ada ruang untuk kolom samping, sedangkan artikel panjang
 * tetap butuh cara melompat antarbagian — pola lembar bawah menjangkaunya
 * dengan satu ibu jari.
 */
function LembarRuteBaca({
  bagian, onTutup, onLompat,
}: { bagian: Bagian[]; onTutup: () => void; onLompat: (indeks: number) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Rute baca">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onTutup}
        className="absolute inset-0 bg-[#050d1f]/55 backdrop-blur-[3px]"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 330, damping: 33 }}
        className="relative w-full bg-white rounded-t-[1.75rem] max-h-[72vh] flex flex-col"
      >
        <div className="pt-3 pb-2 flex justify-center flex-shrink-0">
          <span className="w-12 h-1.5 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pb-3 flex items-center gap-2 border-b border-slate-100 flex-shrink-0">
          <ListTree className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 font-mono">Rute Baca</h3>
          <span className="ml-auto text-[10px] text-slate-400 font-mono">{bagian.length} bagian</span>
        </div>

        <ul className="overflow-y-auto px-3 py-2 pb-9">
          {bagian.map((b, i) => (
            <li key={`${i}-${b.teks}`}>
              <button
                onClick={() => onLompat(i)}
                className={`w-full text-left flex items-start gap-3 rounded-2xl px-3 py-3 active:bg-slate-50 transition-colors ${
                  b.level === 3 ? 'pl-8' : ''
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-[9.5px] font-black font-mono flex items-center justify-center flex-shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[13.5px] font-semibold text-slate-800 leading-snug pt-0.5">{b.teks}</span>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

function SedangMemuat() {
  return (
    <div className="min-h-full bg-[#f6f8fc] flex flex-col items-center justify-center gap-5 py-32">
      <motion.div
        animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
      >
        <Plane className="w-7 h-7 text-white rotate-45" />
      </motion.div>
      <p className="text-slate-400 text-[10.5px] font-bold uppercase tracking-[0.2em] font-mono">Memuat artikel</p>
    </div>
  );
}

function TidakDitemukan() {
  return (
    <div className="min-h-full bg-[#f6f8fc] flex flex-col items-center justify-center gap-5 px-6 py-28 text-center">
      <span className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
        <Compass className="w-8 h-8 text-slate-300" />
      </span>

      <div className="space-y-1.5">
        <h1 className="text-[17px] font-black text-slate-900">Berita tidak ditemukan</h1>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Artikel yang Anda cari mungkin sudah dipindahkan atau tautannya keliru.
        </p>
      </div>

      <Link
        href="/app/berita"
        className="bg-blue-600 text-white font-bold text-[13px] px-5 py-3 rounded-2xl flex items-center gap-2 active:scale-95 transition-transform"
      >
        <Newspaper className="w-4 h-4" /> Lihat Semua Berita
      </Link>
    </div>
  );
}
