import type { Metadata } from 'next';
import RegulasiSuratView from '../RegulasiSuratView';
import { metaHalaman, ldRemah } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/**
 * Server Component tanpa `'use client'` — `metadata` hanya didukung di sini.
 * Seluruh interaksinya (pencarian, penyaring tahun) ada di `RegulasiSuratView`.
 */
export const metadata: Metadata = metaHalaman({
  title: 'Surat Keputusan | Bandara APT Pranoto Samarinda',
  description: 'Daftar Surat Keputusan Kepala Kantor UPBU Kelas I Aji Pangeran Tumenggung Pranoto Samarinda beserta nomor, tanggal terbit, dan berkas resminya.',
  path: '/regulasi/surat-keputusan',
});

export default function SuratKeputusanPage() {
  return (
    <>
      {/* Remah jejak: Google menampilkan jalurnya di hasil pencarian,
          menggantikan URL mentah yang tidak memberi tahu apa-apa. */}
      <JsonLd
        data={ldRemah([
          { name: 'Beranda', path: '/' },
          { name: 'Regulasi', path: '/regulasi/surat-keputusan' },
          { name: 'Surat Keputusan', path: '/regulasi/surat-keputusan' },
        ])}
      />
      <RegulasiSuratView type="keputusan" />
    </>
  );
}
