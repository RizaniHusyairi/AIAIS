import type { Metadata } from 'next';
import PusatBantuanView from './PusatBantuanView';

/**
 * Server Component tipis — `metadata` hanya didukung di sini.
 *
 * Sebelumnya rute ini berupa komponen klien telanjang, sehingga satu-satunya
 * halaman layanan pengaduan bandara sama sekali tidak punya judul maupun
 * deskripsi bagi mesin pencari.
 *
 * Rutenya tetap `/complaints` meski isinya kini lebih luas: 17 berkas
 * menautkannya (Navbar, Footer, FAQ, beranda, proxy ponsel, dan lainnya).
 * Mengganti nama rute berarti churn besar demi keuntungan kosmetik.
 */
export const metadata: Metadata = {
  title: 'Pusat Bantuan | Bandara APT Pranoto Samarinda',
  description:
    'Cari jawaban, mulai percakapan dengan petugas, sampaikan pengaduan resmi, atau laporkan barang yang hilang di Bandara APT Pranoto Samarinda. Lacak penanganannya dengan nomor tiket, tanpa perlu membuat akun.',
  alternates: { canonical: '/complaints' },
};

/**
 * `?mode=` memilih tab mana yang terbuka saat halaman dimuat.
 *
 * Dipakai menu Navbar untuk menunjuk langsung ke "Lapor Kehilangan" tanpa
 * membuat rute baru. Rutenya sengaja tetap `/complaints`: ia sudah dipetakan
 * ke layar PWA `/app/bantuan` di `lib/pwaRoutes.ts`, dan rute baru yang lupa
 * didaftarkan di sana membuat fiturnya tak terjangkau dari ponsel.
 *
 * Pemetaan itu menandai `simpanQuery`, sehingga `?mode=` ikut terbawa saat
 * pengunjung ponsel dialihkan. Tanpa penanda itu proxy membuang seluruh query
 * dan pelapor mendarat di tab pertama — persis yang terjadi sampai sebelum
 * layar PWA-nya diperbaiki.
 *
 * Dibaca DI SINI, bukan lewat `useSearchParams` di komponen kliennya: hook itu
 * menuntut pembungkus `<Suspense>`, dan melewatkannya sebagai prop
 * menghilangkan seluruh urusan itu. `searchParams` berupa Promise pada versi
 * Next ini, jadi halamannya async.
 */
export default async function PusatBantuanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const mode = (await searchParams).mode;

  return <PusatBantuanView modeAwal={typeof mode === 'string' ? mode : undefined} />;
}
