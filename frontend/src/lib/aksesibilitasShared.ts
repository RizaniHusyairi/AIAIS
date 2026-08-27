/**
 * Konstanta penyetelan aksesibilitas — AMAN dipakai Server Component maupun klien.
 *
 * Berkas ini SENGAJA tidak bertanda `'use client'`, persis seperti
 * `siteThemeShared.ts` dan `components/admin/themeShared.ts`. Begitu sebuah
 * modul ditandai klien, seluruh ekspornya berubah menjadi rujukan klien ketika
 * diimpor dari Server Component — termasuk konstanta biasa seperti skrip di
 * bawah, yang justru harus ikut terkirim pada HTML dokumen pertama. Kesalahan
 * yang sama pernah berujung HTTP 500 di repo ini.
 */

/** Persen ukuran teks yang boleh dipilih. */
export const UKURAN_TEKS = [100, 112, 125, 150] as const;
export type UkuranTeks = (typeof UKURAN_TEKS)[number];

export type Aksesibilitas = {
  /** Persen ukuran teks; 100 berarti tidak ada penyesuaian. */
  teks: UkuranTeks;
  kontras: boolean;
  /** Benar = minimalkan gerak. */
  gerak: boolean;
  /** Benar = semua tautan digarisbawahi, tidak hanya dibedakan warna. */
  tautan: boolean;
  /** Benar = cincin fokus dipertebal. */
  fokus: boolean;
  /** Benar = perenggangan baris, huruf, dan kata (WCAG 1.4.12). */
  spasi: boolean;
  /** Benar = font ramah baca menggantikan font antarmuka. */
  font: boolean;
};

/**
 * SATU kunci berisi JSON, bukan tujuh kunci terpisah.
 *
 * Ketujuh penyetelan selalu dibaca dan ditulis bersama, skrip anti-kedip cukup
 * sekali `JSON.parse`, satu peristiwa `storage` lintas-tab menangkap semuanya,
 * dan penyetelan kedelapan kelak tidak menambah kunci baru yang harus diingat
 * di tiga tempat sekaligus.
 */
export const A11Y_KEY = 'aiais_a11y';

/** Nama peristiwa perubahan; dipakai hook di `aksesibilitas.ts`. */
export const A11Y_EVENT = 'aiais-a11y';

export const A11Y_BAWAAN: Aksesibilitas = {
  teks: 100,
  kontras: false,
  gerak: false,
  tautan: false,
  fokus: false,
  spasi: false,
  font: false,
};

/** Pengali yang dibawa ke dalam `calc()` lewat variabel `--a11y-skala`. */
export const SKALA_TEKS: Record<UkuranTeks, number> = {
  100: 1,
  112: 1.12,
  125: 1.25,
  150: 1.5,
};

/**
 * Peta penyetelan boolean → atribut pada <html>.
 *
 * Sumber tunggal, dipakai DUA kali: langsung oleh `PenyetelAksesibilitas`, dan
 * lewat JSON oleh skrip anti-kedip di bawah. Tanpa peta ini keduanya menjadi
 * dua daftar yang perlahan menyimpang — penyetelan baru yang lupa didaftarkan
 * di salah satunya akan berkedip salah pada gambar pertama saja, gejala yang
 * sangat mahal untuk dilacak.
 */
export const PETA_ATRIBUT: {
  kunci: Exclude<keyof Aksesibilitas, 'teks'>;
  atribut: string;
  nilai: string;
}[] = [
  { kunci: 'kontras', atribut: 'data-a11y-kontras', nilai: 'tinggi' },
  { kunci: 'gerak', atribut: 'data-a11y-gerak', nilai: 'minimal' },
  { kunci: 'tautan', atribut: 'data-a11y-tautan', nilai: 'garis' },
  { kunci: 'fokus', atribut: 'data-a11y-fokus', nilai: 'tebal' },
  { kunci: 'spasi', atribut: 'data-a11y-spasi', nilai: 'lega' },
  { kunci: 'font', atribut: 'data-a11y-font', nilai: 'terbaca' },
];

/**
 * Membersihkan apa pun yang terbaca dari penyimpanan menjadi bentuk yang sah.
 *
 * Isi `localStorage` bukan data tepercaya: ia bisa berasal dari versi portal
 * yang lebih lama, dari tab lain, atau dari suntingan tangan. Nilai yang tidak
 * dikenal diganti bawaannya alih-alih dibiarkan lolos menjadi atribut aneh.
 */
export function normalkan(mentah: unknown): Aksesibilitas {
  const o = (mentah ?? {}) as Partial<Record<keyof Aksesibilitas, unknown>>;
  const teks = UKURAN_TEKS.find((u) => u === o.teks) ?? A11Y_BAWAAN.teks;

  return {
    teks,
    kontras: o.kontras === true,
    gerak: o.gerak === true,
    tautan: o.tautan === true,
    fokus: o.fokus === true,
    spasi: o.spasi === true,
    font: o.font === true,
  };
}

/** Benar bila tidak ada satu pun penyetelan yang menyala. */
export function semuanyaBawaan(a: Aksesibilitas): boolean {
  return (Object.keys(A11Y_BAWAAN) as (keyof Aksesibilitas)[]).every(
    (k) => a[k] === A11Y_BAWAAN[k],
  );
}

/**
 * Skrip yang harus jalan SEBELUM halaman digambar.
 *
 * Alasannya sama persis dengan skrip tema: tanpa ini, pemakai yang menyalakan
 * kontras tinggi atau teks 150% melihat satu bingkai halaman bergaya bawaan
 * setiap kali memuat halaman, dan koreksinya baru datang setelah React
 * hidrasi. Pada teks 150% bingkai salah itu bukan kedipan kecil melainkan
 * seluruh tata letak yang melompat.
 *
 * HARUS dirender dari LAYOUT AKAR. Peramban hanya menjalankan <script> yang
 * ikut terkirim pada HTML dokumen pertama; yang dirender React di klien tidak
 * pernah dieksekusi.
 *
 * Sesudah gambar pertama, atributnya menjadi urusan `PenyetelAksesibilitas`.
 */
export const A11Y_INIT_SCRIPT = `
try {
  var e = document.documentElement;
  var s = localStorage.getItem('${A11Y_KEY}');
  var a = Object.assign({}, ${JSON.stringify(A11Y_BAWAAN)}, s ? JSON.parse(s) : null);
  var peta = ${JSON.stringify(PETA_ATRIBUT)};
  for (var i = 0; i < peta.length; i++) {
    if (a[peta[i].kunci] === true) e.setAttribute(peta[i].atribut, peta[i].nilai);
  }
  var skala = ${JSON.stringify(SKALA_TEKS)}[a.teks];
  if (skala && skala !== 1) {
    e.setAttribute('data-a11y-teks', String(a.teks));
    e.style.setProperty('--a11y-skala', String(skala));
  }
} catch (err) {
  /* Mode penyamaran, penyimpanan penuh, atau JSON rusak. Halaman tampil
     dengan penyetelan bawaan — tidak apa-apa, dan tidak boleh menggagalkan
     apa pun. */
}
`;
