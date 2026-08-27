'use client';

/**
 * Penampil satu artikel berita — dipakai halaman publik dan pratinjau admin.
 *
 * BENTUKNYA. Artikel disusun seperti satu penerbangan, bukan seperti kartu
 * berita yang diperbesar:
 *
 *   1. Hero setinggi layar sebagai "keberangkatan" — sampul sinematik dengan
 *      papan informasi bergaya FIDS, bukan kartu putih melayang.
 *   2. Lembar artikel putih yang menaiki hero, dibaca dalam satu lajur selebar
 *      ±68 aksara dengan huruf inisial besar dan sub judul bernomor titik
 *      lintasan (gayanya di `globals.css`, kelas `.article-content--majalah`).
 *   3. Rel tegak di margin kiri: kemajuan baca sebagai lintasan menurun berikut
 *      tombol bagikan — menggantikan bilah tipis di puncak halaman yang selalu
 *      berebut tempat dengan navbar.
 *   4. Penutup bergaya sobekan tiket dan papan keberangkatan.
 *
 * KENAPA BERKAS TERSENDIRI. Panel admin perlu menampilkan artikel yang BELUM
 * tersimpan, dirender dari isian yang sedang diketik. Menyalin tata letaknya ke
 * sana berarti dua salinan yang cepat atau lambat berbeda — dan pratinjau yang
 * berbeda dari hasil terbitnya lebih buruk daripada tidak ada pratinjau.
 * Komponen ini murni: ia hanya menerima artikel dan daftar, tanpa memanggil API.
 *
 * PROP `pratinjau` mematikan perkakas yang memang tidak dapat bekerja pada
 * tulisan yang belum tersimpan — rincian dan alasannya di bawah.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import SafeHtml from '@/components/SafeHtml';
import SkyParticles from '@/components/effects/SkyParticles';
import { urlAbsolut } from '@/lib/seo';
import { useKemajuanBaca, useKemajuanHero } from '@/lib/gulirBaca';
import { NewsItem } from '@/types';
import {
  bacaDaftarIsi, gambarBerita, judulKe, semuaJudul, tanggalPanjang, tanggalPendek, terkait,
  terpopuler, tetangga, waktuBaca, type Bagian,
} from '@/lib/berita';
import {
  Eye, ArrowLeft, ArrowRight, Plane, Clock, Link2, Check, MessageCircle, Share2,
  ChevronRight, ChevronDown, Sparkles, ListTree, ArrowUp, PenLine,
} from 'lucide-react';

/* ================================================================== */

/**
 * @param daftar  Berita lain untuk blok penjelajahan. Beri array kosong dan
 *                ketiga bloknya (terkait, terpopuler, tetangga) hilang sendiri.
 * @param pratinjau  Mode pratinjau panel admin.
 *
 * KENAPA `pratinjau` MEMATIKAN SEBAGIAN PERKAKAS. Seluruh pengukuran kemajuan
 * baca terikat pada `window` (lihat `lib/gulirBaca.ts`). Di halaman publik itu
 * benar — jendelalah yang bergulir. Di dalam hamparan pratinjau yang punya
 * scrollport sendiri, pengukurnya membaca posisi gulir HALAMAN FORM di
 * baliknya: rel kemajuan membeku di 0% dan hero meredup tanpa sebab. Perkakas
 * yang tidak dapat bekerja lebih baik tidak ditampilkan daripada ditampilkan
 * dalam keadaan rusak.
 *
 * Tombol bagikan juga disembunyikan: tautannya menunjuk slug yang belum ada.
 * "Rute Baca" justru DIPERTAHANKAN — memeriksa susunan sub judul adalah salah
 * satu alasan utama petugas membuka pratinjau.
 */
