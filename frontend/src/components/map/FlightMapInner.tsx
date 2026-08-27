'use client';

/**
 * Peta rute penerbangan berbasis Leaflet — TANPA ubin daring.
 *
 * Seluruh tampilan digambar dari lapisan vektor (garis pantai lokal, gratikul,
 * rute, penanda), sehingga peta bekerja penuh di jaringan bandara yang tidak
 * punya jalur ke internet. Ubin hanya menyala bila `NEXT_PUBLIC_MAP_TILE_URL`
 * diisi — lihat `src/lib/mapTiles.ts`.
 *
 * Catatan arsitektur: animasi TIDAK melewati React. Lapisan disimpan di ref
 * dan digerakkan langsung oleh loop requestAnimationFrame. State React di
 * komponen ini hanya untuk teks dan pemilihan, bukan untuk posisi.
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Flight } from '@/types';
import { simulateAt, SimState } from '@/lib/flightSim';
import { greatCirclePath, boundsOf, LatLon } from '@/lib/geo';
import { HOME_IATA } from '@/lib/airports';
import { getTileConfig } from '@/lib/mapTiles';
import { airportIcon, labelIcon, planeIcon, PLANE_ROTOR_CLASS } from './planeIcon';
import type { FlightMapProps } from './FlightMap';

/* ------------------------------------------------------------------ */
/*  Palet                                                              */
/* ------------------------------------------------------------------ */

const SEA = '#0b1e5b';
const LAND_FILL = 'rgba(255,255,255,0.07)';
const LAND_LINE = 'rgba(255,255,255,0.28)';
const GRATICULE = 'rgba(255,255,255,0.07)';

/** Warna rute mengikuti fase simulasi. */
function routeColor(phase: SimState['phase']): string {
  switch (phase) {
    case 'cancelled':
      return '#fb7185';
    case 'hold':
      return '#fbbf24';
    case 'arrived':
      return '#38bdf8';
    case 'enroute':
      return '#22d3ee';
    default:
      return '#93c5fd';
  }
}

type Layer = {
  route: L.Polyline;
  plane: L.Marker | null;
  rotor: HTMLElement | null;
  path: [LatLon, LatLon];
};

