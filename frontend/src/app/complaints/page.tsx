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
    'Cari jawaban, mulai percakapan dengan petugas, atau sampaikan pengaduan resmi berlampiran bukti di Bandara APT Pranoto Samarinda. Lacak penanganannya dengan nomor tiket, tanpa perlu membuat akun.',
  alternates: { canonical: '/complaints' },
};

export default function PusatBantuanPage() {
  return <PusatBantuanView />;
}
