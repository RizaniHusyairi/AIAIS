import type { Metadata } from 'next';
import SlotView from './SlotView';

export const metadata: Metadata = {
  title: 'Slot Charter | Bandara APT Pranoto Samarinda',
  // Isi halaman ini milik satu pemohon.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SlotView />;
}
