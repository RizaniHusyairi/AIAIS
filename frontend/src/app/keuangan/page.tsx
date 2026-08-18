import type { Metadata } from 'next';
import KeuanganView from './KeuanganView';
import { fetchApi } from '@/lib/api';
import type { FinanceStats } from '@/types';
import { metaHalaman } from '@/lib/seo';

/**
 * Kinerja keuangan BLU.
 *
 * Server Component tipis: mengekspor metadata dan mengambil data awalnya di
 * sisi server, sehingga halaman sudah berisi angka pada render pertama. View
 * mengambil ulang di sisi klien setiap penyaring tahun diubah.
 */

export const metadata: Metadata = metaHalaman({
  title: 'Kinerja Keuangan | Bandara APT Pranoto Samarinda',
  description: 'Rekapitulasi pemasukan dan anggaran Badan Layanan Umum Bandar Udara APT Pranoto '
    + 'Samarinda beserta rincian pos belanjanya.',
  path: '/keuangan',
});

export default async function KeuanganPage() {
  const res = await fetchApi<FinanceStats>('/finances');
  let awal = res.success && res.data ? res.data : null;

  // Bila catatannya baru mencakup satu tahun, seri "semua tahun" cuma berisi
  // satu kelompok batang — grafik yang tidak menunjukkan apa pun. Dalam
  // keadaan itu halaman langsung dibuka pada rincian bulanannya. Pola yang
  // sama dipakai halaman statistik.
  if (awal && awal.years.length === 1) {
    const perBulan = await fetchApi<FinanceStats>(`/finances?year=${awal.years[0]}`);
    if (perBulan.success && perBulan.data) awal = perBulan.data;
  }

  return <KeuanganView awal={awal} />;
}
