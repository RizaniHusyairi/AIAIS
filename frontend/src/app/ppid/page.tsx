import type { Metadata } from 'next';
import ProfilPpidView from './ProfilPpidView';
import { metaHalaman } from '@/lib/seo';

/**
 * Berkas ini sengaja Server Component tanpa `'use client'`.
 *
 * `metadata` hanya didukung di Server Component — Next.js harus menyelesaikan
 * metadata di server sebelum komponen halaman dirender. Seluruh interaksinya
 * (lightbox, animasi gulir) berada di `ProfilPpidView`, mengikuti pola yang
 * dianjurkan dokumentasi Next 16.
 */
export const metadata: Metadata = metaHalaman({
  title: 'Profil PPID | Bandara APT Pranoto Samarinda',
  description: 'Profil Pejabat Pengelola Informasi dan Dokumentasi (PPID) BLU Kantor UPBU Kelas I A.P.T. Pranoto: visi, misi, tugas dan fungsi, struktur organisasi, maklumat pelayanan, serta standar biaya layanan informasi publik.',
  path: '/ppid',
});

export default function ProfilPpidPage() {
  return <ProfilPpidView />;
}
