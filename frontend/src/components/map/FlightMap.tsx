'use client';

/**
 * Pembungkus peta rute penerbangan.
 *
 * Leaflet menyentuh `window` saat modul dimuat, jadi isinya dimuat dinamis
 * dengan `ssr: false`. Ini satu-satunya berkas yang perlu diimpor halaman —
 * `FlightMapInner` tidak boleh diimpor langsung.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { Plane } from 'lucide-react';
import type { Flight } from '@/types';

export type FlightMapProps = {
  /** Satu elemen = mode tunggal; banyak = mode papan. */
  flights: Flight[];
  mode?: 'single' | 'multi';
  /** Tinggi peta dalam satuan CSS. */
  height?: string;
  /** `false` mematikan geser/zoom — dipakai pada kartu kecil dan layar kios. */
  interactive?: boolean;
  showLabels?: boolean;
  selectedId?: string | number | null;
  onSelect?: (id: string | number) => void;
  /** Override jam untuk pengujian. Bawaan: waktu nyata. */
  nowMs?: number;
  className?: string;
};

function MapSkeleton({ height }: { height: string }) {
  return (
    <div
      className="relative overflow-hidden flex items-center justify-center"
      style={{ height, background: 'linear-gradient(160deg, #0b1e5b 0%, #132a6b 100%)' }}
    >
      <div className="flex flex-col items-center gap-2.5">
        <Plane className="w-6 h-6 text-cyan-300/70 rotate-45 animate-pulse" />
        <p className="text-[11px] text-blue-200/70">Menyiapkan peta rute...</p>
      </div>
    </div>
  );
}

const Inner = dynamic(() => import('./FlightMapInner'), {
  ssr: false,
  loading: () => <MapSkeleton height="100%" />,
});

export default function FlightMap(props: FlightMapProps) {
  const height = props.height ?? '260px';
  return (
    <div style={{ height }} className={props.className}>
      <Inner {...props} height="100%" className="" />
    </div>
  );
}
