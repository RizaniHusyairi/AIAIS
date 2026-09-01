/**
 * Konstanta pengaturan portal — AMAN dipakai Server Component maupun klien.
 *
 * Berkas ini SENGAJA tidak bertanda `'use client'`, dan itu bukan kelalaian.
 * `lib/settings.ts` bertanda demikian karena berisi hook; begitu sebuah modul
 * ditandai klien, seluruh ekspornya berubah menjadi rujukan klien ketika
 * diimpor dari Server Component — termasuk konstanta biasa. Akibatnya nyata
 * dan pernah terjadi: halaman Standar Pelayanan membalas HTTP 500 saat
 * `DEFAULT_SETTINGS` diimpor dari `page.tsx`.
 *
 * Karena itu nilainya tinggal di sini, dan `settings.ts` mengekspornya ulang
 * agar kode klien yang sudah ada tidak perlu diubah.
 */

/** Kunci latar header/hero yang dapat diatur dari panel manajemen. */
export const BACKGROUND_KEYS = [
  'bg_home',
  'bg_news',
  'bg_profile',
  'bg_tenants',
  'bg_facilities',
  'bg_tourism',
  'bg_ppid',
  'bg_app_home',
  'bg_app_news',
] as const;

export type BackgroundKey = (typeof BACKGROUND_KEYS)[number];

/**
 * Kunci blok SKM yang dapat disunting dari panel.
 *
 * `skm_is_active` bernilai teks '1'/'0', bukan boolean — tabel `settings`
 * warisan v1 menyimpan seluruh nilainya sebagai teks, dan mengubah bentuknya
 * berarti menyentuh skema yang masih dipakai v1 sampai cutover.
 */
export const SKM_KEYS = ['skm_title', 'skm_text', 'skm_label', 'skm_url', 'skm_is_active'] as const;

export type SkmKey = (typeof SKM_KEYS)[number];

/**
 * Kunci blok "Tentang Bandar Udara APT Pranoto" pada beranda.
 *
 * Berpasangan `_id`/`_en` karena portalnya dwibahasa dan tabel `settings`
 * hanya menyimpan satu nilai per kunci. Bawaannya kosong; lihat catatan
 * panjang pada `SettingController::DEFAULTS` untuk alasan teksnya TIDAK
 * disalin ke sini dari kamus.
 */
export const TENTANG_KEYS = [
  'tentang_kicker_id', 'tentang_kicker_en',
  'tentang_judul_id', 'tentang_judul_en',
  'tentang_teks_id', 'tentang_teks_en',
  'tentang_caption_id', 'tentang_caption_en',
  'tentang_gambar',
  'tentang_video_url',
] as const;

export type TentangKey = (typeof TENTANG_KEYS)[number];

/**
 * Video Profil PPID pada halaman /ppid.
 *
 * Terpisah dari blok Tentang: yang satu memperkenalkan bandara, yang ini
 * memperkenalkan layanan informasi publiknya. Keduanya dikelola dari panel
 * yang berbeda pula — Tentang di /admin/appearance, PPID di /admin/profil-ppid.
 */
export const PPID_VIDEO_KEYS = ['ppid_video_url', 'ppid_video_gambar'] as const;

export type PpidVideoKey = (typeof PPID_VIDEO_KEYS)[number];

/**
 * Kunci notifikasi WhatsApp yang BUKAN rahasia.
 *
 * Kunci API gateway dan nomor ponsel petugas sengaja tidak ada di sini:
 * endpoint GET /settings bersifat publik. Keduanya dilayani endpoint bertoken
 * tersendiri — lihat halaman /admin/whatsapp.
 */
export const WA_KEYS = ['wa_enabled', 'wa_endpoint', 'wa_daily_cap'] as const;

export type WaKey = (typeof WA_KEYS)[number];

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

  // Kosong dengan sengaja: hero PPID memakai gradien langitnya sendiri sampai
  // petugas memilih gambar. Lihat catatan pada SettingController::DEFAULTS.
  bg_ppid: '',
  hero_video_url: 'https://assets.mixkit.co/videos/preview/mixkit-airplane-taking-off-at-sunset-41484-large.mp4',

  // Satu ukuran responsif yang dipakai seluruh Slide Informasi di beranda.
  info_slide_width: '1400',
  info_slide_height: '525',

  // Survei Kepuasan Masyarakat — lihat catatan pada SettingController::DEFAULTS.
  skm_url: 'https://skm.dephub.go.id/ly/ApfkINxw',
  skm_label: 'Isi Survei Kepuasan Masyarakat',
  skm_is_active: '1',
  skm_title: 'Ikut Serta dalam Survei Kepuasan Masyarakat',
  skm_text: 'Penilaian Anda kami olah menjadi Indeks Kepuasan Masyarakat, dan laporan hasilnya diterbitkan pada halaman ini.',

  // Blok "Tentang" — semuanya kosong dengan sengaja; teks bawaannya ada di
  // kamus, bukan di sini. Lihat SettingController::DEFAULTS.
  tentang_kicker_id: '',
  tentang_kicker_en: '',
  tentang_judul_id: '',
  tentang_judul_en: '',
  tentang_teks_id: '',
  tentang_teks_en: '',
  tentang_caption_id: '',
  tentang_caption_en: '',
  tentang_gambar: '',
  tentang_video_url: '',

  // Video Profil PPID — kosong berarti bagian videonya tidak dirender.
  ppid_video_url: '',
  ppid_video_gambar: '',

  // Notifikasi WhatsApp — kosong berarti "pakai nilai .env di server".
  wa_enabled: '',
  wa_endpoint: '',
  wa_daily_cap: '',
};
