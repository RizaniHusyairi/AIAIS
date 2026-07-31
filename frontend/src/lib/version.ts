/**
 * Versi produk AIAIS untuk ditampilkan di antarmuka.
 *
 * Nilainya ditanam saat build oleh `next.config.ts`, yang membacanya dari
 * berkas `VERSION` di akar monorepo. Backend Laravel membaca berkas yang sama,
 * sehingga keduanya tidak bisa berbeda kecuali salah satu lupa di-build ulang
 * (panel admin punya pendeteksi selisih untuk kasus itu).
 *
 * PENTING: `process.env.NEXT_PUBLIC_APP_VERSION` harus ditulis sebagai akses
 * properti literal seperti di bawah. Destrukturisasi atau akses dinamis
 * (`process.env[key]`) TIDAK akan digantikan saat build dan hasilnya
 * `undefined` di browser. Berkas ini melakukannya sekali; modul lain cukup
 * mengimpor konstanta di bawah.
 */

/** Contoh: "2.0.0-alpha.1". */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

/** Contoh: "v2.0.0-alpha.1" — bentuk yang ditampilkan ke pengguna. */
export const VERSION_LABEL = `v${APP_VERSION}`;

/** Benar untuk 2.0.0-alpha.1 / -beta.2 / -rc.1; salah untuk 2.0.0. */
export const IS_PRERELEASE = APP_VERSION.includes('-');

/** "alpha" | "beta" | "rc" | "stable" */
export const RELEASE_CHANNEL = IS_PRERELEASE
  ? APP_VERSION.split('-')[1].split('.')[0]
  : 'stable';
