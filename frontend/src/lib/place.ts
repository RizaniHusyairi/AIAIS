/**
 * Pengurai string rute FIDS.
 *
 * Dipisahkan dari `components/flights/shared.tsx` supaya modul non-React
 * (`lib/airports.ts`, `lib/flightSim.ts`) dapat memakainya tanpa menarik
 * React — sekaligus agar logikanya bisa diuji lewat skrip Node biasa.
 *
 * `shared.tsx` mengekspor ulang `splitPlace` dari sini, jadi seluruh halaman
 * yang sudah ada tidak perlu diubah dan perilakunya tetap sama persis.
 */

/** Pisahkan "Jakarta (CGK)" menjadi kode IATA ringkas + nama kota. */
export function splitPlace(place: string): { code: string; city: string } {
  const m = (place || '').match(/\(([^)]+)\)/);
  const code = m ? m[1] : (place || '').slice(0, 3).toUpperCase();
  const city = (place || '').replace(/\s*\([^)]*\)\s*/, '').trim();
  return { code, city: city || place || '' };
}

/** Buang embel-embel zona waktu supaya jam tampil ringkas. */
export function shortTime(time?: string | null): string {
  return (time || '').replace(/\s*WITA\s*/i, '').trim();
}
