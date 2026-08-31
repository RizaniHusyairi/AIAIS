/**
 * Peta rute publik ⇄ layar PWA.
 *
 * SATU-SATUNYA tempat pemetaan ini boleh ditulis. Dua pemakainya:
 *
 *  - `proxy.ts` — sisi server, mengalihkan ponsel sungguhan;
 *  - `components/pwa/MobileRedirect.tsx` — sisi klien, mengikuti jendela yang
 *    disempitkan atau dilebarkan kembali.
 *
 * Sebelum berkas ini ada, keduanya menyimpan daftarnya sendiri dan daftar itu
 * sudah menyimpang: `/complaints` menuju `/app/layanan/bantuan` menurut proxy
 * tetapi `/app/layanan` menurut MobileRedirect — bug lama yang dulu hanya
 * diperbaiki di satu sisi. Selama ada dua salinan, perbaikan berikutnya akan
 * bernasib sama.
 *
 * Modul ini sengaja murni TypeScript tanpa API peramban maupun Node, supaya
 * aman dijalankan di middleware Edge.
 */

/* ------------------------------------------------------------------ */
/*  Perayap                                                            */
/* ------------------------------------------------------------------ */

/**
 * Perayap mesin pencari dan pengambil pratayang tautan.
 *
 * Tinggal di sini karena alasan yang sama dengan tabel rute di bawah: KEDUA
 * pengalih membacanya — `proxy.ts` dari header User-Agent, dan
 * `MobileRedirect.tsx` dari `navigator.userAgent`. Menyalinnya ke masing-
 * masing berkas adalah persis kesalahan yang dulu membuat `/complaints`
 * menuju dua tempat berbeda menurut dua berkas yang berbeda.
 *
 * Perayap TIDAK BOLEH dialihkan ke /app. UA Googlebot Smartphone memuat token
 * "Android" dan Bingbot Mobile memuat "iPhone", sehingga keduanya tertangkap
 * penyaring ponsel — akibatnya seluruh alamat publik portal menjawab
 * pengalihan bagi perayap utama Google, dan tidak satu pun URL kanoniknya
 * pernah dirayapi apa adanya.
 *
 * Nama yang disebut eksplisit adalah yang TIDAK memuat "bot", "crawler",
 * maupun "spider" di dalam UA-nya.
 */
export const CRAWLER_UA =
  /bot|crawler|spider|crawling|facebookexternalhit|WhatsApp|Slackbot|Discordbot|Twitterbot|LinkedInBot|TelegramBot|Applebot|Chrome-Lighthouse|PageSpeed|GPTBot|ClaudeBot|PerplexityBot/i;

/** Benar bila User-Agent ini milik perayap atau pengambil pratayang. */
export function adalahPerayap(ua: string | null | undefined): boolean {
  return !!ua && CRAWLER_UA.test(ua);
}

export type PetaRute = {
  /** Awalan rute publik. */
  publik: string;
  /** Layar PWA yang melayaninya. */
  app: string;
  /**
   * Pertahankan segmen terakhir: `/flights/GA123` → `/app/penerbangan/GA123`.
   * Tanpa ini, tautan detail yang dibagikan mendarat di daftar dan penerimanya
   * harus mencari sendiri.
   */
  simpanSegmen?: boolean;
  /**
   * Pertahankan query. Dipakai `/complaints?mode=hilang`: tanpa ini pelapor
   * mendarat di tab pertama, dan Lapor Kehilangan tidak pernah terbuka dari
   * menu navbar.
   */
  simpanQuery?: boolean;
  /**
   * Jangan pakai untuk arah balik (PWA → desktop). Diberikan pada rute publik
   * yang berbagi satu layar PWA dengan rute lain; hanya satu yang boleh
   * menjadi tujuan baliknya.
   */
  bukanBalikan?: boolean;
  /**
   * Hanya untuk arah balik (PWA → desktop). Kebalikan `bukanBalikan`: dipakai
   * layar PWA yang tidak punya alamat publik sendiri, sehingga tanpa baris ini
   * `toDesktopRoute` menjatuhkannya ke `/`. Baris seperti ini TIDAK BOLEH ikut
   * dalam pencocokan maju maupun `AWALAN_PUBLIK` — awalan publiknya sudah
   * dipegang baris lain, dan `config.matcher` di `proxy.ts` tidak berubah
   * karenanya.
   */
  hanyaBalikan?: boolean;
};

/**
 * Tabelnya. Diurutkan otomatis dari awalan terpanjang di bawah, jadi urutan
 * penulisan di sini bebas — `/ppid/sop` tidak akan pernah kalah oleh `/ppid`.
 */
