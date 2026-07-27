/**
 * Konfigurasi ubin (tile) peta — opsional.
 *
 * Peta rute sengaja dirancang bekerja TANPA ubin: seluruh tampilan digambar
 * dari `src/data/indonesia-outline.json` di sisi klien, sehingga tetap
 * berfungsi penuh di jaringan lokal bandara yang tidak punya jalur ke
 * internet. Ini kondisi bawaan.
 *
 * Bila suatu saat ubin ingin diaktifkan (misalnya setelah berlangganan
 * penyedia peta atau menyiapkan cache ubin sendiri di server), cukup isi
 * variabel lingkungan di bawah — tidak ada kode yang perlu diubah:
 *
 *   NEXT_PUBLIC_MAP_TILE_URL="https://.../{z}/{x}/{y}.png"
 *   NEXT_PUBLIC_MAP_TILE_ATTRIBUTION="© Penyedia © OpenStreetMap contributors"
 *   NEXT_PUBLIC_MAP_TILE_MAXZOOM="10"
 *
 * Peringatan: jangan mengarahkannya ke `tile.openstreetmap.org`. Kebijakan
 * penggunaan OSM melarang server ubin publiknya dipakai sebagai basemap
 * produksi, dan portal resmi yang terkena pembatasan laju di depan penumpang
 * adalah risiko nyata. Pakai penyedia berlangganan, basemap resmi pemerintah
 * (BIG/Ina-Geoportal), atau cache ubin sendiri.
 *
 * Atribusi WAJIB ditampilkan bila ubin diaktifkan.
 */

export type TileConfig = {
  url: string;
  attribution: string;
  maxZoom: number;
};

/** `null` berarti mode vektor mandiri — tidak ada permintaan jaringan apa pun. */
export function getTileConfig(): TileConfig | null {
  const url = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim();
  if (!url) return null;

  const attribution = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim();
  if (!attribution) {
    console.warn(
      '[mapTiles] NEXT_PUBLIC_MAP_TILE_URL diisi tetapi NEXT_PUBLIC_MAP_TILE_ATTRIBUTION kosong. ' +
        'Atribusi sumber peta wajib ditampilkan — ubin tidak diaktifkan.',
    );
    return null;
  }

  const maxZoom = Number(process.env.NEXT_PUBLIC_MAP_TILE_MAXZOOM) || 10;
  return { url, attribution, maxZoom };
}
