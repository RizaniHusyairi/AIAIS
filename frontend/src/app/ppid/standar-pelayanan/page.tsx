import type { Metadata } from 'next';
import StandarPelayananView from './StandarPelayananView';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'Standar Pelayanan | Bandara APT Pranoto Samarinda',
  description:
    'Standar Pelayanan, Maklumat Pelayanan, dan hasil Survei Kepuasan Masyarakat Bandar Udara APT Pranoto Samarinda sesuai UU 25/2009 tentang Pelayanan Publik.',
  alternates: { canonical: '/ppid/standar-pelayanan' },
};

export default function StandarPelayananPage() {
  return <StandarPelayananView />;
}
