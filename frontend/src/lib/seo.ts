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
import { CONTACT } from '@/lib/airportProfile';
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

/** Ubah lintasan relatif menjadi URL absolut. Aman untuk nilai yang sudah absolut. */
export function urlAbsolut(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}/${path.replace(/^\/+/, '')}`;
}

/**
 * Kartu bawaan hasil `app/opengraph-image.tsx`.
 *
 * HARUS disebut eksplisit. Next melampirkan gambar hasil konvensi berkas itu
 * hanya selama segmen rutenya tidak mendeklarasikan `openGraph` sendiri —
 * dan setiap halaman yang lewat `metaHalaman` justru mendeklarasikannya,
 * sehingga gambarnya lenyap tanpa suara. Terbukti saat pengujian: beranda
 * membawa og:image, /flights sama sekali tidak.
 */
const KARTU_BAWAAN = '/opengraph-image';

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
  const images = [{ url: urlAbsolut(image || KARTU_BAWAAN), alt: title }];

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
    alternateName: ['Bandara APT Pranoto', 'Bandara Samarinda', 'APT Pranoto Airport'],
    iataCode: GEO.iata,
    icaoCode: GEO.icao,
    url: SITE_URL,
    logo: urlAbsolut('/logo-apt.svg'),
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
