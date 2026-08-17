'use client';

/**
 * Direktori layanan — pintu ke seluruh cabang portal.
 *
 * MENGGANTIKAN TUJUH KARTU YANG SEBAGIAN BUNTU. Layar lama memuat "Lost &
 * Found", "Booking Fasilitas", dan "Karir" yang `href`-nya menunjuk ke layar
 * ini sendiri — pengunjung yang menekannya melihat halaman yang sama persis
 * dan menyimpulkan aplikasinya rusak. Satu kartu lagi menunjuk `/faq`, di luar
 * aplikasi.
 *
 * Sekarang seluruh entri berujung pada layar yang benar-benar ada, dan yang
 * berdata menariknya dari API.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import type { ServiceItem } from '@/types';
import { gabungLayanan, EXTERNAL_SERVICES, type Service } from '@/lib/serviceData';
import { hostOf } from '@/lib/url';
import {
  StatusBar, AppHeader, KotakCari, Memuat, listContainer, listItem,
} from '@/components/pwa/ui';
import {
  LifeBuoy, ShieldCheck, Scale, FileText, Download, Store, CircleHelp, Globe,
  ChevronRight, ExternalLink, Building2, ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Pintu = { href: string; nama: string; desc: string; icon: LucideIcon; warna: string; latar: string };

/** Cabang informasi & dokumen. Semuanya punya layarnya sendiri di `/app`. */
const INFORMASI: Pintu[] = [
  { href: '/app/ppid', nama: 'PPID', desc: 'Keterbukaan informasi publik', icon: ShieldCheck, warna: '#2563eb', latar: '#eff6ff' },
  { href: '/app/regulasi/keputusan', nama: 'Surat Keputusan', desc: 'Keputusan resmi Kepala Kantor UPBU', icon: Scale, warna: '#7c3aed', latar: '#f5f3ff' },
  { href: '/app/regulasi/edaran', nama: 'Surat Edaran', desc: 'Edaran resmi operasional bandara', icon: FileText, warna: '#0891b2', latar: '#ecfeff' },
  { href: '/app/unduhan', nama: 'Pusat Unduhan', desc: 'Dokumen dan formulir publik', icon: Download, warna: '#059669', latar: '#ecfdf5' },
  { href: '/app/tenant', nama: 'Tenant', desc: 'Kuliner, retail, lounge, dan layanan', icon: Store, warna: '#d97706', latar: '#fffbeb' },
  { href: '/app/faq', nama: 'FAQ', desc: 'Pertanyaan yang sering diajukan', icon: CircleHelp, warna: '#db2777', latar: '#fdf2f8' },
  { href: '/app/profil', nama: 'Profil Bandara', desc: 'Sejarah, visi-misi, tugas & fungsi', icon: Building2, warna: '#475569', latar: '#f1f5f9' },
  { href: '/app/tautan', nama: 'Tautan Terkait', desc: 'Portal resmi instansi pemerintah', icon: Globe, warna: '#0d9488', latar: '#f0fdfa' },
];

export default function LayananScreen() {
  const [layanan, setLayanan] = useState<Service[] | null>(null);
  const [cari, setCari] = useState('');

  useEffect(() => {
    fetchApi<ServiceItem[]>('/services').then((res) => {
      setLayanan(res.success && Array.isArray(res.data) ? res.data.map(gabungLayanan) : []);
    });
  }, []);

  const q = cari.trim().toLowerCase();

  const pengajuan = useMemo(
    () => (layanan ?? []).filter((s) => !q || s.name.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)),
    [layanan, q],
  );

  const informasi = useMemo(
    () => INFORMASI.filter((i) => !q || i.nama.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)),
    [q],
  );

  const luar = useMemo(
    () => EXTERNAL_SERVICES.filter((e) => !q || e.name.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q)),
    [q],
  );

  const kosong = pengajuan.length === 0 && informasi.length === 0 && luar.length === 0;

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Layanan" back={false} />
        <div className="px-4 pb-3">
          <KotakCari value={cari} onChange={setCari} placeholder="Cari layanan…" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl p-4 space-y-5">
        {/* ---- Pusat Bantuan, ditonjolkan ---- */}
        {!q && (
          <Link
            href="/app/bantuan"
            className="relative block overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 p-5 text-white shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-transform"
          >
            <span className="relative flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                <LifeBuoy className="w-6 h-6" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-black">Pusat Bantuan</span>
                <span className="block text-[12px] text-blue-100 leading-snug mt-0.5">
                  Tanya petugas, adukan, lapor kehilangan, atau lacak tiket
                </span>
              </span>
              <ChevronRight className="w-5 h-5 flex-shrink-0" />
            </span>
            <LifeBuoy className="absolute -bottom-6 -right-5 w-28 h-28 text-white/10" aria-hidden="true" />
          </Link>
        )}

        {/* ---- pengajuan layanan ---- */}
        <section className="space-y-2.5">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Pengajuan Layanan
          </h2>

          {layanan === null ? (
            <Memuat label="Memuat layanan…" />
          ) : pengajuan.length === 0 ? (
            !q && (
              <p className="px-1 text-[12.5px] text-slate-500">
                Daftar layanan pengajuan belum diisi petugas.
              </p>
            )
          ) : (
            <motion.div
              variants={listContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
            >
              {pengajuan.map((s) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.slug} variants={listItem}>
                    <Link
                      href={`/app/layanan/${s.slug}`}
                      className="flex items-center gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
                    >
                      <span
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${s.accent}14` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: s.accent }} strokeWidth={2.1} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-slate-900 text-[14px]">{s.name}</span>
                        <span className="block text-[11.5px] text-slate-500 leading-snug line-clamp-2">
                          {s.summary}
                        </span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>

        {/* ---- informasi & dokumen ---- */}
        {informasi.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Informasi &amp; Dokumen
            </h2>

            <motion.div
              variants={listContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
            >
              {informasi.map((i) => {
                const Icon = i.icon;
                return (
                  <motion.div key={i.href} variants={listItem}>
                    <Link
                      href={i.href}
                      className="flex items-center gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
                    >
                      <span
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: i.latar }}
                      >
                        <Icon className="w-5 h-5" style={{ color: i.warna }} strokeWidth={2.1} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-slate-900 text-[14px]">{i.nama}</span>
                        <span className="block text-[11.5px] text-slate-500 leading-snug">{i.desc}</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        )}

        {/* ---- sistem di luar portal ---- */}
        {luar.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Sistem di Luar Portal
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {luar.map((e) => (
                <a
                  key={e.url}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
                >
                  <span className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-slate-500" strokeWidth={2.1} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-900 text-[14px]">{e.name}</span>
                    <span className="block text-[11.5px] text-slate-500 leading-snug">{e.summary}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                      {hostOf(e.url)} <ExternalLink className="w-3 h-3" />
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {kosong && (
          <p className="text-center text-slate-400 text-[13px] py-10">Tidak ada layanan yang cocok.</p>
        )}
      </div>
    </div>
  );
}
