import type { Metadata } from 'next';
import AbsensiForm from './AbsensiForm';
import { fetchApi } from '@/lib/api';
import type { AbsensiInfo } from '@/types';

/**
 * Daftar hadir rapat, dibuka lewat tautan bertoken.
 *
 * Keterangan rapatnya diambil di sisi server supaya peserta langsung melihat
 * judul, tanggal, dan status bukanya — di pintu ruang rapat dengan sinyal
 * seadanya, layar memuat lebih dulu bisa berarti belasan detik menghalangi
 * antrean di belakangnya. Pola yang sama dipakai halaman Posko Nataru.
 *
 * `noindex` bukan kehati-hatian berlebihan: tokennya ada di dalam URL, dan
 * halaman terindeks berarti tautannya dapat ditemukan lewat mesin pencari —
 * siapa pun yang memegangnya dapat mengisi daftar hadir.
 */

export const metadata: Metadata = {
  title: 'Daftar Hadir Rapat | Bandara APT Pranoto Samarinda',
  robots: { index: false, follow: false },
};

export default async function AbsensiPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await fetchApi<AbsensiInfo>(`/absensi/${token}`);

  return <AbsensiForm token={token} info={res.success && res.data ? res.data : null} />;
}
