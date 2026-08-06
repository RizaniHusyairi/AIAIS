import type { Metadata } from 'next';
import LaporanLayananView from './LaporanLayananView';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'Laporan Layanan Informasi | Bandara APT Pranoto Samarinda',
  description:
    'Laporan tahunan penyelenggaraan layanan informasi publik PPID Bandar Udara APT Pranoto Samarinda.',
  alternates: { canonical: '/ppid/laporan-layanan-informasi' },
};

export default function LaporanLayananPage() {
  return <LaporanLayananView />;
}
