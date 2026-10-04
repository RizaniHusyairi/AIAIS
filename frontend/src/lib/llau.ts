/**
 * Bawaan tampilan rekapitulasi LLAU.
 *
 * NAMA BANDARA. Berkas LLAU hanya memuat kode IATA. Peta di bawah adalah
 * padanan kode IATA umum (direktori kode IATA), dibatasi pada kode yang
 * pernah muncul atau lazim di rute APT Pranoto dan yang padanannya pasti.
 * Kode yang tidak ada di sini ditampilkan apa adanya — menebak nama bandara
 * dari kode yang tidak dikenali lebih buruk daripada tidak menamainya.
 */

export const NAMA_BANDARA: Record<string, string> = {
  CGK: 'Jakarta (Soekarno-Hatta)',
  HLP: 'Jakarta (Halim)',
  PCB: 'Tangerang Selatan (Pondok Cabe)',
  SUB: 'Surabaya',
  YIA: 'Yogyakarta',
  SRG: 'Semarang',
  DPS: 'Denpasar',
  UPG: 'Makassar',
  BPN: 'Balikpapan',
  BDJ: 'Banjarmasin',
  BEJ: 'Berau',
  PNK: 'Pontianak',
  PKY: 'Palangka Raya',
  TRK: 'Tarakan',
  PLW: 'Palu',
  AMQ: 'Ambon',
  TTE: 'Ternate',
  LNU: 'Malinau',
  RTU: 'Maratua',
  LPU: 'Long Apung',
  DTD: 'Datah Dawai',
  GHS: 'Kutai Barat (Melalan)',
};

/** Nama tampil ujung rute; kode khusus diberi keterangan, bukan nama karangan. */
export function namaRute(kode: string): string {
  if (kode === 'LOKAL') return 'Penerbangan lokal';
  if (kode === 'ZZZZ') return 'Lokasi tanpa kode';

  return NAMA_BANDARA[kode] ?? kode;
}

/** "BERJADWAL" → "Berjadwal"; kategori di Excel ditulis kapital semua. */
export function judulKata(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/(^|\s|\/)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

/** Persen gaya Indonesia: 71,2%. */
export const persen = (n: number | null | undefined, digit = 1) =>
  n == null ? '—' : `${n.toLocaleString('id-ID', { minimumFractionDigits: digit, maximumFractionDigits: digit })}%`;

/** Ringkas angka besar pada sumbu supaya labelnya tidak bertabrakan. */
export const ringkasSumbu = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;

  return String(n);
};

/**
 * Perubahan relatif terhadap bulan sebelumnya, dalam persen.
 *
 * `null` bila tidak ada pembanding — kartunya lalu tidak menampilkan panah
 * sama sekali, alih-alih "naik ∞%" dari nol.
 */
export function perubahan(kini: number, lalu: number | null | undefined): number | null {
  if (lalu == null || lalu === 0) return null;

  return ((kini - lalu) / lalu) * 100;
}

/** Warna satu seri (grafik berseri tunggal): biru kedatangan dari palet tervalidasi. */
export const WARNA_TUNGGAL = '#2a78d6';
