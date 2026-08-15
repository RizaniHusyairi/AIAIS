import type { Metadata } from 'next';
import PoskoForm from './PoskoForm';
import { fetchApi } from '@/lib/api';
import type { PoskoInfo } from '@/types';

/**
 * Formulir petugas Posko Nataru, dibuka lewat tautan bertoken.
 *
 * Keterangan poskonya diambil di sisi server supaya petugas langsung melihat
 * nama periode dan status bukanya — bukan layar memuat lebih dulu, yang di
 * lapangan dengan sambungan seadanya bisa berarti puluhan detik.
 *
 * `noindex` bukan kehati-hatian berlebihan: tokennya ada di dalam URL, dan
 * halaman terindeks berarti tautannya dapat ditemukan siapa pun lewat mesin
 * pencari — dan siapa pun yang memegangnya dapat menulis data penerbangan.
 */

export const metadata: Metadata = {
  title: 'Input Data Posko Nataru | Bandara APT Pranoto Samarinda',
  robots: { index: false, follow: false },
};

export default async function PoskoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await fetchApi<PoskoInfo>(`/nataru/${token}`);

  return <PoskoForm token={token} info={res.success && res.data ? res.data : null} />;
}
