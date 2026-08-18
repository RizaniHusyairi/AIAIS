import type { Metadata } from 'next';
import AplikasiView from './AplikasiView';
import { metaHalaman } from '@/lib/seo';

/**
 * Server Component tipis + view `'use client'` — pola halaman publik v2.
 *
 * Rute baru (tidak ada padanannya di portal v1): pintu masuk tunggal ke
 * sistem kedinasan yang selama ini alamatnya hanya beredar dari mulut ke
 * mulut dan terselip di dropdown menu Layanan.
 */
export const metadata: Metadata = metaHalaman({
  title: 'Portal Aplikasi | Bandara APT Pranoto Samarinda',
  description: 'Pintu masuk aplikasi kedinasan pegawai Bandar Udara APT Pranoto Samarinda: SIKEREN, Guma, PAS & TIM, FIDS, dan pengelolaan portal.',
  path: '/aplikasi',
});

export default function AplikasiPage() {
  return <AplikasiView />;
}
