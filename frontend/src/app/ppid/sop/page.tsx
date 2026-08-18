import type { Metadata } from 'next';
import SopPpidView from './SopPpidView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = metaHalaman({
  title: 'SOP PPID | Bandara APT Pranoto Samarinda',
  description: 'Prosedur operasional standar layanan informasi publik PPID Bandar Udara A.P.T. Pranoto: tata cara permohonan informasi, pengajuan keberatan, dan penyelesaian sengketa beserta batas waktunya menurut UU 14/2008.',
  path: '/ppid/sop',
});

export default function SopPpidPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'PPID', path: '/ppid' },
          { name: 'Standar Operasional Prosedur', path: '/ppid/sop' },
        ])}
      />
      <SopPpidView />
    </>
  );
}
