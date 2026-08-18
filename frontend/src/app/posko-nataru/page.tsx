import type { Metadata } from 'next';
import PoskoNataruView from './PoskoNataruView';
import { fetchApi } from '@/lib/api';
import type { NataruSummary } from '@/types';
import { metaHalaman } from '@/lib/seo';

/**
 * Papan pantau publik Posko Nataru.
 *
 * Server Component tipis: mengambil ringkasan awal di sisi server supaya
 * papan sudah berisi angka pada gambar pertama — halaman ini kerap
 * ditayangkan di monitor terminal yang dinyalakan lalu ditinggal, jadi
 * layar kosong menunggu JavaScript adalah kegagalan yang terlihat semua
 * orang. View memperbarui sendiri secara berkala setelahnya.
 *
 * `/nataru/summary` menjawab `data: null` bila tidak ada periode aktif;
 * itu keadaan sah, bukan galat, dan view menanganinya sebagai layar tunggu.
 */

export const metadata: Metadata = metaHalaman({
  title: 'Papan Pantau Posko Nataru | Bandara APT Pranoto Samarinda',
  description: 'Perkembangan arus penumpang, penerbangan, kargo, dan bagasi selama Posko Angkutan '
    + 'Udara Natal dan Tahun Baru di Bandar Udara APT Pranoto Samarinda.',
  path: '/posko-nataru',
});

// Papan ini menayangkan angka berjalan; jawaban yang di-cache membuatnya
// menampilkan keadaan kemarin tanpa ada yang menyadarinya.
export const dynamic = 'force-dynamic';

export default async function PoskoNataruPage() {
  const res = await fetchApi<NataruSummary | null>('/nataru/summary');
  const awal = res.success && res.data ? res.data : null;

  return <PoskoNataruView awal={awal} />;
}
