'use client';

import { useLayoutEffect } from 'react';
import { useAksesibilitas } from '@/lib/aksesibilitas';
import { PETA_ATRIBUT, SKALA_TEKS } from '@/lib/aksesibilitasShared';

/**
 * Satu-satunya penulis atribut `data-a11y-*` pada <html>.
 *
 * Skrip anti-kedip di layout akar hanya benar untuk gambar pertama; ia jalan
 * sekali lalu selesai, sedangkan penyetelan bisa berubah kapan saja dari panel
 * maupun dari tab lain. Komponen inilah yang meneruskannya sesudah itu.
 *
 * Berbeda dari `PenyetelTema`, di sini TIDAK ADA pemeriksaan lintasan halaman.
 * Kontras tinggi dan teks besar bukan gaya visual yang boleh dikalahkan tata
 * warna halaman tertentu — ia kebutuhan pemakainya, dan berlaku di mana pun ia
 * berada, termasuk di rute ber-chrome sendiri.
 *
 * `useLayoutEffect`, bukan `useEffect`: ia jalan sebelum peramban menggambar,
 * jadi perpindahan halaman tidak pernah memperlihatkan satu bingkai bergaya
 * salah.
 */
export default function PenyetelAksesibilitas() {
  const a11y = useAksesibilitas();

  useLayoutEffect(() => {
    const e = document.documentElement;

    for (const { kunci, atribut, nilai } of PETA_ATRIBUT) {
      if (a11y[kunci]) e.setAttribute(atribut, nilai);
      else e.removeAttribute(atribut);
    }

    const skala = SKALA_TEKS[a11y.teks];
    if (skala && skala !== 1) {
      // Atribut memilih aturannya, variabel membawa angkanya — atribut CSS
      // tidak bisa dipakai berhitung di dalam `calc()`.
      e.setAttribute('data-a11y-teks', String(a11y.teks));
      e.style.setProperty('--a11y-skala', String(skala));
    } else {
      e.removeAttribute('data-a11y-teks');
      e.style.removeProperty('--a11y-skala');
    }
  }, [a11y]);

  return null;
}
