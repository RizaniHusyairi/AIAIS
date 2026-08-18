import type { Metadata } from 'next';
import TenantsView from './TenantsView';
import { metaHalaman } from '@/lib/seo';

/**
 * Halaman /tenants.
 *
 * Server Component tipis di atas view klien — pola yang sama dengan
 * `/tourism` dan `/layanan`. Isinya tetap diambil view di sisi klien; yang
 * dikerjakan di sini hanya metadata, yang memang harus lahir di server agar
 * terbaca mesin pencari dan pratayang tautan. Sebelum pemisahan ini halaman
 * ini seluruhnya `'use client'` dan karena itu tidak punya judul maupun
 * ringkasan sendiri sama sekali.
 */
export const metadata: Metadata = metaHalaman({
  title: "Tenant dan Kuliner | Bandara APT Pranoto Samarinda",
  description: "Direktori tenant Bandara APT Pranoto Samarinda — kuliner, oleh-oleh khas Kalimantan Timur, retail, dan layanan penunjang beserta lokasi dan jam bukanya.",
  path: '/tenants',
});

export default function Halaman() {
  return <TenantsView />;
}
