'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import { TOURISM_SPOTS, TOURISM_CAT_META, type TourismCategory } from '@/lib/tourismData';
import { ORG_NAME } from '@/lib/airportProfile';
import { PEJABAT_PHOTO_FIT } from '@/lib/pejabatFoto';
import { usePejabat } from '@/lib/pejabatLive';
import HeroParticles from '@/components/effects/HeroParticles';
import DekorEvent, { PitaPerayaan } from '@/components/events/DekorEvent';
import { usePerayaanAktif } from '@/lib/perayaanAktif';
import NamaBandaraHero from '@/components/home/NamaBandaraHero';
import HeroBoardingPass from '@/components/home/HeroBoardingPass';
import { LampuLandasan, JudulBagian } from '@/components/home/AviasiDekor';
import { NewsItem, InstagramPost, Facility, TourismItem, InfoSlide } from '@/types';
import { facilityCatMeta, facilityIcon } from '@/lib/facilityMeta';
import GambarBerita from '@/components/GambarBerita';
import PetaSematanGoogle from '@/components/map/PetaSematanGoogle';
import { AIRPORTS, HOME_IATA } from '@/lib/airports';
import { useBahasa } from '@/lib/bahasa';
import { useTeks, formatTanggal, type Kamus } from '@/lib/kamus';
import { useStatistikBandara } from '@/lib/statistikBandara';
import { useTentang } from '@/lib/tentang';
import VideoProfil from '@/components/home/VideoProfil';
import MitraLogos from '@/components/home/MitraLogos';
import {
  Plane, ArrowRight, Building2, ChevronRight, ChevronLeft, MapPin, Car,
  ParkingSquare, Headphones,
  CarFront, Bus, Navigation, Calendar, Palmtree, Clock,
} from 'lucide-react';

/* ================================================================
   Data statis pendukung
   ================================================================ */

/* Letak bandara. Diambil dari `lib/airports.ts` — berprovenans OurAirports
   dan sudah dicocokkan silang dengan kode ICAO WALS — bukan ditulis ulang di
   sini, supaya tidak ada salinan kedua yang perlahan menyimpang. */
const BANDARA_LOKASI = AIRPORTS[HOME_IATA];

/** Koordinat siap baca, 4 desimal (±11 m) — cukup untuk menuntun kendaraan. */
const KOORDINAT_BANDARA = `${BANDARA_LOKASI.lat.toFixed(4)}, ${BANDARA_LOKASI.lon.toFixed(4)}`;

/* Membuka aplikasi peta bawaan pengunjung. Memakai koordinat, bukan nama:
   pencarian "APT Pranoto" masih kerap mendarat di kantor perwakilan di dalam
   kota, sedangkan koordinat selalu menunjuk apronnya sendiri. */
const TAUTAN_PETA = `https://www.google.com/maps/search/?api=1&query=${BANDARA_LOKASI.lat},${BANDARA_LOKASI.lon}`;
/*
 * Daftar-daftar di bawah dibangun dari kamus.
 *
 * Yang berpindah ke kamus HANYA teksnya. Ikon, warna, alamat, dan angka tetap
 * di sini: keempatnya sama persis di kedua bahasa, dan menyalinnya ke kamus
 * berarti dua daftar angka resmi yang perlahan menyimpang — kesalahan yang
 * paling mahal justru pada angka.
 *
 * `kunci` dipakai sebagai kunci React, bukan teksnya: teks berganti saat
 * bahasa berganti, dan kunci yang ikut berganti memaksa React membuang lalu
 * memasang ulang seluruh kartunya.
 */
const quickAccess = (t: Kamus) => [
  { kunci: 'penerbangan', ...t.beranda.cepat.penerbangan, icon: Plane, color: '#2563eb', bg: '#eff6ff', href: '/flights' },
  { kunci: 'fasilitas', ...t.beranda.cepat.fasilitas, icon: Building2, color: '#0d9488', bg: '#f0fdfa', href: '/facilities' },
  { kunci: 'transportasi', ...t.beranda.cepat.transportasi, icon: Car, color: '#ea580c', bg: '#fff7ed', href: '/tenants' },
  { kunci: 'parkir', ...t.beranda.cepat.parkir, icon: ParkingSquare, color: '#7c3aed', bg: '#f5f3ff', href: '/facilities#parkir' },
  { kunci: 'layanan', ...t.beranda.cepat.layananOnline, icon: Headphones, color: '#e11d48', bg: '#fff1f2', href: '/complaints' },
  { kunci: 'peta', ...t.beranda.cepat.peta, icon: MapPin, color: '#059669', bg: '#ecfdf5', href: '/facilities#peta' },
];

/*
 * Kartu-kartu ini dulu sepenuhnya dekoratif — tidak satu pun menuju ke mana
 * pun, termasuk kartu taksi, padahal daftar mitranya ada di
 * `/tenants#transportasi`. Kini ketiga moda yang benar-benar terdaftar di sana
 * bertaut ke sana. Kendaraan pribadi tidak: itu soal parkir, bukan mitra.
 */
/**
 * Satu kartu wisata pada beranda.
 *
 * Bentuk perantara, sama seperti `Spot` di halaman /tourism: data API dan
 * arsip statis punya nama medan yang berbeda, dan kartunya tidak perlu tahu
 * mana yang sedang dipakai.
 */
type WisataKartu = {
  slug: string;
  name: string;
  category: string;
  distanceKm: number | null;
  duration: string | null;
  city: string | null;
  ringkas: string;
  cover: string | null;
};

const wisataDariApi = (t: TourismItem): WisataKartu => ({
  slug: t.slug,
  name: t.name,
  category: t.category,
  distanceKm: t.distance_km,
  duration: t.duration,
  city: t.city,
  ringkas: t.short_desc || t.description,
  cover: t.cover_url,
});

const wisataDariArsip = (t: (typeof TOURISM_SPOTS)[number]): WisataKartu => ({
  slug: t.slug,
  name: t.name,
  category: t.category,
  distanceKm: t.distanceKm,
  duration: t.duration,
  city: t.city,
  ringkas: t.description,
  cover: null,
});

