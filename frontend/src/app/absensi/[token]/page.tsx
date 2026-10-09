import type { Metadata } from 'next';
import AbsensiForm, { type MasalahTautan } from './AbsensiForm';
import { API_BASE_URL } from '@/lib/api';
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

/**
 * Keterangan rapat beserta SEBAB kegagalannya.
 *
 * Sengaja tidak lewat `fetchApi`: ia meratakan setiap kegagalan menjadi
 * `success: false` tanpa kode status, dan dulu akibatnya 429 maupun server
 * yang mati sama-sama tampil sebagai "tautan tidak dikenali" — peserta
 * memegang tautan yang benar lalu disuruh meminta tautan baru.
 */
async function muatRapat(token: string): Promise<{ info: AbsensiInfo | null; masalah: MasalahTautan | null }> {
  try {
    const res = await fetch(`${API_BASE_URL}/absensi/${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.status === 404) return { info: null, masalah: 'tidak-dikenal' };
    if (res.status === 429) return { info: null, masalah: 'ramai' };

    const json = await res.json().catch(() => null);

    if (res.ok && json?.success && json.data) return { info: json.data, masalah: null };
  } catch {
    /* jatuh ke gangguan di bawah */
  }

  return { info: null, masalah: 'gangguan' };
}

export default async function AbsensiPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { info, masalah } = await muatRapat(token);

  return <AbsensiForm token={token} info={info} masalah={masalah} />;
}
