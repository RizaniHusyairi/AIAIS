import type { Metadata } from 'next';
import ExtendAdvanceView from './ExtendAdvanceView';

export const metadata: Metadata = {
  title: 'Extend Advance | Bandara APT Pranoto Samarinda',
  // Isi halaman ini milik satu pemohon.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ExtendAdvanceView />;
}
