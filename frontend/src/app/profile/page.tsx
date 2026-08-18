import type { Metadata } from 'next';
import ProfileView from './ProfileView';
import { metaHalaman } from '@/lib/seo';

/**
 * Halaman /profile.
 *
 * Server Component tipis di atas view klien — pola yang sama dengan
 * `/tourism` dan `/layanan`. Isinya tetap diambil view di sisi klien; yang
 * dikerjakan di sini hanya metadata, yang memang harus lahir di server agar
 * terbaca mesin pencari dan pratayang tautan. Sebelum pemisahan ini halaman
 * ini seluruhnya `'use client'` dan karena itu tidak punya judul maupun
 * ringkasan sendiri sama sekali.
 */
export const metadata: Metadata = metaHalaman({
  title: "Profil Bandara | Bandara APT Pranoto Samarinda",
  description: "Profil resmi Bandar Udara Aji Pangeran Tumenggung Pranoto Samarinda: sejarah, visi dan misi, tugas dan fungsi, struktur organisasi, pejabat, serta rute yang dilayani.",
  path: '/profile',
});

export default function Halaman() {
  return <ProfileView />;
}
