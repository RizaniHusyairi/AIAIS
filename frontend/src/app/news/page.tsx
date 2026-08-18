import type { Metadata } from 'next';
import NewsView from './NewsView';
import { metaHalaman } from '@/lib/seo';

/**
 * Halaman /news.
 *
 * Server Component tipis di atas view klien — pola yang sama dengan
 * `/tourism` dan `/layanan`. Isinya tetap diambil view di sisi klien; yang
 * dikerjakan di sini hanya metadata, yang memang harus lahir di server agar
 * terbaca mesin pencari dan pratayang tautan. Sebelum pemisahan ini halaman
 * ini seluruhnya `'use client'` dan karena itu tidak punya judul maupun
 * ringkasan sendiri sama sekali.
 */
export const metadata: Metadata = metaHalaman({
  title: "Berita dan Pengumuman | Bandara APT Pranoto Samarinda",
  description: "Berita terbaru, pengumuman operasional, dan informasi kegiatan Bandara APT Pranoto Samarinda — dari perubahan jadwal penerbangan sampai layanan penumpang.",
  path: '/news',
});

export default function Halaman() {
  return <NewsView />;
}
