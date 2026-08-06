import type { Metadata } from 'next';
import PengajuanInformasiView from './PengajuanInformasiView';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'Pengajuan Informasi Publik | Bandara APT Pranoto Samarinda',
  description:
    'Formulir permohonan informasi publik Bandar Udara APT Pranoto Samarinda sesuai UU 14/2008. Lengkapi syarat, kirim permohonan, dan lacak statusnya dengan nomor tiket.',
  alternates: { canonical: '/ppid/pengajuan-informasi' },
};

export default function PengajuanInformasiPage() {
  return <PengajuanInformasiView />;
}
