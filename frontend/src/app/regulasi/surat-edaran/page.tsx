import type { Metadata } from 'next';
import RegulasiSuratView from '../RegulasiSuratView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = metaHalaman({
  title: 'Surat Edaran | Bandara APT Pranoto Samarinda',
  description: 'Daftar Surat Edaran resmi pengelola Bandar Udara APT Pranoto Samarinda beserta nomor, tanggal terbit, dan berkas resminya.',
  path: '/regulasi/surat-edaran',
});

export default function SuratEdaranPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'Regulasi', path: '/regulasi/surat-keputusan' },
          { name: 'Surat Edaran', path: '/regulasi/surat-edaran' },
        ])}
      />
      <RegulasiSuratView type="edaran" />
    </>
  );
}