export default function TampilanBerita({
  artikel,
  daftar,
  pratinjau = false,
}: {
  artikel: NewsItem;
  daftar: NewsItem[];
  pratinjau?: boolean;
}) {
  const kurangiGerak = !!useReducedMotion();

  const badanRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const bacaanRef = useRef<HTMLDivElement>(null);

  const [bagian, setBagian] = useState<Bagian[]>([]);
  const [bagianAktif, setBagianAktif] = useState(-1);
  const [tersalin, setTersalin] = useState(false);

  /* ---------- daftar isi ---------- */

  useEffect(() => {
    setBagian(bacaDaftarIsi(badanRef.current));
  }, [artikel]);

  /* ---------- bagian yang sedang dibaca ---------- */

  // Pengamatnya dipasang pada render BERIKUTNYA, sesudah `bagian` mengendap —
  // pada saat itulah simpul yang diamati sudah simpul terakhir yang dipasang
  // React, bukan simpul yang sebentar lagi ditulis ulang.
  useEffect(() => {
    const judul = semuaJudul(badanRef.current);
    if (judul.length === 0) return;

    const pengamat = new IntersectionObserver(
      (entri) => {
        const terlihat = entri
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (terlihat) setBagianAktif(judul.indexOf(terlihat.target as HTMLElement));
      },
      // Jendela sempit di bawah navbar: bagian yang "sedang dibaca" adalah yang
      // barusan melewati batas atas, bukan yang paling besar di layar.
      { rootMargin: '-100px 0px -68% 0px', threshold: 0 },
    );

    judul.forEach((el) => pengamat.observe(el));

    return () => pengamat.disconnect();
  }, [bagian]);

  const salinTaut = useCallback(async (taut: string) => {
    try {
      await navigator.clipboard.writeText(taut);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      /* peramban tanpa izin papan klip: tombol sekadar tidak berubah */
    }
  }, []);

  const lain = useMemo(() => terkait(daftar, artikel, 5), [daftar, artikel]);
  const populer = useMemo(() => terpopuler(daftar, artikel.slug, 4), [daftar, artikel.slug]);
  const { sebelumnya, selanjutnya } = useMemo(() => tetangga(daftar, artikel.slug), [daftar, artikel.slug]);

  const taut = urlAbsolut(`/news/${artikel.slug}`);
  const menitBaca = waktuBaca(artikel.content);

  return (
    /* JANGAN menambahkan `overflow-x-hidden` di sini. `overflow-x` selain
       `visible` menjadikan elemen ini scrollport, dan `position: sticky` pada
       SELURUH keturunannya berhenti bekerja tanpa pesan apa pun — rel tegak
       dan sidebar akan tergulir keluar layar. Hero sudah menahan luapan
       mendatarnya sendiri lewat `overflow-hidden` miliknya. */
    <div className="relative bg-[#f6f8fc]">
      {/* Bilah kemajuan mendatar hanya di bawah xl, tempat rel tegak tidak muat. */}
      {!pratinjau && <BilahKemajuan bacaanRef={bacaanRef} />}

      <Hero
        artikel={artikel}
        menitBaca={menitBaca}
        heroRef={heroRef}
        kurangiGerak={kurangiGerak}
        pratinjau={pratinjau}
      />

      {/* ===== LEMBAR ARTIKEL — menaiki hero ===== */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 240, damping: 28 }}
        className="relative z-20 -mt-12 md:-mt-16 bg-white rounded-t-[2rem] md:rounded-t-[3rem] shadow-[0_-24px_60px_-30px_rgba(9,17,36,0.55)]"
      >
        <div className="flex justify-center pt-4">
          <span className="w-14 h-1.5 rounded-full bg-slate-200" aria-hidden />
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 md:pt-12 pb-16">
          {/* Tanpa `items-start`, setiap kolom setinggi barisnya — itulah syarat
              agar anak `sticky` di dalamnya punya ruang untuk ikut turun.
              Dengan `items-start`, sel gridnya menyusut setinggi isinya sendiri
              dan rel maupun sidebar tergulir keluar layar begitu terlewati. */}
          <div className="grid grid-cols-1 xl:grid-cols-[72px_minmax(0,1fr)_286px] gap-x-8 gap-y-10">
            <div className="hidden xl:block">
              {!pratinjau && (
                <RelTegak
                  bacaanRef={bacaanRef}
                  taut={taut}
                  judul={artikel.title}
                  tersalin={tersalin}
                  salinTaut={salinTaut}
                />
              )}
            </div>

            <article ref={bacaanRef} className="min-w-0 xl:max-w-[68ch]">
              <Sari teks={artikel.excerpt} />

              {/* Isi artikel berupa HTML dari editor panel admin; disaring lebih
                  dulu — lihat alasannya di components/SafeHtml.tsx. */}
              <div ref={badanRef} className="mt-8">
                <SafeHtml className="article-content article-content--lega article-content--majalah" html={artikel.content} />
              </div>

              <SobekanTiket
                artikel={artikel}
                menitBaca={menitBaca}
                taut={taut}
                tersalin={tersalin}
                salinTaut={salinTaut}
                pratinjau={pratinjau}
              />

              <NavigasiTetangga sebelumnya={sebelumnya} selanjutnya={selanjutnya} />
            </article>

            <div>
              <aside className="xl:sticky xl:top-[92px] space-y-4 xl:space-y-5">
                {bagian.length > 1 && <RuteBaca bagian={bagian} aktif={bagianAktif} badanRef={badanRef} />}
                <PapanTerpopuler daftar={populer} />
                <KartuJadwal />
              </aside>
            </div>
          </div>
        </div>

        <PapanKeberangkatan daftar={lain} />
      </motion.div>
    </div>
  );
}

