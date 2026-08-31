'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

/*
 * Konstantanya tinggal di 'settingsShared.ts' yang TIDAK bertanda 'use client'.
 * Berkas ini bertanda demikian karena berisi hook, dan modul klien membuat
 * seluruh ekspornya menjadi rujukan klien saat diimpor Server Component —
 * lihat catatan lengkapnya di sana. Diekspor ulang di sini supaya kode klien
 * yang sudah mengimpornya dari '@/lib/settings' tidak perlu diubah.
 */
export {
  BACKGROUND_KEYS,
  SKM_KEYS,
  TENTANG_KEYS,
  PPID_VIDEO_KEYS,
  WA_KEYS,
  DEFAULT_SETTINGS,
  type BackgroundKey,
  type SkmKey,
  type TentangKey,
  type PpidVideoKey,
  type WaKey,
} from './settingsShared';

import { DEFAULT_SETTINGS, type BackgroundKey } from './settingsShared';


export const BACKGROUND_META: { key: BackgroundKey; label: string; page: string; href: string; note: string }[] = [
  { key: 'bg_home', label: 'Beranda', page: 'Portal Desktop', href: '/', note: 'Latar hero utama halaman depan' },
  { key: 'bg_news', label: 'Berita & Pengumuman', page: 'Portal Desktop', href: '/news', note: 'Latar header daftar berita' },
  { key: 'bg_profile', label: 'Profil & Visi Misi', page: 'Portal Desktop', href: '/profile', note: 'Latar hero halaman profil bandara' },
  { key: 'bg_tenants', label: 'Tenant & Transportasi', page: 'Portal Desktop', href: '/tenants', note: 'Latar hero direktori tenant' },
  { key: 'bg_facilities', label: 'Fasilitas Terminal', page: 'Portal Desktop', href: '/facilities', note: 'Latar hero direktori fasilitas' },
  { key: 'bg_tourism', label: 'Pariwisata Terdekat', page: 'Portal Desktop', href: '/tourism', note: 'Latar hero destinasi wisata sekitar bandara' },
  { key: 'bg_ppid', label: 'Halaman PPID', page: 'Portal Desktop', href: '/ppid', note: 'Latar hero seluruh halaman PPID — kosongkan untuk memakai gradien langit' },
  { key: 'bg_app_home', label: 'Beranda Aplikasi', page: 'Aplikasi Mobile', href: '/app', note: 'Latar hero beranda PWA' },
  { key: 'bg_app_news', label: 'Berita Aplikasi', page: 'Aplikasi Mobile', href: '/app/berita', note: 'Latar hero berita pada PWA' },
];

/* ------------------------------------------------------------------ */
/*  Pengambilan data (dengan cache sederhana antar-komponen)           */
/* ------------------------------------------------------------------ */
let cache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

export async function fetchSettings(force = false): Promise<Record<string, string>> {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;

  inflight = fetch(`${API_BASE_URL}/settings`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const data = json?.data && typeof json.data === 'object' ? json.data : {};
      const merged: Record<string, string> = { ...DEFAULT_SETTINGS, ...data };
      cache = merged;
      return merged;
    })
    .catch(() => {
      const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
      cache = merged;
      return merged;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Kosongkan cache agar perubahan dari panel admin langsung terlihat. */
export function invalidateSettings() {
  cache = null;
}

/**
 * Ambil satu pengaturan. Mengembalikan nilai bawaan lebih dulu supaya
 * tidak ada layout shift, lalu diperbarui saat data server tiba.
 */
export function useSetting(key: string): string {
  const [value, setValue] = useState<string>(DEFAULT_SETTINGS[key] ?? '');

  useEffect(() => {
    let alive = true;
    fetchSettings().then((s) => {
      if (alive && s[key]) setValue(s[key]);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return value;
}
