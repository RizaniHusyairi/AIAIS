'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useSetting } from '@/lib/settings';
import {
  Plane, Compass, Target, Eye, ShieldCheck, Award, MapPin, Ruler, Building2, Users,
  Radio, Flame, ArrowRight, Quote, CheckCircle2, Sparkles, Navigation, Clock, Globe2, Heart,
} from 'lucide-react';

/* ================================================================
   Animated counter
   ================================================================ */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return <span ref={ref} className="tabular-nums">{val.toLocaleString('id-ID')}{suffix}</span>;
}

/* ================================================================
   Decorative: dashed flight arc
   ================================================================ */
function FlightArc({ className = '', d = 'M-20 180 Q 380 60 1020 140', delay = 0 }: { className?: string; d?: string; delay?: number }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 1000 220" preserveAspectRatio="none" fill="none">
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 9"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/* ================================================================
   Data
   ================================================================ */
const SPECS = [
  { label: 'Panjang Landas Pacu', value: 2250, suffix: ' m', sub: '2.250 × 45 meter · Boeing 737-800NG', icon: Ruler, color: '#2563eb' },
  { label: 'Luas Terminal', value: 16400, suffix: ' m²', sub: 'Kapasitas 1,5 juta penumpang / tahun', icon: Building2, color: '#0d9488' },
  { label: 'Parking Stand', value: 8, suffix: '', sub: 'Apron untuk pesawat narrow-body', icon: Plane, color: '#ea580c' },
  { label: 'Kategori PKP-PK', value: 7, suffix: '', sub: 'Kesiapsiagaan penanggulangan darurat', icon: Flame, color: '#dc2626' },
];

const MISI = [
  'Menyelenggarakan pelayanan jasa kebandarudaraan yang selamat, aman, dan nyaman sesuai standar nasional maupun internasional.',
  'Meningkatkan kapasitas dan kualitas prasarana terminal serta sisi udara secara berkelanjutan.',
  'Mengembangkan konektivitas udara Kalimantan Timur sebagai penyangga Ibu Kota Nusantara (IKN).',
  'Mewujudkan tata kelola yang transparan, akuntabel, dan berorientasi pada kepuasan pengguna jasa.',
  'Mendorong pemberdayaan ekonomi daerah melalui kemitraan dengan pelaku usaha lokal.',
];

const TIMELINE = [
  { year: '2011', title: 'Awal Pembangunan', desc: 'Pembangunan bandara baru Samarinda dimulai untuk menggantikan Bandara Temindung yang terbatas.' },
  { year: '2018', title: 'Penerbangan Perdana', desc: 'Bandara APT Pranoto resmi melayani penerbangan komersial pertama pada 24 Mei 2018.' },
  { year: '2019', title: 'Perpanjangan Runway', desc: 'Landas pacu diperpanjang menjadi 2.250 meter, memungkinkan operasi pesawat jet berbadan sempit.' },
  { year: '2022', title: 'Status BLU', desc: 'Ditetapkan sebagai Badan Layanan Umum untuk tata kelola yang lebih mandiri dan profesional.' },
  { year: '2024', title: 'Gerbang IKN', desc: 'Berperan sebagai simpul konektivitas udara pendukung Ibu Kota Nusantara.' },
];

const NILAI = [
  { icon: ShieldCheck, title: 'Keselamatan', desc: 'Keselamatan penerbangan adalah prioritas yang tidak dapat ditawar.', color: '#2563eb', bg: '#eff6ff' },
  { icon: Heart, title: 'Pelayanan', desc: 'Melayani dengan tulus, ramah, dan setara bagi seluruh pengguna jasa.', color: '#e11d48', bg: '#fff1f2' },
  { icon: Sparkles, title: 'Integritas', desc: 'Menjunjung kejujuran dan transparansi dalam setiap proses kerja.', color: '#d97706', bg: '#fffbeb' },
  { icon: Globe2, title: 'Profesional', desc: 'Bekerja sesuai standar, kompeten, dan terus mengembangkan diri.', color: '#0d9488', bg: '#f0fdfa' },
];

/**
 * Foto dummy pejabat — avatar SVG berlatar transparan (DiceBear).
 * Ganti dengan foto potong (PNG transparan) resmi saat sudah tersedia.
 */
const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}`;

const PEJABAT = [
  { name: 'Ahmad Syauqi Shahab', role: 'Kepala Kantor UPBU Kelas I', img: avatar('Ahmad Syauqi Shahab') },
  { name: 'Nina Kurniawati', role: 'Kepala Subbagian Tata Usaha', img: avatar('Nina Kurniawati') },
  { name: 'Budi Santoso', role: 'Kasi Operasi & Keamanan', img: avatar('Budi Santoso') },
  { name: 'Rudi Hermawan', role: 'Kasi Pelayanan & Fasilitas', img: avatar('Rudi Hermawan') },
  { name: 'Dewi Lestari', role: 'Kasi Lalu Lintas Udara', img: avatar('Dewi Lestari') },
];

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

export default function ProfilePage() {
  const heroBg = useSetting('bg_profile');

  return (
    <div className="bg-slate-50 overflow-hidden">
      {/* ============ 1. HERO ============ */}
      <section className="relative min-h-[560px] flex items-center overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#1e40af]">
        <motion.img
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.32 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          src={heroBg}
          alt="Terminal Bandara APT Pranoto"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1e5b] via-[#0b1e5b]/60 to-transparent" />

        {/* radar rings */}
        <div className="absolute -right-24 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block">
          <div className="relative w-[420px] h-[420px] rounded-full border border-white/10">
            <div className="absolute inset-12 rounded-full border border-white/10" />
            <div className="absolute inset-24 rounded-full border border-white/10" />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: 'conic-gradient(from 0deg, rgba(103,232,249,0.16), transparent 26%)' }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            />
          </div>
        </div>

        {/* clouds */}
        <div className="absolute top-20 left-[12%] w-52 h-16 bg-white/10 blur-3xl rounded-full" style={{ animation: 'cloudDrift 11s ease-in-out infinite alternate' }} />
        <div className="absolute bottom-28 right-[22%] w-64 h-20 bg-white/10 blur-3xl rounded-full" style={{ animation: 'cloudDrift 14s ease-in-out infinite alternate-reverse' }} />

        {/* flight arc + plane */}
        <FlightArc className="absolute inset-x-0 top-1/3 w-full h-56 text-white/25" />
        <motion.div
          initial={{ x: -90, y: 40, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-[18%] top-[26%] hidden md:block"
        >
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <Plane className="w-16 h-16 text-cyan-200/80 -rotate-[18deg] drop-shadow-2xl" strokeWidth={1.2} />
          </motion.div>
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-20 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Compass className="w-3.5 h-3.5" /> Kantor UPBU Kelas I
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight">
              Profil &amp; Visi Misi
              <br />
              <span className="text-cyan-300">Bandara APT Pranoto</span>
            </h1>

            <p className="mt-5 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">
              Bandar Udara Aji Pangeran Tumenggung Pranoto <b className="text-white">(IATA: AAP · ICAO: WALS)</b> adalah gerbang
              transportasi udara utama Kota Samarinda, Kalimantan Timur, sekaligus simpul konektivitas kawasan penyangga
              Ibu Kota Nusantara.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#visi-misi" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                Lihat Visi &amp; Misi <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#pejabat" className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors">
                <Users className="w-4 h-4" /> Pejabat Bandara
              </Link>
            </div>
          </motion.div>
        </div>

        {/* runway stripes */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 flex gap-2 px-4 opacity-70">
          {Array.from({ length: 28 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.08 }}
              className="flex-1 bg-cyan-300 rounded-full"
            />
          ))}
        </div>
      </section>

      {/* ============ 2. SPESIFIKASI ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-14 relative z-20">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SPECS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} variants={rise} whileHover={{ y: -6 }} className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-5">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}14` }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </span>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                <p className="text-[26px] font-black text-slate-900 leading-tight mt-0.5">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="text-[11.5px] text-slate-500 leading-snug mt-1">{s.sub}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ 3. TENTANG ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <Navigation className="w-3.5 h-3.5" /> Tentang Kami
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight">
            Gerbang Udara <span className="text-blue-600">Kalimantan Timur</span>
          </h2>
          <div className="mt-5 space-y-4 text-slate-600 text-[14.5px] leading-relaxed">
            <p>
              Bandara APT Pranoto dioperasikan oleh <b className="text-slate-900">Kantor Unit Penyelenggara Bandar Udara (UPBU)
              Kelas I APT Pranoto Samarinda</b> di bawah Direktorat Jenderal Perhubungan Udara, Kementerian Perhubungan
              Republik Indonesia.
            </p>
            <p>
              Berlokasi di Sungai Siring, bandara ini menggantikan peran Bandara Temindung yang terbatas oleh kepadatan
              permukiman kota. Dengan landas pacu 2.250 meter, APT Pranoto mampu melayani pesawat jet berbadan sempit
              menuju berbagai kota besar di Indonesia.
            </p>
            <p>
              Sebagai bandara berstatus <b className="text-slate-900">Badan Layanan Umum (BLU)</b>, pengelolaan dijalankan
              secara mandiri dan profesional untuk mendukung pertumbuhan ekonomi daerah serta konektivitas kawasan IKN.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-4">
            {[
              { icon: MapPin, label: 'Lokasi', value: 'Sungai Siring' },
              { icon: Clock, label: 'Operasional', value: '06.00 – 18.00' },
              { icon: Award, label: 'Status', value: 'BLU · Kelas I' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="border-l-2 border-blue-100 pl-3">
                  <Icon className="w-4 h-4 text-blue-600" />
                  <p className="text-[10.5px] text-slate-400 uppercase tracking-wide mt-1.5 font-semibold">{f.label}</p>
                  <p className="text-[13px] font-bold text-slate-900">{f.value}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-400/25">
            <img src="https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1000&q=80" alt="Terminal APT Pranoto" className="w-full h-[380px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1e5b]/50 to-transparent" />
          </div>

          {/* boarding-pass code card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 24 }}
            className="absolute -bottom-6 left-4 sm:left-6 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-[230px]"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-600">
              <Plane className="w-3.5 h-3.5 rotate-45" /> Kode Bandara
            </div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-[22px] font-black text-slate-900 leading-none">AAP</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">IATA</p>
              </div>
              <div className="flex-1 mx-3 border-t-2 border-dashed border-slate-200" />
              <div className="text-right">
                <p className="text-[22px] font-black text-slate-900 leading-none">WALS</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">ICAO</p>
              </div>
            </div>
          </motion.div>

          <div className="absolute -top-5 -right-3 grid grid-cols-4 gap-1.5 opacity-40">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============ 4. VISI & MISI ============ */}
      <section id="visi-misi" className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-20 overflow-hidden scroll-mt-24">
        <FlightArc className="absolute inset-x-0 top-10 w-full h-40 text-white/15" d="M-20 160 Q 420 40 1020 120" />
        <div className="absolute -left-20 bottom-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <Plane className="absolute right-10 bottom-10 w-40 h-40 text-white/[0.04] rotate-[25deg]" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 bg-white/12 border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Target className="w-3.5 h-3.5" /> Arah Organisasi
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">Visi &amp; Misi</h2>
            <p className="mt-3 text-blue-100/80 text-[14px] leading-relaxed">
              Landasan arah pengembangan Bandara APT Pranoto Samarinda dalam melayani masyarakat Kalimantan Timur.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="lg:col-span-2 relative overflow-hidden bg-white/[0.07] backdrop-blur border border-white/15 rounded-3xl p-7"
            >
              <span className="w-12 h-12 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center">
                <Eye className="w-6 h-6 text-cyan-300" />
              </span>
              <h3 className="mt-4 text-[22px] font-black text-white">Visi</h3>
              <Quote className="w-8 h-8 text-white/15 mt-3" />
              <p className="mt-1 text-blue-50 text-[15px] leading-relaxed italic">
                Terwujudnya penyelenggaraan bandar udara yang <b className="text-cyan-300 not-italic">selamat, aman, dan nyaman</b>,
                serta menjadi gerbang udara terdepan pendukung pertumbuhan Kalimantan Timur dan Ibu Kota Nusantara.
              </p>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 text-[11.5px] text-blue-200">
                <ShieldCheck className="w-4 h-4 text-cyan-300" /> Berlandaskan standar ICAO &amp; regulasi nasional
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="lg:col-span-3 bg-white rounded-3xl p-7 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </span>
                <h3 className="text-[22px] font-black text-slate-900">Misi</h3>
              </div>

              <motion.ol variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-5 space-y-3.5">
                {MISI.map((m, i) => (
                  <motion.li key={i} variants={rise} className="flex gap-3.5 group">
                    <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-[12px] font-black flex items-center justify-center shadow-md shadow-blue-600/25 group-hover:scale-110 transition-transform">
                      {i + 1}
                    </span>
                    <p className="text-slate-600 text-[13.5px] leading-relaxed pt-1">{m}</p>
                  </motion.li>
                ))}
              </motion.ol>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ 5. NILAI ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> Budaya Kerja
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Nilai yang Kami Pegang</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">
            Empat nilai dasar yang menjadi pedoman seluruh insan Bandara APT Pranoto dalam melayani.
          </p>
        </motion.div>

        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {NILAI.map((n) => {
            const Icon = n.icon;
            return (
              <motion.div
                key={n.title}
                variants={rise}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 p-6 transition-shadow"
              >
                <Plane className="absolute -right-3 -top-3 w-16 h-16 text-slate-50 rotate-[25deg] group-hover:text-blue-50 transition-colors" />

                <span className="relative w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: n.bg }}>
                  <Icon className="w-7 h-7" style={{ color: n.color }} />
                </span>
                <h3 className="relative mt-4 text-[17px] font-black text-slate-900">{n.title}</h3>
                <p className="relative mt-1.5 text-slate-500 text-[12.5px] leading-relaxed">{n.desc}</p>

                <span className="relative block mt-4 h-1 w-10 rounded-full group-hover:w-20 transition-all duration-300" style={{ backgroundColor: n.color }} />
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ 6. SEJARAH ============ */}
      <section className="relative bg-white py-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '26px 26px' }}
        />

        <div className="relative max-w-[1000px] mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
              <Radio className="w-3.5 h-3.5" /> Jejak Perjalanan
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Sejarah Singkat</h2>
          </motion.div>

          <div className="relative mt-12">
            <div className="absolute left-[26px] sm:left-1/2 sm:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-slate-200" />
            <motion.div
              className="absolute left-[26px] sm:left-1/2 sm:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-600 to-cyan-400 origin-top"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
            />

            <div className="space-y-8">
              {TIMELINE.map((t, i) => {
                const left = i % 2 === 0;
                return (
                  <motion.div
                    key={t.year}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 280, damping: 26 }}
                    className={`relative flex items-start ${left ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
                  >
                    <span className="absolute left-[26px] sm:left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shadow-md">
                      <Plane className="w-3.5 h-3.5 text-blue-600 rotate-[135deg]" />
                    </span>

                    <div className="hidden sm:block sm:w-1/2 flex-shrink-0" />

                    <div className={`flex-1 sm:w-1/2 pl-16 sm:pl-0 ${left ? 'sm:pr-12 sm:text-right' : 'sm:pl-12'}`}>
                      <div className="inline-block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow p-5">
                        <span className="inline-block bg-blue-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wider">{t.year}</span>
                        <h3 className="mt-2.5 text-[16px] font-black text-slate-900">{t.title}</h3>
                        <p className="mt-1.5 text-slate-500 text-[12.5px] leading-relaxed">{t.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 7. PEJABAT ============ */}
      <section id="pejabat" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5" /> Struktur Pimpinan
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Pejabat Bandara</h2>
          <p className="mt-2.5 text-slate-500 text-[14px]">Jajaran pimpinan Kantor UPBU Kelas I APT Pranoto Samarinda.</p>
        </motion.div>

        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {PEJABAT.map((p, i) => (
            <motion.div key={p.name} variants={rise} whileHover={{ y: -8 }} className="group relative">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-blue-50 to-slate-100 aspect-[3/4]">
                <div className="absolute inset-x-4 top-6 h-40 rounded-full bg-gradient-to-tr from-blue-400 via-cyan-300 to-amber-300 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
                <img src={p.img} alt={p.name} className="relative w-full h-full object-contain p-4 pb-10 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b1e5b]/85 to-transparent" />
                {i === 0 && (
                  <span className="absolute top-3 left-3 bg-amber-400 text-[#0b1e5b] text-[9.5px] font-black uppercase tracking-wider px-2 py-1 rounded-full">
                    Kepala Kantor
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <p className="text-white font-black text-[13px] leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-cyan-200 text-[10.5px] mt-0.5 line-clamp-2">{p.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ 8. CTA ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1e5b] to-[#2563eb] p-8 sm:p-12 text-center"
        >
          <FlightArc className="absolute inset-x-0 top-4 w-full h-32 text-white/20" d="M-20 140 Q 400 30 1020 110" />
          <Plane className="absolute -bottom-6 -right-4 w-40 h-40 text-white/[0.06] rotate-[25deg]" />

          <div className="relative max-w-xl mx-auto">
            <CheckCircle2 className="w-10 h-10 text-cyan-300 mx-auto" />
            <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white leading-tight">Ada Pertanyaan atau Masukan?</h2>
            <p className="mt-3 text-blue-100/85 text-[14px] leading-relaxed">
              Kami terbuka terhadap saran dan keluhan untuk terus meningkatkan kualitas pelayanan bandara.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Link href="/complaints" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-6 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                Sampaikan Pengaduan <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/flights" className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/25 text-white font-bold text-[13.5px] px-6 py-3 rounded-full hover:bg-white/20 transition-colors">
                <Plane className="w-4 h-4" /> Cek Penerbangan
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
