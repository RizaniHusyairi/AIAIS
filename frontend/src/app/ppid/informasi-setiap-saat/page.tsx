import type { Metadata } from 'next';
import InformasiSetiapSaatView from './InformasiSetiapSaatView';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'Informasi Setiap Saat | Bandara APT Pranoto Samarinda',
  description:
    'Informasi yang wajib disediakan dan siap diakses publik tanpa permohonan di Bandar Udara APT Pranoto Samarinda: persuratan, inventaris BMN, dan SOP pelayanan publik.',
  alternates: { canonical: '/ppid/informasi-setiap-saat' },
};

export default function InformasiSetiapSaatPage() {
  return <InformasiSetiapSaatView />;
}
