import { fetchApi } from '@/lib/api';
import type { NewsItem } from '@/types';

/**
 * Ambil SELURUH berita terbit, bukan halaman pertamanya saja.
 *
 * `GET /news` memberi sepuluh berita per halaman. Halaman daftar menyaring dan
 * mencari di sisi klien — konvensi portal ini — sehingga penyaringan yang
 * hanya bekerja atas sepuluh teratas akan diam-diam menyembunyikan berita yang
 * sebenarnya cocok. Karena itu halamannya diambil berurutan sampai habis.
 *
 * Batas 20 halaman ada supaya kekeliruan di sisi server tidak berubah menjadi
 * permintaan tanpa akhir dari peramban pengunjung.
 */
export async function ambilSemuaBerita(): Promise<NewsItem[]> {
  const semua: NewsItem[] = [];

  for (let halaman = 1; halaman <= 20; halaman++) {
    const res = await fetchApi<NewsItem[]>(`/news?page=${halaman}`);

    if (!res.success || !Array.isArray(res.data)) break;

    semua.push(...res.data);

    const terakhir = Number(res.pagination?.last_page ?? 1);
    if (halaman >= terakhir) break;
  }

  return semua;
}

/**
 * Perhitungan bersama untuk halaman detail berita.
 *
 * Layar desktop (`app/news/[slug]`) dan layar PWA (`app/app/berita/[slug]`)
 * menampilkan artikel yang sama dengan tata letak berbeda. Sebelum berkas ini
 * ada, keduanya menghitung waktu baca, memilih berita terkait, dan memformat
 * tanggal dengan salinan kodenya masing-masing — dan sempat berbeda hasil.
 * Semua yang bukan soal tampilan tinggal di sini.
 *
 * Daftar berita yang dipakai fungsi-fungsi di bawah berasal dari `GET /news`,
 * yang mengembalikan sepuluh berita terbit terbaru. Itu cukup untuk tetangga
 * dan berita terkait sebuah artikel baru, dan sengaja tidak ditambah: satu
 * permintaan daftar melayani seluruh blok penjelajahan di halaman ini.
 */

