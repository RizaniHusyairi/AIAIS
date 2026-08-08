'use client';

/**
 * Halaman satu layanan pengajuan.
 *
 * Satu tampilan untuk kesembilan layanan: di v1 semuanya memakai view Blade
 * yang sama dan hanya berbeda isi, jadi memisahkannya di sini hanya akan
 * menduplikasi markup yang harus dijaga tetap seragam. Pembeda antar halaman
 * cukup warna aksen dan ikon dari `SERVICES`.
 *
 * Yang dibawa dari v1: judul, deskripsi, daftar persyaratan, alur
 * pendaftaran, tarif ruang tenant, kontak, dan tombol pengajuan. Yang
 * berubah: bahasa visualnya mengikuti portal v2 (hero gradien langit,
 * langkah bernomor sebagai lini masa, kartu persyaratan bergaya boarding
 * pass) dan tombol pengajuan diberi keterangan bahwa prosesnya masih
 * berjalan di portal lama — pengguna berhak tahu sebelum berpindah situs.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, ExternalLink, CheckCircle2, ClipboardList, Headphones,
  Phone, Mail, MapPin, Info, Ruler,
} from 'lucide-react';
import SkyParticles from '@/components/effects/SkyParticles';
import { CONTACT } from '@/lib/airportProfile';
import { SERVICES, getService } from '@/lib/serviceData';

/* Lengkung lintasan dekoratif — selaras dengan halaman regulasi & unduhan */
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

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

/**
 * Yang dioper hanya `slug`, bukan objek layanannya.
 *
 * `Service.icon` adalah komponen React, dan komponen tidak dapat diserialkan
 * dari Server Component ke Client Component — build gagal dengan "Functions
 * cannot be passed directly to Client Components". Pencarian datanya
 * dikerjakan di sini, di sisi klien, tempat `SERVICES` memang dapat diimpor
 * utuh. Slug-nya sudah dipastikan sah oleh halaman pembungkus.
 */
