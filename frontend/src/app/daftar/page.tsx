import type { Metadata } from 'next';
import DaftarView from './DaftarView';

export const metadata: Metadata = {
  title: 'Daftar Akun | Bandara APT Pranoto Samarinda',
  description: 'Buat akun untuk mengirim pengajuan layanan Bandar Udara APT Pranoto Samarinda.',
  alternates: { canonical: '/daftar' },
  robots: { index: false, follow: true },
};

export default function DaftarPage() {
  return <DaftarView />;
}
