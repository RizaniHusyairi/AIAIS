/**
 * Kategori informasi publik PPID untuk panel admin.
 *
 * Daftarnya DITURUNKAN dari [[publicInfoData]] — arsip halaman v1 yang
 * provenansnya tercatat di kepala berkas itu — bukan diketik ulang di sini.
 * Salinan kedua akan menyimpang begitu satu sisi disunting, dan kategori adalah
 * nilai yang dipakai halaman publik untuk mengelompokkan dokumen: nama yang
 * meleset satu huruf memunculkan akordeon kembar bagi pengunjung.
 *
 * Dua ejaan di bawah memang keliru pada sumbernya — "Survey Kepuasan" dan
 * "Peraturan Kementrian Perhubungan…" — dan sengaja dipertahankan supaya
 * kategori yang sudah tersimpan di basis data tetap cocok. Membetulkannya di
 * sini akan memecah kelompok yang selama ini utuh.
 *
 * Backend TIDAK mengunci daftar ini: `PeriodicDocument` dan
 * `EvergreenInformation` menerima kategori sebagai teks bebas, dan itu
 * keputusan sadar agar petugas dapat menambah kelompok baru tanpa rilis kode.
 * Daftar ini hanya menyeragamkan ejaan pada pilihan yang lazim.
 */

import { INFO_BERKALA, INFO_SETIAP_SAAT } from './publicInfoData';

/** Enam kategori Informasi Berkala sebagaimana tayang di portal v1. */
export const KATEGORI_BERKALA: string[] = INFO_BERKALA.map((g) => g.title);

/** Enam kategori Informasi Setiap Saat sebagaimana tayang di portal v1. */
export const KATEGORI_SETIAP_SAAT: string[] = INFO_SETIAP_SAAT.map((g) => g.title);

/**
 * Kategori resmi digabung dengan yang benar-benar ada di basis data.
 *
 * Yang resmi didahulukan agar urutan pilihannya tetap sama dari hari ke hari.
 * Perbandingannya tak peka huruf besar-kecil: kategori dari data yang hanya
 * berbeda kapitalisasi bukan kategori baru, dan menampilkannya sebagai chip
 * kedua justru mengundang percabangan yang hendak dicegah daftar ini.
 */
export function gabungKategori(resmi: string[], adaDiData: string[]): string[] {
  const dikenal = new Set(resmi.map((k) => k.toLowerCase()));
  const tambahan = adaDiData
    .filter((k) => k && !dikenal.has(k.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'id'));

  return [...resmi, ...tambahan];
}
