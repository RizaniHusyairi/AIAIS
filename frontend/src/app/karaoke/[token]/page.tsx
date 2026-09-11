import type { Metadata } from 'next';
import PapanJuriView from './PapanJuriView';
import { fetchApi } from '@/lib/api';
import { rekapSah } from '@/lib/karaokeKriteria';
import type { KaraokePapanJuri } from '@/types';

/**
 * Papan nilai seorang juri, dibuka lewat tautan bertoken.
 *
 * Muatannya diambil di sisi server dengan alasan yang sama seperti daftar
 * hadir rapat: juri membuka tautan ini dari ponselnya di ruang acara, kerap
 * dengan sinyal seadanya, dan daftar peserta yang baru muncul beberapa detik
 * sesudah hidrasi berarti penampil pertama sudah selesai menyanyi sebelum
 * papannya siap.
 *
 * `noindex` bukan kehati-hatian berlebihan: tokennya ada di dalam URL, dan
 * halaman terindeks berarti siapa pun yang menemukannya dapat menilai atas
 * nama juri itu. `robots.ts` melarang seluruh awalan `/karaoke/` untuk
 * alasan yang sama.
 */
export const metadata: Metadata = {
  title: 'Papan Nilai Juri | Bandara APT Pranoto Samarinda',
  robots: { index: false, follow: false },
};

/*
 * Pesan galat backend TIDAK diteruskan ke layar, dan itu disengaja.
 *
 * `fetchApi` hanya mengurai badan respons ketika statusnya 2xx; pada 404 ia
 * jatuh ke jalur cadangan dan mengembalikan pesan umumnya sendiri ("Gagal
 * terhubung ke server") — yang justru menyesatkan, karena servernya baik-baik
 * saja dan yang salah adalah tokennya. Selama helper itu belum membedakan
 * keduanya, layar menyebut kedua kemungkinan apa adanya.
 */
export default async function PapanJuriPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await fetchApi<KaraokePapanJuri>(`/karaoke/${token}`);

  return <PapanJuriView token={token} awal={res.success ? rekapSah(res.data) : null} />;
}
