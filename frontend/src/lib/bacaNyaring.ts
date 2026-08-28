'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useBahasa } from './bahasa';
import { KODE_LOKAL, type Bahasa } from './bahasaShared';

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

/**
 * Suara terbaik yang tersedia untuk bahasa yang sedang aktif.
 *
 * Bahasanya WAJIB ikut pilihan pemakai, bukan dipatok Indonesia. Membacakan
 * halaman berbahasa Inggris dengan suara Indonesia menghasilkan bunyi yang
 * tidak dapat dimengerti siapa pun — dan justru pemakai tunanetra, yang paling
 * bergantung pada fitur ini, yang menanggungnya.
 *
 * Bahasa lain tetap dipakai sebagai cadangan: sebagian peramban di Indonesia
 * tidak memasang satu pun suara Inggris, dan suara yang salah masih lebih
 * berguna daripada diam.
 */
function pilihSuara(bahasa: Bahasa): SpeechSynthesisVoice | null {
  const semua = window.speechSynthesis.getVoices();
  if (!semua.length) return null;

  // Peramban menuliskan `lang` dengan pemisah yang berbeda-beda: "en-US" di
  // Chrome, "en_US" di sebagian mesin Android. Disamakan sekali di sini.
  const kode = (s: SpeechSynthesisVoice) => s.lang.toLowerCase().replace('_', '-');

  const penuh = KODE_LOKAL[bahasa].toLowerCase(); // id-id | en-us
  const pokok = bahasa; // id | en

  /* Suara lokal (terpasang di perangkat) didahulukan atas suara awan. Bukan
     soal selera: suara awan diam saja ketika jaringan bandara sedang padat,
     dan pemakai yang bergantung pada baca-nyaring justru mendapat halaman
     yang bisu tanpa penjelasan. */
  const urut = (daftar: SpeechSynthesisVoice[]) =>
    daftar.slice().sort((a, b) => Number(b.localService) - Number(a.localService));

  // Aksen yang persis (en-US untuk Inggris, id-ID untuk Indonesia) lebih dulu,
  // baru varian lain dari bahasa yang sama (en-GB, en-AU, ...).
  const tepat = urut(semua.filter((s) => kode(s) === penuh));
  if (tepat.length) return tepat[0];

  const sebahasa = urut(semua.filter((s) => kode(s).startsWith(`${pokok}-`) || kode(s) === pokok));
  if (sebahasa.length) return sebahasa[0];

  /* Bahasa lain sebagai cadangan terakhir: sebagian peramban di Indonesia
     tidak memasang satu pun suara Inggris, dan aksen yang salah masih lebih
     berguna daripada diam. */
  const lain = bahasa === 'id' ? 'en' : 'id';
  return urut(semua.filter((s) => kode(s).startsWith(lain)))[0] ?? semua[0] ?? null;
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
  bahasa: Bahasa,
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
    ucapan.lang = KODE_LOKAL[bahasa];
    const suara = pilihSuara(bahasa);
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

/* ------------------------------------------------------------------ */
/*  Ucapan lepas — dipakai pembacaan yang mengikuti kursor              */
/* ------------------------------------------------------------------ */

/**
 * Membacakan satu potong teks, menggantikan apa pun yang sedang diucapkan.
 *
 * Berbeda dari `useBacaNyaring` yang mengantre seluruh halaman, fungsi ini
 * melayani pembacaan per elemen: satuannya pendek, datang bertubi-tubi saat
 * kursor menyapu halaman, dan yang TERBARU selalu menang.
 *
 * `cancel()` di awal itu wajib, bukan kehati-hatian berlebih: `speak()`
 * MENUMPUK ke antrean alih-alih menggantikan, sehingga tanpa itu menyapu
 * sepuluh paragraf berarti mendengarkan kesepuluhnya berurutan sampai habis —
 * persis kebalikan dari yang diinginkan pemakai.
 *
 * Fungsi tingkat modul, bukan hook: pemanggilnya sebuah pendengar peristiwa
 * DOM yang hidup di luar daur render React.
 */
export function ucapkanSekali(teks: string, bahasa: Bahasa) {
  if (!adaSintesis()) return;

  window.speechSynthesis.cancel();

  const bersih = teks.replace(/\s+/g, ' ').trim();
  if (!bersih) return;

  /* Tetap dipenggal meski satuannya sudah pendek. Chrome memutus ucapan
     panjang di tengah jalan — cacat yang sama yang menjadi alasan
     `MAKS_POTONGAN` ada — dan satu paragraf panjang dapat melampauinya. */
  const suara = pilihSuara(bahasa);

  for (const bagian of penggal(bersih)) {
    const ucapan = new SpeechSynthesisUtterance(bagian);
    ucapan.lang = KODE_LOKAL[bahasa];
    if (suara) ucapan.voice = suara;
    window.speechSynthesis.speak(ucapan);
  }
}

/** Menghentikan ucapan apa pun yang sedang berjalan. */
export function hentikanUcapan() {
  if (!adaSintesis()) return;
  window.speechSynthesis.cancel();
}

/**
 * Daftar bahasa yang benar-benar punya suara di perangkat ini.
 *
 * Dibaca lewat `useSyncExternalStore`, bukan `useState` yang diisi dari dalam
 * efek: mengisi state secara langsung di badan efek memicu render bertingkat,
 * dan daftar suara memang persis berbentuk sumber luar — ia dimuat peramban
 * secara asinkron dan mengabarkan perubahannya lewat `voiceschanged`.
 *
 * Mengembalikan STRING, bukan larik: `useSyncExternalStore` membandingkan
 * hasilnya dengan `===`, dan larik baru pada tiap panggilan berarti render tak
 * berujung. Bentuknya "en,id" — kode dua huruf, unik, terurut, sehingga
 * nilainya sama persis selama daftar suaranya tidak berubah.
 *
 * Sebelumnya fungsi ini hanya menjawab ada-tidaknya suara Indonesia. Sejak
 * portal dwibahasa itu tidak cukup: pemakai Inggris di perangkat tanpa suara
 * Inggris menghadapi persoalan yang sama persis.
 */
function cuplikanSuara(): string {
  if (!adaSintesis()) return 'tak-didukung';
  const semua = window.speechSynthesis.getVoices();
  if (!semua.length) return 'belum-dimuat';

  const kode = new Set(semua.map((s) => s.lang.toLowerCase().slice(0, 2)));
  return [...kode].sort().join(',');
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
  /** Benar bila perangkat tidak punya suara untuk bahasa yang sedang aktif. */
  tanpaSuaraBahasa: boolean;
  mulai: () => void;
  jeda: () => void;
  lanjut: () => void;
  henti: () => void;
};

export function useBacaNyaring(): BacaNyaring {
  const pathname = usePathname();
  const bahasa = useBahasa();
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

    jalankanAntrean(penggal(teks), bahasa, dihentikan, () => {
      setSedangBaca(false);
      setTerjeda(false);
    });
  }, [bahasa]);

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
    tanpaSuaraBahasa:
      keadaanSuara !== 'tak-didukung' &&
      keadaanSuara !== 'belum-dimuat' &&
      !keadaanSuara.split(',').includes(bahasa),
    mulai,
    jeda,
    lanjut,
    henti,
  };
}
