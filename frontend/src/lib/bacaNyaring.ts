'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Baca nyaring isi halaman lewat Web Speech API peramban.
 *
 * TIDAK ADA layanan luar yang dihubungi: seluruh sintesis suara dikerjakan
 * perangkat pengunjung sendiri. Untuk portal pemerintah itu bukan sekadar
 * penghematan, melainkan syarat — teks halaman tidak boleh dikirim ke server
 * pihak ketiga hanya untuk dibacakan.
 *
 * KETERBATASAN YANG HARUS DISAMPAIKAN APA ADANYA KEPADA PEMAKAI: ketersediaan
 * dan kualitas suara Indonesia sepenuhnya bergantung pada perangkat dan sistem
 * operasinya. Android dan Windows umumnya menyediakannya; sebagian iOS tidak,
 * dan di sana teks Indonesia akan dibacakan dengan pelafalan Inggris. Panel
 * yang memakai hook ini menyebutkan hal itu, bukan membiarkannya menjadi
 * kejutan.
 */

/** Sumber teks; sama dengan sasaran tautan lompat isi di layout akar. */
const ID_KONTEN = 'konten-utama';

/**
 * Panjang maksimum satu ucapan.
 *
 * Chrome memutus `SpeechSynthesisUtterance` yang terlalu panjang di tengah
 * jalan — cacat lama yang tidak pernah diperbaiki. Karena itu teksnya
 * dipenggal per kalimat dan diantrekan satu per satu, bukan diserahkan
 * sekaligus.
 */
const MAKS_POTONGAN = 200;

/** Batas atas keseluruhan; halaman daftar yang sangat panjang tidak layak
 *  menjadi antrean ribuan potongan yang tak mungkin diselesaikan siapa pun. */
const MAKS_TEKS = 20_000;

/** Elemen yang tidak boleh ikut terbaca: hiasan, kanvas, dan navigasi. */
const BUANG = 'script, style, canvas, svg, nav, [aria-hidden="true"], .lewati-tautan';

function ambilTeks(): string {
  const sumber = document.getElementById(ID_KONTEN);
  if (!sumber) return '';

  // Disalin dulu: membuang simpul dari DOM yang sebenarnya akan merusak
  // halaman yang sedang dilihat pemakai.
  const salinan = sumber.cloneNode(true) as HTMLElement;
  salinan.querySelectorAll(BUANG).forEach((el) => el.remove());

  return (salinan.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAKS_TEKS);
}

function penggal(teks: string): string[] {
  const potongan: string[] = [];
  let kini = '';

  // Dipecah pada akhir kalimat lebih dulu supaya jedanya jatuh di tempat yang
  // wajar; kalimat yang tetap kepanjangan baru dipotong pada spasi.
  for (const kalimat of teks.split(/(?<=[.!?])\s+/)) {
    if ((kini + ' ' + kalimat).trim().length <= MAKS_POTONGAN) {
      kini = (kini + ' ' + kalimat).trim();
      continue;
    }
    if (kini) potongan.push(kini);

    if (kalimat.length <= MAKS_POTONGAN) {
      kini = kalimat;
      continue;
    }
    let sisa = kalimat;
    while (sisa.length > MAKS_POTONGAN) {
      const batas = sisa.lastIndexOf(' ', MAKS_POTONGAN);
      const potong = batas > 0 ? batas : MAKS_POTONGAN;
      potongan.push(sisa.slice(0, potong));
      sisa = sisa.slice(potong).trim();
    }
    kini = sisa;
  }

  if (kini) potongan.push(kini);
  return potongan;
}

/** Suara terbaik yang tersedia: Indonesia dulu, lalu Inggris, lalu apa pun. */
function pilihSuara(): SpeechSynthesisVoice | null {
  const semua = window.speechSynthesis.getVoices();
  if (!semua.length) return null;
  return (
    semua.find((s) => s.lang.toLowerCase().startsWith('id')) ??
    semua.find((s) => s.lang.toLowerCase().startsWith('en')) ??
    semua[0] ??
    null
  );
}

/**
 * Menjalankan antrean sampai habis.
 *
 * Fungsi tingkat modul, bukan `useCallback` yang memanggil dirinya sendiri:
 * rekursi di dalam hook membuat variabelnya diacu sebelum dideklarasikan, dan
 * antrean ini memang tidak bergantung pada satu pun nilai React.
 */
