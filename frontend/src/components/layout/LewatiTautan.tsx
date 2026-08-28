'use client';

import { useTeks } from '@/lib/kamus';

/**
 * Tautan "lewati ke konten utama" — pintu pertama bagi pemakai papan tik dan
 * pembaca layar.
 *
 * Berdiri sebagai komponen klien hanya karena teksnya harus ikut berganti
 * bahasa, sementara layout akar adalah Server Component dan tidak boleh
 * memanggil `useTeks()`. Gayanya tetap `.lewati-tautan` di `globals.css`;
 * tidak ada yang berubah selain sumber teksnya.
 */
export default function LewatiTautan() {
  const t = useTeks();

  return (
    <a href="#konten-utama" className="lewati-tautan">
      {t.umum.lewatiKeKonten}
    </a>
  );
}
