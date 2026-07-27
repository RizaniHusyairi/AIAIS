'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

/** Kunci latar header/hero yang dapat diatur dari panel manajemen. */
export const BACKGROUND_KEYS = [
  'bg_home',
  'bg_news',
  'bg_profile',
  'bg_tenants',
  'bg_facilities',
  'bg_tourism',
  'bg_app_home',
  'bg_app_news',
] as const;

export type BackgroundKey = (typeof BACKGROUND_KEYS)[number];

/** Nilai bawaan — harus selaras dengan SettingController::DEFAULTS di backend. */
export const DEFAULT_SETTINGS: Record<string, string> = {
  bg_home: '/bg/bg-beranda.png',
  bg_news: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1400&q=80',
  bg_profile: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1800&q=80',
  bg_tenants: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1800&q=80',
  bg_facilities: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=80',
  bg_tourism: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1800&q=80',
  bg_app_home: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80',
  bg_app_news: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80',
  hero_video_url: 'https://assets.mixkit.co/videos/preview/mixkit-airplane-taking-off-at-sunset-41484-large.mp4',
};

export const BACKGROUND_META: { key: BackgroundKey; label: string; page: string; href: string; note: string }[] = [
  { key: 'bg_home', label: 'Beranda', page: 'Portal Desktop', href: '/', note: 'Latar hero utama halaman depan' },
  { key: 'bg_news', label: 'Berita & Pengumuman', page: 'Portal Desktop', href: '/news', note: 'Latar header daftar berita' },
  { key: 'bg_profile', label: 'Profil & Visi Misi', page: 'Portal Desktop', href: '/profile', note: 'Latar hero halaman profil bandara' },
  { key: 'bg_tenants', label: 'Tenant & Transportasi', page: 'Portal Desktop', href: '/tenants', note: 'Latar hero direktori tenant' },
  { key: 'bg_facilities', label: 'Fasilitas Terminal', page: 'Portal Desktop', href: '/facilities', note: 'Latar hero direktori fasilitas' },
  { key: 'bg_tourism', label: 'Pariwisata Terdekat', page: 'Portal Desktop', href: '/tourism', note: 'Latar hero destinasi wisata sekitar bandara' },
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
