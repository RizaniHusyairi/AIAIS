'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usesOwnChrome } from '@/lib/layoutChrome';
import { useSiteTheme } from '@/lib/siteTheme';
import { SITE_THEME_COLOR } from '@/lib/siteThemeShared';

/**
 * Satu-satunya penulis atribut `data-site-theme` pada <html>.
 *
 * Skrip anti-kedip di layout akar hanya benar untuk gambar pertama. Ia jalan
 * sekali, membaca `location.pathname` sekali, lalu selesai — sedangkan Next
 * berpindah halaman tanpa memuat ulang dokumen. Tanpa komponen ini, pengunjung
 * bertema malam yang menyusur dari beranda ke `/admin` membawa serta kulit
 * malam portal ke dalam panel yang sudah punya tema gelapnya sendiri, dan
 * keduanya bertumpuk.
 *
 * Aturannya satu kalimat: atribut malam terpasang hanya bila pemakai memilih
 * malam DAN halaman ini bukan rute ber-chrome sendiri.
 *
 * `useLayoutEffect`, bukan `useEffect`: ia jalan sebelum peramban menggambar,
 * jadi perpindahan halaman tidak pernah memperlihatkan satu bingkai bertema
 * salah. Di server hook ini tidak pernah dipanggil karena komponennya klien.
 */
export default function PenyetelTema() {
  const pathname = usePathname();
  const theme = useSiteTheme();

  useLayoutEffect(() => {
    const malam = theme === 'night' && !usesOwnChrome(pathname);
    const nilai = malam ? 'night' : 'day';

    document.documentElement.dataset.siteTheme = nilai;

    // Warna bilah peramban ikut berpindah. Disetel lewat DOM biasa, bukan
    // lewat `viewport.themeColor` di layout, karena nilainya bergantung pada
    // pilihan pemakai — sesuatu yang hanya diketahui setelah halaman hidup.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = SITE_THEME_COLOR[malam ? 'night' : 'day'];
  }, [pathname, theme]);

  return null;
}
