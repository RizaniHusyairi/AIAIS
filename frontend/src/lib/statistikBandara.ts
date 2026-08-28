'use client';

import { useEffect, useState } from 'react';
import { Users, MapPin, Plane, Ruler, Award, Star, Building2, Clock, TrendingUp, Luggage, Package, Compass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useBahasa } from '@/lib/bahasa';
import type { AirportStatItem } from '@/types';

/**
 * Angka ringkas bandara, dikelola petugas lewat `/admin/angka-bandara`.
 *
 * Sebelum modul ini ada, kelima angkanya adalah konstanta di TIGA berkas yang
 * saling menyalin — dan salah satunya mengakuinya sendiri dalam komentar
 * ("Cermin dari ABOUT_STATS ... Bila angka di sana berubah, ubah di sini
 * juga"). Sekarang ketiga blok penampil membaca daftar yang sama dan menyaring
 * `show_*` masing-masing.
 *
 * Polanya menyalin `pejabatLive.ts`: halaman dibuka dengan konstanta cadangan
 * dan baru berpindah ke API setelah API menjawab dengan daftar berisi. Daftar
 * kosong sengaja diperlakukan sebagai "belum ada jawaban", BUKAN sebagai
 * "memang tidak ada angka" — beranda yang mendadak kehilangan seluruh kartunya
 * karena basis data belum disemai adalah kegagalan yang jauh lebih terlihat
 * daripada angka yang sedikit basi. Untuk menyembunyikan satu angka, matikan
 * `is_active`-nya; jangan mengosongkan tabelnya.
 */

/**
 * Ikon yang boleh dipilih petugas.
 *
 * Daftar tertutup, BUKAN `lucide-react[nama]` yang dinamis: indeks dinamis
 * membuat bundler menyertakan seluruh pustaka ikon karena tidak ada satu pun
 * nama yang dapat dipastikan saat build. Pola dan alasannya sama dengan
 * `FACILITY_ICON_MAP` di `facilityMeta.ts`.
 */
export const STAT_ICON_MAP: Record<string, LucideIcon> = {
  Users, MapPin, Plane, Ruler, Award, Star,
  Building2, Clock, TrendingUp, Luggage, Package, Compass,
};

/** Ikon bawaan untuk nilai kosong maupun nama yang tidak dikenali. */
const IKON_BAWAAN = Star;

export function ikonStatistik(nama: string | null | undefined): LucideIcon {
  return (nama && STAT_ICON_MAP[nama]) || IKON_BAWAAN;
}

/** Bentuk siap tampil; label sudah dipilih menurut bahasa aktif. */
export type Statistik = {
  slug: string;
  icon: LucideIcon;
  value: string;
  label: string;
  diTentang: boolean;
  diAngka: boolean;
  diHero: boolean;
};

/**
 * Cadangan — angka yang tayang sebelum modul ini ada.
 *
 * Bukan data karangan: ia salinan konstanta frontend yang sama dengan yang
 * disemai `AirportStatSeeder`, dan angkanya sama-sama BELUM terverifikasi
 * terhadap dokumen resmi. Baca blok provenans di seeder itu sebelum
 * mengubah salah satunya — keduanya harus berubah bersama.
 */
const CADANGAN: AirportStatItem[] = [
  { id: -1, slug: 'penumpang', icon: 'Users', value: '1.250.000+', label_id: 'Penumpang / Tahun', label_en: 'Passengers / Year', show_about: true, show_numbers: true, show_hero: false, sort_order: 10, is_active: true },
  { id: -2, slug: 'destinasi', icon: 'MapPin', value: '18', label_id: 'Destinasi', label_en: 'Destinations', show_about: true, show_numbers: true, show_hero: true, sort_order: 20, is_active: true },
  { id: -3, slug: 'penerbangan', icon: 'Plane', value: '120+', label_id: 'Penerbangan / Hari', label_en: 'Flights / Day', show_about: true, show_numbers: true, show_hero: true, sort_order: 30, is_active: true },
  { id: -4, slug: 'runway', icon: 'Ruler', value: '2.250 m', label_id: 'Panjang Runway', label_en: 'Runway Length', show_about: true, show_numbers: false, show_hero: true, sort_order: 40, is_active: true },
  { id: -5, slug: 'akreditasi', icon: 'Award', value: '4 Star', label_id: 'Bandara Terakreditasi', label_en: 'Accredited Airport', show_about: true, show_numbers: false, show_hero: false, sort_order: 50, is_active: true },
  { id: -6, slug: 'kepuasan', icon: 'Star', value: '98%', label_id: 'Tingkat Kepuasan Penumpang', label_en: 'Passenger Satisfaction Rate', show_about: false, show_numbers: true, show_hero: false, sort_order: 60, is_active: true },
];

export function useStatistikBandara(): Statistik[] {
  const bahasa = useBahasa();
  const [daftar, setDaftar] = useState<AirportStatItem[]>(CADANGAN);

  useEffect(() => {
    let batal = false;

    fetchApi<AirportStatItem[]>('/airport-stats').then((res) => {
      if (batal) return;

      const isi = Array.isArray(res.data) ? res.data : [];
      if (isi.length === 0) return;

      setDaftar(isi);
    });

    return () => { batal = true; };
    // Bahasa TIDAK ikut: yang berubah hanya label yang dipilih di bawah, dan
    // mengambil ulang seluruh daftar dari API setiap kali pengunjung menekan
    // tombol bahasa adalah permintaan jaringan yang tidak menghasilkan data
    // baru sama sekali.
  }, []);

  return daftar.map((s) => ({
    slug: s.slug,
    icon: ikonStatistik(s.icon),
    value: s.value,
    label: bahasa === 'en' ? s.label_en : s.label_id,
    diTentang: s.show_about,
    diAngka: s.show_numbers,
    diHero: s.show_hero,
  }));
}
