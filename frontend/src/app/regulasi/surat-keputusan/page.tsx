import type { Metadata } from 'next';
import RegulasiSuratView from '../RegulasiSuratView';

/**
 * Server Component tanpa `'use client'` — `metadata` hanya didukung di sini.
 * Seluruh interaksinya (pencarian, penyaring tahun) ada di `RegulasiSuratView`.
 */
export const metadata: Metadata = {
  title: 'Surat Keputusan | Bandara APT Pranoto Samarinda',
  description:
    'Daftar Surat Keputusan Kepala Kantor UPBU Kelas I Aji Pangeran Tumenggung Pranoto Samarinda beserta nomor, tanggal terbit, dan berkas resminya.',
  alternates: { canonical: '/regulasi/surat-keputusan' },
};

export default function SuratKeputusanPage() {
  return <RegulasiSuratView type="keputusan" />;
}
