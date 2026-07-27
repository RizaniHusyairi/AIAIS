/**
 * Geometri bola untuk rute penerbangan.
 *
 * Semua fungsi murni dan tanpa dependensi, supaya bisa diuji lewat skrip
 * Node biasa tanpa DOM. Bumi diperlakukan sebagai bola berjari-jari rata-rata
 * — cukup untuk rute domestik Indonesia; selisihnya terhadap elipsoid WGS84
 * di bawah 0,5% dan tak berarti pada skala peta ini.
 */

export type LatLon = { lat: number; lon: number };

/** Jari-jari rata-rata bumi (km), IUGG. */
const R_KM = 6371.0088;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Jarak lingkaran besar antara dua titik, dalam kilometer. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Arah awal dari `a` menuju `b`, dalam derajat kompas (0 = utara, searah jarum jam). */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const phi1 = rad(a.lat);
  const phi2 = rad(b.lat);
  const dLon = rad(b.lon - a.lon);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);

  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Interpolasi sferis (slerp) sepanjang lingkaran besar.
 * `f` = 0 mengembalikan `a`, `f` = 1 mengembalikan `b`.
 */
export function interpolate(a: LatLon, b: LatLon, f: number): LatLon {
  const delta = distanceKm(a, b) / R_KM; // jarak sudut, radian
  if (delta < 1e-9) return { ...a }; // titik berimpit, hindari bagi nol

  const sinDelta = Math.sin(delta);
  const A = Math.sin((1 - f) * delta) / sinDelta;
  const B = Math.sin(f * delta) / sinDelta;

  const phi1 = rad(a.lat);
  const lam1 = rad(a.lon);
  const phi2 = rad(b.lat);
  const lam2 = rad(b.lon);

  const x = A * Math.cos(phi1) * Math.cos(lam1) + B * Math.cos(phi2) * Math.cos(lam2);
  const y = A * Math.cos(phi1) * Math.sin(lam1) + B * Math.cos(phi2) * Math.sin(lam2);
  const z = A * Math.sin(phi1) + B * Math.sin(phi2);

  return {
    lat: deg(Math.atan2(z, Math.hypot(x, y))),
    lon: deg(Math.atan2(y, x)),
  };
}

/**
 * Titik-titik untuk menggambar rute sebagai lengkung lingkaran besar.
 *
 * Garis lurus dua titik pada proyeksi Web Mercator BUKAN jalur terpendek —
 * pada rute panjang selisihnya terlihat jelas. Karena itu rute selalu
 * digambar sebagai polyline bersegmen.
 *
 * Catatan: seluruh rute domestik Indonesia berada jauh dari antimeridian,
 * jadi tidak ada penanganan pemecahan garis di ±180°.
 */
export function greatCirclePath(a: LatLon, b: LatLon, segments = 64): LatLon[] {
  const n = Math.max(2, Math.floor(segments));
  const out: LatLon[] = [];
  for (let i = 0; i <= n; i++) out.push(interpolate(a, b, i / n));
  return out;
}

/**
 * Arah hidung pesawat pada posisi tertentu di sepanjang rute.
 *
 * Diambil dari garis singgung lokal (posisi kini -> sedikit di depan), bukan
 * bearing awal-ke-akhir: pada lingkaran besar arahnya berubah sepanjang jalur,
 * sehingga bearing awal akan membuat ikon miring terhadap kurva yang digambar.
 */
export function headingAt(a: LatLon, b: LatLon, f: number): number {
  const eps = 0.002;
  // Dekat ujung akhir, ambil singgung ke belakang agar tidak melewati `b`.
  const from = f >= 1 - eps ? interpolate(a, b, 1 - eps) : interpolate(a, b, f);
  const to = f >= 1 - eps ? b : interpolate(a, b, Math.min(1, f + eps));
  return bearingDeg(from, to);
}

/** Kotak pembatas [selatan, barat, utara, timur] dengan margin opsional (derajat). */
export function boundsOf(points: LatLon[], padDeg = 0): [[number, number], [number, number]] | null {
  if (!points.length) return null;

  let south = points[0].lat;
  let north = points[0].lat;
  let west = points[0].lon;
  let east = points[0].lon;

  for (const p of points) {
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
    if (p.lon < west) west = p.lon;
    if (p.lon > east) east = p.lon;
  }

  return [
    [south - padDeg, west - padDeg],
    [north + padDeg, east + padDeg],
  ];
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
