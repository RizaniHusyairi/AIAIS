import type { Metadata } from 'next';
import PetaRuteView from './PetaRuteView';
import { metaHalaman } from '@/lib/seo';

/**
 * Halaman /peta-rute.
 *
 * Server Component tipis di atas view klien — pola yang sama dengan
 * `/tourism` dan `/layanan`. Isinya tetap diambil view di sisi klien; yang
 * dikerjakan di sini hanya metadata, yang memang harus lahir di server agar
 * terbaca mesin pencari dan pratayang tautan. Sebelum pemisahan ini halaman
 * ini seluruhnya `'use client'` dan karena itu tidak punya judul maupun
 * ringkasan sendiri sama sekali.
 */
export const metadata: Metadata = metaHalaman({
  title: "Peta Rute Penerbangan | Bandara APT Pranoto Samarinda",
  description: "Peta interaktif rute penerbangan reguler dan perintis dari Bandara APT Pranoto Samarinda ke kota-kota tujuan di Kalimantan Timur dan seluruh Indonesia.",
  path: '/peta-rute',
});

export default function Halaman() {
  return <PetaRuteView />;
}
