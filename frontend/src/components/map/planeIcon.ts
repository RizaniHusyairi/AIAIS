/**
 * Ikon peta: siluet pesawat, penanda bandara, dan label kode IATA.
 *
 * Semua memakai `L.divIcon` (HTML biasa), bukan berkas gambar — sehingga
 * tidak ada permintaan jaringan dan bug klasik ikon marker Leaflet yang
 * rusak di bundler tidak pernah muncul.
 *
 * Bentuk siluet pesawatnya mengikuti `drawPlane` di
 * `src/components/effects/SkyParticles.tsx` agar konsisten dengan animasi
 * yang sudah ada di portal.
 */

import L from 'leaflet';

/** Kelas pembungkus yang dipakai rAF untuk memutar hidung pesawat. */
export const PLANE_ROTOR_CLASS = 'apt-plane-rotor';

/**
 * Penanda pesawat. Rotasi diterapkan pada elemen di dalam ikon, BUKAN pada
 * pembungkus Leaflet — Leaflet menulis sendiri `transform: translate3d(...)`
 * di pembungkus dan akan menimpa rotasi kita.
 */
export function planeIcon(color: string, dimmed = false): L.DivIcon {
  return L.divIcon({
    className: 'apt-plane-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <span class="${PLANE_ROTOR_CLASS}" style="
        display:block;width:28px;height:28px;
        transform-origin:50% 50%;
        will-change:transform;
        opacity:${dimmed ? 0.45 : 1};
      ">
        <svg viewBox="-14 -14 28 28" width="28" height="28" aria-hidden="true">
          <circle r="11" fill="${color}" opacity="0.16" />
          <!-- Hidung mengarah ke ATAS (0deg = utara) agar rotasi = bearing kompas. -->
          <g transform="rotate(-90)">
            <path d="M9 0 L-4 4.4 L-1.6 0 L-4 -4.4 Z"
                  fill="${color}" stroke="#ffffff" stroke-width="1.1"
                  stroke-linejoin="round" />
          </g>
        </svg>
      </span>`,
  });
}

/** Penanda bandara: titik dengan cincin. */
export function airportIcon(color: string, home = false): L.DivIcon {
  const size = home ? 16 : 12;
  return L.divIcon({
    className: 'apt-airport-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      box-shadow:0 0 0 ${home ? 3 : 2}px rgba(255,255,255,0.85), 0 1px 4px rgba(0,0,0,0.4);
    "></span>`,
  });
}

/** Label kode IATA di samping penanda bandara. */
export function labelIcon(text: string, sub?: string): L.DivIcon {
  return L.divIcon({
    className: 'apt-label-icon',
    iconSize: [0, 0],
    iconAnchor: [-10, 8],
    html: `<span style="
      display:inline-block;white-space:nowrap;
      font-weight:800;font-size:11px;letter-spacing:0.04em;
      color:#ffffff;text-shadow:0 1px 3px rgba(0,0,0,0.85);
      pointer-events:none;
    ">${text}${
      sub
        ? `<span style="display:block;font-weight:600;font-size:9.5px;opacity:0.75;letter-spacing:0">${sub}</span>`
        : ''
    }</span>`,
  });
}
