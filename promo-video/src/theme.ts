import { loadFont } from '@remotion/google-fonts/PlusJakartaSans';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] });

/**
 * Font portal aptpairport.id — dipakai HANYA oleh beranda desktop gambar ulang
 * (ui/desktop/*) agar tampil sama dengan situsnya: Inter untuk teks
 * (`--font-sans` di globals.css), Playfair Display untuk nama bandara di hero
 * (`--font-display`, lihat NamaBandaraHero.tsx).
 */
export const FONT_SITE = loadInter('normal', { weights: ['400', '500', '600', '700', '800', '900'], subsets: ['latin'] }).fontFamily;
export const FONT_DISPLAY = loadPlayfair('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily;

/**
 * Palet diambil dari hero portal (`from-[#0b1e5b] via-blue-700 to-sky-500`)
 * supaya video terasa satu keluarga dengan situs yang dipromosikan.
 */
export const C = {
  navy: '#0b1e5b',
  navyDeep: '#06123a',
  blue: '#1d4ed8',
  sky: '#0ea5e9',
  skyLight: '#7dd3fc',
  cyan: '#22d3ee',
  amber: '#fbbf24',
  green: '#34d399',
  rose: '#fb7185',
  white: '#ffffff',
  ink: '#0f172a',
  slate: '#64748b',
  glass: 'rgba(255,255,255,0.12)',
  glassStrong: 'rgba(255,255,255,0.2)',
  glassLine: 'rgba(255,255,255,0.28)',
};

export const FONT = fontFamily;

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** Zona aman Reels/TikTok: teks penting tidak boleh di bawah 250 px atas/bawah. */
export const SAFE = 250;
