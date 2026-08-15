/**
 * Pertanyaan yang sering diajukan — bawaan presentasi.
 *
 * ────────────────────────────────────────────────────────────────────────
 * Berkas ini TIDAK lagi memuat isi pertanyaan.
 *
 * Sepuluh pertanyaan beserta jawabannya kini datang dari API (`/faqs`), yang
 * membacanya dari tabel `faqs` warisan portal v1 — sumber yang sama dengan
 * yang selama ini tayang, dan yang dapat disunting petugas lewat panel admin.
 *
 * Daftar transkripsi sebelumnya dibuang karena basis datanya lengkap dan
 * lebih mutakhir: kesepuluh pertanyaannya cocok, dan satu di antaranya
 * ("Berapa tarif taksi bandara?") sudah disunting di panel sehingga berbeda
 * dari salinan statis. Menyimpan dua sumber untuk hal yang sama hanya
 * menunggu keduanya berbeda isi tanpa ada yang menyadarinya.
 *
 * Yang tersisa di sini murni pilihan tampilan: ikon per kategori. Kategori
 * sendiri datang dari data, karena petugas yang menentukannya.
 * ────────────────────────────────────────────────────────────────────────
 */

import {
  Plane, Building2, ClipboardList, MessageSquare, HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { FaqItem } from '@/types';

/** Semua kategori, untuk penyaring "Semua". */
export const SEMUA_KATEGORI = 'Semua';

/**
 * Ikon per kategori, dikunci pada nama sebagaimana tersimpan di basis data.
 *
 * Kategori yang belum punya entri memakai ikon bawaan — kategori baru yang
 * dibuat petugas tetap tampil wajar tanpa menyunting kode.
 */
const IKON_KATEGORI: Record<string, LucideIcon> = {
  'Penerbangan & Keberangkatan': Plane,
  'Fasilitas Bandara': Building2,
  'Layanan & Perizinan': ClipboardList,
  'Informasi Publik & Pengaduan': MessageSquare,
};

/** Bentuk siap tampil: isi dari API, ikon dan teks pencarian diturunkan. */
export type FaqTampil = {
  id: number;
  question: string;
  /** HTML dari editor panel admin; render lewat `SafeHtml`. */
  answerHtml: string;
  category: string;
  icon: LucideIcon;
  /**
   * Teks gabungan untuk pencarian.
   *
   * v1 memakai daftar kata kunci yang ditulis tangan per pertanyaan. Daftar
   * seperti itu ikut usang begitu jawabannya disunting, dan tidak punya kolom
   * di basis data. Menurunkannya dari pertanyaan + jawaban membuat pencarian
   * selalu selaras dengan isi yang sebenarnya tayang.
   */
  cariTeks: string;
};

/** Buang markah HTML, sisakan teksnya untuk keperluan pencarian. */
function teksSaja(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function gabungFaq(api: FaqItem): FaqTampil {
  return {
    id: api.id,
    question: api.question,
    answerHtml: api.answer,
    category: api.category,
    icon: IKON_KATEGORI[api.category] ?? HelpCircle,
    cariTeks: `${api.question} ${teksSaja(api.answer)}`.toLowerCase(),
  };
}

/** Daftar kategori yang benar-benar dipakai, diawali "Semua". */
export function kategoriDari(items: FaqTampil[]): string[] {
  return [SEMUA_KATEGORI, ...Array.from(new Set(items.map((f) => f.category)))];
}
