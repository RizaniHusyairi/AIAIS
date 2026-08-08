import type { Metadata } from 'next';
import RegulasiSuratView from '../RegulasiSuratView';

export const metadata: Metadata = {
  title: 'Surat Edaran | Bandara APT Pranoto Samarinda',
  description:
    'Daftar Surat Edaran resmi pengelola Bandar Udara APT Pranoto Samarinda beserta nomor, tanggal terbit, dan berkas resminya.',
  alternates: { canonical: '/regulasi/surat-edaran' },
};

export default function SuratEdaranPage() {
  return <RegulasiSuratView type="edaran" />;
}
