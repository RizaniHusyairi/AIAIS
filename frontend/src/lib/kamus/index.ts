'use client';

/**
 * Kamus portal dan cara membacanya.
 *
 * PENTING: berkas ini bertanda `'use client'` karena mengekspor hook. Server
 * Component tidak boleh mengimpornya — kebalikan dari `bahasaShared.ts`, yang
 * sengaja bebas direktif supaya layout akar bisa memakai skrip anti-kedipnya.
 * Batas itu sama persis dengan pasangan `siteTheme.ts` ⇄ `siteThemeShared.ts`.
 *
 * Bahasa Indonesia adalah sumber kebenaran strukturnya. `Kamus` diturunkan dari
 * `id.ts`, dan `en.ts` mengakhiri dirinya dengan `satisfies Kamus`, sehingga
 * kunci yang lupa diterjemahkan menjadi galat kompilasi. Tidak ada pencarian
 * kunci berupa string dan tidak ada mekanisme cadangan saat runtime: teks yang
 * hilang tertangkap sebelum tayang, bukan oleh pengunjung.
 */

import { useBahasa } from '../bahasa';
import { KODE_LOKAL, type Bahasa } from '../bahasaShared';
import id from './id';
import en from './en';

export type Kamus = typeof id;

const KAMUS: Record<Bahasa, Kamus> = { id, en };

/** Kamus untuk bahasa tertentu; dipakai di luar komponen React. */
export function teks(bahasa: Bahasa): Kamus {
  return KAMUS[bahasa];
}

/**
 * Kamus untuk bahasa yang sedang aktif.
 *
 * `const t = useTeks();` lalu `t.nav.beranda` — satu pemanggilan per komponen,
 * bukan satu per teks.
 */
export function useTeks(): Kamus {
  return KAMUS[useBahasa()];
}

/**
 * Kolom tanggal (bukan waktu) diurai sebagai tanggal kalender.
 *
 * Backend mengirim kolom bertipe `date` sebagai ISO penuh — `published_date`
 * sebuah dokumen tiba sebagai "2025-02-03T00:00:00.000000Z", bukan
 * "2025-02-03". Dua hal keliru bila string itu diteruskan apa adanya:
 *
 *  1. Pemformat yang menambahkan sendiri "T00:00:00" (pola yang dipakai
 *     beberapa berkas di portal ini) menghasilkan "…000000ZT00:00:00" yang
 *     tidak dapat diurai, lalu memuntahkan ISO mentahnya ke muka halaman.
 *  2. Tengah malam UTC jatuh pada tanggal SEBELUMNYA di zona waktu barat,
 *     sehingga dokumen bertanggal 3 Februari tampil sebagai 2 Februari bagi
 *     sebagian pembaca.
 *
 * Keduanya hilang bila bagian tanggalnya diambil lalu dibangun sebagai tengah
 * malam waktu setempat. Nilai yang memang membawa waktu bermakna — misalnya
 * `published_at` sebuah berita — tidak cocok dengan pola ini dan diteruskan
 * apa adanya beserta zona waktunya.
 */
function uraiNilai(nilai: string | number | Date): string | number | Date {
  if (typeof nilai !== 'string') return nilai;

  const cocok = nilai.match(/^(\d{4}-\d{2}-\d{2})(?:[T ]00:00:00(?:\.0+)?Z?)?$/);

  return cocok ? `${cocok[1]}T00:00:00` : nilai;
}

/**
 * Pemformat tanggal yang mengikuti bahasa aktif.
 *
 * Sebelum ini `toLocaleDateString('id-ID', …)` tersebar di belasan berkas.
 * Tanggal yang tetap berbunyi "12 Agustus 2026" di tengah halaman berbahasa
 * Inggris adalah bocoran yang paling cepat terlihat, dan satu-satunya cara
 * menutupnya secara menyeluruh adalah menyalurkan semuanya lewat satu tempat.
 */
export function formatTanggal(
  nilai: string | number | Date | null | undefined,
  bahasa: Bahasa,
  opsi: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string {
  if (nilai === null || nilai === undefined || nilai === '') return '';

  const tanggal = nilai instanceof Date ? nilai : new Date(uraiNilai(nilai));
  // Tanggal rusak dari API tidak boleh muncul sebagai "Invalid Date" di muka
  // halaman; lebih baik tidak ada tulisan sama sekali.
  if (Number.isNaN(tanggal.getTime())) return '';

  return tanggal.toLocaleDateString(KODE_LOKAL[bahasa], opsi);
}

/** Pemisah ribuan mengikuti bahasa aktif: 1.234 (id) ⇄ 1,234 (en). */
export function formatAngka(nilai: number, bahasa: Bahasa): string {
  return nilai.toLocaleString(KODE_LOKAL[bahasa]);
}
