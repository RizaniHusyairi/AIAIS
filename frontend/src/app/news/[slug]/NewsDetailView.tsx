'use client';

/**
 * Halaman baca satu berita — versi desktop dan tablet.
 *
 * Berkas ini hanya menangani pengambilan data dan tiga keadaan halaman;
 * seluruh tata letak artikelnya ada di `components/berita/TampilanBerita.tsx`,
 * yang dipakai bersama pratinjau panel admin supaya keduanya tidak pernah
 * berbeda bentuk.
 *
 * Pengunjung ponsel tidak pernah sampai ke sini; proksi mobile melemparkan
 * mereka ke layar PWA `app/app/berita/[slug]`. Keduanya berbagi perhitungan di
 * `lib/berita.ts` supaya waktu baca, berita terkait, dan tetangga artikel tidak
 * pernah berbeda antara dua layar.
 *
 * SELURUH ISINYA BERASAL DARI API. Versi lama memajang artikel cadangan
 * karangan lengkap dengan kutipan yang diatasnamakan Kepala Kantor UPBU,
 * berita terkait fiktif, komentar warga bernama lengkap, penghitung reaksi
 * bernilai karangan, dan cuaca "BMKG Sync" yang tidak pernah menghubungi BMKG.
 */

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import TampilanBerita from '@/components/berita/TampilanBerita';
import { fetchApi } from '@/lib/api';
import { NewsItem } from '@/types';
import { Plane, Newspaper, Compass } from 'lucide-react';

export default function NewsDetailView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [artikel, setArtikel] = useState<NewsItem | null>(null);
  const [daftar, setDaftar] = useState<NewsItem[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let batal = false;

    (async () => {
      setMemuat(true);

      // Satu permintaan daftar melayani berita terkait, terpopuler, dan
      // tetangga artikel sekaligus.
      const [detail, senarai] = await Promise.all([
        fetchApi<NewsItem>(`/news/${slug}`),
        fetchApi<NewsItem[]>('/news'),
      ]);

      if (batal) return;

      setArtikel(detail.success && detail.data?.title ? detail.data : null);
      setDaftar(senarai.success && Array.isArray(senarai.data) ? senarai.data : []);
      setMemuat(false);
    })();

    return () => { batal = true; };
  }, [slug]);

  if (memuat) return <SedangMemuat />;
  if (!artikel) return <TidakDitemukan />;

  return <TampilanBerita artikel={artikel} daftar={daftar} />;
}


/* ------------------------- keadaan lainnya ------------------------ */

function SedangMemuat() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center gap-5 bg-[#f6f8fc]">
      <motion.div
        animate={{ x: [-18, 18, -18], y: [5, -5, 5] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
      >
        <Plane className="w-7 h-7 text-white rotate-45" />
      </motion.div>
      <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] font-mono">Memuat artikel</p>
    </div>
  );
}

/**
 * Berita tidak ditemukan.
 *
 * Versi lama menampilkan artikel karangan lengkap saat API tidak menjawab,
 * sehingga tautan mati pun terlihat seperti berita resmi.
 */
function TidakDitemukan() {
  return (
    <div className="min-h-[75vh] bg-[#f6f8fc] flex flex-col items-center justify-center gap-5 px-4 text-center">
      <span className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
        <Compass className="w-8 h-8 text-slate-300" />
      </span>

      <div className="space-y-1.5">
        <h1 className="text-xl font-black text-slate-900">Berita tidak ditemukan</h1>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          Artikel yang Anda cari mungkin sudah dipindahkan atau tautannya keliru.
        </p>
      </div>

      <Link
        href="/news"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-colors"
      >
        <Newspaper className="w-4 h-4" /> Lihat Semua Berita
      </Link>
    </div>
  );
}
