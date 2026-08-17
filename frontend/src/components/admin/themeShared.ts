/**
 * Konstanta tema panel — AMAN dipakai Server Component maupun klien.
 *
 * Berkas ini SENGAJA tidak bertanda `'use client'`. `theme.ts` bertanda
 * demikian karena berisi hook, dan begitu sebuah modul ditandai klien, seluruh
 * ekspornya berubah menjadi rujukan klien ketika diimpor dari Server Component
 * — termasuk konstanta biasa seperti `THEME_INIT_SCRIPT`.
 *
 * Pemisahan yang sama sudah dilakukan pada `lib/settingsShared.ts` karena
 * alasan yang persis sama; di sana akibatnya halaman membalas HTTP 500.
 */

export type AdminTheme = 'light' | 'dark';

export const ADMIN_THEME_KEY = 'aiais_admin_theme';

/** Nama peristiwa perubahan tema; dipakai hook di `theme.ts`. */
export const ADMIN_THEME_EVENT = 'adm-theme';

/**
 * Skrip yang harus jalan SEBELUM halaman digambar.
 *
 * Tanpa ini, pemakai tema gelap melihat kedipan putih setiap kali panel
 * dimuat: CSS menetapkan tema terang sebagai bawaan, dan koreksinya baru
 * datang setelah React hidrasi.
 *
 * HARUS dirender dari LAYOUT AKAR (`app/layout.tsx`), bukan dari layout
 * `/admin`. Peramban hanya menjalankan <script> yang ikut terkirim pada HTML
 * dokumen pertama; yang dirender React di klien tidak pernah dieksekusi.
 *
 * Menaruhnya di `admin/layout.tsx` tidak cukup, bahkan sebagai Server
 * Component: segmen layout itu tetap dirender di klien ketika pengunjung
 * berpindah dari halaman publik ke `/admin`, sehingga skripnya dilewati dan
 * atribut temanya tidak pernah tersetel. Layout akar tidak pernah dirender
 * ulang saat berpindah halaman, jadi hanya di sana tag ini dapat diandalkan.
 */
export const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('${ADMIN_THEME_KEY}');
  document.documentElement.dataset.admTheme = t === 'dark' ? 'dark' : 'light';
} catch (e) {
  document.documentElement.dataset.admTheme = 'light';
}
`;
