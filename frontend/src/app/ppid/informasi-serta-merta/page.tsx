import type { Metadata } from 'next';
import InformasiSertaMertaView from './InformasiSertaMertaView';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'Informasi Serta Merta | Bandara APT Pranoto Samarinda',
  description:
    'Maklumat yang wajib diumumkan serta merta oleh Bandar Udara APT Pranoto Samarinda karena menyangkut hajat hidup orang banyak dan ketertiban umum.',
  alternates: { canonical: '/ppid/informasi-serta-merta' },
};

export default function InformasiSertaMertaPage() {
  return <InformasiSertaMertaView />;
}
