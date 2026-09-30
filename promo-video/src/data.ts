import snapshot from './data/snapshot.json';

/**
 * Semua teks data di video berasal dari snapshot API (lihat scripts/fetch-data.mjs).
 * Adegan yang datanya kosong menampilkan kerangka, bukan isian karangan.
 */
export type Flight = (typeof snapshot.flights)[number];
export type NewsItem = (typeof snapshot.news)[number];

export const DATA = snapshot;
export const departures = snapshot.flights.filter((f) => f.type === 'departure');
export const arrivals = snapshot.flights.filter((f) => f.type === 'arrival');

export const STATUS_COLOR: Record<string, string> = {
  Terjadwal: '#7dd3fc',
  Boarding: '#fbbf24',
  Berangkat: '#34d399',
  Mendarat: '#34d399',
  Tertunda: '#fb923c',
  Batal: '#fb7185',
};

export function tanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
