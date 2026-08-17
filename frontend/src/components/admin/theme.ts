'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tema panel admin.
 *
 * Nilainya tinggal di atribut `data-adm-theme` pada <html>, bukan di state
 * React: seluruh warna panel berasal dari variabel CSS yang dipilih oleh
 * atribut itu, sehingga pergantian tema tidak perlu me-render ulang apa pun.
 * Hook di bawah hanya untuk segelintir tempat yang warnanya memang harus
 * dihitung di JavaScript — grafik Recharts dan warna aksen yang dikirim
 * halaman sebagai heks.
 */
/*
 * Konstantanya tinggal di 'themeShared.ts' yang TIDAK bertanda 'use client'.
 * Berkas ini bertanda demikian karena berisi hook, dan modul klien membuat
 * seluruh ekspornya menjadi rujukan klien saat diimpor Server Component.
 * Diekspor ulang di sini supaya kode klien yang sudah ada tidak perlu diubah.
 */
export { ADMIN_THEME_KEY, THEME_INIT_SCRIPT, type AdminTheme } from './themeShared';

import { ADMIN_THEME_KEY, ADMIN_THEME_EVENT as EVENT, type AdminTheme } from './themeShared';

export function setAdminTheme(theme: AdminTheme) {
  document.documentElement.dataset.admTheme = theme;
  try {
    localStorage.setItem(ADMIN_THEME_KEY, theme);
  } catch {
    // Mode penyamaran atau penyimpanan penuh — temanya tetap berlaku untuk
    // sesi ini, hanya tidak diingat. Bukan alasan untuk menggagalkan apa pun.
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

const getSnapshot = (): AdminTheme =>
  document.documentElement.dataset.admTheme === 'dark' ? 'dark' : 'light';

// Di server atribut itu belum ada; terang adalah bawaannya.
const getServerSnapshot = (): AdminTheme => 'light';

export function useAdminTheme(): AdminTheme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Menggelapkan warna aksen untuk tema terang.
 *
 * Halaman mengirim aksen sebagai heks cerah (mis. `#22d3ee`) yang dipilih
 * untuk latar gelap. Dipakai apa adanya sebagai warna teks di atas kertas
 * putih, warna itu nyaris tak terbaca. Latarnya tetap memakai heks asli
 * dengan alfa rendah — justru semburat cerahnya yang diinginkan di sana.
 */
export function aksenTeks(hex: string, theme: AdminTheme): string {
  if (theme === 'dark') return hex;

  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;

  const n = parseInt(m[1], 16);
  const gelapkan = (c: number) => Math.round(c * 0.62);

  const r = gelapkan((n >> 16) & 0xff);
  const g = gelapkan((n >> 8) & 0xff);
  const b = gelapkan(n & 0xff);

  return `rgb(${r} ${g} ${b})`;
}
