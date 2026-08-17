import { Home, Newspaper, LifeBuoy, LayoutGrid, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Lima tujuan utama PWA.
 *
 * Ditulis SEKALI di sini karena dibaca dua penyaji sekaligus: bilah bawah pada
 * ponsel dan rail kiri pada tablet. Sebelum berkas ini ada, daftarnya hidup di
 * dalam komponen bilah bawah — dan rail tablet yang menyusul pasti akan
 * menyimpan salinannya sendiri lalu menyimpang, persis yang sudah terjadi pada
 * peta rute di `proxy.ts` dan `MobileRedirect.tsx`.
 */
export type TabPwa = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Tujuan yang ditonjolkan. Tepat SATU tab boleh memilikinya.
   *
   * Pusat Bantuan adalah satu-satunya layar di aplikasi ini yang dibuka orang
   * saat sedang bermasalah — barang tertinggal, penerbangan tidak jelas,
   * petugas perlu dihubungi. Menaruhnya sejajar dengan Berita berarti menyuruh
   * orang yang sedang panik memindai lima ikon seukuran sama.
   */
  utama?: boolean;
};

export const TABS_PWA: TabPwa[] = [
  { href: '/app', label: 'Beranda', icon: Home },
  { href: '/app/berita', label: 'Berita', icon: Newspaper },
  { href: '/app/bantuan', label: 'Bantuan', icon: LifeBuoy, utama: true },
  { href: '/app/layanan', label: 'Layanan', icon: LayoutGrid },
  { href: '/app/akun', label: 'Akun', icon: UserRound },
];

/**
 * Benar bila `pathname` berada di dalam tab `href`.
 *
 * `/app` diperlakukan khusus: sebagai awalan ia cocok dengan SELURUH rute
 * aplikasi, sehingga tanpa pengecualian ini tab Beranda akan menyala di setiap
 * layar.
 */
export function tabAktif(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}
