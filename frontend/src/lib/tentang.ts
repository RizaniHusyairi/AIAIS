'use client';

import { useSetting } from '@/lib/settings';
import { useBahasa } from '@/lib/bahasa';
import { useTeks } from '@/lib/kamus';

/**
 * Isi blok "Tentang Bandar Udara APT Pranoto" pada beranda.
 *
 * Menyatukan dua hal yang kalau dibiarkan tersebar akan memenuhi `page.tsx`
 * dengan belasan percabangan yang sama persis:
 *
 *   1. PEMILIHAN BAHASA — tiap teks punya sepasang kunci pengaturan
 *      (`_id`/`_en`), karena tabel `settings` hanya menyimpan satu nilai per
 *      kunci sementara portalnya dwibahasa.
 *
 *   2. PENCADANGAN KE KAMUS — nilai pengaturan yang kosong berarti "petugas
 *      belum menyunting bagian ini", dan yang tampil adalah teks kamus yang
 *      selama ini sudah tayang. Bukan teks kosong, dan bukan pula teks
 *      Indonesia pada halaman berbahasa Inggris.
 *
 * Perhatikan arah pencadangannya: isian Inggris yang kosong jatuh ke
 * TERJEMAHAN di kamus, bukan ke teks Indonesia yang baru saja diisi petugas.
 * Halaman berbahasa Inggris yang separuh kalimatnya Indonesia lebih
 * membingungkan daripada terjemahan baku yang belum sempat disesuaikan.
 */
export type Tentang = {
  kicker: string;
  judul: string;
  teks: string;
  caption: string;
  /** Sampul kartu; selalu terisi — jatuh ke aset statis bila belum diatur. */
  gambar: string;
  /** Kosong berarti tombol putar tidak boleh dirender sama sekali. */
  videoUrl: string;
};

/** Sampul bawaan; aset statis yang sama dengan yang tayang sebelum modul ini. */
const GAMBAR_BAWAAN = '/bg/bg-beranda.png';

export function useTentang(): Tentang {
  const bahasa = useBahasa();
  const t = useTeks();

  /* Kesepuluh kunci dibaca tanpa syarat. `useSetting` sebuah hook, jadi
     jumlah dan urutan pemanggilannya tidak boleh bergantung pada bahasa yang
     sedang aktif — memilih pasangannya dilakukan sesudah semuanya terbaca. */
  const kickerId = useSetting('tentang_kicker_id');
  const kickerEn = useSetting('tentang_kicker_en');
  const judulId = useSetting('tentang_judul_id');
  const judulEn = useSetting('tentang_judul_en');
  const teksId = useSetting('tentang_teks_id');
  const teksEn = useSetting('tentang_teks_en');
  const captionId = useSetting('tentang_caption_id');
  const captionEn = useSetting('tentang_caption_en');
  const gambar = useSetting('tentang_gambar');
  const videoUrl = useSetting('tentang_video_url');

  const inggris = bahasa === 'en';
  const pilih = (id: string, en: string, cadangan: string) =>
    (inggris ? en : id).trim() || cadangan;

  return {
    kicker: pilih(kickerId, kickerEn, t.beranda.profilKicker),
    judul: pilih(judulId, judulEn, t.beranda.profilJudul),
    teks: pilih(teksId, teksEn, t.beranda.profilRingkas),
    caption: pilih(captionId, captionEn, t.beranda.lihatProfil),
    gambar: gambar.trim() || GAMBAR_BAWAAN,
    videoUrl: videoUrl.trim(),
  };
}

/**
 * Kode video dari sebuah tautan YouTube, atau null bila tidak dikenali.
 *
 * Tiga bentuk yang benar-benar ditempel orang dari bilah alamat maupun tombol
 * "Bagikan": `watch?v=`, `youtu.be/`, dan `embed/`. Tautan yang tidak dikenali
 * mengembalikan null, dan pemanggilnya memperlakukan itu sama dengan kosong —
 * lebih baik tombol putarnya tidak muncul daripada muncul lalu menampilkan
 * pemutar yang gagal.
 *
 * Fungsi biasa, bukan hook: dipakai pula di luar komponen React.
 */
export function idYouTube(url: string): string | null {
  const bersih = url.trim();
  if (!bersih) return null;

  try {
    const u = new URL(bersih);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return kodeSah(u.pathname.slice(1));
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') return kodeSah(u.searchParams.get('v') ?? '');
      if (u.pathname.startsWith('/embed/')) return kodeSah(u.pathname.slice('/embed/'.length));
      if (u.pathname.startsWith('/shorts/')) return kodeSah(u.pathname.slice('/shorts/'.length));
    }

    return null;
  } catch {
    // Bukan URL yang sah. Petugas mungkin baru menempel setengahnya.
    return null;
  }
}

/** Kode video YouTube selalu 11 karakter dari abjad terbatas. */
function kodeSah(kode: string): string | null {
  const potong = kode.split('/')[0] ?? '';
  return /^[\w-]{11}$/.test(potong) ? potong : null;
}
