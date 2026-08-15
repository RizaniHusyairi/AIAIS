import { Plane, Users, Luggage, Package, type LucideIcon } from 'lucide-react';
import type { TrafficPeriod } from '@/types';

/**
 * Bawaan tampilan statistik lalu lintas udara.
 *
 * Satuan tiap kategori BERBEDA — pesawat dan penumpang dihitung per satuan,
 * bagasi dan kargo dalam kilogram. Perbedaan itu bukan hiasan: menaruh
 * keempatnya pada satu grafik menuntut dua sumbu berbeda skala, yang membuat
 * dua garis tampak dapat dibandingkan padahal tidak. Karena itu tiap kategori
 * mendapat grafiknya sendiri, dan satuannya ditulis di sini supaya angka tanpa
 * satuan tidak pernah tayang.
 */

export type KategoriTrafik = 'aircraft' | 'passenger' | 'baggage' | 'cargo';

export const KATEGORI: {
  key: KategoriTrafik;
  label: string;
  /** Satuan yang ditulis di samping angka. Kosong berarti satuan hitung. */
  unit: string;
  icon: LucideIcon;
}[] = [
  { key: 'aircraft', label: 'Pergerakan Pesawat', unit: 'penerbangan', icon: Plane },
  { key: 'passenger', label: 'Penumpang', unit: 'orang', icon: Users },
  { key: 'baggage', label: 'Bagasi', unit: 'kg', icon: Luggage },
  { key: 'cargo', label: 'Kargo', unit: 'kg', icon: Package },
];

/**
 * Warna dua seri: kedatangan dan keberangkatan.
 *
 * Diambil dari palet kategorikal yang sudah tervalidasi — pemisahan ΔE 24,7
 * pada simulasi buta warna protan, jauh di atas ambang 8. Jangan menggantinya
 * dengan warna pilihan sendiri tanpa memvalidasi ulang.
 *
 * Identitas seri TIDAK pernah bergantung warna semata: legenda selalu ada dan
 * tabel data menyediakan angkanya dalam teks.
 */
export const WARNA_SERI = {
  arrival: '#2a78d6',
  departure: '#eb6834',
} as const;

/** Format angka bergaya Indonesia; nol tetap ditulis nol, bukan tanda hubung. */
export const angka = (n: number) => n.toLocaleString('id-ID');

/** Ubah seri API menjadi baris siap gambar untuk satu kategori. */
export function barisGrafik(series: TrafficPeriod[], kategori: KategoriTrafik) {
  return series.map((p) => ({
    label: p.label,
    Kedatangan: p[kategori].arrival,
    Keberangkatan: p[kategori].departure,
  }));
}
