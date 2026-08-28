/**
 * Konstanta pilihan bahasa portal — AMAN dipakai Server Component maupun klien.
 *
 * Berkas ini SENGAJA tidak bertanda `'use client'`, persis seperti
 * `siteThemeShared.ts` dan `aksesibilitasShared.ts`. Begitu sebuah modul
 * ditandai klien, seluruh ekspornya berubah menjadi rujukan klien ketika
 * diimpor dari Server Component — termasuk skrip di bawah, yang justru harus
 * ikut terkirim pada HTML dokumen pertama. Kesalahan yang sama pernah berujung
 * HTTP 500 di repo ini.
 */

export type Bahasa = 'id' | 'en';

export const BAHASA_KEY = 'aiais_bahasa';

/** Nama peristiwa perubahan bahasa; dipakai hook di `bahasa.ts`. */
export const BAHASA_EVENT = 'aiais-bahasa';

/**
 * Indonesia adalah bawaannya, bukan hasil menebak `navigator.language`.
 *
 * Ini portal resmi instansi pemerintah: bahasa negara adalah keadaan normal,
 * dan Inggris adalah pilihan sadar pengunjung. Menebak dari peramban juga akan
 * membuat gambar pertama berbeda-beda per pengunjung, sementara HTML yang
 * dirender Next di server hanya satu.
 */
export const BAHASA_BAWAAN: Bahasa = 'id';

/** Kode BCP 47 untuk atribut `lang` dan seluruh pemformatan `Intl`. */
export const KODE_LOKAL: Record<Bahasa, string> = {
  id: 'id-ID',
  en: 'en-US',
};

/**
 * Membersihkan apa pun yang terbaca dari penyimpanan menjadi bahasa yang sah.
 *
 * Isi `localStorage` bukan data tepercaya: ia bisa berasal dari versi portal
 * yang lebih lama, dari tab lain, atau dari suntingan tangan.
 */
export function normalkanBahasa(mentah: unknown): Bahasa {
  return mentah === 'en' ? 'en' : 'id';
}

/**
 * Skrip yang harus jalan SEBELUM halaman digambar.
 *
 * Yang diperbaikinya bukan warna melainkan atribut `lang` pada <html>: nilainya
 * dirender server sebagai `id-ID`, dan tanpa skrip ini pembaca layar mulai
 * melafalkan halaman berbahasa Inggris dengan fonem Indonesia. Pembaca layar
 * tidak menunggu hidrasi.
 *
 * HARUS dirender dari LAYOUT AKAR. Peramban hanya menjalankan <script> yang
 * ikut terkirim pada HTML dokumen pertama; yang dirender React di klien tidak
 * pernah dieksekusi — alasan yang sama sudah dijelaskan panjang lebar di
 * `siteThemeShared.ts`.
 *
 * Berbeda dari skrip tema, di sini TIDAK ada pemeriksaan lintasan: bahasa
 * berlaku sama di seluruh rute portal.
 */
export const BAHASA_INIT_SCRIPT = `
try {
  var b = localStorage.getItem('${BAHASA_KEY}') === 'en' ? 'en' : 'id';
  var e = document.documentElement;
  e.lang = ${JSON.stringify(KODE_LOKAL)}[b];
  e.dataset.bahasa = b;
} catch (e) {
  /* Mode penyamaran atau penyimpanan penuh. Portal tampil dalam bahasa
     bawaannya — tidak apa-apa, dan tidak boleh menggagalkan apa pun. */
}
`;
