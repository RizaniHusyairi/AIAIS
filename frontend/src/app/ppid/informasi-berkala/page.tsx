import type { Metadata } from 'next';
import InformasiBerkalaView from './InformasiBerkalaView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = metaHalaman({
  title: 'Informasi Berkala | Bandara APT Pranoto Samarinda',
  description: 'Informasi yang wajib disediakan dan diumumkan secara berkala oleh Bandar Udara APT Pranoto Samarinda: laporan keuangan, LAKIP, LHKPN, RKA, dan survei kepuasan.',
  path: '/ppid/informasi-berkala',
});

export default function InformasiBerkalaPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'PPID', path: '/ppid' },
          { name: 'Informasi Berkala', path: '/ppid/informasi-berkala' },
        ])}
      />
      <InformasiBerkalaView />
    </>
  );
}
