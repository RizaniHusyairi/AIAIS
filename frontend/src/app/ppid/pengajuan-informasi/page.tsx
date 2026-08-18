import type { Metadata } from 'next';
import PengajuanInformasiView from './PengajuanInformasiView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = metaHalaman({
  title: 'Pengajuan Informasi Publik | Bandara APT Pranoto Samarinda',
  description: 'Formulir permohonan informasi publik Bandar Udara APT Pranoto Samarinda sesuai UU 14/2008. Lengkapi syarat, kirim permohonan, dan lacak statusnya dengan nomor tiket.',
  path: '/ppid/pengajuan-informasi',
});

export default function PengajuanInformasiPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'PPID', path: '/ppid' },
          { name: 'Pengajuan Informasi Publik', path: '/ppid/pengajuan-informasi' },
        ])}
      />
      <PengajuanInformasiView />
    </>
  );
}
