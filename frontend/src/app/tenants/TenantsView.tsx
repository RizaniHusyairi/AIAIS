'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import { Tenant } from '@/types';
import {
  Store, Clock, MapPin, Phone, Coffee, ShoppingBag, Car, Sofa, Wrench, Plane,
  Search, Bus, Bike, CarFront, ParkingSquare, Headphones, ArrowRight, Sparkles, Utensils, Navigation,
} from 'lucide-react';

/* ================================================================
   Decorative flight arc
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

const CATEGORIES = [
  { value: 'all', label: 'Semua', icon: Sparkles, color: '#2563eb' },
  { value: 'food_beverage', label: 'Kuliner', icon: Utensils, color: '#e11d48' },
  { value: 'retail', label: 'Retail & Oleh-oleh', icon: ShoppingBag, color: '#7c3aed' },
  { value: 'lounge', label: 'Lounge', icon: Sofa, color: '#d97706' },
  { value: 'transportation', label: 'Transportasi', icon: Car, color: '#0891b2' },
  { value: 'services', label: 'Layanan', icon: Wrench, color: '#059669' },
];

const CAT_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  food_beverage: { label: 'Kuliner', color: '#e11d48', bg: '#fff1f2', icon: Utensils },
  retail: { label: 'Retail', color: '#7c3aed', bg: '#f5f3ff', icon: ShoppingBag },
  lounge: { label: 'Lounge', color: '#d97706', bg: '#fffbeb', icon: Sofa },
  transportation: { label: 'Transportasi', color: '#0891b2', bg: '#ecfeff', icon: Car },
  services: { label: 'Layanan', color: '#059669', bg: '#ecfdf5', icon: Wrench },
};

/* Ikon moda transportasi.

   Daftar moda dulu ditulis tetap di sini — enam kartu lengkap dengan keterangan
   seperti "Bus DAMRI" dan "Taksi Resmi, beroperasi 24 jam" yang tidak bersumber
   dari mana pun. Kini isinya datang dari gerai kategori `transportation` yang
   didaftarkan petugas, sama seperti layar PWA. Yang tersisa di berkas ini hanya
   ikonnya, ditebak dari nama gerai karena data admin tidak menyimpan ikon. */
function ikonModa(name: string) {
  const n = name.toLowerCase();
  if (/bus|damri|pemadu/.test(n)) return Bus;
  if (/rental|sewa/.test(n)) return CarFront;
  if (/ojek/.test(n)) return Bike;
  if (/parkir/.test(n)) return ParkingSquare;
  return Car;
}

