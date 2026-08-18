import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/seo';

/**
 * Kartu bagi bawaan portal, 1200×630.
 *
 * Dibangkitkan, bukan berkas gambar. Alasannya praktis: satu-satunya foto
 * beresolusi cukup di `public/` adalah `bg/bg-beranda.png` yang berukuran
 * 1,8 MB — di atas ambang yang diambil pratayang WhatsApp, sehingga tautan
 * yang dibagikan justru muncul tanpa gambar sama sekali. Kartu ini di bawah
 * 100 KB dan terbaca jelas pada petak kecil di gulungan percakapan.
 *
 * Berlaku untuk SELURUH rute yang tidak menyediakan gambarnya sendiri; Next
 * melampirkannya lewat konvensi berkas, jadi tidak perlu — dan tidak boleh —
 * disebut ulang di dalam objek `metadata`.
 *
 * Tanpa font kustom dengan sengaja: memuat berkas font di sini berarti satu
 * pembacaan berkas tiap kali kartunya dibangkitkan, dan huruf bawaan sudah
 * memadai untuk teks sebesar ini.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = SITE_NAME;

/** Biru lembaga — sama dengan `themeColor` di layout akar. */
const BIRU = '#0b1e5b';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: `linear-gradient(135deg, ${BIRU} 0%, #143a8f 55%, #1e56c4 100%)`,
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Kode IATA. Inilah yang dicari orang di kolom pencarian tiket. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            fontSize: 30,
            letterSpacing: '0.32em',
            color: '#ffd977',
            textTransform: 'uppercase',
          }}
        >
          AAP · WALS
        </div>

        <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.12, marginTop: 28 }}>
          Bandara APT Pranoto
        </div>
        <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.12, color: '#ffd977' }}>
          Samarinda
        </div>

        <div style={{ fontSize: 32, marginTop: 34, color: '#c8d6f5', lineHeight: 1.4 }}>
          Portal resmi — jadwal penerbangan, layanan, dan informasi publik
        </div>

        {/* Garis emas sebagai penutup; menahan blok teks agar tidak melayang. */}
        <div style={{ display: 'flex', width: 190, height: 8, background: '#ffd977', marginTop: 46 }} />
      </div>
    ),
    size,
  );
}
