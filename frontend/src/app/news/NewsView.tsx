'use client';

/**
 * Media Center — daftar seluruh berita portal.
 *
 * BENTUKNYA mengikuti bahasa visual halaman baca berita: papan informasi
 * bergaya FIDS di atas latar gelap, motif tiket, dan huruf mono berjarak lebar
 * untuk label. Dua halaman itu kini terbaca sebagai satu tempat.
 *
 * TIGA HAL YANG DIPERBAIKI DARI VERSI LAMA.
 *
 *   1. Versi lama hanya menampilkan satu sorotan dan EMPAT berita terbaru.
 *      Sisanya tidak dapat dijangkau dari mana pun — tidak ada pagination,
 *      tidak ada "muat lagi". Berita ketujuh dan seterusnya praktis hilang dari
 *      portal. Kini seluruh berita terbit diambil dan ditampilkan.
 *   2. Daftar kategorinya ditulis tangan dan tertinggal dari panel admin, yang
 *      sudah menawarkan "Berita Utama" dan "Fasilitas". Kini kategorinya
 *      diturunkan dari data, lengkap dengan cacahnya masing-masing.
 *   3. Kotak berlangganan newsletter tidak terhubung ke apa pun —
 *      `onSubmit` hanya memanggil `preventDefault`. Menjanjikan langganan yang
 *      tidak pernah terkirim lebih buruk daripada tidak menawarkannya, jadi
 *      blok itu dibuang.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import SkyParticles from '@/components/effects/SkyParticles';
import GambarBerita from '@/components/GambarBerita';
import { NewsItem } from '@/types';
import { ambilSemuaBerita, tanggalPanjang, tanggalPendek, waktuBaca } from '@/lib/berita';
import {
  Plane, Search, X, ArrowRight, ArrowLeft, Eye, Clock, Calendar, Sparkles,
  LayoutGrid, Rows3, Newspaper, Compass,
} from 'lucide-react';

type Tampilan = 'kartu' | 'papan';

export default function NewsView() {
  const kurangiGerak = !!useReducedMotion();

  const [berita, setBerita] = useState<NewsItem[]>([]);
  const [memuat, setMemuat] = useState(true);

  const [kategori, setKategori] = useState('Semua');
  const [cari, setCari] = useState('');
  const [tampilan, setTampilan] = useState<Tampilan>('kartu');
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    let batal = false;

    ambilSemuaBerita().then((hasil) => {
      if (batal) return;

      setBerita(hasil);
      setMemuat(false);
    });

    return () => { batal = true; };
  }, []);

  /* ---------- turunan ---------- */

  // Kategori diturunkan dari data supaya tidak pernah tertinggal dari panel
  // admin, dan dicacah supaya pengunjung tahu isi tiap saringan sebelum menekan.
  const kategoriTersedia = useMemo(() => {
    const cacah = new Map<string, number>();

    berita.forEach((n) => cacah.set(n.category, (cacah.get(n.category) ?? 0) + 1));

    return [...cacah.entries()].sort((a, b) => b[1] - a[1]);
  }, [berita]);

  const hasil = useMemo(() => {
    const kunci = cari.trim().toLowerCase();

    return berita.filter((n) => {
      if (kategori !== 'Semua' && n.category !== kategori) return false;
      if (!kunci) return true;

      return [n.title, n.excerpt, n.category, n.author]
        .some((v) => String(v ?? '').toLowerCase().includes(kunci));
    });
  }, [berita, kategori, cari]);

  // Sorotan hanya diambil dari hasil saringan supaya ia tidak pernah
  // menampilkan berita yang justru sedang disaring keluar.
  const sorotan = useMemo(() => {
    const utama = hasil.filter((n) => n.is_featured);

    return utama.length > 0 ? utama : hasil.slice(0, 1);
  }, [hasil]);

  const aktif = sorotan[slide % (sorotan.length || 1)];
  const selebihnya = useMemo(() => hasil.filter((n) => n.id !== aktif?.id), [hasil, aktif]);

  const totalDibaca = useMemo(
    () => berita.reduce((a, n) => a + (n.views_count ?? 0), 0),
    [berita],
  );

  // `slide` sengaja tidak pernah disetel ulang saat saringannya berubah:
  // pembacaannya memakai sisa bagi terhadap jumlah sorotan, sehingga nilai
  // berapa pun selalu jatuh pada slide yang sah. Menyetelnya ulang lewat efek
  // hanya menambah satu render tanpa mengubah apa yang terlihat.

  // Putar otomatis; berhenti sendiri bila pengunjung meminta gerak dikurangi.
  useEffect(() => {
    if (sorotan.length < 2 || kurangiGerak) return;

    const jam = setInterval(() => setSlide((s) => s + 1), 7000);

    return () => clearInterval(jam);
  }, [sorotan.length, kurangiGerak]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Hero
        total={berita.length}
        kategori={kategoriTersedia.length}
        dibaca={totalDibaca}
        terbaru={berita[0]?.published_at}
        kurangiGerak={kurangiGerak}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <BilahKendali
          cari={cari}
          setCari={setCari}
          tampilan={tampilan}
          setTampilan={setTampilan}
          jumlah={hasil.length}
          memuat={memuat}
        />

        <SaringanKategori
          daftar={kategoriTersedia}
          total={berita.length}
          aktif={kategori}
          pilih={setKategori}
        />

        {memuat ? (
          <SedangMemuat />
        ) : hasil.length === 0 ? (
          <Kosong cari={cari} kategori={kategori} bersihkan={() => { setCari(''); setKategori('Semua'); }} />
        ) : (
          <>
            {aktif && (
              <Sorotan
                berita={aktif}
                jumlahSlide={sorotan.length}
                slide={slide % (sorotan.length || 1)}
                pilihSlide={setSlide}
              />
            )}

            {selebihnya.length > 0 && (
              <section className="mt-12">
                <TajukBagian
                  label="Seluruh Publikasi"
                  judul={kategori === 'Semua' ? 'Arsip Berita' : kategori}
                  jumlah={selebihnya.length}
                />

                {tampilan === 'kartu' ? (
                  <KisiKartu daftar={selebihnya} />
                ) : (
                  <PapanKeberangkatan daftar={selebihnya} />
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ hero ------------------------------ */

/**
 * Hero berlatar gelap dengan papan angka bergaya FIDS.
 *
 * Angkanya seluruhnya dihitung dari data yang baru diambil — jumlah artikel,
 * banyaknya kategori, total dibaca, dan tanggal terbit terakhir. Tidak ada
 * satu pun yang ditulis tangan.
 */
function Hero({
  total, kategori, dibaca, terbaru, kurangiGerak,
}: {
  total: number;
  kategori: number;
  dibaca: number;
  terbaru?: string;
  kurangiGerak: boolean;
}) {
  const angka = [
    { label: 'Total Artikel', nilai: total ? String(total) : '—' },
    { label: 'Kategori', nilai: kategori ? String(kategori) : '—' },
    { label: 'Total Dibaca', nilai: dibaca ? dibaca.toLocaleString('id-ID') : '—' },
    { label: 'Terbit Terakhir', nilai: terbaru ? tanggalPendek(terbaru) : '—' },
  ];

  return (
    <header className="relative bg-[#050d1f] overflow-hidden pt-12 pb-28 md:pt-16 md:pb-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_10%,#123a6b_0%,transparent_60%)]" />

      <SkyParticles tone="sky" className="absolute inset-0 opacity-60 pointer-events-none" />

      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1400 420" preserveAspectRatio="none" aria-hidden>
        <motion.path
          d="M-40 330 Q 520 120 1440 250"
          fill="none"
          stroke="rgba(125,211,252,0.3)"
          strokeWidth="2"
          strokeDasharray="7 10"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
        />
      </svg>

      <motion.div
        initial={{ x: -100, y: 50, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-[8%] top-[18%] hidden md:block pointer-events-none"
      >
        <motion.div
          animate={kurangiGerak ? {} : { y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        >
          <Plane className="w-14 h-14 text-cyan-300/85 rotate-[18deg] drop-shadow-[0_8px_28px_rgba(34,211,238,0.4)]" />
        </motion.div>
      </motion.div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400 font-mono"
        >
          Media Center · UPBU APT Pranoto
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3 text-[32px] sm:text-[46px] lg:text-[56px] font-black text-white leading-[1.05] tracking-[-0.03em] max-w-[16ch]"
        >
          Berita &amp; Pengumuman
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-4 text-white/65 text-[15px] leading-relaxed max-w-[52ch]"
        >
          Seluruh kabar resmi seputar kegiatan, layanan, dan perkembangan Bandara APT Pranoto
          Samarinda — terbit langsung dari Humas bandara.
        </motion.p>

        <motion.dl
          initial="sembunyi"
          animate="tampil"
          variants={{ tampil: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } } }}
          className="mt-9 flex flex-wrap gap-x-9 gap-y-4 border-l-2 border-cyan-400/70 pl-4"
        >
          {angka.map((a) => (
            <motion.div key={a.label} variants={{ sembunyi: { opacity: 0, y: 10 }, tampil: { opacity: 1, y: 0 } }}>
              <dt className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">{a.label}</dt>
              <dd className="text-[15px] font-bold tracking-wide text-white/90 mt-0.5 font-mono tabular-nums">{a.nilai}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </header>
  );
}

/* --------------------------- bilah kendali ------------------------ */

/**
 * Panel pencarian dan pemilih tampilan, menaiki kaki hero.
 *
 * Ia `sticky` supaya tetap terjangkau saat menyusuri arsip yang panjang —
 * karena itu tidak boleh ada leluhur yang memakai `overflow-x` selain
 * `visible`, yang akan mematikan sticky pada seluruh keturunannya.
 */
function BilahKendali({
  cari, setCari, tampilan, setTampilan, jumlah, memuat,
}: {
  cari: string;
  setCari: (v: string) => void;
  tampilan: Tampilan;
  setTampilan: (v: Tampilan) => void;
  jumlah: number;
  memuat: boolean;
}) {
  const kotakRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 250, damping: 26 }}
      className="sticky top-[74px] z-30 -mt-14 md:-mt-16 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200 p-2.5 flex flex-wrap items-center gap-2.5"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-[220px] px-3">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          ref={kotakRef}
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari judul, ringkasan, atau kategori..."
          aria-label="Cari berita"
          className="flex-1 min-w-0 bg-transparent py-2.5 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {cari && (
          <button
            onClick={() => { setCari(''); kotakRef.current?.focus(); }}
            aria-label="Bersihkan pencarian"
            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <span className="hidden sm:block w-px h-7 bg-slate-200" aria-hidden />

      <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 font-mono tabular-nums px-2">
        {memuat ? 'Memuat' : `${jumlah} artikel`}
      </span>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { nilai: 'kartu' as const, label: 'Kartu', ikon: LayoutGrid },
          { nilai: 'papan' as const, label: 'Papan', ikon: Rows3 },
        ]).map((t) => {
          const on = tampilan === t.nilai;

          return (
            <button
              key={t.nilai}
              onClick={() => setTampilan(t.nilai)}
              aria-pressed={on}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                on ? 'text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {on && (
                <motion.span
                  layoutId="tampilan-aktif"
                  transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  className="absolute inset-0 rounded-lg bg-slate-900"
                />
              )}
              <t.ikon className="relative w-3.5 h-3.5" />
              <span className="relative hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* -------------------------- saringan kategori --------------------- */

function SaringanKategori({
  daftar, total, aktif, pilih,
}: {
  daftar: [string, number][];
  total: number;
  aktif: string;
  pilih: (v: string) => void;
}) {
  if (daftar.length === 0) return null;

  const semua: [string, number][] = [['Semua', total], ...daftar];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="mt-5 flex flex-wrap gap-2"
      role="group"
      aria-label="Saring menurut kategori"
    >
      {semua.map(([nama, cacah]) => {
        const on = aktif === nama;

        return (
          <button
            key={nama}
            onClick={() => pilih(nama)}
            aria-pressed={on}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-bold border transition-colors cursor-pointer ${
              on
                ? 'text-white border-blue-600'
                : 'text-slate-600 border-slate-200 bg-white hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            {on && (
              <motion.span
                layoutId="kategori-aktif"
                transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                className="absolute inset-0 rounded-full bg-blue-600"
              />
            )}
            <span className="relative">{nama}</span>
            <span className={`relative text-[10px] font-mono tabular-nums ${on ? 'text-white/70' : 'text-slate-400'}`}>
              {cacah}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}

/* ----------------------------- sorotan ---------------------------- */

/**
 * Sorotan sebagai satu kartu gelap selebar halaman, bukan gambar di samping
 * teks. Sampulnya menjadi latar penuh dengan gradien, sehingga judulnya tetap
 * terbaca pada foto seterang apa pun.
 */
function Sorotan({
  berita, jumlahSlide, slide, pilihSlide,
}: {
  berita: NewsItem;
  jumlahSlide: number;
  slide: number;
  pilihSlide: (fn: (s: number) => number) => void;
}) {
  return (
    <section className="mt-10">
      <TajukBagian label="Sorotan" judul="Berita Utama" />

      <div className="mt-5 relative rounded-3xl overflow-hidden bg-[#050d1f] min-h-[380px] md:min-h-[420px] flex">
        {/* Sengaja TANPA `AnimatePresence mode="wait"`. Mode itu menahan isi
            lama sampai animasi keluarnya tuntas, sehingga apa yang terbaca
            pengunjung bergantung pada selesainya sebuah animasi — pada tab
            latar yang animasinya diperlambat peramban, sorotan bisa tertinggal
            menampilkan berita yang sudah tersaring keluar. Dengan `key`,
            React menukarnya seketika dan yang baru beranimasi masuk. */}
        <motion.div
          key={berita.id}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <GambarBerita berita={berita} ukuranIkon="w-12 h-12" className="w-full h-full object-cover" />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#050d1f] via-[#050d1f]/85 to-[#050d1f]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050d1f]/90 to-transparent" />

        <div className="relative z-10 p-6 sm:p-10 md:p-12 flex flex-col justify-end w-full md:max-w-[64%]">
          <motion.div
            key={berita.id}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-l-2 border-cyan-400/70 pl-3.5">
                <Nilai label="Kategori" nilai={berita.category} sorot />
                <Nilai label="Terbit" nilai={tanggalPanjang(berita.published_at)} />
                <Nilai label="Baca" nilai={`${waktuBaca(berita.content)} Menit`} />
              </div>

              <Link href={`/news/${berita.slug}`}>
                <h3 className="mt-5 text-[24px] sm:text-[32px] md:text-[38px] font-black text-white leading-[1.12] tracking-[-0.02em] text-balance hover:text-cyan-300 transition-colors">
                  {berita.title}
                </h3>
              </Link>

              <p className="mt-3.5 text-white/70 text-[14px] sm:text-[15px] leading-relaxed line-clamp-3 max-w-[56ch]">
                {berita.excerpt}
              </p>

              <Link
                href={`/news/${berita.slug}`}
                className="group mt-6 inline-flex w-fit items-center gap-2.5 rounded-full bg-cyan-300 px-5 py-3 text-[13px] font-bold text-slate-950 transition-colors hover:bg-cyan-200"
              >
                Baca Selengkapnya
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
          </motion.div>

          {jumlahSlide > 1 && (
            <div className="mt-8 flex items-center gap-4">
              <div className="flex gap-1.5 flex-1 max-w-[220px]">
                {Array.from({ length: jumlahSlide }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => pilihSlide(() => i)}
                    aria-label={`Sorotan ${i + 1}`}
                    className={`h-1 rounded-full flex-1 transition-colors ${
                      i === slide ? 'bg-cyan-400' : 'bg-white/25 hover:bg-white/45'
                    }`}
                  />
                ))}
              </div>

              <span className="text-[10.5px] font-mono text-white/45 tabular-nums">
                {String(slide + 1).padStart(2, '0')} / {String(jumlahSlide).padStart(2, '0')}
              </span>

              <div className="flex gap-2 ml-auto">
                <TombolSlide label="Sorotan sebelumnya" onClick={() => pilihSlide((s) => s - 1 + jumlahSlide)}>
                  <ArrowLeft className="w-4 h-4" />
                </TombolSlide>
                <TombolSlide label="Sorotan selanjutnya" onClick={() => pilihSlide((s) => s + 1)}>
                  <ArrowRight className="w-4 h-4" />
                </TombolSlide>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TombolSlide({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      className="w-9 h-9 rounded-full border border-white/20 text-white/70 hover:bg-white hover:text-[#050d1f] hover:border-white flex items-center justify-center transition-colors cursor-pointer"
    >
      {children}
    </motion.button>
  );
}

function Nilai({ label, nilai, sorot }: { label: string; nilai: string; sorot?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">{label}</p>
      <p className={`text-[12.5px] font-bold tracking-wide mt-0.5 font-mono ${sorot ? 'text-cyan-300' : 'text-white/90'}`}>
        {nilai}
      </p>
    </div>
  );
}

/* --------------------------- tajuk bagian ------------------------- */

function TajukBagian({ label, judul, jumlah }: { label: string; judul: string; jumlah?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b-2 border-dashed border-slate-200">
      <div>
        <p className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-blue-600 font-mono">{label}</p>
        <h2 className="text-slate-900 text-[22px] sm:text-[26px] font-black tracking-tight mt-1">{judul}</h2>
      </div>

      {jumlah != null && (
        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 font-mono tabular-nums">
          {jumlah} artikel
        </span>
      )}
    </div>
  );
}

/* ---------------------------- kisi kartu -------------------------- */

function KisiKartu({ daftar }: { daftar: NewsItem[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {daftar.map((n, i) => (
        <motion.article
          key={n.id}
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ delay: Math.min(i, 8) * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
          whileHover={{ y: -6 }}
          className="h-full"
        >
          <Link
            href={`/news/${n.slug}`}
            className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-900/5 transition-all"
          >
            <div className="relative h-[172px] overflow-hidden">
              <GambarBerita berita={n} ukuranIkon="w-7 h-7" className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

              <span className="absolute top-3 left-3 bg-white/95 backdrop-blur text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-800 px-2.5 py-1 rounded-full font-mono">
                {n.category}
              </span>

              {n.is_featured && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-amber-400 text-[#050d1f] text-[9.5px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" /> Utama
                </span>
              )}

              <p className="absolute bottom-2.5 left-3 flex items-center gap-1.5 text-[10.5px] font-mono text-white/85">
                <Calendar className="w-3 h-3" /> {tanggalPendek(n.published_at)}
              </p>
            </div>

            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-bold text-slate-900 text-[15px] leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                {n.title}
              </h3>

              <p className="mt-2 text-slate-500 text-[12.5px] leading-relaxed line-clamp-3 flex-1">{n.excerpt}</p>

              <div className="mt-4 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {waktuBaca(n.content)} mnt</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(n.views_count ?? 0).toLocaleString('id-ID')}</span>
                </span>

                <span className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                </span>
              </div>
            </div>
          </Link>
        </motion.article>
      ))}
    </div>
  );
}

/* ----------------------- papan keberangkatan ---------------------- */

/**
 * Tampilan padat bergaya papan keberangkatan.
 *
 * Berguna ketika pengunjung sedang menyusuri arsip dan ingin memindai banyak
 * judul sekaligus — kartu bergambar memakan ruang yang tidak dibutuhkan pada
 * pekerjaan itu.
 */
function PapanKeberangkatan({ daftar }: { daftar: NewsItem[] }) {
  return (
    <div className="mt-6 bg-[#0b1428] rounded-2xl px-3 sm:px-5 py-2">
      <ul>
        {daftar.map((n, i) => (
          <motion.li
            key={n.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.35 }}
          >
            <Link
              href={`/news/${n.slug}`}
              className="group grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[92px_120px_minmax(0,1fr)_auto] items-center gap-3 sm:gap-5 py-4 border-b border-white/[0.07] last:border-0 hover:bg-white/[0.04] px-2 -mx-2 rounded-lg transition-colors"
            >
              <span className="hidden sm:block text-[11px] font-mono text-white/40 tabular-nums">
                {tanggalPendek(n.published_at)}
              </span>

              <span className="hidden sm:block text-[9.5px] font-mono font-bold uppercase tracking-[0.14em] text-cyan-300/80 truncate">
                {n.category}
              </span>

              <span className="min-w-0">
                <span className="block text-white font-bold text-[14px] sm:text-[15px] leading-snug line-clamp-1 group-hover:text-cyan-300 transition-colors">
                  {n.title}
                </span>
                <span className="mt-1 flex items-center gap-3 text-[9.5px] font-mono text-white/35">
                  <span className="sm:hidden uppercase tracking-wider text-cyan-300/70">{n.category}</span>
                  <span className="sm:hidden">{tanggalPendek(n.published_at)}</span>
                  <span className="hidden sm:flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {waktuBaca(n.content)} mnt</span>
                  <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" /> {(n.views_count ?? 0).toLocaleString('id-ID')}</span>
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
  );
}

/* ------------------------- keadaan lainnya ------------------------ */

function SedangMemuat() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center gap-5 py-24">
      <motion.div
        animate={{ x: [-18, 18, -18], y: [5, -5, 5] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
      >
        <Plane className="w-7 h-7 text-white rotate-45" />
      </motion.div>
      <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] font-mono">Memuat berita</p>
    </div>
  );
}

function Kosong({ cari, kategori, bersihkan }: { cari: string; kategori: string; bersihkan: () => void }) {
  const adaSaringan = cari.trim() !== '' || kategori !== 'Semua';

  return (
    <div className="mt-12 flex flex-col items-center justify-center gap-5 py-24 text-center">
      <span className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
        <Compass className="w-8 h-8 text-slate-300" />
      </span>

      <div className="space-y-1.5">
        <h2 className="text-lg font-black text-slate-900">
          {adaSaringan ? 'Tidak ada berita yang cocok' : 'Belum ada berita'}
        </h2>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          {adaSaringan
            ? 'Coba kata kunci lain, atau bersihkan saringannya untuk melihat seluruh arsip.'
            : 'Publikasi terbaru dari Humas bandara akan muncul di halaman ini.'}
        </p>
      </div>

      {adaSaringan && (
        <button
          onClick={bersihkan}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Newspaper className="w-4 h-4" /> Tampilkan Semua Berita
        </button>
      )}
    </div>
  );
}
