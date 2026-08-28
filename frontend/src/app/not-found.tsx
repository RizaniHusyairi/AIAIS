import type { Metadata } from 'next';
import NotFoundView from './NotFoundView';

/**
 * Halaman 404.
 *
 * Portal sebelumnya tidak punya berkas ini dan memakai bawaan Next — layar
 * putih bertuliskan "This page could not be found", dalam bahasa Inggris,
 * tanpa navigasi, dan tanpa satu pun jalan kembali. Itu bukan sekadar tidak
 * rapi: alamat yang salah ketik atau tautan lama yang sudah dipindah adalah
 * cara yang lumrah orang tiba di portal pemerintah, dan di situlah pengunjung
 * berhenti.
 *
 * Ia juga yang kini dipakai `/news/[slug]` lewat `notFound()` untuk slug yang
 * tidak dikenal — sebelumnya alamat semacam itu menjawab 200 berisi artikel
 * contoh, keadaan yang Google catat sebagai soft 404.
 *
 * Statusnya 404 yang sebenarnya; Next menyetelnya sendiri untuk berkas ini.
 *
 * Isinya ada di `NotFoundView` karena berkas ini mengekspor `metadata` dan
 * karenanya wajib Server Component, sementara teksnya ikut pilihan bahasa.
 */
export const metadata: Metadata = {
  title: 'Halaman Tidak Ditemukan | Bandara APT Pranoto Samarinda',
  // Halaman galat tidak pernah pantas masuk indeks, tetapi tautan di dalamnya
  // tetap boleh diikuti — di sanalah perayap menemukan jalan kembali ke isi
  // portal yang sungguh ada.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundView />;
}
