'use client';

import React, { useEffect, useState } from 'react';
import { LampuLandasan } from '@/components/home/AviasiDekor';

/**
 * Lampu pendekatan landasan di kaki layar, khusus tema malam.
 *
 * Menempel di tepi bawah viewport seperti deret lampu ambang yang terlihat dari
 * kokpit saat final approach: menyala berkejaran menuju tengah, dengan kabut
 * lembut di bawahnya.
 *
 * Deretnya BUKAN salinan baru — ia memakai `LampuLandasan` yang sudah dipakai
 * beranda, hanya dengan jumlah dan warna yang berbeda.
 *
 * Jumlah lampunya menyesuaikan lebar layar. Jumlah tetap akan berarti dua hal
 * buruk sekaligus: berdesakan tak terbaca di ponsel, atau menggantung sebagai
 * garis pendek di tengah monitor terminal.
 */

/** Satu lampu tiap sekian piksel lebar, lalu dijepit di kedua ujung. */
const PIKSEL_PER_LAMPU = 34;
const LAMPU_MIN = 15;
const LAMPU_MAKS = 61;

function hitungJumlah(lebar: number): number {
  const n = Math.round(lebar / PIKSEL_PER_LAMPU);
  const dijepit = Math.min(LAMPU_MAKS, Math.max(LAMPU_MIN, n));
  // Ganjil supaya ada satu lampu yang benar-benar di sumbu tengah layar,
  // sama seperti lampu ambang sungguhan.
  return dijepit % 2 === 0 ? dijepit + 1 : dijepit;
}

export default function LampuPendekatan() {
  // Komponen ini baru dipasang setelah hidrasi (lihat `DekorMalam`), jadi
  // mengukur viewport di sini tidak dapat menimbulkan ketidakcocokan hidrasi.
  const [jumlah, setJumlah] = useState(() =>
    hitungJumlah(typeof window === 'undefined' ? 1280 : window.innerWidth),
  );

  useEffect(() => {
    const ukur = () => setJumlah(hitungJumlah(window.innerWidth));
    ukur();
    window.addEventListener('resize', ukur);
    return () => window.removeEventListener('resize', ukur);
  }, []);

  return (
    // `overflow-hidden` itu wajib: deret lampu tidak boleh sekali pun menjadi
    // penyebab halaman bisa digulir ke samping.
    <div
      className="fixed inset-x-0 bottom-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      <div className="tema-kabut-landasan" />
      <LampuLandasan
        jumlah={jumlah}
        warnaKelas="bg-cyan-300"
        puncak={0.75}
        className="relative pb-[max(6px,env(safe-area-inset-bottom))]"
      />
    </div>
  );
}
