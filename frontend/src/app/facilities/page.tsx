import type { Metadata } from 'next';
import FacilitiesView from './FacilitiesView';
import { metaHalaman } from '@/lib/seo';

/**
 * Halaman /facilities.
 *
 * Server Component tipis di atas view klien — pola yang sama dengan
 * `/tourism` dan `/layanan`. Isinya tetap diambil view di sisi klien; yang
 * dikerjakan di sini hanya metadata, yang memang harus lahir di server agar
 * terbaca mesin pencari dan pratayang tautan. Sebelum pemisahan ini halaman
 * ini seluruhnya `'use client'` dan karena itu tidak punya judul maupun
 * ringkasan sendiri sama sekali.
 */
export const metadata: Metadata = metaHalaman({
  title: "Fasilitas Terminal | Bandara APT Pranoto Samarinda",
  description: "Fasilitas terminal Bandara APT Pranoto Samarinda: ruang tunggu, musala, ruang menyusui, layanan disabilitas, parkir kendaraan, ATM, dan fasilitas kesehatan.",
  path: '/facilities',
});

export default function Halaman() {
  return <FacilitiesView />;
}
