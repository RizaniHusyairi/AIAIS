import type { Metadata } from 'next';
import FaqView from './FaqView';
import { fetchApi } from '@/lib/api';
import { gabungFaq } from '@/lib/faqData';
import type { FaqItem } from '@/types';

/**
 * Pertanyaan yang Sering Diajukan.
 *
 * Server Component tipis sesuai konvensi portal: ia mengekspor metadata dan
 * MENGAMBIL DATA AWALNYA di sisi server, lalu menyerahkannya ke view.
 *
 * Pengambilan di server itu bukan kerapian belaka. Halaman ini justru yang
 * paling sering ditemukan lewat mesin pencari — orang mengetik pertanyaannya,
 * bukan nama bandara. Bila isinya baru muncul setelah JavaScript berjalan,
 * perayap dan pengunjung berkoneksi buruk mendapat halaman kosong.
 *
 * View tetap mengambil ulang di sisi klien supaya jawaban yang baru disunting
 * petugas langsung tampil tanpa menunggu cache halaman.
 */

export const metadata: Metadata = {
  title: 'Pertanyaan yang Sering Diajukan | Bandara APT Pranoto Samarinda',
  description:
    'Jawaban atas pertanyaan yang paling sering diajukan seputar penerbangan, fasilitas, '
    + 'layanan, dan pengaduan di Bandar Udara APT Pranoto Samarinda.',
  alternates: { canonical: '/faq' },
};

export default async function FaqPage() {
  const res = await fetchApi<FaqItem[]>('/faqs');
  const awal = Array.isArray(res.data) ? res.data.map(gabungFaq) : [];

  return <FaqView awal={awal} />;
}
