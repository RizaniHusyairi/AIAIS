import type { Metadata } from 'next';
import StatistikView from './StatistikView';
import { fetchApi } from '@/lib/api';
import type { AirTrafficStats } from '@/types';

/**
 * Statistik lalu lintas udara.
 *
 * Server Component tipis: mengekspor metadata dan mengambil data awalnya di
 * sisi server, sehingga halaman sudah berisi angka pada render pertama —
 * penting bagi perayap dan pengunjung berkoneksi lambat. View mengambil ulang
 * di sisi klien setiap penyaring tahun diubah.
 */

export const metadata: Metadata = {
  title: 'Statistik Lalu Lintas Udara | Bandara APT Pranoto Samarinda',
  description:
    'Data pergerakan pesawat, penumpang, bagasi, dan kargo di Bandar Udara APT Pranoto '
    + 'Samarinda, dihimpun harian dan disajikan per periode.',
  alternates: { canonical: '/statistik' },
};

export default async function StatistikPage() {
  const res = await fetchApi<AirTrafficStats>('/air-traffic');
  let awal = res.success && res.data ? res.data : null;

  // Bila catatannya baru mencakup satu tahun, seri "semua tahun" hanya berisi
  // satu kelompok batang — grafik yang tidak menunjukkan apa pun. Dalam
  // keadaan itu halaman langsung dibuka pada rincian bulanan tahun tersebut.
  // Permintaan kedua ini hanya terjadi selama catatannya belum melewati
  // pergantian tahun.
  if (awal && awal.years.length === 1) {
    const perBulan = await fetchApi<AirTrafficStats>(`/air-traffic?year=${awal.years[0]}`);
    if (perBulan.success && perBulan.data) awal = perBulan.data;
  }

  return <StatistikView awal={awal} />;
}
