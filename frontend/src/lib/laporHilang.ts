/**
 * Pilihan pada formulir Lapor Kehilangan Barang.
 *
 * ────────────────────────────────────────────────────────────────────────
 * CERMIN KONSTANTA BACKEND — HARUS SAMA PERSIS
 *
 *   KATEGORI  ↔  App\Models\LostReport::CATEGORIES
 *   AREA      ↔  App\Models\LostReport::AREAS
 *
 * Backend memvalidasi keduanya dengan aturan `in:`, jadi nilai yang menyimpang
 * satu huruf pun ditolak 422 — dan pelapor melihat "kategori tidak dikenali"
 * pada pilihan yang tersedia di layarnya sendiri.
 *
 * Duplikasi ini memang pola yang berlaku di portal (`HELP_CATEGORIES` di
 * `helpdesk.ts` mencerminkan `Complaint::CATEGORIES` dengan cara yang sama).
 * Kalau salah satu diubah, ubah pasangannya.
 * ────────────────────────────────────────────────────────────────────────
 */

export const KATEGORI_BARANG = [
  'Dokumen & Identitas',
  'Tas & Koper',
  'Elektronik',
  'Dompet & Kartu',
  'Perhiasan & Jam',
  'Pakaian',
  'Kunci',
  'Lainnya',
] as const;

/**
 * Area terminal.
 *
 * Nama gate mengikuti penamaan yang terbaca di terminal — A1, A2, A3, B1 —
 * bukan angka mentah yang dikirim FIDS. Pelapor mengingat papan yang dilihatnya,
 * bukan isi basis data.
 */
export const AREA_KEHILANGAN = [
  'Area Parkir & Drop-off',
  'Lobi Keberangkatan',
  'Area Check-in',
  'Pemeriksaan Keamanan (SCP)',
  'Ruang Tunggu',
  'Gate A1',
  'Gate A2',
  'Gate A3',
  'Gate B1',
  'Di Dalam Pesawat',
  'Area Pengambilan Bagasi',
  'Lobi Kedatangan',
  'Musala',
  'Toilet',
  'Area Komersial & Kantin',
  'Tidak Ingat / Lainnya',
] as const;

import type { LostReportStatus } from '@/types';

/**
 * Label dan warna status, dari sudut pandang pelapor.
 *
 * Kata-katanya sengaja tidak menyebut mekanisme di baliknya. Pelapor tidak
 * perlu tahu istilah "dicocokkan"; yang perlu ia tahu adalah apakah harus
 * datang ke bandara.
 */
export const STATUS_LAPORAN: Record<
  LostReportStatus,
  { label: string; warna: string; latar: string; jelas: string }
> = {
  submitted: {
    label: 'Laporan Diterima',
    warna: '#0369a1',
    latar: '#e0f2fe',
    jelas: 'Laporan Anda sudah masuk dan menunggu diperiksa petugas.',
  },
  searching: {
    label: 'Sedang Dicari',
    warna: '#a16207',
    latar: '#fef9c3',
    jelas: 'Petugas sedang mencocokkan laporan Anda dengan barang temuan.',
  },
  matched: {
    label: 'Kemungkinan Ditemukan',
    warna: '#15803d',
    latar: '#dcfce7',
    jelas:
      'Ada barang temuan yang cocok dengan ciri-ciri laporan Anda. Silakan datang ke pos layanan dengan membawa identitas untuk verifikasi.',
  },
  returned: {
    label: 'Sudah Diserahkan',
    warna: '#15803d',
    latar: '#dcfce7',
    jelas: 'Barang sudah diserahkan kepada pemiliknya.',
  },
  not_found: {
    label: 'Belum Ditemukan',
    warna: '#b91c1c',
    latar: '#fee2e2',
    jelas:
      'Pencarian belum membuahkan hasil. Laporan Anda tetap tersimpan — hubungi pos layanan bila ada keterangan tambahan.',
  },
};
