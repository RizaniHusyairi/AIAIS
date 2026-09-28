'use client';

/**
 * "Tiket Saya" — nomor tiket permohonan informasi publik yang pernah diajukan
 * dari perangkat ini, disimpan di `localStorage`.
 *
 * YANG DISIMPAN HANYA nomor tiket dan tanggal pengajuan. Nama, NIK, alamat,
 * isi permohonan, maupun status TIDAK ikut: status selalu diambil ulang dari
 * server saat daftar dibuka, jadi tidak pernah basi, dan data pribadi tidak
 * pernah mengendap di peramban.
 *
 * Disimpan otomatis tanpa bertanya. Keputusan produk (28 Sep 2026): bandara
 * tidak menyediakan kios atau komputer loket PPID untuk umum, sehingga
 * perangkat yang mengisi formulir hampir pasti milik pemohon sendiri.
 *
 * Dibaca lewat `useSyncExternalStore`, bukan useState + useEffect: server
 * merender daftar kosong, klien menyusul dengan isinya tanpa ketidakcocokan
 * hidrasi, dan tab lain yang menambah tiket ikut tersinkron lewat event
 * `storage`.
 */

import { useSyncExternalStore } from 'react';

export type TiketTersimpan = {
  ticket_number: string;
  /** Cap waktu pengajuan (ISO), bila diketahui. */
  submitted_at?: string | null;
  /** Kapan tiket ini dicatat di perangkat — untuk urutan daftar. */
  disimpan: string;
};

const KUNCI = 'aiais_tiket_permohonan';
const PERUBAHAN = 'aiais:tiket-saya';
/** Cukup untuk pemohon mana pun; menjaga daftar dan jumlah permintaan status tetap kecil. */
const BATAS = 20;

const KOSONG: TiketTersimpan[] = [];

let mentahTerakhir: string | null = null;
let daftarTerakhir: TiketTersimpan[] = KOSONG;

function baca(): TiketTersimpan[] {
  let mentah: string | null = null;
  try {
    mentah = window.localStorage.getItem(KUNCI);
  } catch {
    return KOSONG; // penyimpanan diblokir (mode privat, kebijakan peramban)
  }

  // Snapshot harus stabil selama isinya sama; kalau tidak, useSyncExternalStore
  // merender ulang tanpa henti.
  if (mentah === mentahTerakhir) return daftarTerakhir;
  mentahTerakhir = mentah;

  try {
    const isi = JSON.parse(mentah ?? '[]');
    daftarTerakhir = Array.isArray(isi)
      ? isi.filter((t): t is TiketTersimpan => typeof t?.ticket_number === 'string')
      : KOSONG;
  } catch {
    daftarTerakhir = KOSONG;
  }
  return daftarTerakhir;
}

function tulis(daftar: TiketTersimpan[]) {
  try {
    window.localStorage.setItem(KUNCI, JSON.stringify(daftar));
  } catch {
    return; // penuh atau diblokir — fitur ini sekadar kemudahan
  }
  window.dispatchEvent(new Event(PERUBAHAN));
}

/** Simpan satu tiket; yang sudah ada dipindah ke paling atas. */
export function simpanTiket(ticket_number: string, submitted_at?: string | null) {
  const nomor = ticket_number.trim().toUpperCase();
  if (!nomor) return;
  const lama = baca().find((t) => t.ticket_number === nomor);
  const baru: TiketTersimpan = {
    ticket_number: nomor,
    submitted_at: submitted_at ?? lama?.submitted_at ?? null,
    disimpan: new Date().toISOString(),
  };
  tulis([baru, ...baca().filter((t) => t.ticket_number !== nomor)].slice(0, BATAS));
}

export function hapusTiket(ticket_number: string) {
  tulis(baca().filter((t) => t.ticket_number !== ticket_number));
}

function langganan(ubah: () => void) {
  const olah = (e: Event) => {
    if (e instanceof StorageEvent && e.key !== null && e.key !== KUNCI) return;
    ubah();
  };
  window.addEventListener(PERUBAHAN, olah);
  window.addEventListener('storage', olah);
  return () => {
    window.removeEventListener(PERUBAHAN, olah);
    window.removeEventListener('storage', olah);
  };
}

/** Daftar tiket di perangkat ini, terbaru dahulu. Kosong saat render server. */
export function useTiketSaya(): TiketTersimpan[] {
  return useSyncExternalStore(langganan, baca, () => KOSONG);
}
