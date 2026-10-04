import type { Metadata } from 'next';
import StatistikView from './StatistikView';
import { fetchApi } from '@/lib/api';
import type { LlauStats } from '@/types';
import { metaHalaman } from '@/lib/seo';

/**
 * Statistik lalu lintas udara, bersumber rekapitulasi LLAU bulanan.
 *
 * Server Component tipis: mengekspor metadata dan mengambil bulan terbaru di
 * sisi server, sehingga halaman sudah berisi angka pada render pertama —
 * penting bagi perayap dan pengunjung berkoneksi lambat. View mengambil ulang
 * di sisi klien setiap bulan lain dipilih.
 */

export const metadata: Metadata = metaHalaman({
  title: 'Statistik Lalu Lintas Udara | Bandara APT Pranoto Samarinda',
  description: 'Rekapitulasi bulanan pergerakan pesawat, penumpang, bagasi, kargo, rute, maskapai, '
    + 'dan ketepatan waktu penerbangan di Bandar Udara APT Pranoto Samarinda.',
  path: '/statistik',
});

export default async function StatistikPage() {
  const res = await fetchApi<LlauStats>('/llau');

  return <StatistikView awal={res.success && res.data ? res.data : null} />;
}
