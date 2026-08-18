import type { Metadata } from 'next';
import FlightDetailView from './FlightDetailView';
import { SITE_NAME } from '@/lib/seo';

/**
 * Halaman satu penerbangan — SENGAJA TIDAK DIINDEKS.
 *
 * Satu penerbangan hanya ada beberapa jam. Membiarkannya terindeks berarti
 * menumpuk ribuan alamat yang sudah mati sebelum perayapnya sempat kembali,
 * dan halaman mati dalam jumlah sebesar itu menyeret turun penilaian mutu
 * seluruh domain. Yang seharusnya ditemukan orang adalah papan jadwalnya,
 * `/flights`, yang selalu berisi.
 *
 * `follow: true`: tautan di halaman ini tetap boleh diikuti, hanya
 * halamannya sendiri yang tidak dicatat. Alamat ini juga tidak dimasukkan ke
 * `sitemap.ts` — keduanya perlu, sebab sitemap hanya mengusulkan sedangkan
 * penanda inilah yang menolak.
 */
export const metadata: Metadata = {
  title: `Detail Penerbangan | ${SITE_NAME}`,
  description: 'Rincian satu penerbangan Bandara APT Pranoto Samarinda: maskapai, rute, gate, konter check-in, dan status terkini.',
  robots: { index: false, follow: true },
};

export default function FlightDetailPage() {
  return <FlightDetailView />;
}
