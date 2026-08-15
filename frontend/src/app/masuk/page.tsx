import type { Metadata } from 'next';
import MasukView from './MasukView';

export const metadata: Metadata = {
  title: 'Masuk | Bandara APT Pranoto Samarinda',
  description: 'Masuk ke akun layanan Bandar Udara APT Pranoto Samarinda.',
  alternates: { canonical: '/masuk' },
  // Layar autentikasi tidak punya nilai bagi hasil pencarian, dan halaman
  // masuk yang terindeks kerap menjadi sasaran halaman tiruan.
  robots: { index: false, follow: true },
};

export default function MasukPage() {
  return <MasukView />;
}
