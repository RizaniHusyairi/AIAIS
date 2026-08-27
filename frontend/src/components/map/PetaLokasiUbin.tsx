'use client';

/**
 * Peta jalan lokasi bandara — HANYA dipakai bila ubin dikonfigurasi.
 *
 * Dimuat dinamis oleh `PetaLokasiBandara` dengan `ssr: false`, karena Leaflet
 * menyentuh `window` saat modulnya dimuat. Jangan mengimpor berkas ini
 * langsung dari halaman; percabangan ada/tidaknya ubin tinggal di pembungkus,
 * dan itulah yang menjaga Leaflet tidak ikut terbawa ke berkas beranda pada
 * pemasangan yang tidak memakai ubin — yakni pemasangan bawaannya.
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AIRPORTS, HOME_IATA } from '@/lib/airports';
import { getTileConfig } from '@/lib/mapTiles';

const BANDARA = AIRPORTS[HOME_IATA];

/* Cukup dekat untuk memperlihatkan jalan masuk terminal, cukup jauh untuk
   tetap memperlihatkan ruas Samarinda–Bontang yang melewatinya. */
const ZOOM = 14;

export default function PetaLokasiUbin({ className = '' }: { className?: string }) {
  const wadahRef = useRef<HTMLDivElement>(null);
  const petaRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = wadahRef.current;
    if (!el) return;

    // StrictMode di dev menjalankan efek dua kali; buang sisa instance lama
    // supaya Leaflet tidak melempar "Map container is already initialized".
    const bertanda = el as HTMLDivElement & { _leaflet_id?: number };
    if (bertanda._leaflet_id) {
      petaRef.current?.remove();
      bertanda._leaflet_id = undefined;
    }

    const ubin = getTileConfig();
    if (!ubin) return; // pembungkus seharusnya tidak pernah merender ini

    const peta = L.map(el, {
      zoomControl: false,
      attributionControl: true,
      // Selalu mati: peta kecil di tengah beranda yang membajak gulir halaman
      // adalah cara tercepat membuat pengunjung ponsel tersesat.
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    petaRef.current = peta;
    peta.setView([BANDARA.lat, BANDARA.lon], ZOOM);

    L.tileLayer(ubin.url, { attribution: ubin.attribution, maxZoom: ubin.maxZoom }).addTo(peta);

    L.circleMarker([BANDARA.lat, BANDARA.lon], {
      radius: 9,
      color: '#0b1e5b',
      weight: 3,
      fillColor: '#22d3ee',
      fillOpacity: 1,
    })
      .addTo(peta)
      .bindTooltip('Bandara APT Pranoto', { permanent: false, direction: 'top' });

    return () => {
      peta.remove();
      petaRef.current = null;
    };
  }, []);

  return (
    <div
      ref={wadahRef}
      className={`absolute inset-0 ${className}`}
      role="img"
      aria-label={`Peta lokasi Bandara APT Pranoto pada koordinat ${BANDARA.lat}, ${BANDARA.lon}.`}
    />
  );
}
