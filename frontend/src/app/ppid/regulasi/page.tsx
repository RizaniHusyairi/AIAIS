import type { Metadata } from 'next';
import RegulasiPpidView from './RegulasiPpidView';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'Regulasi PPID | Bandara APT Pranoto Samarinda',
  description:
    'Dasar hukum keterbukaan informasi publik di Bandar Udara APT Pranoto Samarinda: undang-undang, Peraturan Komisi Informasi Pusat, dan peraturan Kementerian Perhubungan.',
  alternates: { canonical: '/ppid/regulasi' },
};

export default function RegulasiPpidPage() {
  return <RegulasiPpidView />;
}
