'use client';

/**
 * Pemicu layar sambutan perayaan.
 *
 * Dipasang di tata letak akar supaya berlaku bagi beranda portal MAUPUN
 * beranda PWA — pengunjung ponsel merayakan hari yang sama.
 *
 * Sengaja TIDAK merender apa pun sampai tiga syarat terpenuhi sekaligus:
 * ada perayaan yang sedang berlangsung, halaman yang dibuka memang beranda,
 * dan layarnya belum ditonton pada kunjungan ini. Selama salah satunya belum
 * terpenuhi, komponen ini biayanya satu permintaan API yang gagal diam-diam.
 */

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ambilPerayaanAktif } from '@/lib/perayaanAktif';
import { kunciTonton, type SiteEvent } from '@/lib/siteEvents';
import SambutanEvent from './SambutanEvent';

/**
 * Hanya kedua beranda.
 *
 * Layar penuh yang muncul di tengah halaman formulir atau daftar dokumen akan
 * terbaca sebagai gangguan, bukan sambutan — dan pengunjung yang sedang
 * mengisi permohonan informasi paling tidak pantas menerimanya.
 */
const BERANDA = ['/', '/app'];

export default function PemicuEvent() {
  const pathname = usePathname();
  const [event, setEvent] = useState<SiteEvent | null>(null);
  const [main, setMain] = useState(false);

  useEffect(() => {
    if (!pathname || !BERANDA.includes(pathname)) return;

    let batal = false;

    // Permintaannya dibagi dengan hiasan beranda (`DekorEvent`), yang bertanya
    // hal yang sama pada bingkai render yang sama. Penyaringan tema yang tidak
    // dikenali frontend sudah dikerjakan di sana.
    ambilPerayaanAktif().then((data) => {
      if (batal || !data) return;

      // Dibaca DI SINI, bukan saat render: `sessionStorage` tidak ada di
      // server, dan membacanya saat render membuat keluaran server berbeda
      // dari klien lalu menggagalkan hidrasi seluruh halaman.
      if (sessionStorage.getItem(kunciTonton(data.id))) return;

      setEvent(data);
      setMain(true);
    });

    return () => { batal = true; };
  }, [pathname]);

  if (!event || !main) return null;

  return (
    <SambutanEvent
      event={event}
      onSelesai={() => {
        // Ditandai saat layarnya benar-benar selesai menutup, bukan saat
        // dibuka: pengunjung yang memuat ulang di tengah animasi pantas
        // melihatnya utuh sekali.
        try { sessionStorage.setItem(kunciTonton(event.id), '1'); } catch { /* mode privat */ }
        setMain(false);
      }}
    />
  );
}
