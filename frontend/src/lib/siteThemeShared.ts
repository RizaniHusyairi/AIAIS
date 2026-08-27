/**
 * Konstanta tema portal PUBLIK — AMAN dipakai Server Component maupun klien.
 *
 * Berkas ini SENGAJA tidak bertanda `'use client'`, persis seperti
 * `components/admin/themeShared.ts`. Begitu sebuah modul ditandai klien,
 * seluruh ekspornya berubah menjadi rujukan klien ketika diimpor dari Server
 * Component — termasuk konstanta biasa seperti skrip di bawah. Pemisahan yang
 * sama sudah dilakukan dua kali di repo ini (`themeShared.ts`,
 * `settingsShared.ts`); pada kasus kedua akibatnya halaman membalas HTTP 500.
 *
 * Tema panel admin (`data-adm-theme`) berdiri sendiri dan tidak ada
 * hubungannya dengan yang ini. Keduanya sengaja terpisah: petugas boleh
 * memakai panel gelap sambil tetap membaca portal publik dalam tema terang,
 * dan sebaliknya.
 */

import { OWN_CHROME_ROUTES } from './layoutChrome';

export type SiteTheme = 'day' | 'night';

export const SITE_THEME_KEY = 'aiais_site_theme';

/** Nama peristiwa perubahan tema; dipakai hook di `siteTheme.ts`. */
export const SITE_THEME_EVENT = 'site-theme';

/** Warna bilah peramban per tema; dipakai `PenyetelTema` memutakhirkan meta. */
export const SITE_THEME_COLOR: Record<SiteTheme, string> = {
  day: '#0b1e5b',
  night: '#030712',
};

/**
 * Skrip yang harus jalan SEBELUM halaman digambar.
 *
 * Tanpa ini, pemakai tema malam melihat kedipan putih setiap kali halaman
 * dimuat: CSS menetapkan tema terang sebagai bawaan, dan koreksinya baru
 * datang setelah React hidrasi.
 *
 * HARUS dirender dari LAYOUT AKAR (`app/layout.tsx`). Peramban hanya
 * menjalankan <script> yang ikut terkirim pada HTML dokumen pertama; yang
 * dirender React di klien tidak pernah dieksekusi — alasan yang sama sudah
 * dijelaskan panjang lebar di `components/admin/themeShared.ts`.
 *
 * Ia ikut memeriksa lintasan halaman. Rute ber-chrome sendiri (`/admin`,
 * `/app`, `/aplikasi`, `/posko-nataru`, `/absensi`, `/tourism`) punya tata
 * warnanya masing-masing; kulit malam portal tidak boleh menyentuhnya. Daftar
 * rutenya diambil dari `layoutChrome.ts` supaya tidak ada salinan kedua yang
 * perlahan menyimpang. Pemeriksaan yang sama diulang `PenyetelTema` untuk
 * perpindahan halaman di sisi klien, karena skrip ini hanya jalan sekali.
 */
export const SITE_THEME_INIT_SCRIPT = `
try {
  var p = location.pathname;
  var own = ${JSON.stringify(OWN_CHROME_ROUTES)}.some(function (b) {
    return p === b || p.indexOf(b + '/') === 0;
  });
  var t = localStorage.getItem('${SITE_THEME_KEY}');
  document.documentElement.dataset.siteTheme = (!own && t === 'night') ? 'night' : 'day';
} catch (e) {
  document.documentElement.dataset.siteTheme = 'day';
}
`;
