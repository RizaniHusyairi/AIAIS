import type { Metadata } from 'next';
import OjtView from './OjtView';

export const metadata: Metadata = {
  title: 'Praktik Kerja Lapangan | Bandara APT Pranoto Samarinda',
  // Isi halaman ini milik satu pemohon.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OjtView />;
}
