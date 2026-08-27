'use client';

/**
 * Peta Google yang disematkan pada kartu lokasi beranda.
 *
 * Dipilih secara sadar sebagai pengganti peta lokator mandiri: yang dicari
 * pengunjung di kartu ini adalah peta jalan yang bisa mereka kenali, dan
 * lokator seukuran pulau tidak menjawabnya.
 *
 * KONSEKUENSI YANG PERLU DIKETAHUI SIAPA PUN YANG MENYUNTING BERKAS INI.
 * Sematan ini membuat beranda portal memuat sumber daya dari server Google
 * pada setiap kunjungan, dan Google menyetel cookie-nya sendiri di sana —
 * di portal yang belum punya banner persetujuan. Ia juga tidak akan tampil
 * di jaringan lokal bandara yang tanpa jalur ke internet, berbeda dari
 * seluruh peta portal yang lain (lihat `lib/mapTiles.ts`). Dua hal itu
 * ditanggung dengan sengaja; jangan menyalin pola ini ke halaman lain tanpa
 * menimbangnya lagi.
 *
 * Yang diredam di sini:
 *  - `loading="lazy"` menahan permintaan sampai kartunya benar-benar mendekat
 *    ke layar, sehingga pengunjung yang tidak pernah menggulir sejauh ini
 *    tidak menghubungi Google sama sekali;
 *  - selama sematan belum termuat, peta lokator mandiri tetap terlihat di
 *    belakangnya, jadi kartu ini tidak pernah berupa kotak kosong.
 *
 * BATAS JARING PENGAMAN ITU, supaya tidak ada yang mengandalkannya lebih jauh
 * dari yang sanggup ia tanggung: ia menutupi masa sebelum sematan termuat dan
 * keadaan ketika pemuatan malas tidak pernah terpicu. Ia TIDAK menutupi
 * kegagalan jaringan yang sesungguhnya — pada iframe lintas-asal yang gagal,
 * peramban menggambar halaman galatnya sendiri dan tetap menyalakan `load`,
 * sehingga yang muncul adalah galat peramban itu, bukan lokator di baliknya.
 * Kegagalan lintas-asal memang tidak dapat dibedakan dari keberhasilan oleh
 * halaman induk; itu batas platform, bukan sesuatu yang bisa ditambal di sini.
 */

import React, { useState } from 'react';
import { AIRPORTS, HOME_IATA } from '@/lib/airports';
import PetaLokasiBandara from './PetaLokasiBandara';

const BANDARA = AIRPORTS[HOME_IATA];

/* Cukup dekat untuk memperlihatkan ruas Samarinda–Bontang dan jalan masuk
   terminal, cukup jauh untuk tidak kehilangan konteks sekitarnya. */
const ZOOM = 15;

/**
 * Alamat sematan.
 *
 * Bila `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` diisi, Embed API resmi dipakai —
 * itu yang punya kontrak layanan dan kuota yang jelas. Tanpa kunci, dipakai
 * bentuk `output=embed` yang tidak memerlukan kunci; ia bekerja hari ini
 * tetapi tidak pernah dijanjikan Google secara resmi, jadi anggap sebagai
 * jalan sementara, bukan pilihan akhir.
 *
 * Memakai KOORDINAT, bukan nama tempat: pencarian "APT Pranoto" masih kerap
 * mendarat di kantor perwakilan di dalam kota.
 */
function alamatSematan(): string {
  const q = `${BANDARA.lat},${BANDARA.lon}`;
  const kunci = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim();

  if (kunci) {
    return `https://www.google.com/maps/embed/v1/place?key=${kunci}&q=${q}&zoom=${ZOOM}&language=id&region=ID`;
  }
  return `https://maps.google.com/maps?q=${q}&hl=id&z=${ZOOM}&output=embed`;
}

export default function PetaSematanGoogle({ className = '' }: { className?: string }) {
  const [termuat, setTermuat] = useState(false);

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Latar sekaligus jaring pengaman. Tetap dirender (bukan dilepas saat
          sematan termuat) supaya tidak ada kedipan putih di antara keduanya,
          dan supaya kartu tetap menunjukkan letak yang benar bila Google
          tidak dapat dihubungi. */}
      <PetaLokasiBandara />

      <iframe
        src={alamatSematan()}
        title="Peta Google: lokasi Bandara APT Pranoto Samarinda"
        loading="lazy"
        onLoad={() => setTermuat(true)}
        /* Google memerlukan perujuk untuk mengaitkan permintaan dengan domain
           yang diizinkan pada Embed API; `no-referrer` akan membuatnya ditolak. */
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${
          termuat ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
