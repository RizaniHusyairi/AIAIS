/**
 * Bawaan tampilan kinerja keuangan.
 *
 * SATU KATA YANG DIJAGA DI SELURUH RANTAI: `detailed` berarti anggaran yang
 * sudah **dirinci**, bukan yang sudah terpakai. Portal v1 melabeli angka ini
 * "Realisasi" pada grafik publiknya, dan akibatnya nyata — anggaran 2025
 * sebesar Rp 1,2 miliar yang rinciannya baru diketik Rp 550 juta tampil
 * seolah serapan bandaranya 46%. Label di berkas ini sengaja tidak pernah
 * menyebut realisasi maupun pengeluaran.
 */

/** Rupiah penuh, bergaya Indonesia. */
export const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

/**
 * Rupiah diringkas ke miliar/juta untuk kartu dan sumbu.
 *
 * Angkanya menyentuh miliaran; menuliskannya utuh membuat label sumbu
 * bertabrakan dan kartu ringkasan tak terbaca sekilas. Nilai utuhnya tetap
 * tersedia pada tabel angka di bawah halaman.
 */
export function rupiahRingkas(n: number): string {
  const nilai = (pembagi: number, satuan: string) =>
    `${(n / pembagi).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${satuan}`;

  if (n >= 1_000_000_000) return `Rp ${nilai(1_000_000_000, 'M')}`;
  if (n >= 1_000_000) return `Rp ${nilai(1_000_000, 'jt')}`;
  if (n >= 1_000) return `Rp ${nilai(1_000, 'rb')}`;

  return `Rp ${n.toLocaleString('id-ID')}`;
}

/** Sumbu grafik: tanpa awalan "Rp", satuannya sudah ditulis pada judul. */
export function ringkasSumbu(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} jt`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;

  return String(n);
}

/**
 * Warna per ENTITAS, bukan per urutan.
 *
 * Pemasukan dan anggaran memakai pasangan kategorikal yang sudah tervalidasi
 * (pemisahan ΔE 24,7 pada simulasi protan, jauh di atas ambang 8) — pasangan
 * yang sama dipakai halaman statistik. `anggaran` sengaja berwarna sama pada
 * kedua grafik: warna mengikuti entitasnya, tidak berganti karena grafiknya
 * berganti.
 *
 * `belumTerinci` abu-abu netral dan BUKAN anggota palet kategorikal, karena
 * yang diwakilinya memang bukan kategori melainkan ketiadaan data. Memberinya
 * hue tersendiri akan membuatnya terbaca sebagai pos anggaran ketiga.
 */
export const WARNA = {
  pemasukan: '#2a78d6',
  anggaran: '#eb6834',
  belumTerinci: '#cbd5e1',
} as const;

/** Persentase anggaran yang sudah dirinci; null bila belum ada anggaran. */
export function persenTerinci(anggaran: number, terinci: number): number | null {
  return anggaran > 0 ? Math.round((terinci / anggaran) * 100) : null;
}
