import type { Metadata } from 'next';
import TvView from './TvView';
import { fetchApi } from '@/lib/api';
import type { NataruSummary } from '@/types';

/**
 * Papan monitor Posko Nataru untuk layar TV.
 *
 * Tokennya TERPISAH dari token petugas dan hanya dapat membaca — layar ini
 * terpampang di ruang publik dan URL-nya kerap terlihat. Lihat migrasi
 * 2026_08_13_007000 untuk alasannya.
 *
 * Data awal diambil di sisi server supaya layar langsung berisi angka saat
 * dinyalakan, bukan menampilkan pemuatan di depan orang banyak.
 */

export const metadata: Metadata = {
  title: 'Papan Monitor Posko Nataru | Bandara APT Pranoto Samarinda',
  robots: { index: false, follow: false },
};

export default async function TvPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await fetchApi<NataruSummary>(`/nataru/tv/${token}`);

  return <TvView token={token} awal={res.success && res.data ? res.data : null} />;
}
