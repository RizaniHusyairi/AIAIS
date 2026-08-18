import type { Metadata } from 'next';
import RegulasiPpidView from './RegulasiPpidView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = metaHalaman({
  title: 'Regulasi PPID | Bandara APT Pranoto Samarinda',
  description: 'Dasar hukum keterbukaan informasi publik di Bandar Udara APT Pranoto Samarinda: undang-undang, Peraturan Komisi Informasi Pusat, dan peraturan Kementerian Perhubungan.',
  path: '/ppid/regulasi',
});

export default function RegulasiPpidPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'PPID', path: '/ppid' },
          { name: 'Regulasi PPID', path: '/ppid/regulasi' },
        ])}
      />
      <RegulasiPpidView />
    </>
  );
}