const aksesBandara = (t: Kamus) => [
  { kunci: 'pribadi', ...t.beranda.akses.pribadi, icon: Car, href: undefined as string | undefined },
  { kunci: 'taksi', ...t.beranda.akses.taksi, icon: CarFront, href: '/tenants#transportasi' },
  { kunci: 'bus', ...t.beranda.akses.bus, icon: Bus, href: '/tenants#transportasi' },
  { kunci: 'rental', ...t.beranda.akses.rental, icon: Navigation, href: '/tenants#transportasi' },
];

/*
 * Angka bandara tidak lagi ditulis di berkas ini.
 *
 * Dulu ada DUA larik di sini — `aboutStats` dan `dalamAngka` — yang menyalin
 * nilai yang sama, ditambah salinan ketiga di `HeroBoardingPass.tsx`.
 * Semuanya kini membaca `useStatistikBandara()` dan menyaring benderanya
 * masing-masing.
 *
 * Beranda kini menayangkan angka itu SEKALI saja, pada bilah di kaki kartu
 * Tentang. Sebelumnya ada blok kedua "APT Pranoto dalam Angka" di dekat kaki
 * halaman yang membaca daftar yang sama lewat bendera `show_numbers`; karena
 * tiga barisnya bercentang dua-duanya, angka yang sama tercetak dua kali di
 * satu halaman. Blok itu dihapus, `show_about` yang menentukan.
 */

/*
 * Pejabat bandara kini datang dari `usePejabat()` — dikelola petugas lewat
 * `/admin/pejabat`, dengan konstanta `OFFICIALS` sebagai cadangan selama API
 * belum menjawab. Lihat alasan hukum cadangan itu di lib/pejabatLive.ts.
 *
 * Sebelumnya berkas ini memuat lima nama rekaan dengan avatar kartun
 * DiceBear, salah satunya diberi jabatan "Sekretaris Daerah Pemerintah
 * Kalimantan Timur" — jabatan publik nyata pada nama yang tidak ada —
 * lengkap dengan kutipan karangan. Semuanya dihapus; lihat provenans di
 * lib/airportProfile.ts.
 */

/* Tidak ada FALLBACK_DEPARTURES di sini.
 *
 * Kartu ini dulu menampilkan lima penerbangan karangan (GA 539 ke CGK, JT 367
 * ke SUB, dan seterusnya) setiap kali umpan FIDS kosong — tanpa penanda apa
 * pun bahwa itu bukan jadwal hari ini. Sama seperti DEMO_DEPARTURES yang sudah
 * dibuang dari komponen bersama: kalau tidak ada jadwal, katakan tidak ada. */

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/* Pemformat tanggal berpindah ke `formatTanggal` supaya tanggal berita ikut
   berganti bahasa; lihat lib/kamus/index.ts. */

