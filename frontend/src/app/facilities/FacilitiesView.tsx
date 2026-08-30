'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import { Facility } from '@/types';
import { facilityCatMeta as catMeta, facilityIcon } from '@/lib/facilityMeta';
import { useTeks, type Kamus } from '@/lib/kamus';
import {
  Building2, MapPin, Search, Compass, Plane, ArrowRight, Sparkles, CheckCircle2,
  Armchair, Store, Layers, Accessibility, Headphones, DoorOpen, ParkingSquare,
  Maximize2, X,
} from 'lucide-react';

/* ================================================================
   Lengkung lintasan dekoratif — sama dengan halaman tenant
   ================================================================ */
function FlightArc({ className = '', d = 'M-20 170 Q 380 50 1020 130' }: { className?: string; d?: string }) {
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
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/* Zona terminal untuk bagian denah */
/* Zona terminal. Nama dan isinya dari kamus; ikon, warna, dan urutannya tetap
   di sini — ketiganya sama di kedua bahasa. Kunci React memakai `kunci`, bukan
   namanya, supaya kartunya tidak dipasang ulang saat bahasa berganti. */
/** Kunci zona; banyaknya dipakai kartu ringkasan, jadi tidak perlu kamus. */
const ZONA_KUNCI = ['lantai-1', 'lantai-2', 'vip', 'parkir'] as const;

const zonaTerminal = (t: Kamus) => [
  { kunci: 'lantai-1', ...t.fasilitas.zona.lantai1, icon: DoorOpen, color: '#2563eb', bg: '#eff6ff' },
  { kunci: 'lantai-2', ...t.fasilitas.zona.lantai2, icon: Plane, color: '#0891b2', bg: '#ecfeff' },
  { kunci: 'vip', ...t.fasilitas.zona.vip, icon: Armchair, color: '#d97706', bg: '#fffbeb' },
  { kunci: 'parkir', ...t.fasilitas.zona.parkir, icon: ParkingSquare, color: '#7c3aed', bg: '#f5f3ff' },
];

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/* ================================================================
   Kartu fasilitas
   ================================================================

   Dijadikan komponen tersendiri karena tiap kartu perlu ingatannya sendiri
   tentang "foto ini gagal dimuat". Ditaruh di state induk, satu foto rusak
   akan memicu render ulang seluruh kisi.

   Kepala kartu memakai fotonya bila ada, dan kembali ke ikon kategori bila
   tidak — termasuk saat berkasnya raib dari cakram, keadaan yang baru
   ketahuan setelah peramban gagal memuatnya. `image_url` sudah bernilai null
   dari server bila lintasannya tak ditemukan, sehingga `<img src="">` tidak
   pernah terbentuk. */
function KartuFasilitas({ fac, t, onBuka }: { fac: Facility; t: Kamus; onBuka: () => void }) {
  const meta = catMeta(fac.category);
  /* Ikonnya dirakit lewat createElement, bukan disimpan pada peubah berhuruf
     besar lalu dipakai sebagai <Icon />. Keduanya menghasilkan elemen yang
     sama, tetapi bentuk kedua terbaca linter React sebagai komponen yang
     dibuat ulang setiap render — padahal `facilityIcon` hanya membaca peta
     ikon yang tetap. */
  const ikon = facilityIcon(fac);
  const [gagal, setGagal] = useState(false);
  const foto = gagal ? null : fac.image_url;

  return (
    <motion.article
      variants={rise}
      whileHover={{ y: -7 }}
      className="group relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 transition-shadow flex flex-col"
    >
      <button
        type="button"
        onClick={onBuka}
        aria-label={`${t.fasilitas.lihatFoto} — ${fac.name}`}
        className="relative h-40 w-full overflow-hidden block cursor-pointer"
        style={{ backgroundColor: foto ? undefined : meta.bg }}
      >
        {foto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto}
              alt={fac.name}
              loading="lazy"
              decoding="async"
              onError={() => setGagal(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]"
            />
            {/* Pil kategori dan badge status duduk di atas foto sembarang
                warna; tanpa gradien ini keduanya kerap tak terbaca. */}
            <span className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/5 to-slate-950/45" />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur text-slate-700 text-[10.5px] font-bold px-2.5 py-1 rounded-full opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              <Maximize2 className="w-3 h-3" /> {t.fasilitas.lihatFoto}
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            {React.createElement(ikon, {
              className: 'w-16 h-16 transition-transform duration-500 group-hover:scale-110',
              style: { color: meta.color, opacity: 0.4 },
              strokeWidth: 1.4,
            })}
            <Plane className="absolute -bottom-3 -right-2 w-14 h-14 text-white/50 rotate-[25deg]" />
          </span>
        )}

        <span
          className="absolute top-3 left-3 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow"
          style={{ backgroundColor: meta.color }}
        >
          {fac.category}
        </span>

        <span
          className={`absolute top-3 right-3 inline-flex items-center gap-1 bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${
            fac.is_operational ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${fac.is_operational ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {fac.is_operational ? t.fasilitas.statusBeroperasi : t.fasilitas.statusTutup}
        </span>
      </button>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-black text-slate-900 text-[16px] leading-snug group-hover:text-blue-700 transition-colors">
          {fac.name}
        </h3>
        <p className="mt-1.5 text-slate-500 text-[12.5px] leading-relaxed line-clamp-3">
          {fac.description || t.fasilitas.deskripsiBawaan}
        </p>

        <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
          <span className="text-[12px] text-slate-600 leading-relaxed">{fac.location_description}</span>
        </div>
      </div>

      <span className="block h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: meta.color }} />
    </motion.article>
  );
}

/* ================================================================
   Lightbox — foto besar beserta keterangan lengkapnya
   ================================================================ */
function LightboxFasilitas({ fac, t, onTutup }: { fac: Facility; t: Kamus; onTutup: () => void }) {
  const meta = catMeta(fac.category);
  const ikon = facilityIcon(fac);   // lihat catatan pada KartuFasilitas

  /* Migrasi v1 menyalin `details` ke `description`, sehingga sebagian besar
     fasilitas memuat kalimat yang sama persis di kedua kolom. Ditampilkan apa
     adanya, lightbox mengulang isi yang sama dua kali. Ringkasannya karena itu
     hanya ditampilkan bila ia benar-benar menambah sesuatu di luar butirnya. */
  const butir = (fac.details ?? []).map((d) => d.trim()).filter(Boolean);
  const ringkas = (fac.description ?? '').trim();
  const rapikan = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
  const ringkasBerbeda = ringkas !== '' && rapikan(ringkas) !== rapikan(butir.join(' '));

  /* Esc menutup, dan halaman di belakangnya dikunci supaya gulirannya tidak
     ikut bergerak saat pengunjung menggulir isi lightbox. */
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onTutup(); };
    window.addEventListener('keydown', onEsc);
    const semula = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = semula;
    };
  }, [onTutup]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onTutup}
      role="dialog"
      aria-modal="true"
      aria-label={fac.name}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
      >
        <button
          type="button"
          onClick={onTutup}
          aria-label={t.fasilitas.tutup}
          className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {fac.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fac.image_url} alt={fac.name} className="w-full aspect-[16/10] object-cover bg-slate-100" />
        ) : (
          <div className="w-full aspect-[16/6] flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
            {React.createElement(ikon, {
              className: 'w-20 h-20',
              strokeWidth: 1.2,
              style: { color: meta.color, opacity: 0.45 },
            })}
          </div>
        )}

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ backgroundColor: meta.color }}
            >
              {fac.category}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                fac.is_operational ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fac.is_operational ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {fac.is_operational ? t.fasilitas.statusBeroperasi : t.fasilitas.statusTutup}
            </span>
          </div>

          <h3 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">{fac.name}</h3>

          {(ringkasBerbeda || butir.length === 0) && (
            <p className="mt-3 text-slate-600 text-[14px] leading-relaxed whitespace-pre-line">
              {ringkas || t.fasilitas.deskripsiBawaan}
            </p>
          )}

          {butir.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {butir.map((d) => (
                <li key={d} className="flex items-start gap-2 text-[13px] text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]" style={{ backgroundColor: meta.color }} />
                  {d}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 pt-4 border-t border-dashed border-slate-200 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{t.fasilitas.labelLokasi}</p>
              <p className="mt-0.5 text-[13.5px] text-slate-700 leading-relaxed">{fac.location_description}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================ */

export default function FacilitiesView() {
  const t = useTeks();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [dipilih, setDipilih] = useState<Facility | null>(null);
  const heroBg = useSetting('bg_facilities');

  useEffect(() => {
    fetchApi<Facility[]>('/facilities').then((res) => {
      if (res.success && Array.isArray(res.data)) setFacilities(res.data);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(facilities.map((f) => f.category))).sort(),
    [facilities],
  );

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return facilities.filter((f) => {
      const byCat = cat === 'all' || f.category === cat;
      const byQ = !q || [f.name, f.category, f.description, f.location_description]
        .some((v) => String(v ?? '').toLowerCase().includes(s));
      return byCat && byQ;
    });
  }, [facilities, cat, q]);

  const counts = useMemo(() => ({
    total: facilities.length,
    categories: new Set(facilities.map((f) => f.category)).size,
    operational: facilities.filter((f) => f.is_operational).length,
    /* Yang dihitung banyaknya zona, dan itu sama di kedua bahasa — jadi
       daftarnya tidak perlu ikut kamus di sini. */
    zones: ZONA_KUNCI.length,
  }), [facilities]);

  return (
    <div className="bg-slate-50 overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[440px] flex items-center overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#1e40af]">
        <motion.img
          initial={{ scale: 1.14, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
          src={heroBg}
          alt="Fasilitas terminal bandara"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1e5b] via-[#0b1e5b]/65 to-transparent" />

        {/* awan */}
        <div className="absolute top-16 left-[10%] w-48 h-16 bg-white/10 blur-3xl rounded-full" style={{ animation: 'cloudDrift 11s ease-in-out infinite alternate' }} />
        <div className="absolute bottom-20 right-[18%] w-60 h-20 bg-white/10 blur-3xl rounded-full" style={{ animation: 'cloudDrift 13s ease-in-out infinite alternate-reverse' }} />

        <FlightArc className="absolute inset-x-0 top-1/3 w-full h-48 text-white/25" />
        <motion.div
          initial={{ x: -80, y: 34, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-[16%] top-[24%] hidden md:block"
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <Building2 className="w-14 h-14 text-cyan-200/80 drop-shadow-2xl" strokeWidth={1.2} />
          </motion.div>
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-16 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Building2 className="w-3.5 h-3.5" /> {t.fasilitas.heroKicker}
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
              {t.fasilitas.heroJudul}
              <br />
              <span className="text-cyan-300">{t.fasilitas.heroAksen}</span>
            </h1>

            <p className="mt-4 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">
              {t.fasilitas.heroLead}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#denah" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                <Compass className="w-4 h-4" /> {t.fasilitas.lihatDenah}
              </Link>
              <Link href="/tenants" className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors">
                {t.fasilitas.tenantTransportasi} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* garis landasan */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 flex gap-2 px-4 opacity-70">
          {Array.from({ length: 26 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.08 }}
              className="flex-1 bg-cyan-300 rounded-full"
            />
          ))}
        </div>
      </section>

      {/* ============ RINGKASAN ANGKA ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { kunci: 'total', label: t.fasilitas.ringkas.total, value: counts.total, icon: Building2, color: '#2563eb' },
            { kunci: 'kategori', label: t.fasilitas.ringkas.kategori, value: counts.categories, icon: Layers, color: '#7c3aed' },
            { kunci: 'beroperasi', label: t.fasilitas.ringkas.beroperasi, value: counts.operational, icon: CheckCircle2, color: '#059669' },
            { kunci: 'zona', label: t.fasilitas.ringkas.zona, value: counts.zones, icon: Compass, color: '#0891b2' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.kunci} variants={rise} whileHover={{ y: -5 }} className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-5">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}14` }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </span>
                <p className="text-[24px] font-black text-slate-900 leading-none mt-3 tabular-nums">{s.value}</p>
                <p className="text-[11.5px] text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ DIREKTORI FASILITAS ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <Building2 className="w-3.5 h-3.5" /> {t.fasilitas.heroKicker}
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">{t.fasilitas.direktoriJudul}</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">{t.fasilitas.direktoriRingkas}</p>
        </motion.div>

        {/* filter + pencarian */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between"
        >
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[{ value: 'all', label: t.fasilitas.semua, color: '#2563eb', icon: Sparkles },
              ...categories.map((c) => ({ value: c, label: c, color: catMeta(c).color, icon: catMeta(c).icon })),
            ].map((c) => {
              const Icon = c.icon;
              const on = cat === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCat(c.value)}
                  className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    on ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="facility-filter"
                      className="absolute inset-0 rounded-xl"
                      style={{ backgroundColor: c.color }}
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    />
                  )}
                  <Icon className="relative w-4 h-4" />
                  <span className="relative whitespace-nowrap">{c.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative lg:w-64 flex-shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.fasilitas.cariPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </motion.div>

        {/* kisi kartu */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <motion.div
              animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
            >
              <Plane className="w-7 h-7 text-white rotate-45" />
            </motion.div>
            <p className="text-slate-500 text-[13px]">{t.fasilitas.memuat}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-[13.5px] font-medium">
              {facilities.length === 0
                ? t.fasilitas.kosongData
                : t.fasilitas.kosongCari}
            </p>
          </div>
        ) : (
          <motion.div key={cat + q} variants={container} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((fac) => (
              <KartuFasilitas key={fac.id} fac={fac} t={t} onBuka={() => setDipilih(fac)} />
            ))}
          </motion.div>
        )}
      </section>

      {/* ============ DENAH TERMINAL ============ */}
      <section id="denah" className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-16 overflow-hidden scroll-mt-24">
        <FlightArc className="absolute inset-x-0 top-8 w-full h-36 text-white/15" d="M-20 150 Q 420 40 1020 120" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <Building2 className="absolute right-8 bottom-6 w-40 h-40 text-white/[0.05]" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 bg-white/12 border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Compass className="w-3.5 h-3.5" /> {t.fasilitas.denahKicker}
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">{t.fasilitas.denahJudul}</h2>
            <p className="mt-3 text-blue-100/80 text-[14px] leading-relaxed">
              {t.fasilitas.denahRingkas}
            </p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {zonaTerminal(t).map((z) => {
              const Icon = z.icon;
              return (
                <motion.div
                  key={z.kunci}
                  variants={rise}
                  whileHover={{ y: -7 }}
                  className="group relative overflow-hidden bg-white rounded-3xl p-6 shadow-xl"
                >
                  <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: z.bg }}>
                    <Icon className="w-7 h-7" style={{ color: z.color }} />
                  </span>

                  <h3 className="mt-4 text-[16px] font-black text-slate-900 leading-snug">{z.nama}</h3>

                  <ul className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-1.5">
                    {z.item.map((it) => (
                      <li key={it} className="flex items-start gap-2 text-[12px] text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: z.color }} />
                        {it}
                      </li>
                    ))}
                  </ul>

                  <span className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: z.color }} />
                </motion.div>
              );
            })}
          </motion.div>

          {/* panel bantuan */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden mt-8 rounded-3xl bg-white/[0.07] backdrop-blur border border-white/15 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
          >
            <span className="w-16 h-16 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center flex-shrink-0">
              <Accessibility className="w-8 h-8 text-cyan-300" />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-black text-[19px]">{t.fasilitas.bantuanJudul}</h3>
              <p className="mt-1.5 text-blue-100/85 text-[13px] leading-relaxed">
                {t.fasilitas.bantuanRingkas}
              </p>
            </div>
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              <Headphones className="w-4 h-4" /> {t.fasilitas.hubungiPetugas}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-lg p-8 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
              <Store className="w-3.5 h-3.5" /> {t.fasilitas.ctaKicker}
            </span>
            <h2 className="mt-3.5 text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {t.fasilitas.ctaJudul}
            </h2>
            <p className="mt-3 text-slate-500 text-[13.5px] leading-relaxed max-w-md">
              {t.fasilitas.ctaRingkas}
            </p>
            <Link
              href="/tenants"
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors"
            >
              {t.fasilitas.ctaTombol} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative flex justify-center">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 via-cyan-300 to-amber-300 blur-3xl opacity-40 rounded-full" />
              <Building2 className="relative w-40 h-40 text-blue-600/80" strokeWidth={1} />
            </motion.div>
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {dipilih && <LightboxFasilitas fac={dipilih} t={t} onTutup={() => setDipilih(null)} />}
      </AnimatePresence>
    </div>
  );
}
