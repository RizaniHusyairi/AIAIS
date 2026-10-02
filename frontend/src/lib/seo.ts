/**
 * Identitas portal untuk mesin pencari dan pratayang tautan.
 *
 * SATU-SATUNYA tempat alamat publik portal disusun — sejajar dengan peran
 * `lib/api.ts` bagi alamat API. Sebelum berkas ini ada, tidak ada `metadataBase`
 * sama sekali, sehingga seluruh `alternates.canonical` di 31 halaman tersimpan
 * sebagai lintasan relatif; Next menuliskannya apa adanya ke `<link rel=
 * "canonical">`, dan tag kanonik relatif tidak menggabungkan sinyal apa pun di
 * mata Google. Efeknya sama dengan tidak memasang kanonik.
 *
 * Dipisahkan dari `lib/api.ts` dengan sengaja: alamat API dan alamat publik
 * kebetulan seasal di produksi, tetapi tidak selalu — saat pengembangan API
 * ada di `127.0.0.1:8000` sementara portalnya di `localhost:3000`, dan
 * menurunkan yang satu dari yang lain akan menghasilkan kanonik
 * `http://127.0.0.1:8000/news` pada halaman yang dilayani port 3000.
 */

import type { Metadata } from 'next';
import { CONTACT, MEDIA_SOSIAL, ORG_NAME } from '@/lib/airportProfile';
import { AIRPORTS, HOME_IATA } from '@/lib/airports';

/**
 * Asal portal publik, tanpa garis miring penutup.
 *
 * Domainnya masih dipakai portal v1 sampai pengalihan selesai (lihat
 * docs/CUTOVER.md), dan itu justru alasan nilainya ditulis di sini: begitu
 * v2 mengambil alih `aptpairport.id`, seluruh kanonik, sitemap, dan kartu
 * Open Graph ikut benar tanpa satu pun berkas lain disunting.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://aptpairport.id').replace(/\/+$/, '');

/** Nama portal sebagaimana ingin ditampilkan pada hasil pencarian. */
export const SITE_NAME = 'Bandara APT Pranoto Samarinda';

/** Nama resmi lengkap — dipakai data terstruktur, bukan judul halaman. */
export const NAMA_RESMI = 'Bandar Udara Aji Pangeran Tumenggung Pranoto';

/**
 * Judul dan ringkasan beranda — juga bawaan setiap halaman yang tidak menimpanya.
 *
 * Judul dijaga di bawah ±60 karakter: lebih dari itu Google dan Bing
 * memotongnya dengan elipsis, dan judul lama ("... | Sistem Informasi Terpadu
 * AIAIS") terpotong tepat sebelum kata yang menjelaskan isinya. "AIAIS" juga
 * tidak dicari siapa pun; "jadwal penerbangan" dicari setiap hari.
 *
 * Ringkasan ±155 karakter dengan kata yang paling dicari di depan, karena
 * potongan sesudahnya tidak terbaca di hasil pencarian ponsel.
 */
export const JUDUL_BERANDA = 'Bandara APT Pranoto Samarinda (AAP) | Jadwal & Info Resmi';
export const RINGKASAN_BERANDA =
  'Portal resmi Bandara APT Pranoto Samarinda: jadwal keberangkatan & kedatangan langsung dari FIDS, rute, fasilitas terminal, transportasi, parkir, berita, dan layanan PPID.';

/** Deskripsi entitas bandara untuk data terstruktur — lebih lengkap dari ringkasan halaman. */
const DESKRIPSI_BANDARA = `Bandar udara di Samarinda, Kalimantan Timur, yang diselenggarakan ${ORG_NAME}, Kementerian Perhubungan Republik Indonesia.`;