/* ------------------------------ hero ------------------------------ */

/**
 * "Keberangkatan" — hero setinggi layar.
 *
 * Metadatanya ditulis sebagai papan informasi penerbangan (mono, huruf besar,
 * berjarak lebar), bukan sebagai kartu putih melayang. Itu yang membuat halaman
 * ini terbaca sebagai bagian dari sebuah bandara, bukan halaman blog biasa.
 */
function Hero({
  artikel, menitBaca, heroRef, kurangiGerak, pratinjau,
}: {
  artikel: NewsItem;
  menitBaca: number;
  heroRef: React.RefObject<HTMLDivElement | null>;
  kurangiGerak: boolean;
  pratinjau: boolean;
}) {
  const sampul = gambarBerita(artikel);
  const lapisRef = useRef<HTMLDivElement>(null);

  // Paralaks: sampul turun lebih lambat daripada halaman sambil meredup dan
  // sedikit membesar. Ditulis langsung ke DOM — alasannya di `lib/gulirBaca.ts`.
  //
  // Dilewati di mode pratinjau: pengukurnya membaca gulir jendela, sedangkan
  // hamparan pratinjau bergulir di dalam wadahnya sendiri. Tanpa penjaga ini,
  // hero muncul sudah teredup mengikuti posisi gulir halaman form di baliknya.
  useKemajuanHero(heroRef, (v) => {
    const el = lapisRef.current;
    if (!el || pratinjau) return;

    if (kurangiGerak) {
      el.style.opacity = String(1 - Math.min(0.75, v / 0.85 * 0.75));
      return;
    }

    el.style.transform = `translateY(${v * 22}%) scale(${1 + v * 0.14})`;
    el.style.opacity = String(1 - Math.min(0.75, (v / 0.85) * 0.75));
  });

  return (
    <header
      ref={heroRef}
      className="relative min-h-[560px] h-[88vh] max-h-[860px] w-full overflow-hidden bg-[#050d1f] flex flex-col"
    >
      <div ref={lapisRef} className="absolute inset-0 origin-center will-change-transform">
        {sampul ? (
          <img src={sampul} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_30%_20%,#123a6b_0%,#050d1f_65%)]" />
        )}
      </div>

      {/* Dua lapis gradien: satu menggelapkan seluruhnya, satu menegaskan kaki
          hero supaya judul putih tetap terbaca di atas sampul seterang apa pun. */}
      <div className="absolute inset-0 bg-[#050d1f]/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050d1f] via-[#050d1f]/70 to-transparent" />

      <SkyParticles tone="sky" className="absolute inset-0 opacity-60 pointer-events-none" />

      {/* Lintasan terbang yang tergambar saat halaman terbuka */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden>
        <motion.path
          d="M-40 620 Q 380 300 1240 470"
          fill="none"
          stroke="rgba(125,211,252,0.35)"
          strokeWidth="2"
          strokeDasharray="7 10"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
        />
      </svg>

      <motion.div
        initial={{ x: -120, y: 60, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-[10%] top-[24%] hidden md:block pointer-events-none"
      >
        <motion.div
          animate={kurangiGerak ? {} : { y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        >
          <Plane className="w-12 h-12 text-cyan-300/90 rotate-[18deg] drop-shadow-[0_8px_24px_rgba(34,211,238,0.45)]" />
        </motion.div>
      </motion.div>

      {/* Jejak remah */}
      <div className="relative z-10 pt-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-[11px] font-bold uppercase tracking-[0.14em] bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur px-4 py-2 rounded-full transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-300" /> Media Center
          </Link>

          <nav aria-label="Jejak halaman" className="hidden sm:flex items-center gap-1.5 text-[11px] text-white/55 font-medium">
            <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/news" className="hover:text-white transition-colors">Berita</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-cyan-300 font-bold">{artikel.category}</span>
          </nav>
        </div>
      </div>

      {/* Judul & papan informasi */}
      <div className="relative z-10 mt-auto pb-20 md:pb-24">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <PapanFids artikel={artikel} menitBaca={menitBaca} />

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-[30px] sm:text-[44px] lg:text-[56px] font-black text-white leading-[1.06] tracking-[-0.025em] max-w-[19ch] text-balance drop-shadow-[0_2px_18px_rgba(0,0,0,0.4)]"
          >
            {artikel.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.55 }}
            className="hidden sm:block mt-5 text-white/75 text-[16px] leading-relaxed max-w-[58ch]"
          >
            {artikel.excerpt}
          </motion.p>
        </div>
      </div>

      {/* Isyarat gulir */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 pointer-events-none"
      >
        <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/45">Gulir untuk membaca</span>
        <motion.span
          animate={kurangiGerak ? {} : { y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-4 h-4 text-cyan-300/80" />
        </motion.span>
      </motion.div>
    </header>
  );
}

/** Baris metadata bergaya papan informasi penerbangan. */
function PapanFids({ artikel, menitBaca }: { artikel: NewsItem; menitBaca: number }) {
  const kolom = [
    { label: 'Kategori', nilai: artikel.category, sorot: true },
    { label: 'Terbit', nilai: tanggalPanjang(artikel.published_at) },
    { label: 'Durasi Baca', nilai: `${menitBaca} Menit` },
    { label: 'Pembaca', nilai: (artikel.views_count ?? 0).toLocaleString('id-ID') },
  ];

  return (
    <motion.div
      initial="sembunyi"
      animate="tampil"
      variants={{ tampil: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
      className="flex flex-wrap items-stretch gap-x-7 gap-y-3 border-l-2 border-cyan-400/70 pl-4"
    >
      {artikel.is_featured && (
        <motion.span
          variants={{ sembunyi: { opacity: 0, y: 10 }, tampil: { opacity: 1, y: 0 } }}
          className="self-center inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300 bg-amber-400/15 border border-amber-300/30 px-2.5 py-1 rounded-full backdrop-blur"
        >
          <Sparkles className="w-3 h-3" /> Berita Utama
        </motion.span>
      )}

      {kolom.map((k) => (
        <motion.div key={k.label} variants={{ sembunyi: { opacity: 0, y: 10 }, tampil: { opacity: 1, y: 0 } }}>
          <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">{k.label}</p>
          <p className={`text-[13px] font-bold tracking-wide mt-0.5 font-mono ${k.sorot ? 'text-cyan-300' : 'text-white/90'}`}>
            {k.nilai}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Bilah kemajuan mendatar untuk lebar di bawah xl, tempat rel tegak tidak muat. */
function BilahKemajuan({ bacaanRef }: { bacaanRef: React.RefObject<HTMLElement | null> }) {
  const isiRef = useRef<HTMLSpanElement>(null);

  useKemajuanBaca(bacaanRef, (v) => {
    if (isiRef.current) isiRef.current.style.transform = `scaleX(${v})`;
  });

  return (
    <div className="xl:hidden sticky top-[66px] z-30 h-[3px] bg-slate-200/70">
      <span
        ref={isiRef}
        className="block h-full origin-left scale-x-0 bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-400"
      />
    </div>
  );
}

/* ---------------------------- rel tegak --------------------------- */

/**
 * Rel margin kiri: kemajuan baca sebagai lintasan menurun, lalu tombol bagikan.
 *
 * KENAPA TEGAK, BUKAN BILAH DI PUNCAK. Navbar portal ini `sticky top-0`, jadi
 * bilah kemajuan mendatar selalu menempel tepat di bawahnya dan keduanya
 * berebut tempat yang sama. Rel tegak hidup di margin yang memang kosong, dan
 * arah geraknya searah dengan arah baca.
 */
function RelTegak({
  bacaanRef, taut, judul, tersalin, salinTaut,
}: {
  bacaanRef: React.RefObject<HTMLElement | null>;
  taut: string;
  judul: string;
  tersalin: boolean;
  salinTaut: (taut: string) => void;
}) {
  const isiRef = useRef<HTMLSpanElement>(null);
  const pesawatRef = useRef<HTMLSpanElement>(null);
  const persenRef = useRef<HTMLSpanElement>(null);

  // Ditulis langsung ke DOM, tanpa state maupun MotionValue — alasannya di
  // `lib/gulirBaca.ts`.
  useKemajuanBaca(bacaanRef, (v) => {
    const persen = v * 100;

    if (isiRef.current) isiRef.current.style.height = `${persen}%`;
    if (pesawatRef.current) pesawatRef.current.style.top = `calc(${persen}% - 10px)`;
    if (persenRef.current) persenRef.current.textContent = `${Math.round(persen)}%`;
  });

  return (
    <div className="sticky top-[110px] flex flex-col items-center gap-5">
      <div className="relative w-[2px] h-[240px] rounded-full border-l-2 border-dashed border-slate-200">
        <span
          ref={isiRef}
          className="absolute top-0 -left-[2px] w-[2px] h-0 rounded-full bg-gradient-to-b from-blue-600 to-cyan-400"
        />

        <span ref={pesawatRef} className="absolute -left-[11px] -top-[10px]">
          <Plane className="w-5 h-5 text-blue-600 fill-blue-600 rotate-[135deg] drop-shadow-sm" />
        </span>
      </div>

      <span ref={persenRef} className="text-[10px] font-bold text-slate-400 font-mono tabular-nums">0%</span>

      <div className="w-8 h-px bg-slate-200" aria-hidden />

      <div className="flex flex-col gap-2">
        <TombolRel
          href={`https://wa.me/?text=${encodeURIComponent(`${judul} — ${taut}`)}`}
          label="Bagikan ke WhatsApp"
          className="hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
        >
          <MessageCircle className="w-4 h-4" />
        </TombolRel>

        <TombolRel
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(taut)}`}
          label="Bagikan ke Facebook"
          className="hover:bg-blue-700 hover:text-white hover:border-blue-700"
        >
          <Share2 className="w-4 h-4" />
        </TombolRel>

        <button
          onClick={() => salinTaut(taut)}
          aria-label="Salin tautan artikel"
          title={tersalin ? 'Tautan tersalin' : 'Salin tautan artikel'}
          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
            tersalin
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900'
          }`}
        >
          {tersalin ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function TombolRel({
  href, label, className, children,
}: { href: string; label: string; className: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={`w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center transition-colors ${className}`}
    >
      {children}
    </a>
  );
}

/* ------------------------------ badan ----------------------------- */

/** Paragraf pembuka, dipisahkan dari badan artikel dengan garis tebal. */
function Sari({ teks }: { teks: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="relative pl-5 border-l-[3px] border-blue-600"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700 font-mono mb-2">Ringkasan</p>
      <p className="text-slate-700 text-[17px] sm:text-[18px] leading-[1.7] font-medium">{teks}</p>
    </motion.div>
  );
}

/**
 * Penutup artikel bergaya sobekan tiket.
 *
 * Menandai batas antara "tulisannya sudah habis" dan blok penjelajahan di
 * bawahnya — tanpa penanda itu pembaca kerap mengira masih ada lanjutannya.
 */
function SobekanTiket({
  artikel, menitBaca, taut, tersalin, salinTaut, pratinjau,
}: {
  artikel: NewsItem;
  menitBaca: number;
  taut: string;
  tersalin: boolean;
  salinTaut: (taut: string) => void;
  pratinjau: boolean;
}) {
  return (
    <div className="relative mt-12 rounded-2xl bg-[#f6f8fc] border border-slate-200 overflow-hidden">
      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-r border-slate-200" aria-hidden />
      <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-l border-slate-200" aria-hidden />

      <div className="px-5 sm:px-7 py-5 flex flex-wrap items-center justify-between gap-5">
        <div className="space-y-1.5">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">Selesai dibaca</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5 text-blue-600" /> {artikel.author}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-600" /> {menitBaca} menit</span>
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-600" /> {(artikel.views_count ?? 0).toLocaleString('id-ID')}</span>
          </p>
        </div>

        {/* Tombol bagikan ini menggandakan rel tegak dengan sengaja: rel hanya
            ada di xl ke atas, dan di lebar lain inilah satu-satunya jalan.
            Di mode pratinjau keduanya hilang — slug yang dibagikan belum ada. */}
        <div className={`items-center gap-2 xl:hidden ${pratinjau ? 'hidden' : 'flex'}`}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${artikel.title} — ${taut}`)}`}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <button
            onClick={() => salinTaut(taut)}
            className={`text-[11.5px] font-bold px-4 py-2.5 rounded-xl border flex items-center gap-2 transition-colors cursor-pointer ${
              tersalin ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tersalin ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            {tersalin ? 'Tersalin' : 'Salin Link'}
          </button>
        </div>

        <Link
          href="/news"
          className="hidden xl:inline-flex items-center gap-2 text-[11.5px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Semua Berita <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------- tetangga ---------------------------- */

function NavigasiTetangga({ sebelumnya, selanjutnya }: { sebelumnya: NewsItem | null; selanjutnya: NewsItem | null }) {
  if (!sebelumnya && !selanjutnya) return null;

  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sebelumnya ? <KartuTetangga berita={sebelumnya} arah="sebelumnya" /> : <span className="hidden sm:block" />}
      {selanjutnya && <KartuTetangga berita={selanjutnya} arah="selanjutnya" />}
    </div>
  );
}

function KartuTetangga({ berita, arah }: { berita: NewsItem; arah: 'sebelumnya' | 'selanjutnya' }) {
  const maju = arah === 'selanjutnya';

  return (
    <Link
      href={`/news/${berita.slug}`}
      className={`group p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all space-y-1.5 ${
        maju ? 'text-right sm:col-start-2' : ''
      }`}
    >
      <span className={`text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-400 font-mono flex items-center gap-1.5 ${maju ? 'justify-end' : ''}`}>
        {!maju && <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />}
        {maju ? 'Berita Selanjutnya' : 'Berita Sebelumnya'}
        {maju && <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />}
      </span>
      <p className="font-bold text-slate-900 text-[13px] leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
        {berita.title}
      </p>
    </Link>
  );
}

/* ---------------------------- rute baca --------------------------- */

function RuteBaca({
  bagian, aktif, badanRef,
}: { bagian: Bagian[]; aktif: number; badanRef: React.RefObject<HTMLDivElement | null> }) {
  /**
   * KENAPA `scrollIntoView`, BUKAN `window.scrollTo`. Komponen ini juga dipakai
   * di dalam hamparan pratinjau panel admin, yang bergulir di wadahnya sendiri
   * dan bukan di jendela — `window.scrollTo` di sana tidak berbuat apa-apa.
   * `scrollIntoView` menggulir scrollport terdekat, apa pun itu.
   *
   * Jarak dari navbar `sticky` tidak lagi dihitung tangan: `scroll-margin-top`
   * pada `.article-content--lega h2/h3` di `globals.css` sudah menanganinya,
   * dan itu memang gunanya properti tersebut.
   */
  const lompat = (indeks: number) => {
    judulKe(badanRef.current, indeks)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Kembali ke puncak wadah yang benar-benar bergulir — jendela atau hamparan. */
  const keAwal = () => {
    let simpul: HTMLElement | null = badanRef.current;

    while (simpul) {
      const oy = getComputedStyle(simpul).overflowY;
      if (oy === 'auto' || oy === 'scroll') {
        simpul.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      simpul = simpul.parentElement;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav aria-label="Daftar isi artikel" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono flex items-center gap-1.5 mb-3">
        <ListTree className="w-3.5 h-3.5 text-blue-600" /> Rute Baca
      </h4>

      <ul className="space-y-0.5">
        {bagian.map((b, i) => {
          const on = aktif === i;

          return (
            <li key={`${i}-${b.teks}`}>
              <button
                onClick={() => lompat(i)}
                className={`relative w-full text-left rounded-lg py-1.5 pr-2 flex gap-2.5 transition-colors cursor-pointer ${
                  b.level === 3 ? 'pl-8' : 'pl-4'
                } ${on ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'}`}
              >
                {on && (
                  <motion.span
                    layoutId="rute-baca-aktif"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-gradient-to-b from-blue-600 to-cyan-400"
                  />
                )}
                <span className="text-[9.5px] font-mono text-slate-300 pt-[3px] flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[12px] line-clamp-2 leading-snug">{b.teks}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        onClick={keAwal}
        className="w-full mt-2 pt-3 border-t border-slate-100 text-[10.5px] font-bold text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <ArrowUp className="w-3.5 h-3.5" /> Kembali ke awal
      </button>
    </nav>
  );
}

/* --------------------------- terpopuler --------------------------- */

function PapanTerpopuler({ daftar }: { daftar: NewsItem[] }) {
  if (daftar.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono flex items-center gap-1.5 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Paling Banyak Dibaca
      </h4>

      <ol className="space-y-2.5">
        {daftar.map((n, i) => (
          <li key={n.id}>
            <Link href={`/news/${n.slug}`} className="group flex gap-2.5">
              <span className="text-[16px] font-black text-slate-200 group-hover:text-blue-300 transition-colors w-6 flex-shrink-0 text-center leading-none pt-0.5 font-mono">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h5 className="font-bold text-[12px] text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  {n.title}
                </h5>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-blue-600 font-bold font-mono">
                  <Eye className="w-3 h-3" /> {(n.views_count ?? 0).toLocaleString('id-ID')}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------- kartu jadwal -------------------------- */

function KartuJadwal() {
  return (
    <div className="relative rounded-2xl bg-[#0b1428] p-5 text-white overflow-hidden border border-white/10">
      <Plane className="absolute -bottom-5 -right-4 w-24 h-24 text-white/[0.07] rotate-[25deg]" aria-hidden />

      <div className="relative space-y-1">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-cyan-400 font-mono">Info Penerbangan</p>
        <h3 className="font-bold text-[15px] leading-snug pt-0.5">Jadwal Hari Ini</h3>
        <p className="text-slate-400 text-[11.5px] leading-relaxed">
          Kedatangan dan keberangkatan seluruh maskapai di APT Pranoto.
        </p>
      </div>

      <Link
        href="/flights"
        className="relative mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        Lihat Jadwal <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/* ---------------------- papan keberangkatan ----------------------- */

/**
 * Berita lainnya sebagai papan keberangkatan, bukan deretan kartu.
 *
 * Barisnya dibaca seperti jadwal penerbangan — tanggal, kategori, judul —
 * sehingga blok penjelajahan ini tidak menyaingi artikel di atasnya, sekaligus
 * memuat lebih banyak judul dalam ruang yang sama.
 */
function PapanKeberangkatan({ daftar }: { daftar: NewsItem[] }) {
  if (daftar.length === 0) return null;

  return (
    <section className="bg-[#0b1428] rounded-b-[2rem] md:rounded-b-[3rem] px-4 sm:px-6 py-12 md:py-14">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-5 border-b border-white/10">
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-cyan-400 font-mono">
              Papan Keberangkatan
            </p>
            <h2 className="text-white text-[22px] sm:text-[26px] font-black tracking-tight mt-1">Berita Berikutnya</h2>
          </div>

          <Link href="/news" className="text-[11.5px] text-cyan-300 hover:text-white font-bold flex items-center gap-1.5 transition-colors">
            Semua Berita <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <ul>
          {daftar.map((n, i) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <Link
                href={`/news/${n.slug}`}
                className="group grid grid-cols-[76px_minmax(0,1fr)_auto] sm:grid-cols-[96px_120px_minmax(0,1fr)_auto] items-center gap-3 sm:gap-5 py-4 border-b border-white/[0.07] hover:bg-white/[0.04] px-2 -mx-2 rounded-lg transition-colors"
              >
                <span className="text-[11px] font-mono text-white/40 tabular-nums">
                  {tanggalPendek(n.published_at)}
                </span>

                <span className="hidden sm:block text-[9.5px] font-mono font-bold uppercase tracking-[0.14em] text-cyan-300/80 truncate">
                  {n.category}
                </span>

                <span className="min-w-0">
                  <span className="block text-white font-bold text-[14px] sm:text-[15px] leading-snug line-clamp-1 group-hover:text-cyan-300 transition-colors">
                    {n.title}
                  </span>
                  <span className="block sm:hidden text-[9.5px] font-mono uppercase tracking-wider text-cyan-300/70 mt-0.5">
                    {n.category}
                  </span>
                </span>

                <span className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/40 group-hover:bg-cyan-400 group-hover:text-[#0b1428] group-hover:border-cyan-400 transition-colors flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
