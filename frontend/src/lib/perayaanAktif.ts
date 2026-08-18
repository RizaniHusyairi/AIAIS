'use client';

/**
 * Perayaan yang sedang berlangsung, diambil sekali untuk seluruh halaman.
 *
 * Dua bagian memerlukan jawaban yang sama pada saat yang sama: layar sambutan
 * (`components/events/PemicuEvent`) dan dekorasi beranda
 * (`components/events/DekorEvent`). Tanpa singgahan di sini keduanya memanggil
 * `/site-events/active` masing-masing — dua permintaan untuk satu baris yang
 * berubah paling sering setahun sekali.
 *
 * Yang lebih penting daripada penghematan itu: keduanya dijamin melihat
 * perayaan yang SAMA. Bila permintaannya terpisah dan petugas kebetulan
 * mengganti perayaan aktif di antara keduanya, beranda bisa berhias satu tema
 * sementara layar sambutannya mengucapkan tema lain.
 *
 * Berkas ini sengaja terpisah dari `lib/siteEvents.ts`, yang isinya murni
 * urusan tampilan (palet dan kalimat) dan tidak menyentuh jaringan sama sekali.
 */

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { TEMA_EVENT, type SiteEvent } from '@/lib/siteEvents';

/**
 * Singgahan tingkat modul.
 *
 * Yang disimpan adalah PROMISE-nya, bukan hasilnya. Kedua pemakai memasang
 * diri pada bingkai render yang sama, jadi menyimpan hasil saja tetap
 * menyisakan celah: pemanggil kedua tiba saat permintaan pertama belum
 * selesai, mendapati singgahan kosong, lalu menembak permintaannya sendiri.
 */
let permintaan: Promise<SiteEvent | null> | null = null;

/**
 * Ambil perayaan aktif; permintaannya dibagi ke semua pemanggil.
 *
 * Gagal diam-diam menjadi `null`. Perayaan adalah hiasan — portal yang tidak
 * dapat menghubungi backend punya masalah yang jauh lebih layak ditampilkan
 * daripada ketiadaan bendera.
 */
export function ambilPerayaanAktif(): Promise<SiteEvent | null> {
  if (!permintaan) {
    permintaan = fetchApi<SiteEvent | null>('/site-events/active')
      .then((res) => {
        const data = res.success ? res.data : null;

        // Tema yang tidak dikenali frontend diperlakukan sebagai tidak ada
        // perayaan. Backend boleh saja punya nilai baru yang komponennya belum
        // mendarat di sini, dan hiasan kosong lebih buruk daripada tanpa hiasan.
        return data && TEMA_EVENT[data.theme] ? data : null;
      })
      .catch(() => null);
  }

  return permintaan;
}

/**
 * Perayaan aktif sebagai state React.
 *
 * Selalu mulai dari `null` dan baru terisi sesudah render pertama. Itu bukan
 * kemalasan: keluaran server tidak mengenal perayaan, jadi mengisi nilai awal
 * dari singgahan akan membuat render klien berbeda dari render server dan
 * menggagalkan hidrasi seluruh halaman.
 */
export function usePerayaanAktif(): SiteEvent | null {
  const [event, setEvent] = useState<SiteEvent | null>(null);

  useEffect(() => {
    let batal = false;

    ambilPerayaanAktif().then((data) => {
      if (!batal) setEvent(data);
    });

    return () => { batal = true; };
  }, []);

  return event;
}

/**
 * Usia Republik Indonesia pada perayaan yang bersangkutan.
 *
 * Dihitung dari tanggal mulai perayaan, BUKAN dari tanggal hari ini. Perayaan
 * yang dijadwalkan petugas boleh membentang melewati pergantian tahun, dan
 * "HUT ke-81" tidak boleh berubah angka di tengah rentangnya sendiri.
 *
 * Mengembalikan `null` bila tanggalnya tidak terbaca — lebih baik pitanya
 * berbunyi "Dirgahayu Republik Indonesia" tanpa angka daripada memasang angka
 * yang salah pada portal resmi.
 */
export const TAHUN_PROKLAMASI = 1945;

export function usiaRI(mulai: string | null | undefined): number | null {
  if (!mulai) return null;

  const tahun = Number(String(mulai).slice(0, 4));
  if (!Number.isFinite(tahun) || tahun < TAHUN_PROKLAMASI) return null;

  return tahun - TAHUN_PROKLAMASI;
}