export default function HomePage() {
  const t = useTeks();
  const bahasa = useBahasa();
  const QUICK = quickAccess(t);
  const tentang = useTentang();
  const semuaAngka = useStatistikBandara();
  const ABOUT_STATS = semuaAngka.filter((s) => s.diTentang);
  const AKSES = aksesBandara(t);

  /* Unggahan Instagram — kini mengisi kolom kanan hero, menggantikan papan
     penerbangan. Dibaca dari tabel LOKAL portal, bukan dari Instagram: token
     tidak boleh sampai ke peramban, dan gangguan di Instagram tidak boleh ikut
     merusak beranda.

     Sumbernya bisa sinkronisasi API atau masukan petugas; beranda tidak perlu
     tahu bedanya — keduanya baris yang sama di tabel yang sama. */
  const [igPosts, setIgPosts] = useState<InstagramPost[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [slides, setSlides] = useState<InfoSlide[]>([]);
  const [slideAktif, setSlideAktif] = useState(0);
  const [slideOtomatis, setSlideOtomatis] = useState(true);
  const [slideTertahan, setSlideTertahan] = useState(false);
  const [wisata, setWisata] = useState<WisataKartu[]>(() => TOURISM_SPOTS.map(wisataDariArsip));
  const [exec, setExec] = useState(0);
  const [auto, setAuto] = useState(true);

  const heroBg = useSetting('bg_home');
  const lebarSlide = Number(useSetting('info_slide_width')) || 1400;
  const tinggiSlide = Number(useSetting('info_slide_height')) || 525;

  /* Pejabat bandara — dikelola lewat /admin/pejabat. Membuka dengan teks
     otoritatif, lalu berpindah ke data API begitu jawabannya tiba. */
  const EXECUTIVES = usePejabat();

  /* Perayaan yang sedang berlangsung — menghias hero bila ada, dan tidak
     melakukan apa pun bila tidak. Permintaannya dibagi dengan layar sambutan
     di tata letak akar, jadi memanggilnya di sini tidak menambah lalu lintas. */
  const perayaan = usePerayaanAktif();

  useEffect(() => {
    fetchApi<NewsItem[]>('/news').then((res) => {
      if (res.success && Array.isArray(res.data)) setNews(res.data);
    });
    // Gagal diam-diam: seksinya memang tidak dirender bila kosong, jadi
    // beranda tidak perlu tahu bedanya "belum tersambung" dan "sedang gagal".
    fetchApi<InstagramPost[]>('/instagram-posts').then((res) => {
      if (res.success && Array.isArray(res.data)) setIgPosts(res.data);
    });
    // Endpoint publiknya sudah menyaring yang tidak beroperasi.
    fetchApi<Facility[]>('/facilities').then((res) => {
      if (res.success && Array.isArray(res.data)) setFacilities(res.data);
    });
    /* Destinasi wisata. Daftar kosong dari API TIDAK menggantikan arsip:
       endpoint yang sedang gagal tidak boleh membuat bagian ini lenyap —
       perlakuan yang sama dengan halaman /tourism. */
    /* Papan pengumuman bergambar. Endpoint publiknya sudah menyaring slide
       yang disembunyikan maupun yang gambarnya hilang — lihat
       InfoSlideController::index(). */
    fetchApi<InfoSlide[]>('/info-slides').then((res) => {
      if (res.success && Array.isArray(res.data)) setSlides(res.data);
    });
    fetchApi<TourismItem[]>('/tourisms').then((res) => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setWisata(res.data.map(wisataDariApi));
      }
    });
  }, []);


  useEffect(() => {
    if (!auto || EXECUTIVES.length === 0) return;
    const t = setInterval(() => setExec((e) => (e + 1) % EXECUTIVES.length), 6000);
    return () => clearInterval(t);
  }, [auto, EXECUTIVES.length]);

  // Daftarnya dapat menyusut saat data API menggantikan cadangan, sementara
  // `exec` masih menunjuk indeks lama — tanpa pembatasan ini kartunya kosong.
  const aman = EXECUTIVES.length === 0 ? 0 : exec % EXECUTIVES.length;
  const current = EXECUTIVES[aman];
  const others = EXECUTIVES.filter((_, i) => i !== aman).slice(0, 4);
  const latestNews = news.slice(0, 3);

  /* Empat fasilitas untuk satu baris beranda.

     Kategori "Umum" didahulukan: itulah yang benar-benar dapat dipakai
     penumpang. Daftar basis data didominasi fasilitas teknis — Runway,
     Apron, Power Station — yang tidak berarti apa-apa bagi pengunjung yang
     sedang mencari mushola. Yang berfoto didahulukan di antara sesamanya,
     supaya barisan kartunya tidak seluruhnya berupa bidang gradien.

     Empat item mengisi tepat satu baris pada kisi desktop. Daftar lengkap
     tetap tersedia melalui tautan "Lihat semua". */
  const FASILITAS = useMemo(() => {
    const nilai = (f: Facility) => (f.category === 'Umum' ? 0 : 2) + (f.image_url ? 0 : 1);

    return [...facilities].sort((a, b) => nilai(a) - nilai(b)).slice(0, 4);
  }, [facilities]);

  /* Empat destinasi terdekat. Jaraknya boleh kosong — tabel warisan v1 tidak
     mengisi `distance_km` untuk seluruh barisnya — dan yang tanpa jarak
     ditaruh di belakang, bukan dianggap berjarak nol. */
  /* Slide beranda. Urutannya sudah ditentukan backend (terbaru lebih dulu);
     beranda tidak mengurutkannya ulang. */
  const SLIDES = useMemo(() => slides.slice(0, 8), [slides]);

  /* Indeks dijaga tetap sah: daftarnya dapat menyusut saat data API tiba,
     sementara `slideAktif` masih menunjuk posisi lama. */
  const slideIdx = SLIDES.length === 0 ? 0 : slideAktif % SLIDES.length;

  const geserSlide = (arah: number) => {
    setSlideOtomatis(false);
    setSlideAktif((v) => (SLIDES.length ? (v + arah + SLIDES.length) % SLIDES.length : 0));
  };

  /* Putar otomatis berhenti begitu pengunjung menyentuh papannya atau
     menggeser sendiri — papan yang berpindah saat sedang dibaca lebih
     mengganggu daripada papan diam. */
  useEffect(() => {
    if (!slideOtomatis || slideTertahan || SLIDES.length < 2) return;
    const t = setInterval(() => setSlideAktif((v) => (v + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [slideOtomatis, slideTertahan, SLIDES.length]);

  const WISATA = useMemo(
    () => [...wisata].sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)).slice(0, 4),
    [wisata],
  );
  const wisataUtama = WISATA[0];
  const wisataLain = WISATA.slice(1);
  const metaWisataUtama = wisataUtama
    ? (TOURISM_CAT_META[wisataUtama.category as TourismCategory] ?? { color: '#0f766e', bg: '#ecfdf5' })
    : { color: '#0f766e', bg: '#ecfdf5' };

  const pickExec = (i: number) => { setExec(i); setAuto(false); };

  return (
    <div className="bg-slate-50">
      {/* ================= 1. HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Bandara APT Pranoto Samarinda" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent" />
          {/* Partikel cahaya, aliran udara & jejak pesawat */}
          <HeroParticles />
          {/* Hiasan perayaan. Sengaja DI DALAM kotak latar ini, bukan sebagai
              saudara kolom teks: kotaknya sudah `absolute inset-0` di bawah
              lapisan isi, sehingga untaian bendera dan konfetinya tidak akan
              pernah menutupi judul maupun tombol. */}
          <DekorEvent event={perayaan} />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 pt-12 pb-24 lg:pt-16 lg:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* teks */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-6 space-y-5 pt-6">
            {/* Ucapan perayaan. Sebaris di atas lockup, bukan menumpuk di
                atasnya — pada layar sempit keduanya akan bertabrakan. Tidak
                merender apa pun di luar masa perayaan, jadi tata letak hero
                pada hari biasa persis seperti sebelumnya. */}
            <PitaPerayaan event={perayaan} />
            {/* Lockup nama resmi — termasuk sambutan "Selamat Datang di" dan
                baris kota, supaya seluruh susunannya muncul sebagai satu
                kesatuan. Lihat komponennya untuk urutan animasinya. */}
            <NamaBandaraHero />
            <p className="text-slate-600 text-base leading-relaxed max-w-md">
              {t.beranda.intro}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Link href="/flights" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3.5 rounded-full shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all">
                <Plane className="w-4 h-4" /> {t.beranda.cekPenerbangan} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/facilities" className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm px-6 py-3.5 rounded-full shadow-sm flex items-center gap-2 transition-all">
                <Building2 className="w-4 h-4 text-blue-600" /> {t.beranda.lihatFasilitas}
              </Link>
              {/* Wisata terdekat. Bergaya sekunder seperti Fasilitas: hero
                  hanya boleh punya satu ajakan utama, dan "Cek Penerbangan"
                  yang paling sering dicari pengunjung bandara. */}
              <Link href="/tourism" className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm px-6 py-3.5 rounded-full shadow-sm flex items-center gap-2 transition-all">
                <Palmtree className="w-4 h-4 text-emerald-600" /> {t.beranda.lihatWisata}
              </Link>
            </div>
          </motion.div>

          <HeroBoardingPass posts={igPosts} />

        </div>

        {/* Lampu tepi landasan sebagai batas bawah hero.

            Ditaruh pada `bottom-16`, bukan di tepi paling bawah: kartu Quick
            Access di bawahnya bergeser naik (`-mt-12`) dan menutupi sekitar 48
            piksel terakhir hero, sehingga lampu di tepi bawah tidak akan pernah
            terlihat sama sekali. */}
        <LampuLandasan className="absolute inset-x-0 bottom-16 z-10" />
      </section>

      {/* ================= 2. QUICK ACCESS ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative bg-white rounded-2xl shadow-xl shadow-slate-300/40 ring-1 ring-slate-200/80 px-6 py-5 overflow-hidden"
        >
          {/* Pita gradien di tepi atas — penanda yang sama dipakai kartu unit
              pada bagan organisasi dan kartu panel admin. */}
          <span
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600"
            aria-hidden="true"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-dashed divide-slate-200">
            {QUICK.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.kunci} variants={rise}>
                  <Link
                    href={s.href}
                    className="relative flex items-center gap-3 px-4 py-3 md:py-2 group rounded-xl transition-colors hover:bg-slate-50/80"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                      style={{ backgroundColor: s.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                        {s.judul}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">{s.desc}</p>
                    </div>
                    {/* Garis landas kecil yang memanjang saat disentuh kursor. */}
                    <span
                      className="absolute left-4 right-4 bottom-1 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"
                      aria-hidden="true"
                    />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ================= 3. PAPAN PENGUMUMAN ================= */}
      {/*
        Papan pengumuman bergambar, seperti portal v1: satu slide adalah
        selembar gambar yang boleh ditautkan, tanpa judul dan tanpa teks di
        atasnya. Isinya datang dari modul Slide Informasi (`/admin/info-slides`)
        yang memakai tabel warisan `info_slides` apa adanya.

        Slide yang gambarnya tidak dapat dibuka sudah disaring backend — lihat
        `InfoSlideController::index()`. Seluruh bagian TIDAK dirender bila tidak
        ada slide sama sekali: papan kosong di beranda bandara membuat
        pengunjung mengira ada yang gagal dimuat.
      */}
      {SLIDES.length > 0 && (
        <section className="mx-auto mt-12 px-4 sm:px-6">
          <div
            className="relative mx-auto w-full overflow-hidden rounded-3xl bg-[#0b1e5b] shadow-xl shadow-blue-950/15 ring-1 ring-slate-200/70 transition-[max-width] duration-500"
            style={{ maxWidth: `${lebarSlide}px` }}
            onMouseEnter={() => setSlideTertahan(true)}
            onMouseLeave={() => setSlideTertahan(false)}
            role="region"
            aria-roledescription="carousel"
            aria-label={t.beranda.pengumumanJudul}
          >
            <div
              className="relative min-h-[200px] transition-[aspect-ratio] duration-500 sm:min-h-0"
              style={{ aspectRatio: `${lebarSlide} / ${tinggiSlide}` }}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={SLIDES[slideIdx]?.id}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  {/* Slide bertautan dapat diklik; yang tanpa tautan tetap
                      gambar biasa — bukan tombol mati. */}
                  {SLIDES[slideIdx]?.link_url ? (
                    <a
                      href={SLIDES[slideIdx].link_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={SLIDES[slideIdx].image_url as string}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={SLIDES[slideIdx]?.image_url as string}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Kendali hanya muncul bila memang ada yang bisa digeser. */}
            {SLIDES.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => geserSlide(-1)}
                  aria-label={t.beranda.sebelumnya}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/35 hover:bg-black/60 backdrop-blur text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => geserSlide(1)}
                  aria-label={t.beranda.selanjutnya}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/35 hover:bg-black/60 backdrop-blur text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {SLIDES.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSlideAktif(i); setSlideOtomatis(false); }}
                      aria-label={`${t.beranda.pengumumanKicker} ${i + 1}`}
                      aria-current={i === slideIdx}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === slideIdx ? 'w-7 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ================= 4. TENTANG ================= */}
      {/* Bentang editorial terbuka: seluruh isi duduk langsung pada latar
          beranda. Tidak ada panel putih, bingkai, atau bayangan pembungkus. */}
      <section className="relative mt-12 overflow-hidden pb-6 pt-16 sm:pb-8 sm:pt-20 lg:pb-6 lg:pt-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_42%,rgba(37,99,235,0.13),transparent_32%),radial-gradient(circle_at_12%_82%,rgba(6,182,212,0.08),transparent_24%)]" />
        <div className="pointer-events-none absolute right-[-5rem] top-[-3rem] select-none text-[15rem] font-black leading-none tracking-[-0.1em] text-blue-950/[0.025] sm:text-[22rem] lg:right-[2%] lg:text-[28rem]" aria-hidden="true">
          AAP
        </div>

        <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 xl:col-span-4"
            >
              <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-blue-600">
                <Building2 className="h-4 w-4" />
                {tentang.kicker}
              </span>

              <h2 className="mt-4 max-w-xl text-[32px] font-black leading-[1.08] tracking-[-0.035em] text-slate-900 sm:text-[40px] lg:text-[46px]">
                {tentang.judul}
              </h2>

              <div className="mt-5 flex items-center gap-2" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="h-px w-16 bg-gradient-to-r from-cyan-400 to-blue-500" />
                <Plane className="h-4 w-4 rotate-45 text-blue-600" />
              </div>

              <p className="mt-6 max-w-xl text-[14.5px] leading-[1.9] text-slate-600 sm:text-[15px]">
                {tentang.teks}
              </p>

              <Link
                href="/profile"
                className="group mt-8 inline-flex items-center gap-3 rounded-full bg-blue-600 px-6 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
              >
                {t.beranda.profilLengkap}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, delay: 0.06 }}
              className="relative lg:col-span-7 xl:col-span-8"
            >
              <div className="pointer-events-none absolute -left-8 -top-8 h-44 w-44 rounded-full border border-blue-300/30" aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-10 right-[12%] h-52 w-52 rounded-full border border-dashed border-cyan-300/30" aria-hidden="true" />
              <div className="pointer-events-none absolute -left-4 bottom-[18%] z-10 hidden rounded-full bg-blue-600 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-900/25 sm:block" aria-hidden="true">
                AAP · Samarinda
              </div>

              <div className="relative z-[1] ml-auto w-full lg:max-w-[920px]">
                <VideoProfil
                  gambar={tentang.gambar}
                  videoUrl={tentang.videoUrl}
                  caption={tentang.caption}
                  tinggiKelas="aspect-[16/9] h-auto sm:aspect-[16/8.6]"
                />
              </div>
            </motion.div>
          </div>

          {/* Statistik tetap satu-satunya ringkasan angka profil di beranda,
              tetapi kini berdiri langsung di latar alih-alih menjadi kaki card. */}
          {ABOUT_STATS.length > 0 && (
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:mt-16 lg:grid-cols-5 lg:gap-x-10"
            >
              {ABOUT_STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.slug} variants={rise} className="group min-w-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100/80 transition-colors group-hover:bg-blue-600">
                      <Icon className="h-[18px] w-[18px] text-blue-700 transition-colors group-hover:text-white" />
                    </span>
                    <p className="mt-4 text-[25px] font-black leading-none tabular-nums tracking-tight text-slate-900 sm:text-[28px]">{s.value}</p>
                    <p className="mt-2 max-w-[11rem] text-[11.5px] font-medium leading-snug text-slate-500">{s.label}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ================= 5. PEJABAT BANDARA ================= */}
      <section className="relative mt-14 overflow-hidden py-8 sm:py-10">
        {/* Seluruh atmosfer bersifat transparan agar seksi ini tetap menjadi
            bagian dari latar halaman, bukan panel atau kartu tersendiri. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_48%,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_8%_80%,rgba(14,165,233,0.07),transparent_25%)]" />

        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4 sm:mb-0">
            <JudulBagian kicker={t.beranda.pejabatKicker}>{t.beranda.pejabatJudul}</JudulBagian>
            <Link href="/profile#pejabat" className="group inline-flex items-center gap-2 self-start sm:self-auto text-[12.5px] font-bold text-blue-700">
              {t.beranda.profilLengkap}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10 xl:gap-14 items-stretch">
            {/* Presentasi utama dibuat seperti bentang editorial terbuka: foto,
                tipografi, dan atmosfer bertumpuk langsung di latar halaman. */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-9 relative min-h-[520px] grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] items-center"
            >
              <div className="pointer-events-none absolute right-[10%] top-[17%] w-[390px] h-[390px] rounded-full border border-blue-300/30" />
              <div className="pointer-events-none absolute right-[16%] top-[25%] w-[290px] h-[290px] rounded-full border border-dashed border-sky-300/30" />
              <div className="pointer-events-none absolute right-[7%] bottom-[10%] h-40 w-[58%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.11),transparent_68%)]" />

              <motion.div
                key={current.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45 }}
                className="relative z-10 flex flex-col py-8 md:h-[520px] md:py-12 md:pr-6"
              >
                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                  <span className="h-px w-9 bg-blue-500" />
                  {t.beranda.pejabatAktif}
                </div>
                {/* Ruang identitas dibuat tetap. Nama dan jabatan yang lebih
                    panjang boleh membungkus, tetapi tidak lagi mendorong
                    organisasi, uraian, dan navigasi ke posisi berbeda. */}
                <div className="mt-6 h-[2.75rem] overflow-hidden">
                  <p className="line-clamp-2 text-[13px] font-bold italic leading-snug text-cyan-700 sm:text-[14px]">{current.shortTitle}</p>
                </div>
                <div className="mt-1 flex h-[5.8rem] items-start overflow-hidden sm:h-24">
                  <h3 className="line-clamp-2 max-w-xl text-[clamp(1.9rem,2.55vw,2.65rem)] font-black leading-[1.08] tracking-[-0.035em] text-slate-900">
                    {current.name}
                  </h3>
                </div>
                <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">{ORG_NAME}</p>
                <p className="mt-6 h-[3rem] max-w-md overflow-hidden border-l-2 border-blue-500 pl-4 text-[13px] leading-relaxed text-slate-600 line-clamp-2 sm:text-[14px]">
                  {current.title}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-4 pt-8">
                  <div className="flex items-center gap-3 text-[12px] font-mono tracking-wider text-slate-400">
                    <b className="text-blue-700">{String(aman + 1).padStart(2, '0')}</b>
                    <span>/</span>
                    <span>{String(EXECUTIVES.length).padStart(2, '0')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => pickExec((aman - 1 + EXECUTIVES.length) % EXECUTIVES.length)} className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer" aria-label={`${t.beranda.sebelumnya} — ${t.beranda.pejabatJudul}`}>
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => pickExec((aman + 1) % EXECUTIVES.length)} className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors cursor-pointer" aria-label={`${t.beranda.selanjutnya} — ${t.beranda.pejabatJudul}`}>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              <div className="relative min-h-[380px] md:min-h-[520px] flex items-end justify-center">
                <motion.img
                  key={current.photo}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                  src={current.photo}
                  alt={current.name}
                  className={`pejabat-foto-utama relative z-10 h-[390px] sm:h-[440px] md:h-[510px] max-w-full w-auto object-contain object-bottom origin-bottom ${PEJABAT_PHOTO_FIT[current.slug] ?? ''}`}
                  style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)' }}
                />
              </div>
            </motion.div>

            {/* Daftar lain berupa indeks terbuka, hanya dipisahkan garis tipis.
                Tidak ada permukaan, radius, atau bayangan kartu. */}
            <div className="lg:col-span-3 lg:border-l lg:border-slate-200 lg:pl-7 xl:pl-9 lg:pt-10">
              <p className="pb-4 text-[10.5px] font-black uppercase tracking-[0.16em] text-slate-400">{t.beranda.pilihPejabatLain}</p>
              <div className="border-t border-slate-200">
                {others.map((p, urutan) => {
                  const idx = EXECUTIVES.findIndex((e) => e.slug === p.slug);
                  return (
                    <motion.button
                      key={p.slug}
                      onClick={() => pickExec(idx)}
                      whileHover={{ x: 5 }}
                      className="group grid h-[105px] w-full grid-cols-[24px_58px_minmax(0,1fr)_18px] items-center gap-3 border-b border-slate-200 text-left cursor-pointer"
                    >
                      <span className="text-[10px] font-mono text-slate-400">{String(urutan + 1).padStart(2, '0')}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photo} alt={p.name} loading="lazy" className={`w-[58px] h-[72px] object-contain object-bottom origin-bottom flex-shrink-0 grayscale group-hover:grayscale-0 transition-all ${PEJABAT_PHOTO_FIT[p.slug] ?? ''}`} />
                      <span className="min-w-0">
                        <span className="line-clamp-2 font-black text-slate-900 text-[13px] leading-snug group-hover:text-blue-700 transition-colors">{p.name}</span>
                        <span className="block mt-1 text-[11px] text-slate-500 leading-snug line-clamp-2">{p.shortTitle}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. BERITA ================= */}
      {/*
        Berita dan Fasilitas dulu berbagi satu baris — tujuh kolom untuk tiga
        kartu berita, lima untuk enam baris fasilitas. Keduanya jadi sempit
        tanpa alasan, dan gambar beritanya tinggal 112px. Kini masing-masing
        memiliki barisnya sendiri, dan kartunya kembali seukuran kartu.
      */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <JudulBagian kicker={t.beranda.beritaKicker}>{t.beranda.beritaJudul}</JudulBagian>
          <Link href="/news" className="text-[13px] font-semibold text-blue-600 flex items-center gap-1.5 hover:gap-2.5 transition-all">
            {t.umum.lihatSemua} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {latestNews.length === 0 ? (
          /* Bagian berita kini selebar halaman, jadi daftar kosong meninggalkan
             lubang yang kentara. Dikatakan apa adanya lewat kamus, bukan
             dibiarkan kosong. */
          <div className="mt-6 rounded-2xl bg-white border border-slate-100 px-6 py-12 text-center">
            <p className="text-[13.5px] font-bold text-slate-700">{t.umum.tidakAdaData}</p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {latestNews.map((n) => (
              <motion.article key={n.id} variants={rise} whileHover={{ y: -6 }} className="group">
                <Link
                  href={'/news/' + n.slug}
                  className="block h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm shadow-slate-200/60 hover:shadow-xl hover:shadow-blue-900/10 transition-shadow"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <GambarBerita berita={n} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-[9.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                      {n.category}
                    </span>
                  </div>

                  <div className="p-5">
                    <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5" /> {formatTanggal(n.published_at, bahasa)}
                    </p>
                    <h3 className="mt-2 font-black text-slate-900 text-[15px] leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {n.title}
                    </h3>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-blue-600 text-[12.5px] font-bold">
                      {t.umum.selengkapnya} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>
        )}
      </section>

      {/* ================= 7. FASILITAS UNGGULAN ================= */}
      {/*
        Berdata, bukan lagi enam kartu tetap dari kamus.

        Sebelum ini beranda menjanjikan Wi-Fi, Ruang Tunggu, Restoran, Musala,
        Area Bermain Anak, dan Layanan Disabilitas — enam nama yang ditulis di
        kamus dan tidak satu pun cocok dengan 22 fasilitas yang benar-benar
        terdaftar di `/facilities`. Menyunting fasilitas dari panel tidak
        mengubah beranda sedikit pun, dan pengunjung yang menekan "Lihat semua"
        mendarat di daftar yang isinya berbeda.

        Kategori "Umum" didahulukan karena itulah fasilitas yang benar-benar
        dapat dipakai penumpang; sisi udara dan sisi darat menyusul hanya untuk
        menggenapi kartunya.

        BENTUK KARTU. Foto di atas, lencana ikon bundar menumpang di batas foto
        dan kertas, judul dengan tombol panah bundar di kanannya, satu baris
        keterangan, lalu deretan cip spesifikasi.

        Cip itu BUKAN hiasan: isinya `details` warisan v1 — "Ukuran: 2.250 m x
        45 m", "8 Parking Stand" — data sungguhan yang selama ini hanya terbaca
        di halaman /facilities. Butir pertama naik menjadi baris keterangan dan
        tidak diulang sebagai cip, sebab `description` pada tabel ini memang
        gabungan butir-butir itu sendiri; menampilkan keduanya utuh membuat satu
        kalimat tercetak dua kali.
      */}
      <section className="mt-12 py-14">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <JudulBagian kicker={t.beranda.fasilitasKicker}>{t.beranda.fasilitasJudul}</JudulBagian>
            <Link href="/facilities" className="text-[13px] font-semibold text-blue-600 flex items-center gap-1.5 hover:gap-2.5 transition-all">
              {t.umum.lihatSemua} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {FASILITAS.length === 0 ? (
            <div className="mt-7 rounded-2xl bg-white border border-slate-100 px-6 py-12 text-center">
              <p className="text-[13.5px] font-bold text-slate-700">{t.umum.tidakAdaData}</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {FASILITAS.map((f) => {
                const meta = facilityCatMeta(f.category);
                const Icon = facilityIcon(f);

                /* Butir `details` warisan v1 bercampur dua jenis: spesifikasi berformat
                   "Label: nilai" dan kalimat penjelas. Yang berlabel jadi cip — pendek
                   dan terbaca sebagai data — sedangkan yang berupa kalimat naik menjadi
                   baris keterangan. Memasang kalimat utuh ke dalam cip hanya membuatnya
                   terpotong di tengah. */
                const butir = (f.details ?? []).filter(Boolean);
                const spesifikasi = butir.filter((d) => d.includes(':'));
                const kalimat = butir.filter((d) => !d.includes(':'));

                const ringkas = kalimat[0] ?? (f.location_description || '');
                const cip = spesifikasi.slice(0, 3);

                return (
                  <motion.article key={f.id} variants={rise} whileHover={{ y: -6 }} className="group h-full">
                    <Link
                      href="/facilities"
                      className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(15,23,42,0.07)] hover:shadow-[0_14px_36px_rgba(15,23,42,0.14)] transition-shadow"
                    >
                      {/* ---------- foto ---------- */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                        {f.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={f.image_url}
                            alt={f.name}
                            className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-[900ms] ease-out"
                          />
                        ) : (
                          /* Fasilitas tanpa foto tidak boleh tampil sebagai kotak
                             rusak. Bidang gradien berwarna kategori dengan ikon
                             besar dan busur rute terbaca sebagai rancangan, dan
                             kartunya tetap sebaris dengan yang berfoto. */
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${meta.color} 0%, #0b1e5b 130%)` }}
                          >
                            <Icon className="w-12 h-12 text-white/30" strokeWidth={1.4} />
                            <svg
                              className="absolute inset-0 w-full h-full text-white/15 pointer-events-none"
                              viewBox="0 0 400 250"
                              fill="none"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                            >
                              <path d="M-20 180 Q 160 70 420 140" stroke="currentColor" strokeWidth="2" strokeDasharray="7 10" />
                            </svg>
                          </div>
                        )}

                        {/* Lencana kategori di sudut kanan atas. */}
                        <span
                          className="absolute top-3 right-3 inline-flex items-center gap-1 text-white text-[9.5px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full shadow-md"
                          style={{ backgroundColor: meta.color }}
                        >
                          {f.category}
                        </span>
                      </div>

                      {/* ---------- badan kartu ---------- */}
                      <div className="relative flex flex-1 flex-col px-4 pb-4">
                        {/* Lencana ikon menumpang di batas foto dan kertas —
                            cincin putihnya yang memisahkannya dari foto apa pun
                            yang ada di belakangnya. */}
                        <span
                          className="absolute -top-6 left-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white"
                          style={{ backgroundColor: meta.color }}
                          aria-hidden="true"
                        >
                          <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                        </span>

                        <div className="pt-8 flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-black text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                            {f.name}
                          </h3>

                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                            aria-hidden="true"
                          >
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>

                        {ringkas && (
                          <p className="mt-1 text-[11.5px] text-slate-500 leading-relaxed line-clamp-2">
                            {ringkas}
                          </p>
                        )}

                        {cip.length > 0 && (
                          <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                            {cip.map((c) => (
                              <span
                                key={c}
                                title={c}
                                className="max-w-full truncate text-[10px] font-semibold px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: meta.bg, color: meta.color }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ================= 8. PARIWISATA TERDEKAT ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
          <div>
            <span className="inline-flex items-center gap-2 text-emerald-700 text-[10.5px] font-black uppercase tracking-[0.16em]">
              <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Palmtree className="w-4 h-4" />
              </span>
              {t.beranda.wisataKicker}
            </span>
            <h2 className="mt-3 text-[22px] sm:text-[25px] font-black tracking-[-0.02em] text-slate-900">{t.beranda.wisataJudul}</h2>
            <p className="mt-1.5 text-[12.5px] text-slate-500 max-w-xl leading-relaxed">{t.beranda.wisataRingkas}</p>
          </div>
          <Link href="/tourism" className="group inline-flex items-center gap-2 self-start sm:self-auto text-[12.5px] font-bold text-emerald-700">
            {t.beranda.wisataSemua}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {wisataUtama && (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            {/* Destinasi terdekat menjadi jangkar visual. Foto asli dari admin
                dipakai bila ada; tanpa foto, warna kategori membentuk bidang
                atmosfer yang tetap terasa sengaja dirancang. */}
            <motion.article variants={rise} className="lg:col-span-7 min-h-[390px] sm:min-h-[470px]">
              <Link href="/tourism#destinasi" className="group relative flex h-full min-h-[390px] sm:min-h-[470px] overflow-hidden rounded-[28px] bg-[#073b33]">
                {wisataUtama.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wisataUtama.cover} alt={wisataUtama.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.045]" />
                ) : (
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${metaWisataUtama.color} 0%, #0b1e5b 135%)` }}>
                    <Palmtree className="absolute right-[10%] top-[12%] w-40 h-40 text-white/[0.08]" strokeWidth={1} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/28 to-black/5" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

                <div className="relative z-10 mt-auto w-full p-6 sm:p-8 lg:p-9">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-md">{wisataUtama.category}</span>
                    {typeof wisataUtama.distanceKm === 'number' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-[10.5px] font-bold text-white backdrop-blur-md"><Car className="w-3.5 h-3.5" /> {wisataUtama.distanceKm} km</span>
                    )}
                  </div>

                  <h3 className="mt-4 max-w-xl text-[27px] sm:text-[34px] font-black leading-[1.08] tracking-[-0.025em] text-white">{wisataUtama.name}</h3>
                  {wisataUtama.city && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-white/75"><MapPin className="w-3.5 h-3.5" /> {wisataUtama.city}</p>
                  )}
                  <p className="mt-3 max-w-xl text-[12.5px] sm:text-[13px] leading-relaxed text-white/80 line-clamp-2">{wisataUtama.ringkas}</p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    {wisataUtama.duration && (
                      <span className="inline-flex items-center gap-2 text-[11.5px] font-bold text-white"><Clock className="w-4 h-4 text-emerald-300" /> {wisataUtama.duration} {t.beranda.dariBandara}</span>
                    )}
                    <span className="ml-auto inline-flex w-10 h-10 items-center justify-center rounded-full bg-white text-emerald-800 transition-transform group-hover:translate-x-1"><ArrowRight className="w-4 h-4" /></span>
                  </div>
                </div>
              </Link>
            </motion.article>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-5">
              {wisataLain.map((spot) => {
                const meta = TOURISM_CAT_META[spot.category as TourismCategory] ?? { color: '#475569', bg: '#f1f5f9' };

                return (
                  <motion.article key={spot.slug} variants={rise} whileHover={{ y: -3 }}>
                    <Link href="/tourism#destinasi" className="group relative grid min-h-[148px] h-full grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-1 lg:grid-cols-[150px_minmax(0,1fr)] overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_14px_38px_rgba(15,23,42,0.11)]">
                      <div className="relative min-h-[148px] overflow-hidden" style={{ background: `linear-gradient(145deg, ${meta.color}, #0b1e5b)` }}>
                        {spot.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={spot.cover} alt={spot.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                          <Palmtree className="absolute inset-0 m-auto w-14 h-14 text-white/20" strokeWidth={1.2} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      </div>

                      <div className="flex min-w-0 flex-col justify-center p-4 lg:p-5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9.5px] font-black uppercase tracking-[0.13em]" style={{ color: meta.color }}>{spot.category}</span>
                          {typeof spot.distanceKm === 'number' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tabular-nums text-slate-500"><Car className="w-3 h-3" /> {spot.distanceKm} km</span>
                          )}
                        </div>
                        <h4 className="mt-1.5 text-[14px] sm:text-[15px] font-black leading-snug text-slate-900 group-hover:text-emerald-700 transition-colors">{spot.name}</h4>
                        {spot.city && <p className="mt-1 text-[10.5px] text-slate-500 line-clamp-1">{spot.city}</p>}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          {spot.duration ? (
                            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600"><Clock className="w-3.5 h-3.5" style={{ color: meta.color }} /> {spot.duration}</span>
                          ) : <span />}
                          <ArrowRight className="w-4 h-4 text-slate-300 transition-all group-hover:text-emerald-600 group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
        )}
      </section>

      {/* ================= 9. AKSES MENUJU BANDARA ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* moda transportasi */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <JudulBagian kicker={t.beranda.aksesKicker} className="mb-5">{t.beranda.aksesJudul}</JudulBagian>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {AKSES.map((a) => {
              const Icon = a.icon;
              const isi = (
                <>
                  <span className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <Icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                  </span>
                  <p className="mt-2.5 font-bold text-slate-900 text-[12.5px] leading-snug">{a.nama}</p>
                  <p className="mt-1 text-[10.5px] text-slate-500 leading-snug">{a.desc}</p>
                </>
              );
              return (
                <motion.div key={a.kunci} variants={rise} whileHover={{ y: -4 }} className="group">
                  {a.href ? <Link href={a.href} className="block">{isi}</Link> : isi}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* peta */}
{/* Peta lokasi, disematkan dari Google Maps pada koordinat asli bandara
            (`lib/airports.ts`, berprovenans OurAirports). Peta lokator mandiri
            tetap berada di belakangnya sebagai jaring pengaman ketika sematan
            belum atau tidak dapat termuat — lihat catatan panjang di
            `PetaSematanGoogle.tsx` soal harga yang ditanggung sematan ini. */}
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-100 min-h-[240px]">
          <PetaSematanGoogle />

          <div className="absolute top-6 left-5 right-5">
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 flex gap-2.5">
              <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-[12.5px]">APT Pranoto Samarinda</p>
                {/* Alamat resmi sesuai aptpairport.id. */}
                <p className="text-[11px] text-slate-500 leading-snug">Jl. Poros Samarinda–Bontang, Kel. Sungai Siring, Samarinda 75119</p>
                {/* Koordinat ikut ditulis karena inilah satu-satunya keterangan
                    letak yang tetap berguna saat petanya tidak dapat dimuat. */}
                <p className="mt-1 text-[10.5px] text-slate-400 tabular-nums">
                  {KOORDINAT_BANDARA} · {BANDARA_LOKASI.iata}/{BANDARA_LOKASI.icao}
                </p>
              </div>
            </div>
          </div>

          {/* Membuka aplikasi peta milik pengunjung sendiri, bukan menyematkan
              peta pihak ketiga ke dalam beranda: yang pertama hanya berjalan
              bila diklik, yang kedua menyeret setiap pengunjung portal ke
              server pihak ketiga hanya untuk memuat halaman depan. */}
          <a
            href={TAUTAN_PETA}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-5 left-5 inline-flex items-center gap-2 bg-white text-slate-800 font-bold text-[12px] px-4 py-2.5 rounded-full shadow-lg border border-slate-100 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" /> {t.beranda.bukaPetaAplikasi}
            <span className="sr-only">{t.beranda.membukaTabBaru}</span>
          </a>
        </motion.div>

      </section>

      {/* ================= 10. MITRA ================= */}
      {/* `mb-14` di sini yang menanggung jarak ke footer — dulu tugas seksi
          newsletter yang dihapus. */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-12 mb-14">
        <MitraLogos />
      </section>

      {/* Seksi ini dulu berisi kotak berlangganan buletin. Dihapus karena
          formulirnya tidak pernah terhubung ke apa pun: alamat surel yang
          diketik pengunjung hanya ditelan `preventDefault` tanpa dikirim,
          disimpan, atau ditindaklanjuti siapa pun. Meminta data pribadi lalu
          membuangnya diam-diam lebih buruk daripada tidak memintanya sama
          sekali. Bila buletin benar-benar diadakan, bangun kembali seksi ini
          bersama endpoint penyimpanannya — bukan formulirnya lebih dulu.
          Kotak serupa di halaman berita masih ada dan menanggung masalah yang
          sama; lihat catatan pembuka `app/news/NewsView.tsx`. */}
    </div>
  );
}

/**
 * Satu fakta titik layan pada kartu FIDS beranda (Gate / Konter / Conveyor).
 *
 * Nomor yang sudah ditetapkan dibuat tebal dan gelap; yang belum ditetapkan
 * pudar dan berukuran sama dengan labelnya, supaya tidak terbaca sebagai nomor.
 */
function HomeDeskFact({
  icon: Icon, label, value, assigned,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  assigned: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1" title={`${label}: ${value}`}>
      <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
      <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <span
        className={
          assigned
            ? 'text-[12.5px] font-black text-slate-800 tabular-nums'
            : 'text-[10.5px] font-medium text-slate-400'
        }
      >
        {value}
      </span>
    </span>
  );
}
