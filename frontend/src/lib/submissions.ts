import type { SubmissionItem, SubmissionType } from '@/types';

/**
 * Bawaan tampilan pengajuan layanan bandara.
 *
 * Kolom judul tiap jenis bernama berbeda di basis data v1 — `business_name`,
 * `rental_name`, `license_name`, `ad_name`, `name`, `work_type`. Daftar di
 * bawah memetakan slug ke nama kolomnya, dan itu satu-satunya tempat
 * pemetaan itu ditulis di frontend.
 *
 * Pemetaannya TIDAK diambil dari backend meski bisa: nama kolom adalah rincian
 * penyimpanan, dan mengirimkannya lewat API publik mengundang penggunaan yang
 * mengikat tampilan pada bentuk tabel. Yang dikirim backend adalah LABEL-nya.
 */
export const KOLOM_JUDUL: Record<string, string> = {
  'tenant': 'business_name',
  'sewa': 'rental_name',
  'perizinan-usaha': 'license_name',
  'pengiklanan': 'ad_name',
  'beauty-contest': 'name',
  'izin-kerja': 'work_type',
};

export const KOLOM_JENIS: Record<string, string> = {
  'tenant': 'business_type',
  'sewa': 'rental_type',
  'perizinan-usaha': 'license_type',
  'pengiklanan': 'ad_type',
  'beauty-contest': 'lelang_type',
  'izin-kerja': 'work_type',
};

export const KOLOM_LAINNYA: Record<string, string> = {
  'tenant': 'rental_more',
  'sewa': 'rental_more',
  'perizinan-usaha': 'license_more',
};

/** Baca nilai teks satu kolom dengan aman dari bentuk yang terbuka. */
export function teks(item: SubmissionItem, kolom: string | undefined): string {
  if (!kolom) return '';
  const nilai = item[kolom];

  return typeof nilai === 'string' || typeof nilai === 'number' ? String(nilai) : '';
}

export function judul(item: SubmissionItem, slug: string): string {
  return teks(item, KOLOM_JUDUL[slug]) || '(tanpa judul)';
}

export function jenis(item: SubmissionItem, slug: string): string {
  return teks(item, KOLOM_JENIS[slug]);
}

/**
 * Medan yang dikirim formulir untuk satu jenis.
 *
 * Judul dan jenis bisa merujuk kolom yang SAMA (izin kerja memakai `work_type`
 * untuk keduanya). Set dipakai supaya kolom itu tidak dikirim dua kali —
 * pengiriman ganda pada FormData menghasilkan larik, dan validasi `string`
 * di backend menolaknya.
 */
export function medanFormulir(tipe: SubmissionType): string[] {
  const set = new Set<string>([
    KOLOM_JUDUL[tipe.slug],
    KOLOM_JENIS[tipe.slug],
    ...(tipe.has_more && KOLOM_LAINNYA[tipe.slug] ? [KOLOM_LAINNYA[tipe.slug]] : []),
    ...tipe.extra.map((e) => e.field),
  ]);

  return [...set].filter(Boolean);
}

export const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
