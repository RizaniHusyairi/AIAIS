'use client';

import { ImageOff } from 'lucide-react';
import { gambarBerita } from '@/lib/berita';
import type { NewsItem } from '@/types';

/**
 * Gambar sampul berita, lengkap dengan penggantinya bila tidak ada.
 *
 * KENAPA INI ADA. Tidak semua berita punya gambar: sebagian baris warisan v1
 * menyimpan kolom gambar kosong, dan berkasnya pun kadang sudah tidak berada
 * di cakram mana pun. Merender `<img src="">` pada keadaan itu membuat
 * peramban memuat ulang seluruh halaman sebagai gambar — dan setiap daftar
 * berita di portal ini mengulang jebakan yang sama dengan kodenya sendiri.
 *
 * Karena setiap pemakai memberi ukuran kotaknya lewat `className`, komponen
 * ini tidak menetapkan ukuran apa pun: ia hanya menjamin isinya selalu sah.
 */
export default function GambarBerita({
  berita,
  className = '',
  ukuranIkon = 'w-6 h-6',
}: {
  berita?: NewsItem | null;
  className?: string;
  ukuranIkon?: string;
}) {
  const sumber = gambarBerita(berita);

  if (!sumber) {
    return (
      <span
        className={`bg-slate-100 flex items-center justify-center ${className}`}
        role="img"
        aria-label="Berita ini belum memiliki gambar"
      >
        <ImageOff className={`${ukuranIkon} text-slate-300`} />
      </span>
    );
  }

  return <img src={sumber} alt={berita?.title ?? ''} className={className} />;
}
