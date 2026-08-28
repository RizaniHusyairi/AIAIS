'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useSetting } from '@/lib/settings';
import {
  HEAD_OFFICIAL, ORG_NAME, VISI, MISI, SEJARAH, TIMELINE,
  STATUS_BLU, TUGAS, FUNGSI, ROUTES, CONTACT, MAPS_URL,
  type Official,
} from '@/lib/airportProfile';
import { PEJABAT_PHOTO_FIT } from '@/lib/pejabatFoto';
import { usePejabat } from '@/lib/pejabatLive';
import OrgChart from '@/components/profile/OrgChart';
import {
  Plane, Compass, Target, Eye, ShieldCheck, Award, MapPin, Ruler, Building2, Users,
  Radio, Flame, ArrowRight, Quote, CheckCircle2, Sparkles, Navigation, Clock, Globe2, Heart,
  ScrollText, Scale, Route, Phone, Mail, X, Briefcase,
} from 'lucide-react';
import { useBahasa } from '@/lib/bahasa';
import { useTeks } from '@/lib/kamus';

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
/**
 * Spesifikasi teknis. Angka bersumber dari data fasilitas resmi bandara
 * (lihat provenans di lib/airportProfile.ts).
 *
 * Catatan: istilah "PKP-PK" sengaja TIDAK dipakai — halaman publik resmi
 * hanya menyebut "Kategori 6 ARFF". Sebelumnya berkas ini menulis
 * "Kategori PKP-PK 7", yang tidak bersumber dari mana pun.
 */
const SPECS = [
  { label: 'Panjang Landas Pacu', value: 2250, suffix: ' m', sub: '2.250 × 45 meter · PCN 50 F/C/X/T', icon: Ruler, color: '#2563eb' },
  { label: 'Luas Terminal', value: 12700, suffix: ' m²', sub: 'Kapasitas 1,5 juta penumpang / tahun', icon: Building2, color: '#0d9488' },
  { label: 'Parking Stand', value: 8, suffix: '', sub: 'Apron 300 × 123 meter · PCN 63 F/C/X/T', icon: Plane, color: '#ea580c' },
  { label: 'Kategori ARFF', value: 6, suffix: '', sub: 'Fire Station kesiapsiagaan darurat', icon: Flame, color: '#dc2626' },
];

const NILAI = [
  { icon: ShieldCheck, title: 'Keselamatan', desc: 'Keselamatan penerbangan adalah prioritas yang tidak dapat ditawar.', color: '#2563eb', bg: '#eff6ff' },
  { icon: Heart, title: 'Pelayanan', desc: 'Melayani dengan tulus, ramah, dan setara bagi seluruh pengguna jasa.', color: '#e11d48', bg: '#fff1f2' },
  { icon: Sparkles, title: 'Integritas', desc: 'Menjunjung kejujuran dan transparansi dalam setiap proses kerja.', color: '#d97706', bg: '#fffbeb' },
  { icon: Globe2, title: 'Profesional', desc: 'Bekerja sesuai standar, kompeten, dan terus mengembangkan diri.', color: '#0d9488', bg: '#f0fdfa' },
];

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

/* ================================================================
   Dialog profil pejabat

   Dipakai sekali, di halaman ini saja; sengaja tidak digeneralisasi.
   `Modal` pada components/admin/ui.tsx tidak dipakai ulang: bertema gelap
   panel admin, mengunci ikon di headernya, dan belum punya jebakan fokus,
   kunci gulir, maupun peran ARIA.
   ================================================================ */
