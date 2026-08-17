/**
 * Pemetaan kategori & ikon fasilitas terminal.
 *
 * Dipakai bersama oleh direktori fasilitas desktop (/facilities) dan
 * ringkasan fasilitas pada beranda PWA (/app), supaya warna dan ikon
 * satu fasilitas selalu sama di kedua tampilan.
 */

import {
  Building2, Sparkles, Stethoscope, Armchair, Car, Store, Plane, HeartHandshake,
  ShieldCheck, Accessibility, Baby, Wifi, Luggage, Utensils, Headphones,
  Navigation, DoorOpen, ParkingSquare, Compass,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Facility } from '@/types';

/**
 * Warna per kategori fasilitas, selaras dengan palet halaman tenant.
 *
 * DUA KATEGORI TERATAS SEMPAT HILANG DARI DAFTAR INI. Seluruh 22 fasilitas
 * yang benar-benar terdaftar berkategori "Sisi Udara", "Sisi Darat", atau
 * "Umum", sedangkan daftar ini hanya mengenal yang ketiga — sehingga 17 dari
 * 22 fasilitas tampil abu-abu dengan ikon bawaan yang sama, dan kategorinya
 * tidak lagi membedakan apa pun. Empat kategori di bawah "Umum" tidak dipakai
 * data mana pun hari ini; keduanya dibiarkan sebagai cadangan bila petugas
 * memakainya kelak.
 */
export const FACILITY_CAT_META: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  'Sisi Udara': { color: '#0891b2', bg: '#ecfeff', icon: Plane },
  'Sisi Darat': { color: '#7c3aed', bg: '#f5f3ff', icon: Luggage },
  'Umum': { color: '#2563eb', bg: '#eff6ff', icon: Building2 },
  'Keagamaan': { color: '#059669', bg: '#ecfdf5', icon: Sparkles },
  'Kesehatan': { color: '#e11d48', bg: '#fff1f2', icon: Stethoscope },
  'Layanan Khusus': { color: '#d97706', bg: '#fffbeb', icon: Armchair },
  'Transportasi': { color: '#0891b2', bg: '#ecfeff', icon: Car },
  'Komersial': { color: '#7c3aed', bg: '#f5f3ff', icon: Store },
};

const FALLBACK_META = { color: '#64748b', bg: '#f1f5f9', icon: Building2 };

export function facilityCatMeta(category: string) {
  return FACILITY_CAT_META[category] ?? FALLBACK_META;
}

/**
 * Kolom `icon` dari API berisi nama ikon Lucide dalam bentuk teks
 * (mis. "Armchair", "Stethoscope"). Petakan ke komponennya, dan bila
 * namanya tidak dikenali gunakan ikon bawaan kategori.
 */
export const FACILITY_ICON_MAP: Record<string, LucideIcon> = {
  Armchair, Building2, HeartHandshake, Stethoscope, Car, Store, Plane,
  ShieldCheck, Accessibility, Baby, Wifi, Luggage, Utensils, Headphones,
  Navigation, DoorOpen, ParkingSquare, Sparkles, Compass,
};

export function facilityIcon(fac: Facility): LucideIcon {
  return (fac.icon && FACILITY_ICON_MAP[fac.icon]) || facilityCatMeta(fac.category).icon;
}
