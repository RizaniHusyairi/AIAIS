import type { Metadata } from 'next';
import AkunView from './AkunView';

export const metadata: Metadata = {
  title: 'Akun Saya | Bandara APT Pranoto Samarinda',
  // Isi halaman ini milik satu orang; ia tidak boleh masuk hasil pencarian.
  robots: { index: false, follow: false },
};

export default function AkunPage() {
  return <AkunView />;
}