function OfficialDialog({ official, onClose }: { official: Official | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = 'dialog-pejabat-title';

  useEffect(() => {
    if (!official) return;

    // Kembalikan fokus ke kartu pemicu setelah dialog ditutup.
    const opener = document.activeElement as HTMLElement | null;

    // Kunci gulir halaman. Lebar scrollbar dikompensasi supaya tata letak
    // tidak "meloncat" mendatar saat dialog dibuka di desktop.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Jebakan fokus sederhana: putar antar elemen fokusabel di dalam panel.
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    // Fokus awal di panel, bukan tombol tutup, agar pembaca layar
    // membacakan judul dialog lebih dulu.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      opener?.focus?.();
    };
  }, [official, onClose]);

  return (
    <AnimatePresence>
      {official && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0b1e5b]/70 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl outline-none"
          >
            {/* kepala */}
            <div className="flex items-start gap-4 p-5 sm:p-6 border-b border-slate-100">
              <div className="w-16 h-20 rounded-2xl bg-gradient-to-b from-white to-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- aset statis lokal */}
                <img
                  src={official.photo}
                  alt={official.name}
                  className={`w-full h-full object-contain object-bottom origin-bottom ${PEJABAT_PHOTO_FIT[official.slug] ?? ''}`}
                />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 id={titleId} className="text-[17px] font-black text-slate-900 leading-snug">
                  {official.name}
                </h3>
                <p className="mt-1 text-[12.5px] text-blue-700 font-semibold leading-snug">
                  {official.title}
                </p>
                <p className="mt-0.5 text-[11.5px] text-slate-400">{ORG_NAME}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* isi */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
              <DialogList icon={Briefcase} title="Riwayat Jabatan" items={official.riwayatJabatan} color="#2563eb" />
              <DialogList icon={Award} title="Penghargaan" items={official.penghargaan} color="#d97706" />

              {/* Keterangan penyensoran.
                  Ditaruh DI DALAM dialog pejabat, bukan hanya di kaki halaman:
                  di sinilah pembaca menyadari ada bagian yang tidak ada, dan
                  keterangan yang jauh dari tempat itu tidak menjawab apa pun. */}
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
                <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-slate-500 leading-relaxed">
                  Riwayat pendidikan, NIP, dan pangkat/golongan tidak ditampilkan sebagai
                  pelindungan data pribadi sesuai{' '}
                  <strong className="text-slate-600">
                    Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi
                  </strong>
                  . Nama, jabatan, riwayat jabatan, dan penghargaan kedinasan tetap diumumkan
                  sebagai informasi publik menurut UU Nomor 14 Tahun 2008.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DialogList({
  icon: Icon, title, items, color,
}: {
  icon: typeof Award; title: string; items: string[]; color: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </span>
        <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      </div>
      <ul className="mt-2.5 space-y-2 pl-1">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2.5 text-[13px] text-slate-600 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]" style={{ backgroundColor: color }} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProfileView() {
  const t = useTeks();
  const bahasa = useBahasa();
  const heroBg = useSetting('bg_profile');
  /** Objek, bukan indeks, supaya animasi keluar masih punya konten. */
  const [openOfficial, setOpenOfficial] = useState<Official | null>(null);

  /* Pejabat bandara — dikelola lewat /admin/pejabat. Membuka dengan teks
     otoritatif, lalu berpindah ke data API begitu jawabannya tiba. */
  const pejabat = usePejabat();
  /* Kepala kantor selalu entri pertama, mengikuti urutan yang ditetapkan
     petugas — bukan konstanta, supaya penggantian kepala kantor lewat panel
     admin ikut berlaku pada penanda di kartu. */
  const kepalaKantor = pejabat[0] ?? HEAD_OFFICIAL;

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
              <Compass className="w-3.5 h-3.5" /> {t.profil.heroKicker}
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight">
              {t.profil.heroJudul}
              <br />
              <span className="text-cyan-300">{t.profil.heroAksen}</span>
            </h1>

            <p className="mt-5 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">
              {t.profil.heroLeadAwal} <b className="text-white">(IATA: AAP · ICAO: WALS)</b>{' '}
              {t.profil.heroLeadAkhir}
            </p>

            {/* Isi halaman ini dokumen resmi berbahasa Indonesia; dikatakan
                sekali di muka alih-alih diterjemahkan setengah-setengah. */}
            {bahasa === 'en' && (
              <p className="mt-3 text-[12.5px] text-cyan-100/80">{t.profil.catatanIsi}</p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#visi-misi" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                {t.profil.lihatVisiMisi} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#pejabat" className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors">
                <Users className="w-4 h-4" /> {t.profil.pejabatBandara}
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
              { icon: Clock, label: 'Operasional', value: CONTACT.operationalHours },
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

              {/* Kalimat resmi utuh: pembuka menjelaskan dasar penetapan,
                  lalu pernyataan visinya sendiri (bagian dalam tanda kutip). */}
              <p className="mt-3 text-blue-100/75 text-[12px] leading-relaxed">{VISI.pembuka}</p>

              <Quote className="w-8 h-8 text-white/15 mt-3" />
              <p className="mt-1 text-blue-50 text-[15px] leading-relaxed italic">
                &ldquo;{VISI.pernyataan}&rdquo;
              </p>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 text-[11.5px] text-blue-200">
                <ShieldCheck className="w-4 h-4 text-cyan-300" /> Kantor UPBU Kelas I A.P.T. Pranoto – Samarinda
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
                {/* Dokumen aslinya berhuruf a–f, bukan bernomor. */}
                {MISI.map((m) => (
                  <motion.li key={m.label} variants={rise} className="flex gap-3.5 group">
                    <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-[12px] font-black flex items-center justify-center shadow-md shadow-blue-600/25 group-hover:scale-110 transition-transform">
                      {m.label}
                    </span>
                    <p className="text-slate-600 text-[13.5px] leading-relaxed pt-1">{m.text}</p>
                  </motion.li>
                ))}
              </motion.ol>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ 5. TUGAS & FUNGSI ============ */}
      <section id="tugas-fungsi" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <ScrollText className="w-3.5 h-3.5" /> Dasar Hukum
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Tugas &amp; Fungsi</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">
            Mandat penyelenggaraan bandar udara sesuai peraturan yang berlaku.
          </p>
        </motion.div>

        {/* Tugas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 bg-white rounded-3xl border border-slate-100 shadow-sm p-7"
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-blue-600" />
            </span>
            <div>
              <h3 className="text-[18px] font-black text-slate-900">Tugas</h3>
              <span className="inline-block mt-1 bg-blue-50 text-blue-700 text-[10.5px] font-bold px-2.5 py-1 rounded-lg">
                {TUGAS.dasar}
              </span>
            </div>
          </div>
          <p className="mt-4 text-slate-600 text-[13.5px] leading-relaxed">{TUGAS.text}</p>
        </motion.div>

        {/* Fungsi */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-7"
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            </span>
            <h3 className="text-[18px] font-black text-slate-900">Fungsi</h3>
          </div>

          <motion.ol
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5"
          >
            {FUNGSI.map((f) => (
              <motion.li key={f.label} variants={rise} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-[11.5px] font-black flex items-center justify-center">
                  {f.label}
                </span>
                <p className="text-slate-600 text-[13px] leading-relaxed pt-0.5">{f.text}</p>
              </motion.li>
            ))}
          </motion.ol>
        </motion.div>
      </section>

      {/* ============ 6. NILAI ============ */}
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

      {/* ============ 7. SEJARAH ============ */}
      <section id="sejarah" className="relative bg-white py-16 overflow-hidden scroll-mt-24">
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '26px 26px' }}
        />

        <div className="relative max-w-[1000px] mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
              <Radio className="w-3.5 h-3.5" /> Jejak Perjalanan
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Sejarah dan Letak Geografis</h2>
            <p className="mt-2.5 text-slate-500 text-[14px]">Dari Temindung ke gerbang udara baru Samarinda</p>
          </motion.div>

          {/* Narasi resmi. Linimasa di bawahnya hanya memuat peristiwa yang
              punya dasar pada sumber; entri 2011 dan 2019 yang sebelumnya ada
              di sini dihapus karena tidak bersumber. */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mt-10 max-w-[760px] mx-auto space-y-4"
          >
            {SEJARAH.map((p, i) => (
              <motion.p
                key={i}
                variants={rise}
                className={`text-slate-600 leading-relaxed ${i === 0 ? 'text-[15px] font-medium text-slate-700' : 'text-[13.5px]'}`}
              >
                {p}
              </motion.p>
            ))}
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

      {/* ============ 8. STATUS & PENETAPAN BLU ============ */}
      <section id="blu" className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-20 overflow-hidden scroll-mt-24">
        <FlightArc className="absolute inset-x-0 top-10 w-full h-40 text-white/15" d="M-20 150 Q 420 50 1020 130" />
        <div className="absolute -right-24 bottom-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative max-w-[1000px] mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 bg-white/12 border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Scale className="w-3.5 h-3.5" /> Dasar Penetapan
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">Status &amp; Penetapan</h2>
            <p className="mt-2.5 text-blue-100/80 text-[14px]">Dasar hukum pengelolaan keuangan</p>

            <p className="mt-8 text-cyan-300 text-[19px] sm:text-[22px] font-black tracking-tight">
              {STATUS_BLU.dasar}
            </p>

            <p className="mt-4 max-w-2xl mx-auto text-blue-50 text-[14px] leading-relaxed">
              {STATUS_BLU.text}
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <motion.span variants={rise} className="inline-flex items-center gap-2 bg-cyan-400/15 border border-cyan-300/30 text-cyan-100 text-[12.5px] font-bold px-4 py-2.5 rounded-2xl">
              <Plane className="w-4 h-4" /> A.P.T. Pranoto (Samarinda)
            </motion.span>
            {STATUS_BLU.bersama.map((b) => (
              <motion.span
                key={b}
                variants={rise}
                className="inline-flex items-center gap-2 bg-white/[0.07] border border-white/15 text-blue-100 text-[12.5px] px-4 py-2.5 rounded-2xl"
              >
                {b}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ 9. RUTE PENERBANGAN ============ */}
      <section id="rute" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <Route className="w-3.5 h-3.5" /> Konektivitas
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Rute Penerbangan</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">
            Kota tujuan yang terhubung langsung dari Samarinda.
          </p>
        </motion.div>

        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { title: 'Rute Reguler', desc: 'Layanan penerbangan berjadwal harian.', items: ROUTES.reguler, color: '#2563eb', bg: '#eff6ff', icon: Plane },
            { title: 'Rute Perintis', desc: 'Melayani wilayah pedalaman dan kepulauan Kalimantan Timur.', items: ROUTES.perintis, color: '#0d9488', bg: '#f0fdfa', icon: Compass },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                variants={rise}
                whileHover={{ y: -6 }}
                className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 p-6 transition-shadow"
              >
                <Plane className="absolute -right-3 -top-3 w-20 h-20 rotate-[25deg]" style={{ color: c.bg }} />
                <span className="relative w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: c.bg }}>
                  <Icon className="w-6 h-6" style={{ color: c.color }} />
                </span>
                <h3 className="relative mt-4 text-[17px] font-black text-slate-900">{c.title}</h3>
                <p className="relative mt-1 text-[12.5px] text-slate-500 leading-relaxed">{c.desc}</p>

                <div className="relative mt-4 flex flex-wrap gap-2">
                  {c.items.map((d) => (
                    <span
                      key={d}
                      className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: c.bg, color: c.color }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 text-center text-[12px] text-slate-400 leading-relaxed"
        >
          Rute dapat berubah mengikuti jadwal maskapai.{' '}
          <Link href="/flights" className="text-blue-600 font-semibold hover:underline">
            Lihat jadwal penerbangan hari ini
          </Link>
          .
        </motion.p>
      </section>

      {/* ============ 10. PEJABAT ============ */}
      <section id="pejabat" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5" /> Struktur Pimpinan
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Pejabat Bandara</h2>
          <p className="mt-2.5 text-slate-500 text-[14px]">Jajaran pimpinan {ORG_NAME}.</p>
        </motion.div>

        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {pejabat.map((p) => (
            <motion.button
              key={p.slug}
              type="button"
              onClick={() => setOpenOfficial(p)}
              aria-haspopup="dialog"
              variants={rise}
              whileHover={{ y: -8 }}
              className="group relative text-left cursor-pointer rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {/* Bingkai putih, tanpa glow: foto resmi punya latar berbeda-beda
                  (satu di antaranya JPEG berlatar putih opak), sehingga latar
                  biru + blur akan menampakkan kotak putih di baliknya. */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-white to-slate-50 border border-slate-100 aspect-[3/4]">
                {/* eslint-disable-next-line @next/next/no-img-element -- aset statis lokal */}
                <img
                  src={p.photo}
                  alt={p.name}
                  loading="lazy"
                  className={`relative w-full h-full object-contain object-bottom origin-bottom p-3 pb-8 group-hover:scale-105 transition-transform duration-500 ${PEJABAT_PHOTO_FIT[p.slug] ?? ''}`}
                />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0b1e5b]/90 via-[#0b1e5b]/55 to-transparent" />

                {p.slug === kepalaKantor.slug && (
                  <span className="absolute top-3 left-3 bg-amber-400 text-[#0b1e5b] text-[9.5px] font-black uppercase tracking-wider px-2 py-1 rounded-full">
                    Kepala Kantor
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <p className="text-white font-black text-[12.5px] leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-cyan-200 text-[10.5px] mt-0.5 line-clamp-2">{p.shortTitle}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-cyan-300/90 text-[9.5px] font-semibold">
                    Baca profil selengkapnya
                    <ArrowRight className="w-3 h-3 -translate-x-0.5 group-hover:translate-x-0 transition-transform" />
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>

        <OfficialDialog official={openOfficial} onClose={() => setOpenOfficial(null)} />
      </section>

      {/* ============ 11. STRUKTUR ORGANISASI ============ */}
      {/*
        Bagan ini dulu berupa gambar raster 1280×901 yang dibuka di tab baru.
        Kini isinya dirender sebagai data: dapat dicari, terbaca di ponsel,
        terjangkau pembaca layar, dan tiap unitnya bertaut ke dialog pejabat.
        Sumber dan aturan transkripsinya ada di lib/orgStructure.ts.
      */}
      <motion.section
        id="struktur"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-8 scroll-mt-24"
      >
        <OrgChart onOpenOfficial={setOpenOfficial} />
      </motion.section>

      {/* ============ 11b. LOKASI & KONTAK ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <motion.div
            id="lokasi"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 scroll-mt-24"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </span>
              <h2 className="text-[17px] font-black text-slate-900">Lokasi &amp; Kontak</h2>
            </div>

            <div className="mt-5 space-y-4">
              <div className="border-l-2 border-blue-100 pl-3">
                <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Alamat</p>
                <p className="mt-0.5 text-[13px] text-slate-700 leading-relaxed">{CONTACT.address}</p>
              </div>

              <a href={`tel:${CONTACT.phoneHref}`} className="block border-l-2 border-blue-100 pl-3 group">
                <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Telepon</p>
                <p className="mt-0.5 text-[13px] font-semibold text-slate-700 group-hover:text-blue-700 transition-colors flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" /> {CONTACT.phone}
                </p>
              </a>

              <a href={`mailto:${CONTACT.email}`} className="block border-l-2 border-blue-100 pl-3 group">
                <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Email</p>
                <p className="mt-0.5 text-[13px] font-semibold text-slate-700 group-hover:text-blue-700 transition-colors break-all flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" /> {CONTACT.email}
                </p>
              </a>

              <div className="border-l-2 border-blue-100 pl-3">
                <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Jam Operasional</p>
                <p className="mt-0.5 text-[13px] text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> {CONTACT.operationalHours}
                </p>
              </div>

              <div className="border-l-2 border-blue-100 pl-3">
                <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Koordinat</p>
                <p className="mt-0.5 text-[13px] text-slate-700 tabular-nums flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  {CONTACT.lat.toFixed(5)}, {CONTACT.lon.toFixed(5)}
                </p>
              </div>
            </div>

            {/* Tautan keluar, bukan peta tersemat: portal harus tetap berguna
                di jaringan bandara tanpa jalur ke internet. */}
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] py-3 rounded-2xl shadow-lg shadow-blue-600/20 transition-colors"
            >
              <MapPin className="w-4 h-4" /> Buka di Google Maps
            </a>
          </motion.div>
        </div>
      </section>

      {/* ============ 12. CTA ============ */}
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
