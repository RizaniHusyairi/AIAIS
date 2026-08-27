'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import { TOURISM_SPOTS, TOURISM_CAT_META } from '@/lib/tourismData';
import { OFFICIALS, ORG_NAME } from '@/lib/airportProfile';
import { PEJABAT_PHOTO_FIT } from '@/lib/pejabatFoto';
import HeroParticles from '@/components/effects/HeroParticles';
import DekorEvent, { PitaPerayaan } from '@/components/events/DekorEvent';
import { usePerayaanAktif } from '@/lib/perayaanAktif';
import NamaBandaraHero from '@/components/home/NamaBandaraHero';
import HeroBoardingPass from '@/components/home/HeroBoardingPass';
import { LampuLandasan, JudulBagian } from '@/components/home/AviasiDekor';
import { NewsItem, InstagramPost } from '@/types';
import GambarBerita from '@/components/GambarBerita';
import {
  Plane, ArrowRight, Building2, ChevronRight, ChevronLeft, Users, MapPin, Star, Car,
  ParkingSquare, Headphones, Play, Wifi, Sofa, UtensilsCrossed, MoonStar, Baby, Accessibility,
  Ruler, Award, CarFront, Bus, Mail, Share2, Send, Navigation, Calendar, Palmtree, Clock,
} from 'lucide-react';

/* ================================================================
   Data statis pendukung
   ================================================================ */
const QUICK = [
  { title: 'Penerbangan', desc: 'Info Jadwal', icon: Plane, color: '#2563eb', bg: '#eff6ff', href: '/flights' },
  { title: 'Fasilitas', desc: 'Layanan Bandara', icon: Building2, color: '#0d9488', bg: '#f0fdfa', href: '/facilities' },
  { title: 'Transportasi', desc: 'Menuju Bandara', icon: Car, color: '#ea580c', bg: '#fff7ed', href: '/tenants' },
  { title: 'Parkir', desc: 'Area Parkir', icon: ParkingSquare, color: '#7c3aed', bg: '#f5f3ff', href: '/facilities#parkir' },
  { title: 'Layanan Online', desc: 'Pengaduan & Layanan', icon: Headphones, color: '#e11d48', bg: '#fff1f2', href: '/complaints' },
  { title: 'Peta Bandara', desc: 'Navigasi Terminal', icon: MapPin, color: '#059669', bg: '#ecfdf5', href: '/facilities#peta' },
];

const ABOUT_STATS = [
  { icon: Users, value: '1.250.000+', label: 'Penumpang / Tahun' },
  { icon: MapPin, value: '18', label: 'Destinasi' },
  { icon: Plane, value: '120+', label: 'Penerbangan / Hari' },
  { icon: Ruler, value: '2.250 m', label: 'Panjang Runway' },
  { icon: Award, value: '4 Star', label: 'Bandara Terakreditasi' },
];

const FASILITAS = [
  { name: 'Wi-Fi Gratis', sub: 'Tersedia di seluruh area', icon: Wifi, color: '#2563eb', bg: '#eff6ff' },
  { name: 'Ruang Tunggu', sub: 'Nyaman & Luas', icon: Sofa, color: '#0d9488', bg: '#f0fdfa' },
  { name: 'Restaurant', sub: 'Beragam pilihan kuliner', icon: UtensilsCrossed, color: '#e11d48', bg: '#fff1f2' },
  { name: 'Mushola', sub: 'Bersih & Nyaman', icon: MoonStar, color: '#059669', bg: '#ecfdf5' },
  { name: 'Area Bermain Anak', sub: 'Ramah Keluarga', icon: Baby, color: '#d97706', bg: '#fffbeb' },
  { name: 'Layanan Disabilitas', sub: 'Aksesibilitas Terjamin', icon: Accessibility, color: '#7c3aed', bg: '#f5f3ff' },
];

const AKSES = [
  { name: 'Kendaraan Pribadi', desc: 'Tersedia area parkir yang luas', icon: Car },
  { name: 'Taksi & Rideshare', desc: 'Layanan tersedia 24 jam', icon: CarFront },
  { name: 'Bus & Shuttle', desc: 'Tersedia layanan bus dari berbagai titik kota', icon: Bus },
  { name: 'Rental Mobil', desc: 'Berbagai pilihan rental mobil di area bandara', icon: Navigation },
];