export default function FlightMapInner({
  flights,
  mode,
  height = '260px',
  interactive = true,
  showLabels = true,
  selectedId = null,
  onSelect,
  nowMs,
  className = '',
}: FlightMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Map<string, Layer>>(new Map());
  const airportLayerRef = useRef<L.LayerGroup | null>(null);
  const flightsRef = useRef<Flight[]>(flights);
  const nowOverrideRef = useRef<number | undefined>(nowMs);
  const selectedRef = useRef<string | null>(selectedId ? String(selectedId) : null);
  const userMovedRef = useRef(false);

  const [ready, setReady] = useState(false);
  /** Detak 1 Hz, hanya untuk teks — bukan untuk posisi. */
  const [, setTick] = useState(0);

  const multi = (mode ?? (flights.length === 1 ? 'single' : 'multi')) === 'multi';

  /* Jaga agar closure rAF tidak memakai data usang. */
  useEffect(() => {
    flightsRef.current = flights;
  }, [flights]);
  useEffect(() => {
    nowOverrideRef.current = nowMs;
  }, [nowMs]);
  useEffect(() => {
    selectedRef.current = selectedId ? String(selectedId) : null;
  }, [selectedId]);

  /* ---------------------------------------------------------------- */
  /*  Inisialisasi peta — sekali seumur hidup komponen                 */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ditangkap di sini supaya cleanup tidak membaca `.current` yang mungkin
    // sudah berganti (peringatan react-hooks/exhaustive-deps).
    const layers = layersRef.current;

    // StrictMode di dev memanggil efek dua kali; buang sisa instance lama
    // agar tidak memicu "Map container is already initialized".
    const tagged = el as HTMLDivElement & { _leaflet_id?: number };
    if (tagged._leaflet_id) {
      mapRef.current?.remove();
      tagged._leaflet_id = undefined;
    }

    const map = L.map(el, {
      preferCanvas: true,
      zoomControl: interactive,
      attributionControl: false,
      dragging: interactive,
      scrollWheelZoom: false, // selalu mati: mencegah peta membajak gulir halaman
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: false,
      keyboard: interactive,
      minZoom: 3,
      maxZoom: 9,
    });
    mapRef.current = map;
    map.setView([-2.5, 118], 4);

    // Dibaca sekali saat peta dipasang, sejalan dengan efek ini yang memang
    // hanya berjalan sekali. Penyetelan "kurangi gerak" yang dinyalakan di
    // tengah jalan tetap menghentikan animasi rotornya lewat aturan CSS di
    // globals.css — yang berbasis kelas, bukan JavaScript.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Ubin hanya bila dikonfigurasi; bawaannya mode vektor mandiri.
    const tiles = getTileConfig();
    if (tiles) {
      L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: tiles.maxZoom }).addTo(map);
      map.attributionControl?.addTo(map);
    }

    // Gratikul tiap 5 derajat — menegaskan kesan peta navigasi.
    const grat: L.Polyline[] = [];
    for (let lon = 90; lon <= 145; lon += 5) {
      grat.push(L.polyline([[-15, lon], [12, lon]], { color: GRATICULE, weight: 1, interactive: false }));
    }
    for (let lat = -15; lat <= 10; lat += 5) {
      grat.push(L.polyline([[lat, 90], [lat, 145]], { color: GRATICULE, weight: 1, interactive: false }));
    }
    const graticule = L.layerGroup(grat).addTo(map);

    const airportLayer = L.layerGroup().addTo(map);
    airportLayerRef.current = airportLayer;

    let cancelled = false;

    // Garis pantai diimpor dinamis supaya tidak membebani bundel awal
    // halaman yang tidak menampilkan peta.
    import('@/data/indonesia-outline.json')
      .then((mod) => {
        if (cancelled || !mapRef.current) return;
        const data = (mod.default ?? mod) as unknown as GeoJSON.FeatureCollection;
        const land = L.geoJSON(data, {
          style: { color: LAND_LINE, weight: 1, fillColor: LAND_FILL, fillOpacity: 1, interactive: false },
        });
        land.addTo(map);
        // Daratan di paling bawah, lalu gratikul di atasnya — supaya rute dan
        // penanda tetap terlihat jelas.
        land.bringToBack();
        graticule.eachLayer((l) => (l as L.Polyline).bringToFront());
        setReady(true);
      })
      .catch((err) => {
        console.error('[FlightMap] gagal memuat garis pantai:', err);
        // Peta tetap berguna: rute dan penanda tidak bergantung pada lapisan ini.
        setReady(true);
      });

    const onMoveStart = () => {
      userMovedRef.current = true;
    };
    map.on('dragstart', onMoveStart);
    map.on('zoomstart', onMoveStart);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    /* -------- Loop animasi -------- */
    let raf = 0;
    const applyFrame = () => {
      const now = nowOverrideRef.current ?? Date.now();
      const sel = selectedRef.current;

      for (const f of flightsRef.current) {
        const id = String(f.id);
        const layer = layersRef.current.get(id);
        if (!layer) continue;

        const s = simulateAt(f, now);
        if (!s || !s.position || !layer.plane || !layer.rotor) continue;

        layer.plane.setLatLng([s.position.lat, s.position.lon]);
        const dim = sel !== null && sel !== id ? 0.35 : 1;
        layer.rotor.style.transform = `rotate(${s.headingDeg}deg)`;
        layer.rotor.style.opacity = String(dim);
      }
    };

    const frame = () => {
      applyFrame();
      raf = requestAnimationFrame(frame);
    };

    let slowTimer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (reduceMotion) {
        // Tetap akurat, hanya tidak meluncur.
        applyFrame();
        slowTimer ??= setInterval(applyFrame, 30_000);
      } else if (!raf) {
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (slowTimer) clearInterval(slowTimer);
      slowTimer = null;
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    start();

    // Detak teks 1 Hz — tidak menyentuh posisi.
    const textTick = setInterval(() => setTick((t) => t + 1), 1000);

    return () => {
      cancelled = true;
      stop();
      clearInterval(textTick);
      document.removeEventListener('visibilitychange', onVisibility);
      map.off('dragstart', onMoveStart);
      map.off('zoomstart', onMoveStart);
      ro.disconnect();
      layers.clear();
      airportLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // Efek ini sengaja hanya berjalan sekali; pembaruan data ditangani efek lain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Bangun ulang lapisan saat daftar penerbangan berubah             */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    const airportLayer = airportLayerRef.current;
    if (!map || !airportLayer || !ready) return;

    // Bersihkan lapisan lama.
    for (const layer of layersRef.current.values()) {
      map.removeLayer(layer.route);
      if (layer.plane) map.removeLayer(layer.plane);
    }
    layersRef.current.clear();
    airportLayer.clearLayers();

    const now = nowOverrideRef.current ?? Date.now();
    const airportsSeen = new Map<string, { lat: number; lon: number; name: string; home: boolean }>();
    const allPoints: LatLon[] = [];

    for (const f of flights) {
      const s = simulateAt(f, now);
      if (!s) continue; // koordinat tak dikenal -> jangan gambar apa pun

      const color = routeColor(s.phase);
      const a = { lat: s.from.lat, lon: s.from.lon };
      const b = { lat: s.to.lat, lon: s.to.lon };

      // Rute sebagai lengkung lingkaran besar, dihitung sekali di sini.
      const path = greatCirclePath(a, b, 64);
      allPoints.push(...path);

      const route = L.polyline(
        path.map((p) => [p.lat, p.lon] as [number, number]),
        {
          color,
          weight: s.phase === 'cancelled' ? 1.5 : 2,
          opacity: s.phase === 'cancelled' ? 0.4 : 0.75,
          dashArray: s.phase === 'cancelled' ? '4 6' : undefined,
          interactive: !!onSelect,
        },
      ).addTo(map);

      if (onSelect) route.on('click', () => onSelect(f.id));

      let plane: L.Marker | null = null;
      let rotor: HTMLElement | null = null;

      // Tidak ada pesawat untuk penerbangan batal — dan untuk `hold` pesawat
      // digambar diam di asal, tidak pernah bergerak.
      if (s.position) {
        plane = L.marker([s.position.lat, s.position.lon], {
          icon: planeIcon(color),
          interactive: !!onSelect,
          keyboard: false,
          zIndexOffset: 500,
        }).addTo(map);

        if (onSelect) plane.on('click', () => onSelect(f.id));

        const rootEl = plane.getElement();
        rotor = rootEl?.querySelector<HTMLElement>(`.${PLANE_ROTOR_CLASS}`) ?? null;
        if (rotor) rotor.style.transform = `rotate(${s.headingDeg}deg)`;
      }

      layersRef.current.set(String(f.id), { route, plane, rotor, path: [a, b] });

      for (const ap of [s.from, s.to]) {
        airportsSeen.set(ap.iata, {
          lat: ap.lat,
          lon: ap.lon,
          name: ap.iata,
          home: ap.iata === HOME_IATA,
        });
      }
    }

    // Penanda bandara (satu per bandara, tidak ganda pada mode papan).
    for (const [iata, ap] of airportsSeen) {
      L.marker([ap.lat, ap.lon], {
        icon: airportIcon(ap.home ? '#facc15' : '#e2e8f0', ap.home),
        interactive: false,
        keyboard: false,
      }).addTo(airportLayer);

      if (showLabels) {
        L.marker([ap.lat, ap.lon], {
          icon: labelIcon(iata),
          interactive: false,
          keyboard: false,
        }).addTo(airportLayer);
      }
    }

    // Sesuaikan pandangan, kecuali pengguna sudah menggeser sendiri.
    if (!userMovedRef.current && allPoints.length) {
      const bb = boundsOf(allPoints, multi ? 2 : 1.5);
      if (bb) map.fitBounds(bb, { animate: false, padding: [12, 12] });
    }
  }, [flights, ready, multi, showLabels, onSelect]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ height, background: `linear-gradient(160deg, ${SEA} 0%, #132a6b 100%)` }}
    >
      <div ref={containerRef} className="absolute inset-0" style={{ background: 'transparent' }} />

      {/* Leaflet menggambar latarnya sendiri; paksa transparan agar gradien terlihat. */}
      <style>{`
        .leaflet-container { background: transparent !important; font-family: inherit; }
        .leaflet-control-zoom a { border-radius: 8px !important; }
      `}</style>
    </div>
  );
}