const TABEL: PetaRute[] = [
  { publik: '/flights', app: '/app/penerbangan', simpanSegmen: true },
  { publik: '/facilities', app: '/app/fasilitas' },
  { publik: '/news', app: '/app/berita', simpanSegmen: true },
  { publik: '/tourism', app: '/app/wisata' },
  { publik: '/tenants', app: '/app/tenant' },

  // Transportasi tidak punya halaman publik sendiri; isinya satu section di
  // `/tenants`. Arah balik saja, supaya pembaca yang melebarkan jendela dari
  // layar ini mendarat di daftar transportasi, bukan di beranda.
  { publik: '/tenants', app: '/app/transportasi', hanyaBalikan: true },
  { publik: '/downloads', app: '/app/unduhan' },
  { publik: '/faq', app: '/app/faq' },
  { publik: '/tautan-terkait', app: '/app/tautan' },
  { publik: '/profile', app: '/app/profil' },

  // Pusat Bantuan. `simpanQuery` wajib — lihat catatan pada tipe di atas.
  { publik: '/complaints', app: '/app/bantuan', simpanQuery: true },

  { publik: '/layanan', app: '/app/layanan', simpanSegmen: true },

  { publik: '/regulasi/surat-keputusan', app: '/app/regulasi/keputusan' },
  { publik: '/regulasi/surat-edaran', app: '/app/regulasi/edaran' },

  // PPID. Lintasan PWA-nya lebih pendek daripada lintasan publik; nama panjang
  // versi desktop berasal dari struktur menu v1 dan tidak perlu ditiru di
  // layar selebar ponsel.
  { publik: '/ppid/pengajuan-informasi', app: '/app/ppid/permohonan' },
  { publik: '/ppid/laporan-layanan-informasi', app: '/app/ppid/laporan' },
  { publik: '/ppid/informasi-berkala', app: '/app/ppid/berkala' },
  { publik: '/ppid/informasi-serta-merta', app: '/app/ppid/serta-merta' },
  { publik: '/ppid/informasi-setiap-saat', app: '/app/ppid/setiap-saat' },
  { publik: '/ppid/standar-pelayanan', app: '/app/ppid/standar-pelayanan' },
  { publik: '/ppid/regulasi', app: '/app/ppid/regulasi' },
  { publik: '/ppid/sop', app: '/app/ppid/sop' },
  { publik: '/ppid', app: '/app/ppid' },
];

/** Awalan terpanjang menang. Menghindari `/ppid` menelan `/ppid/sop`. */
const TERURUT = [...TABEL].sort((a, b) => b.publik.length - a.publik.length);

/**
 * Rute publik yang TIDAK boleh dialihkan ke PWA.
 *
 * Halaman-halaman ini tidak punya padanan layar PWA, dan `toAppRoute`
 * mengembalikan `/app` untuk lintasan yang tidak dikenalnya — artinya tanpa
 * daftar ini pembacanya terlempar ke beranda aplikasi dan halaman yang
 * dicarinya lenyap tanpa jejak.
 *
 * Keempat yang pertama sudah responsif dan justru lebih baik dibaca apa
 * adanya: statistik dan kinerja keuangan penuh grafik, dan papan Posko Nataru
 * memang dirancang untuk layar lebar tetapi harus tetap dapat diperiksa
 * petugas dari ponsel. `/peta-rute` sebuah peta interaktif yang sudah
 * menyesuaikan diri.
 *
 * `/absensi` masuk dengan alasan yang berbeda dan lebih keras: TOKENNYA ADA
 * DI DALAM URL. Tanpa baris ini `toAppRoute` mengembalikan `/app` — persis
 * yang terjadi sebelumnya: peserta yang memindai QR di pintu ruang rapat
 * mendarat di beranda aplikasi, tokennya hilang bersama pengalihan, dan tidak
 * ada satu pun jalan dari beranda menuju daftar hadir rapatnya. Layarnya
 * sendiri sudah dibangun untuk ponsel (lihat `app/absensi/[token]`), jadi
 * tidak ada yang perlu dialihkan ke mana pun.
 */
export const KEEP_RESPONSIVE = [
  '/statistik',
  '/keuangan',
  '/posko-nataru',
  '/peta-rute',
  '/absensi',
] as const;

/** Benar bila rute ini harus disajikan apa adanya, tanpa pengalihan ke PWA. */
export function keepResponsive(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return KEEP_RESPONSIVE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Cocokkan lintasan publik dengan satu baris tabel. */
function cocokPublik(pathname: string): PetaRute | undefined {
  return TERURUT.find(
    (r) => !r.hanyaBalikan && (pathname === r.publik || pathname.startsWith(`${r.publik}/`)),
  );
}

/**
 * Rute publik → layar PWA.
 *
 * Lintasan yang tidak dikenal jatuh ke `/app`. Itu perilaku yang disengaja
 * untuk beranda (`/`), dan alasan `KEEP_RESPONSIVE` harus diperiksa lebih
 * dulu oleh pemanggilnya.
 */
export function toAppRoute(pathname: string): string {
  const r = cocokPublik(pathname);
  if (!r) return '/app';

  if (r.simpanSegmen) {
    const sisa = pathname.slice(r.publik.length).replace(/^\//, '').split('/')[0];
    return sisa ? `${r.app}/${sisa}` : r.app;
  }

  return r.app;
}

/** Benar bila query harus ikut terbawa saat rute ini dialihkan. */
export function simpanQuery(pathname: string): boolean {
  return cocokPublik(pathname)?.simpanQuery === true;
}

/**
 * Layar PWA → rute publik. Dipakai saat jendela dilebarkan kembali ke ukuran
 * desktop setelah kita sendiri yang mengalihkannya ke PWA.
 */
export function toDesktopRoute(pathname: string): string {
  const r = [...TERURUT]
    .filter((x) => !x.bukanBalikan)
    // Awalan layar PWA terpanjang menang, dengan alasan yang sama.
    .sort((a, b) => b.app.length - a.app.length)
    .find((x) => pathname === x.app || pathname.startsWith(`${x.app}/`));

  if (!r) return '/';

  if (r.simpanSegmen) {
    const sisa = pathname.slice(r.app.length).replace(/^\//, '').split('/')[0];
    return sisa ? `${r.publik}/${sisa}` : r.publik;
  }

  return r.publik;
}

/**
 * Awalan rute publik yang dipetakan — bahan `matcher` middleware.
 *
 * `config.matcher` di `proxy.ts` HARUS berupa literal statis (Next membacanya
 * saat build, bukan saat jalan), jadi daftar ini tidak dapat dipakai langsung
 * di sana. Ia ada untuk diuji: skrip verifikasi membandingkannya dengan
 * matcher supaya rute baru di tabel tidak diam-diam kehilangan pengalihannya.
 */
export const AWALAN_PUBLIK = TABEL.filter((r) => !r.hanyaBalikan).map((r) => r.publik);
