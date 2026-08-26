'use client';

import { useEffect, useRef } from 'react';

/**
 * Pengukur kemajuan gulir untuk halaman baca berita.
 *
 * KENAPA MENULIS LANGSUNG KE DOM, BUKAN LEWAT STATE REACT. Menggulir memicu
 * puluhan pembaruan per detik, dan badan artikel menjalankan penyaringan HTML
 * pada setiap render (lihat `components/SafeHtml.tsx`). Mengalirkan kemajuan
 * gulir melalui state berarti menyaring ulang seluruh isi berita setiap kali
 * pembaca menggeser satu piksel.
 *
 * `MotionValue` framer-motion sebenarnya dirancang untuk keadaan ini, dan
 * itulah pilihan pertama yang dicoba. Ia ditinggalkan bukan karena terbukti
 * salah, melainkan karena jalurnya tidak dapat diperiksa: bila animasinya diam,
 * tidak ada galat, tidak ada nilai yang bisa dibaca, dan tidak ada cara
 * memastikan letak putusnya. Menulis `style` sendiri lewat `ref` membuat
 * seluruh rantainya — pendengar gulir, hitungan, penulisan — terbuka untuk
 * diperiksa satu per satu.
 *
 * Framer tetap dipakai untuk animasi masuk, yang tidak bergantung pada gulir.
 */

/** Batasi ke rentang 0–1. */
function jepit(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Panggil `pada(kemajuan)` setiap kali halaman digulir, diubah ukurannya, atau
 * saat elemennya berubah tinggi.
 *
 * `ukur` menerjemahkan posisi elemen menjadi angka 0–1. `pada` dipegang lewat
 * `ref` supaya penutup (closure) baru pada tiap render tidak memasang ulang
 * pendengarnya.
 */
function useGulir(
  ref: React.RefObject<HTMLElement | null>,
  ukur: (el: HTMLElement) => number,
  pada: (kemajuan: number) => void,
): void {
  const ukurRef = useRef(ukur);
  const padaRef = useRef(pada);

  // Disegarkan di dalam efek, bukan saat render: menulis `ref` selagi render
  // berlangsung membuat hasilnya bergantung pada kapan React memutuskan
  // merender ulang.
  useEffect(() => {
    ukurRef.current = ukur;
    padaRef.current = pada;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const hitung = () => padaRef.current(jepit(ukurRef.current(el)));

    hitung();
    window.addEventListener('scroll', hitung, { passive: true });
    window.addEventListener('resize', hitung);

    // Tinggi artikel berubah setelah gambar selesai dimuat; tanpa ini rentang
    // pengukurannya terlanjur terkunci pada tinggi yang salah.
    const pengamat = new ResizeObserver(hitung);
    pengamat.observe(el);

    return () => {
      window.removeEventListener('scroll', hitung);
      window.removeEventListener('resize', hitung);
      pengamat.disconnect();
    };
  }, [ref]);
}

/**
 * Kemajuan membaca sebuah elemen.
 *
 * Bernilai 0 selama puncak tulisan belum naik melewati kepala layar, dan
 * mencapai 1 ketika kakinya tinggal seperlima layar lagi — pembaca sudah
 * sampai kalimat terakhir jauh sebelum elemennya benar-benar habis tergulir.
 */
export function useKemajuanBaca(
  ref: React.RefObject<HTMLElement | null>,
  pada: (kemajuan: number) => void,
): void {
  useGulir(
    ref,
    (el) => {
      const kotak = el.getBoundingClientRect();
      const atas = kotak.top + window.scrollY;

      const awal = atas - 120;
      const akhir = atas + kotak.height - window.innerHeight * 0.8;
      const rentang = akhir - awal;

      return rentang <= 0 ? 0 : (window.scrollY - awal) / rentang;
    },
    pada,
  );
}

/**
 * Kemajuan tergulirnya hero: 0 saat hero terlihat penuh, 1 saat kakinya
 * mencapai puncak layar. Dipakai untuk paralaks dan peredupan sampul.
 */
export function useKemajuanHero(
  ref: React.RefObject<HTMLElement | null>,
  pada: (kemajuan: number) => void,
): void {
  useGulir(
    ref,
    (el) => {
      const tinggi = el.offsetHeight;

      return tinggi <= 0 ? 0 : window.scrollY / tinggi;
    },
    pada,
  );
}
