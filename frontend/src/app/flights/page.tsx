import type { Metadata } from 'next';
import FlightsView from './FlightsView';
import { metaHalaman } from '@/lib/seo';

/**
 * Halaman /flights.
 *
 * Server Component tipis di atas view klien — pola yang sama dengan
 * `/tourism` dan `/layanan`. Isinya tetap diambil view di sisi klien; yang
 * dikerjakan di sini hanya metadata, yang memang harus lahir di server agar
 * terbaca mesin pencari dan pratayang tautan. Sebelum pemisahan ini halaman
 * ini seluruhnya `'use client'` dan karena itu tidak punya judul maupun
 * ringkasan sendiri sama sekali.
 */
export const metadata: Metadata = metaHalaman({
  title: "Jadwal Penerbangan Samarinda Hari Ini | Bandara APT Pranoto (AAP)",
  description: "Jadwal keberangkatan dan kedatangan pesawat Bandara APT Pranoto Samarinda hari ini, langsung dari layar FIDS bandara — nomor penerbangan, maskapai, gate, konter check-in, dan status terkini.",
  path: '/flights',
});

export default function Halaman() {
  return <FlightsView />;
}
