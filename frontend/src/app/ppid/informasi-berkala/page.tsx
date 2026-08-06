import type { Metadata } from 'next';
import InformasiBerkalaView from './InformasiBerkalaView';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'Informasi Berkala | Bandara APT Pranoto Samarinda',
  description:
    'Informasi yang wajib disediakan dan diumumkan secara berkala oleh Bandar Udara APT Pranoto Samarinda: laporan keuangan, LAKIP, LHKPN, RKA, dan survei kepuasan.',
  alternates: { canonical: '/ppid/informasi-berkala' },
};

export default function InformasiBerkalaPage() {
  return <InformasiBerkalaView />;
}
