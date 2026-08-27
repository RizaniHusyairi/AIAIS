'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tema portal publik: siang (`day`) atau malam (`night`).
 *
 * Polanya menyalin `components/admin/theme.ts` — atribut `data-site-theme`
 * pada <html> yang memilih set variabel CSS, bukan state React, sehingga
 * pergantian tema tidak me-render ulang satu halaman pun. Yang berbeda hanya
 * satu hal, dan perbedaan itu penting:
 *
 * TOKO INI MENYIMPAN PILIHAN PEMAKAI, BUKAN ATRIBUT YANG SEDANG TERPASANG.
 *
 * Keduanya sengaja tidak selalu sama. Pada rute ber-chrome sendiri (`/admin`,
 * `/aplikasi`, ...) atributnya dipaksa `day` oleh `PenyetelTema` karena
 * halaman-halaman itu punya tata warnanya masing-masing. Kalau hook ini ikut
 * membaca atribut, pilihan malam pemakai akan hilang begitu ia mampir ke panel
 * admin lalu kembali ke beranda — atribut `day` terbaca sebagai "pemakai
 * memilih siang", dan tidak ada lagi yang bisa mengembalikannya.
 *
 * Karena itu: pilihan tinggal di `localStorage` (dicadangkan pada variabel
 * modul agar `getSnapshot` murah dan stabil), sedangkan atribut DOM sepenuhnya
 * milik `PenyetelTema`. Satu penulis, tidak ada tarik-menarik.
 */

export { SITE_THEME_KEY, SITE_THEME_COLOR, SITE_THEME_INIT_SCRIPT, type SiteTheme } from './siteThemeShared';

import { SITE_THEME_KEY, SITE_THEME_EVENT as EVENT, type SiteTheme } from './siteThemeShared';

/** Cadangan pilihan; `undefined` berarti belum pernah dibaca dari penyimpanan. */
let pilihan: SiteTheme | undefined;

function bacaPilihan(): SiteTheme {
  if (pilihan === undefined) {
    try {
      pilihan = localStorage.getItem(SITE_THEME_KEY) === 'night' ? 'night' : 'day';
    } catch {
      // Mode penyamaran atau penyimpanan penuh.
      pilihan = 'day';
    }
  }
  return pilihan;
}

export function setSiteTheme(theme: SiteTheme) {
  pilihan = theme;
  try {
    localStorage.setItem(SITE_THEME_KEY, theme);
  } catch {
    // Temanya tetap berlaku untuk sesi ini, hanya tidak diingat. Bukan alasan
    // untuk menggagalkan apa pun.
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  // Pemakai kerap membuka portal di beberapa tab sekaligus. `storage` hanya
  // menyala di tab LAIN, jadi ia melengkapi peristiwa di atas alih-alih
  // menggandakannya.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SITE_THEME_KEY) return;
    pilihan = e.newValue === 'night' ? 'night' : 'day';
    cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
};

// Di server penyimpanan itu tidak terjangkau; siang adalah bawaannya. Sama
// dengan yang diasumsikan skrip anti-kedip, sehingga hidrasinya cocok.
const getServerSnapshot = (): SiteTheme => 'day';

export function useSiteTheme(): SiteTheme {
  return useSyncExternalStore(subscribe, bacaPilihan, getServerSnapshot);
}
