'use client';

/**
 * Daftar seluruh layanan pengajuan bandara.
 *
 * Halaman ini tidak ada di v1 — di sana menu "Layanan" hanya berupa daftar
 * tarik-turun tanpa halaman induk, sehingga pengunjung yang tiba dari mesin
 * pencari atau tautan yang dibagikan tidak punya tempat mendarat. Kartu di
 * bawah menggantikan peran daftar tarik-turun itu pada layar sempit.
 *
 * Layanan yang dilayani portal terpisah (PAS, TIM, SIKEREN) dipisahkan ke
 * bagian sendiri dan ditandai sebagai tautan luar, bukan dicampur — supaya
 * jelas mana yang berpindah situs.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink, Building2, Headphones, Phone, Mail } from 'lucide-react';
import SkyParticles from '@/components/effects/SkyParticles';
import { CONTACT } from '@/lib/airportProfile';
import { SERVICES, EXTERNAL_SERVICES, gabungLayanan } from '@/lib/serviceData';
import { fetchApi } from '@/lib/api';
import type { ServiceItem } from '@/types';
import { useBahasa } from '@/lib/bahasa';
import { useTeks } from '@/lib/kamus';

function FlightArc({ className = '', d = 'M-20 170 Q 380 50 1020 130' }: { className?: string; d?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 1000 220" preserveAspectRatio="none" fill="none" aria-hidden="true">
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

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

export default function LayananIndexView() {
  const t = useTeks();
  const bahasa = useBahasa();
  // Bawaan presentasi dipakai sampai data API tiba, supaya daftar tidak
  // berkedip kosong pada kunjungan pertama.
  const [layanan, setLayanan] = useState(SERVICES);

  useEffect(() => {
    let batal = false;

    fetchApi<ServiceItem[]>('/services').then((res) => {
      if (!batal && Array.isArray(res.data) && res.data.length) {
        setLayanan(res.data.map(gabungLayanan));
      }
    });

    return () => { batal = true; };
  }, []);

  return (
    <div className="bg-slate-50 overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[420px] flex items-center overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#1e40af]">
        <SkyParticles tone="sky" />

        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-cyan-300/15 blur-3xl pointer-events-none" />
        <FlightArc className="absolute inset-x-0 top-1/3 w-full h-48 text-white/20" />

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
              <Building2 className="w-3.5 h-3.5" /> {t.layanan.heroKicker}
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
              {t.layanan.heroJudul}
              <br />
              <span className="text-cyan-300">{t.layanan.heroAksen}</span>
            </h1>

            <p className="mt-4 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">
              {t.layanan.heroLead}
            </p>

            {/* Nama dan ringkasan tiap layanan datang dari basis data dan belum
                punya versi Inggris. Dikatakan terus terang di sini, sekali,
                alih-alih membiarkan pengunjung mengira fitur bahasanya rusak. */}
            {bahasa === 'en' && (
              <p className="mt-3 text-[12.5px] text-cyan-100/80">{t.umum.kontenIndonesia}</p>
            )}
          </motion.div>
        </div>

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

      {/* ============ DAFTAR LAYANAN ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-12 relative z-20 pb-14">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {layanan.map((s) => {
            const SIcon = s.icon;
            return (
              <motion.div key={s.slug} variants={rise} whileHover={{ y: -5 }}>
                <Link
                  href={`/layanan/${s.slug}`}
                  className="group relative block h-full overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-6"
                >
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.accent}, transparent)` }} />

                  <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.accent}14` }}>
                    <SIcon className="w-5 h-5" style={{ color: s.accent }} />
                  </span>

                  <h2 className="mt-4 text-[16.5px] font-black text-slate-900 leading-snug">{s.name}</h2>
                  <p className="mt-1.5 text-[12.5px] text-slate-500 leading-relaxed">{s.summary}</p>

                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: s.accent }}>
                    {t.layanan.lihatPersyaratan}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>

                  <span className="absolute bottom-0 left-0 block h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: s.accent }} />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ---- Layanan pada portal terpisah ---- */}
        <h2 className="mt-12 text-[15px] font-black text-slate-900 uppercase tracking-wider">{t.layanan.portalTerpisah}</h2>
        <p className="mt-1.5 text-[12.5px] text-slate-500">{t.layanan.portalTerpisahRingkas}</p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {EXTERNAL_SERVICES.map((s) => (
            <motion.a
              key={s.name}
              variants={rise}
              whileHover={{ y: -4 }}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 bg-white rounded-2xl shadow-md shadow-slate-300/20 border border-slate-100 p-5 hover:border-slate-300 transition-colors"
            >
              <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="w-4 h-4 text-slate-500" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-black text-slate-900">{s.name}</span>
                <span className="block mt-1 text-[12px] text-slate-500 leading-relaxed">{s.summary}</span>
              </span>
            </motion.a>
          ))}
        </motion.div>
      </section>

      {/* ============ KONTAK ============ */}
      <section className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-14 overflow-hidden">
        <SkyParticles tone="sky" density="low" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-white/[0.07] backdrop-blur border border-white/15 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
          >
            <span className="w-16 h-16 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-8 h-8 text-cyan-300" />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-black text-[19px]">{t.layanan.bantuanJudul}</h3>
              <p className="mt-1.5 text-blue-100/85 text-[13px] leading-relaxed">
                {t.layanan.bantuanAwal} {CONTACT.operationalHours}{t.layanan.bantuanAkhir}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center flex-shrink-0">
              <a
                href={`tel:${CONTACT.phoneHref}`}
                className="inline-flex items-center gap-2 bg-white/12 border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors"
              >
                <Phone className="w-4 h-4" /> {CONTACT.phone}
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors"
              >
                <Mail className="w-4 h-4" /> {t.layanan.email}
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
