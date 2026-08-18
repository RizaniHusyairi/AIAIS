import type { Metadata } from 'next';
import LaporanLayananView from './LaporanLayananView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = metaHalaman({
  title: 'Laporan Layanan Informasi | Bandara APT Pranoto Samarinda',
  description: 'Laporan tahunan penyelenggaraan layanan informasi publik PPID Bandar Udara APT Pranoto Samarinda.',
  path: '/ppid/laporan-layanan-informasi',
});

export default function LaporanLayananPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'PPID', path: '/ppid' },
          { name: 'Laporan Layanan Informasi', path: '/ppid/laporan-layanan-informasi' },
        ])}
      />
      <LaporanLayananView />
    </>
  );
}