function jalankanAntrean(
  potongan: string[],
  dihentikan: { current: boolean },
  selesai: () => void,
) {
  let i = 0;

  const berikutnya = () => {
    const teks = potongan[i];
    if (teks === undefined) {
      selesai();
      return;
    }

    const ucapan = new SpeechSynthesisUtterance(teks);
    ucapan.lang = 'id-ID';
    const suara = pilihSuara();
    if (suara) ucapan.voice = suara;

    ucapan.onend = () => {
      if (dihentikan.current) return;
      i += 1;
      berikutnya();
    };

    // Suara yang gagal di tengah antrean tidak boleh menggantungkan tombolnya
    // pada keadaan "sedang membaca" selamanya.
    ucapan.onerror = () => {
      if (dihentikan.current) return;
      selesai();
    };

    window.speechSynthesis.speak(ucapan);
  };

  berikutnya();
}

const adaSintesis = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Keadaan dukungan suara sebagai SATU string.
 *
 * Dibaca lewat `useSyncExternalStore`, bukan `useState` yang diisi dari dalam
 * efek: mengisi state secara langsung di badan efek memicu render bertingkat,
 * dan daftar suara memang persis berbentuk sumber luar — ia dimuat peramban
 * secara asinkron dan mengabarkan perubahannya lewat `voiceschanged`.
 *
 * Nilainya string, bukan objek, supaya perbandingan `===` milik
 * `useSyncExternalStore` tidak selalu menganggapnya berubah.
 */
function cuplikanSuara(): string {
  if (!adaSintesis()) return 'tak-didukung';
  const semua = window.speechSynthesis.getVoices();
  if (!semua.length) return 'belum-dimuat';
  return semua.some((s) => s.lang.toLowerCase().startsWith('id')) ? 'ada-id' : 'tanpa-id';
}

function langgananSuara(cb: () => void) {
  if (!adaSintesis()) return () => {};
  window.speechSynthesis.addEventListener('voiceschanged', cb);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', cb);
}

// Di server tidak ada sintesis suara sama sekali. Kendalinya memang hanya
// dirender di dalam panel, yang tidak pernah dirender di server.
const cuplikanServer = () => 'tak-didukung';

export type BacaNyaring = {
  didukung: boolean;
  sedangBaca: boolean;
  terjeda: boolean;
  /** Benar bila perangkat ini tidak punya satu pun suara berbahasa Indonesia. */
  tanpaSuaraIndonesia: boolean;
  mulai: () => void;
  jeda: () => void;
  lanjut: () => void;
  henti: () => void;
};

export function useBacaNyaring(): BacaNyaring {
  const pathname = usePathname();
  const [sedangBaca, setSedangBaca] = useState(false);
  const [terjeda, setTerjeda] = useState(false);

  const keadaanSuara = useSyncExternalStore(langgananSuara, cuplikanSuara, cuplikanServer);

  /** Menandai penghentian yang disengaja, supaya `onend` tidak melanjutkan. */
  const dihentikan = useRef(false);

  const henti = useCallback(() => {
    if (!adaSintesis()) return;
    dihentikan.current = true;
    window.speechSynthesis.cancel();
    setSedangBaca(false);
    setTerjeda(false);
  }, []);

  const mulai = useCallback(() => {
    if (!adaSintesis()) return;

    const teks = ambilTeks();
    if (!teks) return;

    // Sisa antrean sebelumnya harus benar-benar bersih: `speak()` menumpuk,
    // tidak menggantikan.
    window.speechSynthesis.cancel();
    dihentikan.current = false;
    setSedangBaca(true);
    setTerjeda(false);

    jalankanAntrean(penggal(teks), dihentikan, () => {
      setSedangBaca(false);
      setTerjeda(false);
    });
  }, []);

  const jeda = useCallback(() => {
    if (!adaSintesis()) return;
    window.speechSynthesis.pause();
    setTerjeda(true);
  }, []);

  const lanjut = useCallback(() => {
    if (!adaSintesis()) return;
    window.speechSynthesis.resume();
    setTerjeda(false);
  }, []);

  // Berhenti saat pengunjung berpindah halaman. Tanpa ini suara halaman lama
  // terus mengoceh di atas halaman baru: `speechSynthesis` milik dokumen, dan
  // Next berpindah rute tanpa memuat ulang dokumen.
  useEffect(() => {
    return () => {
      if (!adaSintesis()) return;
      dihentikan.current = true;
      window.speechSynthesis.cancel();
    };
  }, [pathname]);

  return {
    didukung: keadaanSuara !== 'tak-didukung',
    sedangBaca,
    terjeda,
    tanpaSuaraIndonesia: keadaanSuara === 'tanpa-id',
    mulai,
    jeda,
    lanjut,
    henti,
  };
}
