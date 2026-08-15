'use client';

import { useAdminTheme } from './theme';

/**
 * Lambang resmi Bandar Udara APT Pranoto untuk panel admin.
 *
 * Berkasnya sudah tersedia dalam dua varian resmi — berwarna untuk latar
 * terang, putih untuk latar gelap — jadi temanya memilih berkas, bukan
 * menyaring warna logo berwarna jadi putih. Logo lembaga tidak diolah;
 * yang dipakai adalah varian yang memang diterbitkan untuk keperluan itu.
 *
 * Proyek ini memakai <img> polos di mana-mana (lihat `layout/Navbar.tsx`
 * dan `layout/Footer.tsx`); next/image belum dipakai sama sekali.
 */
export function LogoApt({ className = 'h-9 w-auto' }: { className?: string }) {
  const theme = useAdminTheme();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={theme === 'dark' ? '/logo-white-apt.svg' : '/logo-apt.svg'}
      alt="Bandar Udara APT Pranoto Samarinda"
      className={`object-contain ${className}`}
    />
  );
}

/**
 * Lambang tanpa tulisan, untuk ruang persegi.
 *
 * Satu berkas untuk kedua tema: lambangnya sendiri berwarna dan tetap
 * terbaca di atas kertas maupun langit malam.
 */
export function LambangApt({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mini-apt.svg"
      alt="Lambang Bandar Udara APT Pranoto Samarinda"
      className={`object-contain ${className}`}
    />
  );
}
