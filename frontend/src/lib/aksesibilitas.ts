'use client';

import { useSyncExternalStore } from 'react';
import {
  A11Y_BAWAAN,
  A11Y_EVENT as EVENT,
  A11Y_KEY,
  normalkan,
  type Aksesibilitas,
} from './aksesibilitasShared';

/**
 * Penyetelan aksesibilitas pilihan pengunjung.
 *
 * Polanya menyalin `siteTheme.ts` — atribut `data-a11y-*` pada <html> yang
 * memilih aturan CSS, bukan state React, sehingga menyalakan kontras tinggi
 * tidak me-render ulang satu halaman pun. Dua sifat yang diwarisi dan penting
 * untuk dipertahankan:
 *
 * 1. TOKO INI MENYIMPAN PILIHAN PEMAKAI, BUKAN ATRIBUT YANG SEDANG TERPASANG.
 *    Atribut DOM sepenuhnya milik `PenyetelAksesibilitas`. Satu penulis, tidak
 *    ada tarik-menarik.
 *
 * 2. `bacaPilihan` HARUS mengembalikan rujukan objek yang sama selama isinya
 *    tidak berubah. `useSyncExternalStore` membandingkan hasilnya dengan `===`;
 *    mengurai ulang JSON pada setiap panggilan menghasilkan objek baru setiap
 *    kali, dan React akan me-render tanpa henti. Itu sebabnya hasilnya
 *    dicadangkan pada variabel modul di bawah.
 */

export {
  A11Y_KEY,
  A11Y_BAWAAN,
  SKALA_TEKS,
  UKURAN_TEKS,
  semuanyaBawaan,
  type Aksesibilitas,
  type UkuranTeks,
} from './aksesibilitasShared';

/** Cadangan pilihan; `undefined` berarti belum pernah dibaca dari penyimpanan. */
let pilihan: Aksesibilitas | undefined;

function bacaPilihan(): Aksesibilitas {
  if (pilihan === undefined) {
    try {
      const mentah = localStorage.getItem(A11Y_KEY);
      pilihan = normalkan(mentah ? JSON.parse(mentah) : null);
    } catch {
      // Mode penyamaran, penyimpanan penuh, atau JSON rusak.
      pilihan = A11Y_BAWAAN;
    }
  }
  return pilihan;
}

/** Mengubah sebagian penyetelan; sisanya dibiarkan apa adanya. */
export function setAksesibilitas(tambalan: Partial<Aksesibilitas>) {
  pilihan = normalkan({ ...bacaPilihan(), ...tambalan });
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(pilihan));
  } catch {
    // Penyetelannya tetap berlaku untuk sesi ini, hanya tidak diingat.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Mengembalikan seluruh penyetelan ke bawaan. */
export function resetAksesibilitas() {
  pilihan = A11Y_BAWAAN;
  try {
    // Dihapus, bukan ditimpa dengan bawaan: pengunjung yang tidak menyetel
    // apa pun tidak meninggalkan jejak di peramban orang lain — layar portal
    // ini juga berdiri di area publik terminal.
    localStorage.removeItem(A11Y_KEY);
  } catch {
    // Sama seperti di atas.
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);

  // `storage` hanya menyala di tab LAIN, jadi ia melengkapi peristiwa di atas
  // alih-alih menggandakannya.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== A11Y_KEY) return;
    try {
      pilihan = normalkan(e.newValue ? JSON.parse(e.newValue) : null);
    } catch {
      pilihan = A11Y_BAWAAN;
    }
    cb();
  };

  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
};

// Di server penyimpanan itu tidak terjangkau. Bawaan adalah yang diasumsikan
// skrip anti-kedip juga, sehingga hidrasinya cocok.
const getServerSnapshot = (): Aksesibilitas => A11Y_BAWAAN;

export function useAksesibilitas(): Aksesibilitas {
  return useSyncExternalStore(subscribe, bacaPilihan, getServerSnapshot);
}
