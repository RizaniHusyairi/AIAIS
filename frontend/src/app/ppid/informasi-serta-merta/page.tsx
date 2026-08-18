import type { Metadata } from 'next';
import InformasiSertaMertaView from './InformasiSertaMertaView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = metaHalaman({
  title: 'Informasi Serta Merta | Bandara APT Pranoto Samarinda',
  description: 'Maklumat yang wajib diumumkan serta merta oleh Bandar Udara APT Pranoto Samarinda karena menyangkut hajat hidup orang banyak dan ketertiban umum.',
  path: '/ppid/informasi-serta-merta',
});

export default function InformasiSertaMertaPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'PPID', path: '/ppid' },
          { name: 'Informasi Serta Merta', path: '/ppid/informasi-serta-merta' },
        ])}
      />
      <InformasiSertaMertaView />
    </>
  );
}
