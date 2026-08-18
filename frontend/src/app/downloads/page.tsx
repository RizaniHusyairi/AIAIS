import type { Metadata } from 'next';
import DownloadsView from './DownloadsView';
import { metaHalaman } from '@/lib/seo';

/**
 * Halaman /downloads.
 *
 * Server Component tipis di atas view klien — pola yang sama dengan
 * `/tourism` dan `/layanan`. Isinya tetap diambil view di sisi klien; yang
 * dikerjakan di sini hanya metadata, yang memang harus lahir di server agar
 * terbaca mesin pencari dan pratayang tautan. Sebelum pemisahan ini halaman
 * ini seluruhnya `'use client'` dan karena itu tidak punya judul maupun
 * ringkasan sendiri sama sekali.
 */
export const metadata: Metadata = metaHalaman({
  title: "Unduhan Dokumen dan Formulir | Bandara APT Pranoto Samarinda",
  description: "Unduh dokumen resmi, formulir layanan, dan berkas publik Bandara APT Pranoto Samarinda dalam format PDF.",
  path: '/downloads',
});

export default function Halaman() {
  return <DownloadsView />;
}