const ANGKA = [
  { icon: Users, value: '1.250.000+', label: 'Penumpang / Tahun' },
  { icon: MapPin, value: '18', label: 'Destinasi' },
  { icon: Plane, value: '120+', label: 'Penerbangan / Hari' },
  { icon: Star, value: '98%', label: 'Tingkat Kepuasan Penumpang' },
];

/**
 * Pejabat bandara — data resmi, dipakai bersama halaman /profile.
 *
 * Sebelumnya berkas ini memuat lima nama rekaan dengan avatar kartun
 * DiceBear, salah satunya diberi jabatan "Sekretaris Daerah Pemerintah
 * Kalimantan Timur" — jabatan publik nyata pada nama yang tidak ada —
 * lengkap dengan kutipan karangan. Semuanya dihapus; lihat provenans di
 * lib/airportProfile.ts.
 */
const EXECUTIVES = OFFICIALS;

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

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

export default function HomePage() {
  /* Unggahan Instagram — kini mengisi kolom kanan hero, menggantikan papan
     penerbangan. Dibaca dari tabel LOKAL portal, bukan dari Instagram: token
     tidak boleh sampai ke peramban, dan gangguan di Instagram tidak boleh ikut
     merusak beranda.

     Sumbernya bisa sinkronisasi API atau masukan petugas; beranda tidak perlu
     tahu bedanya — keduanya baris yang sama di tabel yang sama. */
  const [igPosts, setIgPosts] = useState<InstagramPost[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [exec, setExec] = useState(0);
  const [auto, setAuto] = useState(true);

  const heroBg = useSetting('bg_home');

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
  }, []);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setExec((e) => (e + 1) % EXECUTIVES.length), 6000);
    return () => clearInterval(t);
  }, [auto]);

  const current = EXECUTIVES[exec];
  const others = EXECUTIVES.filter((_, i) => i !== exec).slice(0, 4);
  const latestNews = news.slice(0, 3);

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
              Gerbang udara Kalimantan Timur yang menghubungkan Anda ke berbagai destinasi di Indonesia dan dunia.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Link href="/flights" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3.5 rounded-full shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all">
                <Plane className="w-4 h-4" /> Cek Penerbangan <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/facilities" className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm px-6 py-3.5 rounded-full shadow-sm flex items-center gap-2 transition-all">
                <Building2 className="w-4 h-4 text-blue-600" /> Lihat Fasilitas
              </Link>
              {/* Wisata terdekat. Bergaya sekunder seperti Fasilitas: hero
                  hanya boleh punya satu ajakan utama, dan "Cek Penerbangan"
                  yang paling sering dicari pengunjung bandara. */}
              <Link href="/tourism" className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm px-6 py-3.5 rounded-full shadow-sm flex items-center gap-2 transition-all">
                <Palmtree className="w-4 h-4 text-emerald-600" /> Lihat Destinasi Wisata
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
                <motion.div key={s.title} variants={rise}>
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
                        {s.title}
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

      {/* ================= 3. TENTANG ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="lg:col-span-7">
            <JudulBagian kicker="Profil Bandara">Tentang Bandar Udara APT Pranoto</JudulBagian>
            <p className="mt-3 text-slate-500 text-[13.5px] leading-relaxed max-w-xl">
              Bandar Udara APT Pranoto Samarinda merupakan gerbang utama Kalimantan Timur yang melayani penerbangan
              domestik dan terus berkembang menjadi bandara modern berstandar internasional.
            </p>

            <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ABOUT_STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.label} variants={rise} whileHover={{ y: -4 }} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <Icon className="w-5 h-5 text-blue-600" />
                    <p className="mt-2.5 text-[17px] font-black text-slate-900 leading-none">{s.value}</p>
                    <p className="mt-1 text-[10.5px] text-slate-500 leading-tight">{s.label}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden group">
              <img src="/bg/bg-beranda.png" alt="Profil Bandara APT Pranoto" className="w-full h-[220px] object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1e5b]/70 via-transparent to-transparent" />

              <button className="absolute inset-0 flex items-center justify-center cursor-pointer" aria-label="Putar video profil">
                <motion.span
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-900/40"
                >
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </motion.span>
              </button>

              <span className="absolute bottom-4 right-4 text-white text-[12.5px] font-semibold drop-shadow">Lihat Profile Bandara</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= 4. BERITA + FASILITAS ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Berita */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <JudulBagian kicker="Kabar Terkini">Berita &amp; Pengumuman</JudulBagian>
            <Link href="/news" className="text-[13px] font-semibold text-blue-600 flex items-center gap-1.5 hover:gap-2.5 transition-all">
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(latestNews.length > 0 ? latestNews : []).map((n) => (
              <motion.article key={n.id} variants={rise} whileHover={{ y: -5 }} className="group">
                <Link href={`/news/${n.slug}`} className="block">
                  <div className="relative h-28 rounded-xl overflow-hidden">
                    <GambarBerita berita={n} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                    <span className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                      {n.category}
                    </span>
                  </div>
                  <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" /> {fmtDate(n.published_at)}
                  </p>
                  <h3 className="mt-1 font-bold text-slate-900 text-[13px] leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {n.title}
                  </h3>
                  <span className="mt-2.5 inline-flex items-center gap-1.5 text-blue-600 text-[12px] font-bold">
                    Selengkapnya <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </motion.article>
            ))}
          </motion.div>
        </div>

        {/* Fasilitas Unggulan */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <JudulBagian kicker="Kenyamanan">Fasilitas Unggulan</JudulBagian>
            <Link href="/facilities" className="text-[13px] font-semibold text-blue-600 flex items-center gap-1.5 hover:gap-2.5 transition-all">
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {FASILITAS.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.name} variants={rise} className="flex items-center gap-3 group">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105" style={{ backgroundColor: f.bg }}>
                    <Icon className="w-[18px] h-[18px]" style={{ color: f.color }} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-[13px] truncate">{f.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{f.sub}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ================= 5. PEJABAT BANDARA ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <JudulBagian kicker="Tata Kelola" className="mb-5">Pejabat Bandara Udara APT Pranoto Samarinda</JudulBagian>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* kartu utama dengan latar bandara */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-8 relative overflow-hidden rounded-2xl min-h-[320px] flex"
            >
              <img src="/bg/bg-card-pejabat.png" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b1e5b]/92 via-[#123a8f]/55 to-transparent" />

              <div className="relative z-10 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
                {/* teks */}
                <motion.div key={current.name} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }} className="flex flex-col justify-center">
                  <p className="text-cyan-300 text-[13px] italic font-medium">{current.shortTitle}</p>
                  <h3 className="mt-1.5 text-[26px] sm:text-[28px] font-black text-white leading-tight">{current.name}</h3>
                  <p className="mt-1.5 text-blue-100/85 text-[12.5px]">{ORG_NAME}</p>

                  {/* Nomenklatur jabatan lengkap menggantikan slot "quote".
                      Tidak ada kutipan resmi dari para pejabat ini; yang
                      sebelumnya ada di sini karangan. */}
                  <p className="mt-4 text-blue-50 text-[12.5px] leading-relaxed max-w-xs">{current.title}</p>

                  <div className="mt-4 flex items-center gap-2">
                    {/* Email resmi sesuai aptpairport.id. */}
                    <a href="mailto:mail.aptpranotoairport@gmail.com" className="w-8 h-8 rounded-lg bg-white/12 border border-white/20 flex items-center justify-center text-white hover:bg-white/22 transition-colors" aria-label="Email">
                      <Mail className="w-4 h-4" />
                    </a>
                    <a href="#" className="w-8 h-8 rounded-lg bg-white/12 border border-white/20 flex items-center justify-center text-white hover:bg-white/22 transition-colors" aria-label="Bagikan profil">
                      <Share2 className="w-4 h-4" />
                    </a>
                  </div>

                  <Link href="/profile#pejabat" className="mt-5 inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[12.5px] px-4 py-2.5 rounded-full w-fit hover:bg-blue-50 transition-colors">
                    <Plane className="w-3.5 h-3.5 rotate-45" /> Profil Lengkap
                  </Link>
                </motion.div>

                {/* foto */}
                <div className="relative hidden sm:flex items-end justify-center">
                  {/* `top-8` menurunkan foto ~32px sehingga tepi bawahnya lewat di
                      bawah batas kartu dan tertutup `overflow-hidden`. Foto pejabat
                      ini potret cutout yang habis di pinggang; tanpa itu garis
                      potongnya melayang tepat di atas dasar kartu dan terbaca
                      seperti tersayat. Dipakai `top`, bukan `translate-y`, karena
                      framer-motion sudah memakai `transform` untuk animasi masuk —
                      kelas translate apa pun akan ditimpa.

                      `object-bottom` wajib menyertai `object-contain`: rasio foto
                      berbeda-beda, jadi pada kolom yang sempit foto terlebar
                      menyusut di dalam kotaknya. Tanpa `object-bottom` sisa ruangnya
                      dibagi rata atas-bawah dan garis potong itu terangkat kembali
                      ke dalam kartu.

                      Koreksi tinggi subjek (`PEJABAT_PHOTO_FIT`) aman dipasang di
                      gambar yang sama meski framer-motion memakai `transform` untuk
                      animasi masuk: Tailwind v4 memakai properti `scale` tersendiri,
                      bukan `transform`, jadi keduanya menumpuk alih-alih saling
                      menimpa. `origin-bottom` menjaga tepi bawah tetap terkunci saat
                      diskalakan. */}
                  <motion.img
                    key={current.photo}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    src={current.photo}
                    alt={current.name}
                    className={`relative top-8 z-10 h-[360px] w-auto object-contain object-bottom origin-bottom drop-shadow-2xl ${PEJABAT_PHOTO_FIT[current.slug] ?? ''}`}
                  />
                </div>
              </div>

              {/* kontrol */}
              <div className="absolute bottom-5 right-5 z-20 flex items-center gap-3">
                <span className="text-white/90 text-[12px] font-mono tracking-wider">
                  <b className="text-white">{String(exec + 1).padStart(2, '0')}</b> / {String(EXECUTIVES.length).padStart(2, '0')}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => pickExec((exec - 1 + EXECUTIVES.length) % EXECUTIVES.length)}
                  className="w-9 h-9 rounded-full bg-white/15 border border-white/25 backdrop-blur flex items-center justify-center text-white hover:bg-white/25 transition-colors cursor-pointer"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => pickExec((exec + 1) % EXECUTIVES.length)}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-blue-700 shadow-lg hover:bg-blue-50 transition-colors cursor-pointer"
                  aria-label="Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>

            {/* daftar pejabat lain */}
            <div className="lg:col-span-4 space-y-3">
              {others.map((p) => {
                const idx = EXECUTIVES.findIndex((e) => e.slug === p.slug);
                return (
                  <motion.button
                    key={p.slug}
                    onClick={() => pickExec(idx)}
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <img src={p.photo} alt={p.name} loading="lazy" className={`w-14 h-14 rounded-xl object-contain object-bottom origin-bottom bg-slate-50 p-0.5 flex-shrink-0 ${PEJABAT_PHOTO_FIT[p.slug] ?? ''}`} />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-[13px] leading-snug truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{p.shortTitle}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. AKSES MENUJU BANDARA ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* moda transportasi */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <JudulBagian kicker="Transportasi" className="mb-5">Akses Menuju Bandara</JudulBagian>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {AKSES.map((a) => {
              const Icon = a.icon;
              return (
                <motion.div key={a.name} variants={rise} whileHover={{ y: -4 }} className="group">
                  <span className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <Icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                  </span>
                  <p className="mt-2.5 font-bold text-slate-900 text-[12.5px] leading-snug">{a.name}</p>
                  <p className="mt-1 text-[10.5px] text-slate-500 leading-snug">{a.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* peta */}
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-100 min-h-[240px]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
              backgroundSize: '38px 38px',
            }}
          />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 260" fill="none">
            <path d="M-10 190 Q 90 150 150 190 T 320 160" stroke="#cbd5e1" strokeWidth="10" />
            <path d="M60 -10 Q 100 90 70 270" stroke="#e2e8f0" strokeWidth="8" />
          </svg>

          <div className="absolute top-6 left-5 right-5">
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 flex gap-2.5">
              <motion.span
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"
              >
                <MapPin className="w-4 h-4 text-white" />
              </motion.span>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-[12.5px]">APT Pranoto Samarinda</p>
                {/* Alamat resmi sesuai aptpairport.id. */}
                <p className="text-[11px] text-slate-500 leading-snug">Jl. Poros Samarinda–Bontang, Kel. Sungai Siring, Samarinda 75119</p>
              </div>
            </div>
          </div>

          <Link
            href="/facilities#peta"
            className="absolute bottom-5 left-5 inline-flex items-center gap-2 bg-white text-slate-800 font-bold text-[12px] px-4 py-2.5 rounded-full shadow-lg border border-slate-100 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" /> Lihat di Peta
          </Link>
        </motion.div>

      </section>

      {/* ================= 7. PARIWISATA TERDEKAT ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <span className="inline-flex items-center gap-2 text-emerald-600 text-[10.5px] font-bold uppercase tracking-[0.16em] bg-emerald-50 px-2.5 py-1 rounded-full">
                <Palmtree className="w-3.5 h-3.5" /> Pariwisata Terdekat
              </span>
              <h2 className="mt-2.5 text-[19px] font-black text-slate-900">Jelajahi Sekitar Bandara</h2>
              <p className="mt-1 text-[12px] text-slate-500 max-w-lg leading-relaxed">
                Destinasi budaya, alam, dan belanja khas Kalimantan Timur — terdekat hanya 15 menit dari terminal.
              </p>
            </div>
            <Link href="/tourism" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-full transition-colors">
              Lihat Semua Destinasi <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOURISM_SPOTS.slice()
              .sort((a, b) => a.distanceKm - b.distanceKm)
              .slice(0, 4)
              .map((spot) => {
                const meta = TOURISM_CAT_META[spot.category];
                return (
                  <motion.div key={spot.slug} variants={rise} whileHover={{ y: -4 }}>
                    <Link
                      href="/tourism#destinasi"
                      className="group block h-full rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/60 transition-all overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: meta.bg }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                          {spot.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10.5px] font-bold tabular-nums" style={{ color: meta.color }}>
                          <Car className="w-3 h-3" /> {spot.distanceKm} km
                        </span>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-slate-900 text-[13.5px] leading-snug group-hover:text-emerald-700 transition-colors">
                          {spot.name}
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-500">{spot.city}</p>
                        <p className="mt-2 text-[11.5px] text-slate-500 leading-relaxed line-clamp-3">
                          {spot.description}
                        </p>
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                          <Clock className="w-3.5 h-3.5" style={{ color: meta.color }} /> {spot.duration} dari bandara
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
          </motion.div>
        </div>
      </section>

      {/* ================= 8. DALAM ANGKA ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1226] to-[#111c3d] p-7 sm:p-8"
        >
          <img src="/bg/bg-card-pejabat.png" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1226] via-[#0b1226]/85 to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '22px 22px' }}
          />

          <h2 className="relative z-10 text-[19px] font-black text-white">APT Pranoto dalam Angka</h2>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative z-10 mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {ANGKA.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.label} variants={rise} className={`space-y-2 ${i < ANGKA.length - 1 ? 'lg:border-r lg:border-white/10' : ''}`}>
                  <span className="w-10 h-10 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-300" />
                  </span>
                  <p className="text-[22px] font-black text-white leading-none">{s.value}</p>
                  <p className="text-[11.5px] text-slate-400 leading-tight">{s.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ================= 9. NEWSLETTER ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6 mb-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
        >
          <div className="lg:col-span-5">
            <h2 className="text-[18px] font-black text-slate-900">Dapatkan Informasi Terbaru</h2>
            <p className="mt-2 text-slate-500 text-[12.5px] leading-relaxed max-w-sm">
              Berlangganan newsletter kami untuk mendapatkan informasi terbaru seputar penerbangan dan promo menarik.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="lg:col-span-7 flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="Masukkan email Anda"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] px-6 py-3.5 rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              Berlangganan <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </section>
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