/** Ubah lintasan relatif menjadi URL absolut. Aman untuk nilai yang sudah absolut. */
export function urlAbsolut(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}/${path.replace(/^\/+/, '')}`;
}

/**
 * Kartu bagi bawaan: foto terminal dengan nama bandara di atasnya.
 *
 * Berkas JPEG statis, bukan `app/opengraph-image.tsx` seperti sebelumnya.
 * Kartu lama hanya teks di atas gradien, dan Bing — yang memilih thumbnail
 * hasil pencarian dari gambar paling menonjol bila og:image tidak meyakinkan —
 * malah menampilkan foto pejabat dari bagian "Pejabat" beranda. Foto terminal
 * yang dirender lewat `ImageResponse` keluar sebagai PNG ±1 MB, terlalu besar
 * untuk pratayang WhatsApp (kanal utama pengumuman bandara, yang diam-diam
 * membuang gambar di atas ±300 KB); JPEG ini ±100 KB.
 *
 * Disusun dari `public/images/apt-pranoto-cinematic-hero-*.png` dengan sharp.
 * Bila fotonya diganti, susun ulang kartunya dengan ukuran 1200×630 yang sama.
 *
 * HARUS disebut eksplisit di setiap halaman: setiap halaman yang lewat
 * `metaHalaman` mendeklarasikan `openGraph` sendiri, dan Next tidak
 * mewariskan gambar layout ke `openGraph` yang ditimpa.
 */
export const KARTU_BAWAAN = '/og/bandara-apt-pranoto.jpg';

/**
 * Foto terminal tanpa teks, untuk properti `image` data terstruktur.
 *
 * Tiga rasio sekaligus karena itulah yang diminta pedoman Google (16:9, 4:3,
 * 1:1): tiap permukaan hasil pencarian — kartu pengetahuan, thumbnail, carousel
 * — memotong ke rasionya sendiri, dan tanpa rasio yang pas Google memotong
 * sembarangan atau tidak menampilkan gambar sama sekali.
 */
export const FOTO_BANDARA = [
  '/og/terminal-16x9.jpg',
  '/og/terminal-4x3.jpg',
  '/og/terminal-1x1.jpg',
].map(urlAbsolut);

/**
 * Kartu bagi (Open Graph + Twitter) untuk satu halaman.
 *
 * `image` hanya perlu diisi ketika halamannya punya gambar yang lebih baik
 * daripada kartu bawaan — misalnya foto sampul satu berita. Bila dikosongkan,
 * kartu bawaan yang dipakai.
 */
export function metaHalaman(opts: {
  title: string;
  description: string;
  path: string;
  /** URL gambar khusus halaman ini. Absolut maupun relatif sama-sama diterima. */
  image?: string | null;
  /** Halaman berita memakai 'article'; sisanya biarkan bawaan. */
  type?: 'website' | 'article';
  /** Untuk `type: 'article'` — ISO 8601. */
  publishedTime?: string | null;
}): Metadata {
  const { title, description, path, image, type = 'website', publishedTime } = opts;
  const url = urlAbsolut(path);
  const images = image
    ? [{ url: urlAbsolut(image), alt: title }]
    : [{ url: urlAbsolut(KARTU_BAWAAN), width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'id_ID',
      type,
      images,
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Data terstruktur (JSON-LD)                                         */
/*                                                                     */
/*  Ditulis sebagai fungsi, bukan konstanta, supaya setiap halaman      */
/*  hanya menyisipkan skema yang benar-benar menggambarkan isinya.      */
/*  Menaburkan seluruh skema ke seluruh halaman justru melemahkannya:   */
/*  Google memperlakukan skema yang tidak cocok dengan isi halaman       */
/*  sebagai sinyal kualitas yang buruk.                                 */
/* ------------------------------------------------------------------ */

const GEO = AIRPORTS[HOME_IATA];

/**
 * Identitas bandara sebagai tempat sekaligus lembaga pemerintah.
 *
 * `@type` ganda memang sah dan di sini perlu: pengunjung mencari APT Pranoto
 * sebagai BANDARA (Google memakai `Airport` untuk kartu tempat, jam, dan
 * peta), sedangkan penyelenggaranya sebuah unit pelaksana teknis Kementerian
 * Perhubungan — dan status itulah yang membuat halaman PPID masuk akal
 * di mata mesin pencari.
 */
export function ldBandara() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Airport', 'GovernmentOrganization'],
    '@id': `${SITE_URL}/#bandara`,
    name: NAMA_RESMI,
    alternateName: [
      'Bandara APT Pranoto',
      'Bandara APT Pranoto Samarinda',
      'Bandara Samarinda',
      'APT Pranoto Airport',
      'Bandar Udara APT Pranoto',
    ],
    description: DESKRIPSI_BANDARA,
    iataCode: GEO.iata,
    icaoCode: GEO.icao,
    url: SITE_URL,
    /*
     * PNG berlatar, bukan `logo-apt.svg`. Logo pada kartu pengetahuan dan
     * hasil pencarian diambil dari sini, dan Google meminta gambar raster
     * minimal 112×112 yang tetap terbaca di atas latar putih — lambang emas
     * tipis versi SVG nyaris hilang di sana.
     */
    logo: {
      '@type': 'ImageObject',
      url: urlAbsolut('/icon-512.png'),
      width: 512,
      height: 512,
    },
    image: FOTO_BANDARA,
    // Profil resmi; inilah yang menautkan entitas bandara dengan akun sosialnya di kartu pengetahuan.
    sameAs: Object.values(MEDIA_SOSIAL),
    hasMap: `https://www.google.com/maps/search/?api=1&query=${GEO.lat},${GEO.lon}`,
    telephone: CONTACT.phone,
    email: CONTACT.email,
    parentOrganization: {
      '@type': 'GovernmentOrganization',
      name: 'Kementerian Perhubungan Republik Indonesia',
      url: 'https://dephub.go.id',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Jl. Poros Samarinda – Bontang, Kel. Sungai Siring',
      addressLocality: 'Samarinda',
      addressRegion: 'Kalimantan Timur',
      postalCode: '75119',
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: GEO.lat,
      longitude: GEO.lon,
    },
    // Jam OPERASI bandara, bukan jam kantor administrasi.
    openingHours: 'Mo-Su 07:00-20:00',
  };
}