/** Buang seluruh markah, sisakan teks yang benar-benar dibaca orang. */
export function teksPolos(html: string): string {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Perkiraan waktu baca dalam menit, pada 200 kata per menit. */
export function waktuBaca(html: string): number {
  const teks = teksPolos(html);

  return Math.max(1, Math.round((teks ? teks.split(' ').length : 0) / 200));
}

export function tanggalPanjang(iso?: string): string {
  if (!iso) return '-';

  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function tanggalPendek(iso?: string): string {
  if (!iso) return '-';

  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Gambar berita yang siap dipasang pada `<img src>`, atau `undefined`.
 *
 * `thumbnail_url` adalah medan turunan backend yang sudah menyelesaikan berkas
 * v2, berkas warisan v1, maupun URL milik server lain. `thumbnail` mentah hanya
 * dipakai sebagai jaring pengaman untuk data cadangan di `lib/newsData.ts`,
 * yang tidak melewati backend sama sekali.
 *
 * KENAPA STRING KOSONG IKUT DIBUANG. Sebagian baris `news` warisan v1 menyimpan
 * `''` pada kolom gambarnya, bukan NULL — dan `??` meloloskan string kosong.
 * `<img src="">` membuat peramban memuat ulang seluruh halaman sebagai gambar;
 * React pun memperingatkannya. Pemanggil wajib memeriksa hasilnya dan tidak
 * merender `<img>` sama sekali bila `undefined`.
 *
 * KENAPA `null` BERBEDA DARI `undefined`. `thumbnail_url` bernilai `null`
 * berarti backend SUDAH memeriksa ketiga cakram dan berkasnya tidak ada di
 * mana pun. Memundurkan diri ke lintasan mentah pada keadaan itu pasti
 * menghasilkan 404 — lintasan relatifnya akan dicari di alamat frontend, bukan
 * di server berkas. Lebih baik menampilkan penggantinya. Lintasan mentah hanya
 * dipakai bila medan turunannya memang tidak ada sama sekali (`undefined`),
 * yaitu pada data cadangan `lib/newsData.ts` yang tidak melewati backend.
 */
export function gambarBerita(n?: NewsItem | null): string | undefined {
  if (!n) return undefined;
  if (n.thumbnail_url) return n.thumbnail_url;
  if (n.thumbnail_url === null) return undefined;

  return n.thumbnail || undefined;
}

export type Tetangga = { sebelumnya: NewsItem | null; selanjutnya: NewsItem | null };

/**
 * Berita sebelum dan sesudah artikel ini menurut urutan terbit.
 *
 * Daftarnya datang terurut dari yang terbaru, sehingga tetangga yang "lebih
 * baru" berada pada indeks yang lebih kecil.
 */
export function tetangga(daftar: NewsItem[], slug: string): Tetangga {
  const i = daftar.findIndex((n) => n.slug === slug);

  if (i === -1) return { sebelumnya: null, selanjutnya: null };

  return {
    sebelumnya: daftar[i + 1] ?? null,
    selanjutnya: daftar[i - 1] ?? null,
  };
}

/**
 * Berita lain yang sekategori; dilengkapi berita terbaru bila belum cukup.
 *
 * Menyodorkan kategori yang sama lebih dulu membuat pembaca berita layanan
 * tidak dilempar ke kabar kegiatan, tanpa membuat blok ini kosong pada
 * kategori yang baru punya satu tulisan.
 */
export function terkait(daftar: NewsItem[], artikel: NewsItem, maks = 3): NewsItem[] {
  const lain = daftar.filter((n) => n.slug !== artikel.slug);
  const sekategori = lain.filter((n) => n.category === artikel.category);
  const sisanya = lain.filter((n) => n.category !== artikel.category);

  return [...sekategori, ...sisanya].slice(0, maks);
}

/** Berita paling banyak dibaca, di luar artikel yang sedang dibuka. */
export function terpopuler(daftar: NewsItem[], slug: string, maks = 4): NewsItem[] {
  return [...daftar]
    .filter((n) => n.slug !== slug)
    .sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0))
    .slice(0, maks);
}

export type Bagian = { teks: string; level: 2 | 3 };

/**
 * Susun daftar isi dari sub judul artikel yang sudah dirender.
 *
 * KENAPA DIBACA DARI DOM, BUKAN DARI STRING HTML-NYA. Isi artikel dipasang
 * lewat `dangerouslySetInnerHTML` sesudah disaring, jadi DOM adalah satu-
 * satunya tempat bentuk akhirnya diketahui.
 *
 * KENAPA TANPA PENANDA `id`. Dua alasan yang saling menguatkan. Pertama, `id`
 * tidak ada di daftar putih `lib/htmlAman.ts` sehingga penyaring membuangnya,
 * dan menambahkannya ke daftar putih adalah keputusan keamanan yang tidak
 * sepadan hanya demi daftar isi. Kedua — dan ini yang menutup jalan menanam
 * `id` sendiri lewat skrip — penanda yang dipasang secara imperatif TIDAK
 * BERTAHAN: React menulis ulang isi wadahnya pada render berikutnya dan
 * membuang atribut yang tidak berasal dari markahnya, sehingga tautan lompat
 * berhenti menemukan sasarannya tanpa pesan galat apa pun.
 *
 * Karena itu judul dialamatkan lewat POSISI, dan elemennya dibaca ulang dari
 * DOM tepat saat dibutuhkan — lihat `judulKe`.
 */
export function bacaDaftarIsi(akar: HTMLElement | null): Bagian[] {
  if (!akar) return [];

  return Array.from(akar.querySelectorAll('h2, h3')).map((el) => ({
    teks: (el.textContent || '').trim(),
    level: el.tagName === 'H3' ? 3 : 2,
  }));
}

/** Elemen sub judul pada urutan ke-`indeks`, dibaca ulang dari DOM saat dipakai. */
export function judulKe(akar: HTMLElement | null, indeks: number): HTMLElement | null {
  return akar?.querySelectorAll<HTMLElement>('h2, h3')[indeks] ?? null;
}

/** Seluruh elemen sub judul menurut urutan tampilnya. */
export function semuaJudul(akar: HTMLElement | null): HTMLElement[] {
  return akar ? Array.from(akar.querySelectorAll<HTMLElement>('h2, h3')) : [];
}
