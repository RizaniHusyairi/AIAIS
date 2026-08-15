import type { Metadata } from 'next';
import PengajuanView from './PengajuanView';

export const metadata: Metadata = {
  title: 'Pengajuan Layanan | Bandara APT Pranoto Samarinda',
  // Isi halaman ini milik satu pemohon.
  robots: { index: false, follow: false },
};

export default async function PengajuanPage({ params }: { params: Promise<{ jenis: string }> }) {
  const { jenis } = await params;

  return <PengajuanView slug={jenis} />;
}
