'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { usesOwnChrome } from '@/lib/layoutChrome';
import { useSiteTheme } from '@/lib/siteTheme';
import LangitMalam from './LangitMalam';
import LampuPendekatan from './LampuPendekatan';

/**
 * Gerbang tunggal seluruh dekorasi tema malam.
 *
 * Dipasang di layout akar. Siang hari — dan di rute ber-chrome sendiri — ia
 * mengembalikan `null`, sehingga kanvas langit tidak pernah dibuat dan tidak
 * ada satu pun loop animasi berjalan. Menyalakan efeknya lalu menyembunyikannya
 * dengan CSS akan tetap membebani setiap pengunjung siang dengan rAF yang
 * menggambar sesuatu yang tak seorang pun lihat.
 *
 * Syarat rutenya diulang di sini alih-alih membaca atribut `data-site-theme`
 * yang sudah disetel `PenyetelTema`: React tidak dapat berlangganan perubahan
 * atribut DOM, dan menambahkan MutationObserver hanya demi itu jauh lebih
 * mahal daripada satu pemanggilan `usesOwnChrome`.
 */
export default function DekorMalam() {
  const pathname = usePathname();
  const theme = useSiteTheme();

  if (theme !== 'night' || usesOwnChrome(pathname)) return null;

  return (
    <>
      <LangitMalam />
      <LampuPendekatan />
    </>
  );
}