const TRANS_META = CAT_META.transportation;

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export default function TenantsView() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const heroBg = useSetting('bg_tenants');

  useEffect(() => {
    fetchApi<Tenant[]>('/tenants').then((res) => {
      if (res.success && Array.isArray(res.data)) setTenants(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return tenants.filter((t) => {
      const byCat = cat === 'all' || t.category === cat;
      const byQ = !q || [t.name, t.location, t.description].some((v) => String(v ?? '').toLowerCase().includes(s));
      return byCat && byQ;
    });
  }, [tenants, cat, q]);

  const counts = useMemo(() => ({
    total: tenants.length,
    fnb: tenants.filter((t) => t.category === 'food_beverage').length,
    retail: tenants.filter((t) => t.category === 'retail').length,
    trans: tenants.filter((t) => t.category === 'transportation').length,
  }), [tenants]);

  /* Moda transportasi menuju/dari bandara — termasuk konter taksi koperasi di
     area kedatangan. Bersumber data yang sama dengan daftar gerai di atas. */
  const moda = useMemo(
    () => tenants.filter((t) => t.category === 'transportation'),
    [tenants],
  );

  return (
    <div className="bg-slate-50 overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[440px] flex items-center overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#1e40af]">
        <motion.img
          initial={{ scale: 1.14, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
          src={heroBg}
          alt="Area komersial terminal"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1e5b] via-[#0b1e5b]/65 to-transparent" />

        {/* clouds */}
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
            <Plane className="w-14 h-14 text-cyan-200/80 -rotate-[18deg] drop-shadow-2xl" strokeWidth={1.2} />
          </motion.div>
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-16 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Store className="w-3.5 h-3.5" /> Direktori Komersial
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Tenant &amp; Layanan
              <br />
              <span className="text-cyan-300">Transportasi AAP</span>
            </h1>

            <p className="mt-4 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">
              Pilihan kuliner, oleh-oleh khas Kalimantan Timur, lounge, serta moda transportasi resmi untuk
              melengkapi perjalanan Anda di Bandara APT Pranoto.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#transportasi" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                <Navigation className="w-4 h-4" /> Menuju Bandara
              </Link>
              <Link href="/facilities" className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors">
                Lihat Fasilitas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* runway stripes */}
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

      {/* ============ STAT STRIP ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tenant', value: counts.total, icon: Store, color: '#2563eb' },
            { label: 'Kuliner', value: counts.fnb, icon: Coffee, color: '#e11d48' },
            { label: 'Retail & Oleh-oleh', value: counts.retail, icon: ShoppingBag, color: '#7c3aed' },
            { label: 'Moda Transportasi', value: counts.trans, icon: Bus, color: '#0891b2' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} variants={rise} whileHover={{ y: -5 }} className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-5">
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

      {/* ============ DIREKTORI TENANT ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <Store className="w-3.5 h-3.5" /> Direktori Tenant
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Nikmati Ragam Pilihan di Terminal</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">
            Temukan tenant favorit Anda sebelum keberangkatan maupun setelah kedatangan.
          </p>
        </motion.div>

        {/* filter + search */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between"
        >
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((c) => {
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
                      layoutId="tenant-filter"
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
              placeholder="Cari tenant..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </motion.div>

        {/* grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <motion.div
              animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
            >
              <Plane className="w-7 h-7 text-white rotate-45" />
            </motion.div>
            <p className="text-slate-500 text-[13px]">Memuat direktori tenant...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Store className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-[13.5px] font-medium">Tidak ada tenant yang cocok dengan pencarian Anda.</p>
          </div>
        ) : (
          <motion.div key={cat + q} variants={container} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((t) => {
              const meta = CAT_META[t.category] ?? { label: t.category, color: '#64748b', bg: '#f1f5f9', icon: Store };
              const Icon = meta.icon;
              return (
                <motion.article
                  key={t.id}
                  variants={rise}
                  whileHover={{ y: -7 }}
                  className="group relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 transition-shadow"
                >
                  {/* image / placeholder */}
                  <div className="relative h-40 overflow-hidden" style={{ backgroundColor: meta.bg }}>
                    {t.image_url ? (
                      <img src={t.image_url} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-14 h-14" style={{ color: meta.color, opacity: 0.35 }} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                    <span
                      className="absolute top-3 left-3 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label}
                    </span>
                    {/* decorative plane */}
                    <Plane className="absolute -bottom-3 -right-2 w-14 h-14 text-white/25 rotate-[25deg]" />
                  </div>

                  <div className="p-5">
                    <h3 className="font-black text-slate-900 text-[16px] leading-snug group-hover:text-blue-700 transition-colors">{t.name}</h3>
                    {t.description && <p className="mt-1.5 text-slate-500 text-[12.5px] leading-relaxed line-clamp-2">{t.description}</p>}

                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-2">
                      <p className="flex items-center gap-2 text-[12px] text-slate-600">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                        <span className="truncate">{t.location}</span>
                      </p>
                      <p className="flex items-center gap-2 text-[12px] text-slate-600">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                        {t.operating_hours}
                      </p>
                      {t.contact_phone && (
                        <p className="flex items-center gap-2 text-[12px] text-slate-600">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                          {t.contact_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="block h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: meta.color }} />
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* ============ TRANSPORTASI ============ */}
      <section id="transportasi" className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-16 overflow-hidden scroll-mt-24">
        <FlightArc className="absolute inset-x-0 top-8 w-full h-36 text-white/15" d="M-20 150 Q 420 40 1020 120" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <Bus className="absolute right-8 bottom-6 w-40 h-40 text-white/[0.05]" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 bg-white/12 border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Navigation className="w-3.5 h-3.5" /> Akses Menuju Bandara
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">Layanan Transportasi</h2>
            <p className="mt-3 text-blue-100/80 text-[14px] leading-relaxed">
              Konter taksi milik beberapa koperasi berada di luar area kedatangan, siap
              mengantar ke Kota Samarinda maupun kota lain dengan biaya ditanggung penumpang.
              Berikut mitra transportasi yang terdaftar di Bandara APT Pranoto Samarinda.
            </p>
          </motion.div>

          {moda.length === 0 ? (
            /* Kosong dikatakan apa adanya — jangan diisi daftar bawaan. */
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 mx-auto max-w-xl rounded-3xl bg-white/[0.07] backdrop-blur border border-white/15 p-8 text-center"
            >
              <span className="mx-auto w-14 h-14 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center">
                <Car className="w-7 h-7 text-cyan-300" />
              </span>
              <h3 className="mt-4 text-white font-black text-[18px]">Belum ada mitra transportasi terdaftar</h3>
              <p className="mt-2 text-blue-100/80 text-[13px] leading-relaxed">
                Hubungi pusat informasi bandara untuk menanyakan pilihan yang tersedia hari ini.
              </p>
            </motion.div>
          ) : (
            <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {moda.map((m) => {
                const Icon = ikonModa(m.name);
                return (
                  <motion.div
                    key={m.id}
                    variants={rise}
                    whileHover={{ y: -7 }}
                    className="group relative overflow-hidden bg-white rounded-3xl p-6 shadow-xl"
                  >
                    <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: TRANS_META.bg }}>
                      <Icon className="w-7 h-7" style={{ color: TRANS_META.color }} />
                    </span>

                    <h3 className="mt-4 text-[17px] font-black text-slate-900">{m.name}</h3>
                    {m.description && (
                      <p className="mt-1.5 text-slate-500 text-[12.5px] leading-relaxed">{m.description}</p>
                    )}

                    <div className="mt-4 pt-3.5 border-t border-dashed border-slate-200 space-y-2">
                      {m.location && (
                        <p className="flex items-start gap-2 text-[11.5px] text-slate-600">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-px" style={{ color: TRANS_META.color }} />
                          {m.location}
                        </p>
                      )}
                      {m.operating_hours && (
                        <p className="flex items-start gap-2 text-[11.5px] text-slate-600">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-px" style={{ color: TRANS_META.color }} />
                          {m.operating_hours}
                        </p>
                      )}
                      {m.contact_phone && (
                        <a
                          href={`tel:${m.contact_phone.replace(/\s+/g, '')}`}
                          className="flex items-start gap-2 text-[11.5px] font-bold text-blue-600"
                        >
                          <Phone className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                          {m.contact_phone}
                        </a>
                      )}
                    </div>

                    <span className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: TRANS_META.color }} />
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* help banner */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden mt-8 rounded-3xl bg-white/[0.07] backdrop-blur border border-white/15 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
          >
            <span className="w-16 h-16 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-8 h-8 text-cyan-300" />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-black text-[19px]">Butuh Bantuan Transportasi?</h3>
              <p className="mt-1.5 text-blue-100/85 text-[13px] leading-relaxed">
                Hubungi pusat informasi bandara untuk panduan rute, tarif, dan ketersediaan armada.
              </p>
            </div>
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              <Phone className="w-4 h-4" /> Hubungi Kami
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
              <Sparkles className="w-3.5 h-3.5" /> Ingin Membuka Tenant?
            </span>
            <h2 className="mt-3.5 text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              Jadi Bagian dari Ekosistem Bandara
            </h2>
            <p className="mt-3 text-slate-500 text-[13.5px] leading-relaxed max-w-md">
              Kami membuka peluang kemitraan bagi pelaku usaha lokal untuk menghadirkan produk dan layanan terbaik
              di area terminal APT Pranoto.
            </p>
            <Link
              href="/complaints"
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg shadow-blue-600/25 transition-colors"
            >
              Ajukan Kemitraan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative flex justify-center">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 via-cyan-300 to-amber-300 blur-3xl opacity-40 rounded-full" />
              <Store className="relative w-40 h-40 text-blue-600/80" strokeWidth={1} />
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
