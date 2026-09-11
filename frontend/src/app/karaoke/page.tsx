import type { Metadata } from 'next';
import KaraokePapanView from './KaraokePapanView';
import { fetchApi } from '@/lib/api';
import { rekapSah } from '@/lib/karaokeKriteria';
import type { KaraokeRekap } from '@/types';

/**
 * Papan skor lomba karaoke internal.
 *
 * Halaman DALAM RUMAH: tidak didaftarkan di Navbar, tidak masuk sitemap, dan
 * `noindex`. Ia melayani acara kepegawaian, bukan pengunjung bandara — sebuah
 * portal resmi bandara yang memasang menu "Lomba Karaoke" di antara Jadwal
 * Penerbangan dan PPID salah menempatkan keduanya.
 *
 * Rekapnya diambil di sisi server supaya papan yang ditayangkan ke layar besar
 * ruang acara langsung terisi begitu dimuat, tanpa kedipan kosong sesudah
 * hidrasi. Pola yang sama dipakai halaman daftar hadir rapat.
 *
 * `metadata` ditulis manual, bukan lewat `metaHalaman()`: helper itu menyusun
 * kanonik dan kartu OpenGraph untuk halaman yang memang ingin ditemukan.
 */
export const metadata: Metadata = {
  title: 'Papan Skor Lomba Karaoke | Bandara APT Pranoto Samarinda',
  robots: { index: false, follow: false },
};

export default async function KaraokePage() {
  const res = await fetchApi<KaraokeRekap | null>('/karaoke/live');

  return <KaraokePapanView awal={res.success ? rekapSah(res.data) : null} />;
}