/**
 * Situs itu sendiri, berikut kotak pencarian.
 *
 * `SearchAction` menunjuk `/news?q=` karena hanya pencarian beritalah yang
 * benar-benar membaca query dari URL; penyaringan halaman lain terjadi di
 * sisi klien tanpa meninggalkan jejak di alamat, jadi menjanjikannya kepada
 * Google berarti menjanjikan sesuatu yang tidak ada.
 */
export function ldSitus() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#situs`,
    name: SITE_NAME,
    /*
     * `name` + `alternateName` pada WebSite beranda adalah sumber "nama situs"
     * yang ditampilkan Google di atas judul hasil pencarian. Tanpa keduanya
     * Google jatuh ke nama domain — "aptpairport.id" — seperti yang terlihat
     * sebelum skema ini lengkap.
     */
    alternateName: ['APT Pranoto Airport', 'Bandara Samarinda', 'AAP Samarinda'],
    url: SITE_URL,
    inLanguage: 'id-ID',
    publisher: { '@id': `${SITE_URL}/#bandara` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/news?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Beranda sebagai halaman.
 *
 * Gunanya `primaryImageOfPage`: memberi tahu mesin pencari foto mana yang
 * mewakili beranda. Tanpanya Bing menebak dari gambar terbesar di halaman,
 * dan di beranda itu foto pejabat — bukan bandaranya.
 */
export function ldBeranda() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/#beranda`,
    url: SITE_URL,
    name: JUDUL_BERANDA,
    description: RINGKASAN_BERANDA,
    inLanguage: 'id-ID',
    isPartOf: { '@id': `${SITE_URL}/#situs` },
    about: { '@id': `${SITE_URL}/#bandara` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: FOTO_BANDARA[0],
      width: 1600,
      height: 900,
    },
  };
}

/** Remah jejak. `items` diurutkan dari akar ke halaman saat ini. */
export function ldRemah(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: urlAbsolut(it.path),
    })),
  };
}
