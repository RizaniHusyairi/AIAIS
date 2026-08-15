import type { Metadata } from 'next';
import StandarPelayananView from './StandarPelayananView';
import { fetchApi } from '@/lib/api';
import { DEFAULT_SETTINGS, SKM_KEYS } from '@/lib/settingsShared';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'Standar Pelayanan | Bandara APT Pranoto Samarinda',
  description:
    'Standar Pelayanan, Maklumat Pelayanan, dan hasil Survei Kepuasan Masyarakat Bandar Udara APT Pranoto Samarinda sesuai UU 25/2009 tentang Pelayanan Publik.',
  alternates: { canonical: '/ppid/standar-pelayanan' },
};

export default async function StandarPelayananPage() {
  /*
   * Blok SKM diambil di SISI SERVER, bukan lewat `useSetting`.
   *
   * `useSetting` mengembalikan nilai bawaan lebih dulu lalu memperbaruinya
   * setelah hidrasi. Untuk gambar latar itu tidak apa-apa. Untuk sakelar
   * SEMBUNYIKAN itu justru kebalikan yang diminta: bloknya sempat berkedip
   * tampil sebelum menghilang — persis yang hendak dicegah petugas ketika
   * menutup periode surveinya. Terbukti saat diuji: HTML server masih memuat
   * ajakan SKM meski `skm_is_active` sudah 0.
   */
  const res = await fetchApi<Record<string, string>>('/settings');
  const stored = res.success && res.data ? res.data : {};

  const skm = Object.fromEntries(
    SKM_KEYS.map((k) => [k, stored[k] || DEFAULT_SETTINGS[k]]),
  ) as Record<(typeof SKM_KEYS)[number], string>;

  return <StandarPelayananView skm={skm} />;
}
