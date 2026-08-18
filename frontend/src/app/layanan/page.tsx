import type { Metadata } from 'next';
import LayananIndexView from './LayananIndexView';
import { metaHalaman } from '@/lib/seo';

export const metadata: Metadata = metaHalaman({
  title: 'Layanan Bandara | Bandara APT Pranoto Samarinda',
  description: 'Daftar layanan pengajuan Bandar Udara APT Pranoto Samarinda: beauty contest, extend advance, field trip, pengiklanan, perijinan usaha, sertifikat OJT, sewa, slot charter, dan tenant, lengkap dengan persyaratan dan alur prosesnya.',
  path: '/layanan',
});

export default function LayananPage() {
  return <LayananIndexView />;
}
