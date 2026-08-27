'use client';

/**
 * Peta lokasi bandara untuk kartu "Akses Menuju Bandara" di beranda.
 *
 * Sebelumnya tempat ini diisi hiasan: kisi CSS dan dua kurva SVG yang digambar
 * asal. Hiasan itu berbentuk peta tanpa menjadi peta — pengunjung yang baru
 * pertama kali ke Samarinda membacanya sebagai denah jalan menuju terminal,
 * padahal ia tidak menggambarkan tempat mana pun di dunia.
 *
 * DUA MODE, DAN MODE BAWAANNYA YANG TANPA JARINGAN.
 *
 *  1. Tanpa ubin (bawaan) — garis pantai Kalimantan digambar dari
 *     `lib/petaLokator.ts`, penanda diletakkan pada koordinat asli bandara.
 *     Nol permintaan ke pihak ketiga, jadi kartu ini tetap benar di jaringan
 *     lokal bandara yang tidak punya jalur ke internet. Itu bukan kebetulan
 *     melainkan kondisi bawaan yang sudah ditetapkan `lib/mapTiles.ts` dan
 *     `data/README.md` untuk seluruh peta portal.
 *
 *  2. Dengan ubin — bila `NEXT_PUBLIC_MAP_TILE_URL` diisi, peta jalan Leaflet
 *     dimuat dinamis menggantikan mode di atas. Leaflet TIDAK ikut terbawa ke
 *     berkas beranda selama ubin belum dikonfigurasi, karena impornya dinamis
 *     dan percabangannya terjadi sebelum impor itu disentuh.
 *
 * Skala lokator sengaja berhenti di tingkat pulau. Data garis pantainya
 * 1:50 juta; memperbesarnya sampai tingkat jalan akan menghasilkan pantai
 * yang meleset kilometer-an — persis kesalahan yang membuat hiasan lama tadi
 * menyesatkan, hanya dengan tampilan yang lebih meyakinkan.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { AIRPORTS, HOME_IATA } from '@/lib/airports';
import { getTileConfig } from '@/lib/mapTiles';
import { LOKATOR_DARATAN, LOKATOR_VIEWBOX, LOKATOR_LEBAR, LOKATOR_TINGGI, proyeksikan } from '@/lib/petaLokator';

const SEA = '#0b1e5b';
const LAND_FILL = 'rgba(255,255,255,0.07)';
const LAND_LINE = 'rgba(255,255,255,0.28)';
const GRATICULE = 'rgba(255,255,255,0.07)';

const PetaUbin = dynamic(() => import('./PetaLokasiUbin'), { ssr: false });

/** Bandara pangkalan portal; koordinatnya berprovenans di `lib/airports.ts`. */
const BANDARA = AIRPORTS[HOME_IATA];

export default function PetaLokasiBandara({ className = '' }: { className?: string }) {
  const kurangiGerak = useReducedMotion();
  const ubin = getTileConfig();

  if (ubin) return <PetaUbin className={className} />;

  const { x, y } = proyeksikan(BANDARA.lat, BANDARA.lon);

  /* Gratikul tiap 5 derajat, meniru peta rute penerbangan supaya kedua peta
     portal terbaca sebagai satu keluarga. */
  const garis: React.ReactElement[] = [];
  for (let lon = 110; lon <= 115; lon += 5) {
    const gx = proyeksikan(0, lon).x;
    garis.push(<line key={`v${lon}`} x1={gx} y1={0} x2={gx} y2={LOKATOR_TINGGI} stroke={GRATICULE} strokeWidth={2} />);
  }
  for (let lat = -0; lat <= 5; lat += 5) {
    const gy = proyeksikan(lat, 0).y;
    garis.push(<line key={`h${lat}`} x1={0} y1={gy} x2={LOKATOR_LEBAR} y2={gy} stroke={GRATICULE} strokeWidth={2} />);
  }

  return (
    <div className={`absolute inset-0 ${className}`} style={{ background: `linear-gradient(160deg, ${SEA} 0%, #132a6b 100%)` }}>
      <svg
        viewBox={LOKATOR_VIEWBOX}
        /* `slice` memenuhi kartu tanpa memipihkan pulau; sisi yang berlebih
           dipotong, dan penanda tetap di tengah karena xMidYMid. */
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label={`Peta lokasi: Bandara APT Pranoto berada di Kalimantan Timur, pada koordinat ${BANDARA.lat}, ${BANDARA.lon}.`}
      >
        {garis}
        <path d={LOKATOR_DARATAN} fill={LAND_FILL} stroke={LAND_LINE} strokeWidth={2} strokeLinejoin="round" />

        {/* Lingkar denyut. Ia menarik mata ke penanda, jadi ketika gerak
            dikurangi ia tidak dibekukan di tengah denyut melainkan digambar
            pada ukuran tetap — lingkaran beku terbaca sebagai radius wilayah,
            sesuatu yang tidak pernah dimaksudkan. */}
        {kurangiGerak ? (
          <circle cx={x} cy={y} r={26} fill="rgba(34,211,238,0.18)" />
        ) : (
          <motion.circle
            cx={x}
            cy={y}
            fill="rgba(34,211,238,0.22)"
            /* Nilai awal ditulis tegas. Tanpa itu `r` bermula pada 0 dan
               cincinnya lenyap sama sekali di mana pun animasi belum sempat
               berjalan — tab latar, halaman yang baru dipulihkan dari bfcache,
               atau peramban yang menunda animasi. */
            initial={{ r: 14, opacity: 0.7 }}
            animate={{ r: [14, 40], opacity: [0.7, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <circle cx={x} cy={y} r={13} fill="#22d3ee" stroke="#0b1e5b" strokeWidth={4} />
      </svg>
    </div>
  );
}
