import type { Metadata } from 'next';
import InformasiSetiapSaatView from './InformasiSetiapSaatView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = metaHalaman({
  title: 'Informasi Setiap Saat | Bandara APT Pranoto Samarinda',
  description: 'Informasi yang wajib disediakan dan siap diakses publik tanpa permohonan di Bandar Udara APT Pranoto Samarinda: persuratan, inventaris BMN, dan SOP pelayanan publik.',
  path: '/ppid/informasi-setiap-saat',
});

export default function InformasiSetiapSaatPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'PPID', path: '/ppid' },
          { name: 'Informasi Setiap Saat', path: '/ppid/informasi-setiap-saat' },
        ])}
      />
      <InformasiSetiapSaatView />
    </>
  );
}