export default function LayananDetailView({ slug }: { slug: string }) {
  const service = getService(slug)!;
  const Icon = service.icon;
  const accent = service.accent;

  // Tautan ke layanan lain, supaya pengunjung tidak harus kembali ke menu.
  const lainnya = SERVICES.filter((s) => s.slug !== service.slug);

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
            <Icon className="w-14 h-14 text-cyan-200/80 drop-shadow-2xl" strokeWidth={1.2} />
          </motion.div>
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-16 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <Link
              href="/layanan"
              // `flex w-fit`, bukan `inline-flex`: sebagai elemen inline,
              // tautan ini berdempetan sebaris dengan lencana di bawahnya.
              className="flex w-fit items-center gap-1.5 text-blue-100/80 hover:text-white text-[12.5px] font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Semua Layanan
            </Link>

            <span className="mt-4 inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <Icon className="w-3.5 h-3.5" /> Layanan Bandara
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Pengajuan
              <br />
              <span className="text-cyan-300">{service.name}</span>
            </h1>

            <p className="mt-4 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">{service.description}</p>

            <a
              href={service.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-6 py-3.5 rounded-full shadow-lg hover:bg-blue-50 transition-colors"
            >
              Ajukan Sekarang <ExternalLink className="w-4 h-4" />
            </a>
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
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Berkas Persyaratan',
              value: service.requirements.length > 0 ? `${service.requirements.length} dokumen` : 'Lihat formulir',
              icon: ClipboardList,
              color: accent,
            },
            { label: 'Tahapan Proses', value: `${service.steps.length} tahap`, icon: CheckCircle2, color: '#7c3aed' },
            { label: 'Jam Layanan', value: CONTACT.operationalHours, icon: Headphones, color: '#059669' },
          ].map((s) => {
            const SIcon = s.icon;
            return (
              <motion.div key={s.label} variants={rise} whileHover={{ y: -5 }} className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-5">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}14` }}>
                  <SIcon className="w-5 h-5" style={{ color: s.color }} />
                </span>
                <p className="text-[19px] font-black text-slate-900 leading-tight mt-3">{s.value}</p>
                <p className="text-[11.5px] text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ PERSYARATAN & ALUR ============ */}
      {/*
        `items-start` supaya tiap kartu setinggi isinya sendiri. Tanpa itu
        kartu persyaratan ikut meregang mengikuti kolom alur, dan layanan
        yang persyaratannya sedikit menyisakan ruang kosong menganga.
      */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Persyaratan */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="lg:col-span-3 bg-white rounded-3xl shadow-lg shadow-slate-300/30 border border-slate-100 p-6 sm:p-8"
        >
          <motion.h2 variants={rise} className="text-[21px] font-black text-slate-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}14` }}>
              <ClipboardList className="w-4.5 h-4.5" style={{ color: accent }} />
            </span>
            Dokumen yang Diperlukan
          </motion.h2>

          {service.requirements.length === 0 ? (
            // Bukan daftar kosong yang dibiarkan menganga: v1 memang tidak
            // merinci berkasnya untuk layanan ini, dan itu dikatakan terus
            // terang supaya pemohon tidak mengira halamannya rusak.
            <motion.div variants={rise} className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <Info className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-900 leading-relaxed">
                Berkas yang perlu disiapkan ditentukan pada formulir permohonan. Ikuti tahapan di
                samping, atau hubungi bandara terlebih dahulu bila ingin memastikan.
              </p>
            </motion.div>
          ) : (
            <motion.ul variants={container} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {service.requirements.map((r) => (
                <motion.li
                  key={r}
                  variants={rise}
                  className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 hover:bg-white hover:shadow-md transition-all"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" style={{ color: accent }} />
                  <span className="text-[13px] text-slate-700 leading-snug">{r}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}

          {/* Tarif ruang — hanya layanan Tenant yang memilikinya */}
          {service.rates && (
            <>
              <motion.h3 variants={rise} className="mt-9 text-[17px] font-black text-slate-900 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}14` }}>
                  <Ruler className="w-4.5 h-4.5" style={{ color: accent }} />
                </span>
                Kategori &amp; Tarif Ruang
              </motion.h3>

              <motion.div variants={rise} className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[380px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="font-bold px-4 pb-1">Kategori Ruang</th>
                      <th className="font-bold px-4 pb-1 text-right">Tarif per m²</th>
                    </tr>
                  </thead>
                  <tbody>
                    {service.rates.map((r) => (
                      <tr key={r.label} className="bg-slate-50/70">
                        <td className="px-4 py-3 rounded-l-xl text-[13px] text-slate-700">{r.label}</td>
                        <td className="px-4 py-3 rounded-r-xl text-[13.5px] font-black text-slate-900 text-right tabular-nums">
                          {rupiah(r.pricePerM2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>

              <motion.p variants={rise} className="mt-3 text-[11.5px] text-slate-500 leading-relaxed">
                Tarif per meter persegi sebagaimana tercantum pada portal layanan bandara. Besaran
                akhir mengikuti kontrak yang ditandatangani.
              </motion.p>
            </>
          )}
        </motion.div>

        {/* Alur pendaftaran */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="lg:col-span-2 bg-white rounded-3xl shadow-lg shadow-slate-300/30 border border-slate-100 p-6 sm:p-8"
        >
          <motion.h2 variants={rise} className="text-[21px] font-black text-slate-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}14` }}>
              <CheckCircle2 className="w-4.5 h-4.5" style={{ color: accent }} />
            </span>
            Alur Pendaftaran
          </motion.h2>

          <motion.ol variants={container} className="mt-6 relative">
            {/* Lini masa vertikal; garisnya berhenti sebelum langkah terakhir. */}
            <span className="absolute left-[15px] top-2 bottom-8 w-px bg-slate-200" aria-hidden="true" />

            {service.steps.map((step, i) => (
              <motion.li key={step} variants={rise} className="relative flex gap-4 pb-6 last:pb-0">
                <span
                  className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white flex-shrink-0 shadow-md"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <p className="text-[13px] text-slate-700 leading-relaxed pt-1.5">{step}</p>
              </motion.li>
            ))}
          </motion.ol>

          <motion.a
            variants={rise}
            href={service.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 w-full inline-flex items-center justify-center gap-2 text-white font-bold text-[13.5px] px-5 py-3.5 rounded-full shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: accent }}
          >
            Ajukan Sekarang <ExternalLink className="w-4 h-4" />
          </motion.a>

          {/* Pengajuan belum pindah ke portal ini — katakan sebelum diklik. */}
          <motion.p variants={rise} className="mt-3 text-[11.5px] text-slate-500 leading-relaxed text-center">
            Formulir pengajuan masih dilayani portal layanan bandara dan terbuka di tab baru.
          </motion.p>
        </motion.div>
      </section>

      {/* ============ LAYANAN LAIN ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-14">
        <h2 className="text-[15px] font-black text-slate-900 uppercase tracking-wider">Layanan Lainnya</h2>

        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-4 flex flex-wrap gap-2.5">
          {lainnya.map((s) => {
            const SIcon = s.icon;
            return (
              <motion.div key={s.slug} variants={rise}>
                <Link
                  href={`/layanan/${s.slug}`}
                  className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:shadow-md font-bold text-[12.5px] px-4 py-2.5 rounded-full transition-all"
                >
                  <SIcon className="w-3.5 h-3.5" style={{ color: s.accent }} /> {s.name}
                </Link>
              </motion.div>
            );
          })}
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
            className="rounded-3xl bg-white/[0.07] backdrop-blur border border-white/15 p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <span className="w-16 h-16 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-8 h-8 text-cyan-300" />
              </span>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-white font-black text-[19px]">Masih Ragu dengan Persyaratannya?</h3>
                <p className="mt-1.5 text-blue-100/85 text-[13px] leading-relaxed">
                  Petugas pengembangan usaha bandara dapat memeriksa kelengkapan berkas Anda sebelum
                  permohonan diajukan.
                </p>
              </div>
              <Link
                href="/ppid/pengajuan-informasi"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors flex-shrink-0"
              >
                Ajukan Informasi <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-7 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { icon: Phone, label: 'Telepon', value: CONTACT.phone, href: `tel:${CONTACT.phoneHref}` },
                { icon: Mail, label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
                { icon: MapPin, label: 'Alamat', value: CONTACT.address },
              ].map((c) => {
                const CIcon = c.icon;
                const isi = (
                  <>
                    <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                      <CIcon className="w-4 h-4 text-cyan-300" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10.5px] uppercase tracking-wider text-blue-200/70 font-bold">{c.label}</span>
                      <span className="block text-[12.5px] text-white leading-snug break-words">{c.value}</span>
                    </span>
                  </>
                );

                return c.href ? (
                  <a key={c.label} href={c.href} className="flex items-start gap-3 hover:opacity-80 transition-opacity">
                    {isi}
                  </a>
                ) : (
                  <div key={c.label} className="flex items-start gap-3">{isi}</div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
