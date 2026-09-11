/**
 * Label dan palet papan nilai lomba karaoke.
 *
 * YANG TIDAK ADA DI SINI: bobot kriteria.
 *
 * Bobot hidup di `KaraokeScore::CRITERIA` (backend) dan ikut setiap respons
 * sebagai `criteria`. Menyalinnya ke berkas ini berarti dua daftar bobot yang
 * cepat atau lambat menyimpang — dan ketika itu terjadi, angka yang dilihat
 * juri di layar bukan angka yang tersimpan di basis data. Pada sebuah lomba,
 * itu bukan bug tampilan; itu pemenang yang salah.
 *
 * Yang boleh tinggal di sini hanyalah hal-hal yang tidak dimiliki basis data:
 * bunyi label dalam bahasa Indonesia, warna, dan penyaring bentuk respons di
 * bawah — ketiganya dipakai bersama oleh papan skor, papan juri, dan panel
 * admin, jadi menaruhnya di salah satu layar berarti dua layar lain menyalin.
 */

/** Nama kriteria sebagaimana dibaca juri. Kuncinya = nama kolom di backend. */
export const LABEL_KRITERIA: Record<string, string> = {
  teknik_vokal: 'Teknik Vokal',
  ketepatan_irama: 'Ketepatan Irama',
  penjiwaan: 'Penjiwaan',
  penampilan_panggung: 'Penampilan Panggung',
  kesan_keseluruhan: 'Kesan Keseluruhan',
};

/**
 * Label sebuah kriteria. Kriteria yang ditambahkan di backend tetapi belum
 * punya label di sini tampil sebagai kuncinya yang dirapikan — layarnya tetap
 * berjalan, dan yang hilang hanya keindahan namanya.
 */
export function labelKriteria(key: string): string {
  return LABEL_KRITERIA[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Rentang nilai tiap kriteria; cerminan `KaraokeScore::NILAI_MIN/MAKS`. */
export const NILAI_MIN = 1;
export const NILAI_MAKS = 100;

/**
 * Palet papan juri.
 *
 * Gelap, bukan biru korporat portal, dan itu disengaja: papan ini dibaca di
 * ruang acara yang lampunya diredupkan, dari ponsel yang dipegang sambil
 * menonton panggung. Latar terang di ruangan gelap menyilaukan dan membuat
 * angka di layar justru lebih sulit dibaca.
 *
 * Ditulis sebagai kelas Tailwind (arbitrary value), bukan objek `style` —
 * proyek ini memakai Tailwind v4 tanpa blok `@theme`, jadi warna kustom di
 * seluruh portal memang ditulis begini.
 */
export const PALET = {
  latar: 'bg-[#14101C]',
  panel: 'bg-[#1E1830]',
  panelAlt: 'bg-[#241C38]',
  garis: 'border-white/10',
  teks: 'text-[#F5F1EA]',
  redup: 'text-[#A79CC0]',
  emas: 'text-[#E8A33D]',
  emasLatar: 'bg-[#E8A33D]',
  pink: 'text-[#E1487C]',
  pinkGaris: 'border-[#E1487C]',
} as const;

/** Nilai heksadesimalnya, untuk tempat yang menuntut warna sungguhan (ikon, `fill`). */
export const WARNA = {
  emas: '#E8A33D',
  pink: '#E1487C',
  redup: '#A79CC0',
} as const;

/** Format nilai akhir: satu angka di belakang koma, gaya Indonesia. */
export function nilaiTampil(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Saring muatan rekap yang benar-benar berisi acara.
 *
 * `ApiResponse::success(null, ...)` TIDAK mengirim `data: null` — ia mengirim
 * `data: {}`, karena helper backend menukar null dengan objek kosong agar
 * bentuk responsnya tetap sama bagi setiap pemanggil. Memeriksa `res.data`
 * saja karenanya selalu benar, dan layar yang mempercayainya akan memanggil
 * `.map` atas `contestants` yang tidak ada. Keberadaan `event` yang menjadi
 * penentunya.
 */
export function rekapSah<T extends { event?: unknown }>(muatan: T | null | undefined): T | null {
  return muatan && typeof muatan === 'object' && muatan.event ? muatan : null;
}
