'use client';

import { useSyncExternalStore } from 'react';

/**
 * Bahasa portal publik: Indonesia (`id`) atau Inggris (`en`).
 *
 * Polanya menyalin `siteTheme.ts` baris demi baris, dan kesamaan itu disengaja
 * — ini preferensi pemakai keempat di portal setelah tema situs, tema panel,
 * dan penyetelan aksesibilitas. Satu pola yang sama berarti satu tempat untuk
 * dipahami.
 *
 * PILIHAN TINGGAL DI `localStorage`, ATRIBUT <html> MILIK `PenyetelBahasa`.
 * Satu penulis, tidak ada tarik-menarik.
 *
 * Nilai yang terbaca dicadangkan pada variabel modul. Itu bukan pengoptimalan:
 * `useSyncExternalStore` membandingkan hasil `getSnapshot` dengan `===`, jadi
 * membaca ulang penyimpanan pada tiap panggilan sudah cukup untuk render tak
 * berujung bila kelak nilainya berupa objek. Alasan yang sama tertulis di
 * `aksesibilitas.ts`.
 */

export { BAHASA_KEY, KODE_LOKAL, BAHASA_BAWAAN, type Bahasa } from './bahasaShared';

import {
  BAHASA_KEY,
  BAHASA_BAWAAN,
  BAHASA_EVENT as EVENT,
  normalkanBahasa,
  type Bahasa,
} from './bahasaShared';

/** Cadangan pilihan; `undefined` berarti belum pernah dibaca dari penyimpanan. */
let pilihan: Bahasa | undefined;

function bacaPilihan(): Bahasa {
  if (pilihan === undefined) {
    try {
      pilihan = normalkanBahasa(localStorage.getItem(BAHASA_KEY));
    } catch {
      // Mode penyamaran atau penyimpanan penuh.
      pilihan = BAHASA_BAWAAN;
    }
  }
  return pilihan;
}

export function setBahasa(bahasa: Bahasa) {
  pilihan = bahasa;
  try {
    localStorage.setItem(BAHASA_KEY, bahasa);
  } catch {
    // Bahasanya tetap berlaku untuk sesi ini, hanya tidak diingat. Bukan
    // alasan untuk menggagalkan apa pun.
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  // Pemakai kerap membuka portal di beberapa tab sekaligus. `storage` hanya
  // menyala di tab LAIN, jadi ia melengkapi peristiwa di atas alih-alih
  // menggandakannya.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== BAHASA_KEY) return;
    pilihan = normalkanBahasa(e.newValue);
    cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
};

// Di server penyimpanan itu tidak terjangkau; Indonesia adalah bawaannya. Sama
// dengan yang diasumsikan skrip di layout akar, sehingga hidrasinya cocok.
const getServerSnapshot = (): Bahasa => BAHASA_BAWAAN;

export function useBahasa(): Bahasa {
  return useSyncExternalStore(subscribe, bacaPilihan, getServerSnapshot);
}
