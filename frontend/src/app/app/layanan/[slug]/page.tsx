'use client';

/**
 * Detail satu layanan pengajuan.
 *
 * Isinya dari `GET /services/{slug}`, digabung dengan ikon dan warna aksen
 * lewat `gabungLayanan` — sumber yang sama dengan halaman desktop.
 *
 * `applyUrl` bernilai null untuk hampir seluruh layanan, dan itu keadaan yang
 * sebenarnya: `submission_url` di basis data masih menunjuk dasbor pemohon v1
 * yang ikut mati saat cutover. Layar ini mengatakannya terus terang alih-alih
 * memasang tombol yang berujung halaman tidak ada.
 */

import React, { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import type { ServiceItem } from '@/types';
import { gabungLayanan, type Service } from '@/lib/serviceData';
import { StatusBar, AppHeader, Memuat, LayarKosong, listContainer, listItem } from '@/components/pwa/ui';
import { CircleCheck, ClipboardList, Ruler, Info, ArrowRight, PackageSearch } from 'lucide-react';

export default function LayananDetailScreen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [layanan, setLayanan] = useState<Service | null | 'tidak-ada'>(null);

  useEffect(() => {
    let batal = false;

    fetchApi<ServiceItem>(`/services/${slug}`).then((res) => {
      if (batal) return;
      setLayanan(res.success && res.data ? gabungLayanan(res.data) : 'tidak-ada');
    });

    return () => { batal = true; };
  }, [slug]);

  if (layanan === null) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="bg-white border-b border-slate-100">
          <StatusBar />
          <AppHeader title="Layanan" />
        </div>
        <Memuat label="Memuat layanan…" />
      </div>
    );
  }

  if (layanan === 'tidak-ada') {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="bg-white border-b border-slate-100">
          <StatusBar />
          <AppHeader title="Layanan" />
        </div>
        <LayarKosong
          icon={PackageSearch}
          judul="Layanan tidak ditemukan"
          pesan="Layanan ini mungkin sudah tidak aktif. Periksa kembali daftar layanan."
        />
      </div>
    );
  }

  const Icon = layanan.icon;

  return (
    <div className="min-h-full bg-slate-50">
      {/* ===== kepala ===== */}
      <div className="relative overflow-hidden text-white" style={{ backgroundColor: layanan.accent }}>
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/35" />
        <div className="relative">
          <StatusBar />
          <AppHeader title="Layanan" tone="light" />

          <div className="px-5 pb-7">
            <span className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </span>
            <h2 className="mt-3 text-[21px] font-black leading-tight">{layanan.title}</h2>
            {layanan.summary && (
              <p className="mt-1.5 text-white/85 text-[12.5px] leading-relaxed">{layanan.summary}</p>
            )}
          </div>
        </div>
      </div>

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-3xl p-4 space-y-3"
      >
        {layanan.description && (
          <motion.p variants={listItem} className="text-[12.5px] text-slate-600 leading-relaxed">
            {layanan.description}
          </motion.p>
        )}

        {/* ---- persyaratan ---- */}
        <motion.div variants={listItem} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 p-4">
          <h3 className="flex items-center gap-2.5 text-[14px] font-black text-slate-900">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${layanan.accent}14` }}
            >
              <ClipboardList className="w-4 h-4" style={{ color: layanan.accent }} />
            </span>
            Dokumen yang Diperlukan
          </h3>

          {layanan.requirements.length === 0 ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3.5">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-900 leading-relaxed">
                Berkas yang perlu disiapkan ditentukan pada formulir permohonan. Ikuti tahapannya
                di bawah, atau hubungi bandara lebih dahulu bila ingin memastikan.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {layanan.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2.5">
                  <CircleCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: layanan.accent }} />
                  <span className="text-[12.5px] text-slate-600 leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* ---- alur ---- */}
        {layanan.steps.length > 0 && (
          <motion.div variants={listItem} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 p-4">
            <h3 className="text-[14px] font-black text-slate-900">Alur Pengajuan</h3>
            <ol className="mt-3 space-y-2.5">
              {layanan.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: layanan.accent }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] text-slate-600 leading-relaxed pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}

        {/* ---- tarif ---- */}
        {layanan.rates && layanan.rates.length > 0 && (
          <motion.div variants={listItem} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 p-4">
            <h3 className="flex items-center gap-2.5 text-[14px] font-black text-slate-900">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${layanan.accent}14` }}
              >
                <Ruler className="w-4 h-4" style={{ color: layanan.accent }} />
              </span>
              Kategori &amp; Tarif Ruang
            </h3>
            <ul className="mt-3 divide-y divide-slate-100">
              {layanan.rates.map((t) => (
                <li key={t.label} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[12.5px] text-slate-600">{t.label}</span>
                  <span className="text-[12.5px] font-bold text-slate-900 text-right">{t.priceText}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* ---- ajukan ---- */}
        <motion.div variants={listItem}>
          {layanan.applyUrl ? (
            <a
              href={layanan.applyUrl}
              className="w-full inline-flex items-center justify-center gap-2 text-white font-bold text-[14px] py-4 rounded-2xl shadow-lg"
              style={{ backgroundColor: layanan.accent }}
            >
              Ajukan Sekarang <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <div className="rounded-2xl bg-slate-100 ring-1 ring-slate-200 p-4 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-slate-600 leading-relaxed">
                Formulir pengajuan daring untuk layanan ini belum tersedia di portal. Sampaikan
                permohonan Anda lewat Pusat Bantuan, atau hubungi kantor bandara langsung.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
