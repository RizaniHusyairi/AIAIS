'use client';

import { useLayoutEffect } from 'react';
import { useBahasa } from '@/lib/bahasa';
import { KODE_LOKAL } from '@/lib/bahasaShared';

/**
 * Satu-satunya penulis atribut `lang` pada <html> sesudah gambar pertama.
 *
 * Skrip di layout akar hanya benar untuk gambar pertama: ia jalan sekali, lalu
 * selesai — sedangkan pergantian bahasa terjadi tanpa memuat ulang dokumen.
 * Tanpa komponen ini, pengunjung yang beralih ke Inggris tetap membawa
 * `lang="id-ID"`, dan pembaca layar melafalkan seluruh halaman dengan fonem
 * Indonesia sampai halaman dimuat ulang.
 *
 * `useLayoutEffect`, bukan `useEffect`, mengikuti `PenyetelTema`: ia jalan
 * sebelum peramban menggambar. Di server hook ini tidak pernah dipanggil karena
 * komponennya klien.
 *
 * `data-bahasa` ikut ditulis supaya CSS dan skrip lain punya kait yang sama
 * dengan `data-site-theme`, tanpa harus mengurai `lang`.
 */
export default function PenyetelBahasa() {
  const bahasa = useBahasa();

  useLayoutEffect(() => {
    const e = document.documentElement;
    e.lang = KODE_LOKAL[bahasa];
    e.dataset.bahasa = bahasa;
  }, [bahasa]);

  return null;
}
