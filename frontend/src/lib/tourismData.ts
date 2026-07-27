/**
 * Direktori destinasi wisata terdekat dari Bandar Udara APT Pranoto Samarinda.
 *
 * Jarak dan waktu tempuh adalah perkiraan perjalanan darat dari terminal
 * bandara (Sungai Siring, Samarinda Utara) pada kondisi lalu lintas normal.
 * Data dipakai bersama oleh portal desktop (/tourism) dan PWA (/app/wisata).
 */

export type TourismCategory = 'Budaya' | 'Alam' | 'Religi' | 'Belanja' | 'Rekreasi';

export interface TourismSpot {
  slug: string;
  name: string;
  category: TourismCategory;
  /** Perkiraan jarak tempuh darat dari terminal, dalam kilometer. */
  distanceKm: number;
  /** Perkiraan waktu tempuh darat, mis. "±15 menit". */
  duration: string;
  city: string;
  address: string;
  description: string;
  highlights: string[];
  /** Kata kunci pencarian Google Maps. */
  mapsQuery: string;
}

export const TOURISM_SPOTS: TourismSpot[] = [
  {
    slug: 'desa-budaya-pampang',
    name: 'Desa Budaya Pampang',
    category: 'Budaya',
    distanceKm: 8,
    duration: '±15 menit',
    city: 'Samarinda Utara',
    address: 'Jl. Poros Samarinda–Bontang, Sungai Siring, Samarinda Utara',
    description:
      'Perkampungan adat Suku Dayak Kenyah yang menjadi destinasi terdekat dari bandara. Pengunjung dapat melihat lamin (rumah adat), ukiran khas Dayak, serta pertunjukan tari adat yang rutin digelar setiap Minggu siang.',
    highlights: ['Lamin adat Dayak Kenyah', 'Pertunjukan tari tiap Minggu', 'Kerajinan manik-manik & ukiran'],
    mapsQuery: 'Desa Budaya Pampang Samarinda',
  },
  {
    slug: 'air-terjun-tanah-merah',
    name: 'Air Terjun Tanah Merah',
    category: 'Alam',
    distanceKm: 13,
    duration: '±25 menit',
    city: 'Lempake, Samarinda Utara',
    address: 'Desa Tanah Merah, Lempake, Samarinda Utara',
    description:
      'Air terjun bertingkat di tengah rimbunnya vegetasi tropis Kalimantan. Cocok sebagai persinggahan singkat bagi penumpang transit yang ingin menikmati suasana alam tanpa perlu menempuh perjalanan jauh.',
    highlights: ['Air terjun bertingkat', 'Area piknik keluarga', 'Udara sejuk & rindang'],
    mapsQuery: 'Air Terjun Tanah Merah Lempake Samarinda',
  },
  {
    slug: 'kebun-raya-unmul',
    name: 'Kebun Raya Unmul Samarinda (KRUS)',
    category: 'Alam',
    distanceKm: 15,
    duration: '±30 menit',
    city: 'Lempake, Samarinda Utara',
    address: 'Jl. Ir. H. Juanda, Lempake, Samarinda Utara',
    description:
      'Hutan konservasi sekaligus taman rekreasi milik Universitas Mulawarman. Menyimpan koleksi flora khas Kalimantan, danau buatan, serta area kebun binatang mini yang ramah anak.',
    highlights: ['Koleksi flora Kalimantan', 'Danau & wahana perahu', 'Kebun binatang mini'],
    mapsQuery: 'Kebun Raya Unmul Samarinda',
  },
  {
    slug: 'islamic-center-samarinda',
    name: 'Masjid Islamic Center Samarinda',
    category: 'Religi',
    distanceKm: 25,
    duration: '±45 menit',
    city: 'Samarinda Kota',
    address: 'Jl. Slamet Riyadi, Karang Asam Ulu, Sungai Kunjang, Samarinda',
    description:
      'Masjid Baitul Muttaqien, salah satu masjid terbesar di Asia Tenggara, berdiri megah di tepi Sungai Mahakam. Menara utamanya setinggi 99 meter dapat dinaiki untuk menikmati panorama kota Samarinda.',
    highlights: ['Menara pandang 99 meter', 'Panorama Sungai Mahakam', 'Arsitektur ikonik Kaltim'],
    mapsQuery: 'Masjid Islamic Center Samarinda',
  },
  {
    slug: 'tepian-mahakam',
    name: 'Taman Tepian Sungai Mahakam',
    category: 'Rekreasi',
    distanceKm: 26,
    duration: '±45 menit',
    city: 'Samarinda Kota',
    address: 'Jl. Gajah Mada, Pasar Pagi, Samarinda Kota',
    description:
      'Ruang publik di sepanjang tepi Sungai Mahakam yang ramai pada sore hingga malam hari. Tersedia jalur pedestrian, pusat jajanan malam, serta titik keberangkatan susur sungai dengan kapal wisata.',
    highlights: ['Susur Sungai Mahakam', 'Kuliner malam tepian', 'Sunset di atas sungai'],
    mapsQuery: 'Taman Tepian Mahakam Samarinda',
  },
  {
    slug: 'citra-niaga',
    name: 'Citra Niaga',
    category: 'Belanja',
    distanceKm: 25,
    duration: '±45 menit',
    city: 'Samarinda Kota',
    address: 'Jl. Niaga Selatan, Pelabuhan, Samarinda Kota',
    description:
      'Kawasan perdagangan rakyat peraih Aga Khan Award for Architecture. Menjadi pusat oleh-oleh khas Kalimantan Timur, mulai dari sarung Samarinda, amplang, hingga kerajinan manik-manik Dayak.',
    highlights: ['Pusat oleh-oleh khas Kaltim', 'Sarung Samarinda & amplang', 'Peraih Aga Khan Award'],
    mapsQuery: 'Citra Niaga Samarinda',
  },
  {
    slug: 'kampung-tenun-samarinda-seberang',
    name: 'Kampung Tenun Samarinda Seberang',
    category: 'Budaya',
    distanceKm: 30,
    duration: '±55 menit',
    city: 'Samarinda Seberang',
    address: 'Jl. Bung Tomo, Baqa, Samarinda Seberang',
    description:
      'Sentra perajin sarung Samarinda yang masih ditenun manual dengan alat tenun bukan mesin. Pengunjung dapat menyaksikan langsung proses penenunan dan membeli sarung tenun asli dari perajinnya.',
    highlights: ['Demo tenun tradisional', 'Sarung Samarinda asli', 'Belanja langsung dari perajin'],
    mapsQuery: 'Kampung Tenun Samarinda Seberang',
  },
  {
    slug: 'masjid-shiratal-mustaqiem',
    name: 'Masjid Shiratal Mustaqiem',
    category: 'Religi',
    distanceKm: 29,
    duration: '±50 menit',
    city: 'Samarinda Seberang',
    address: 'Jl. Pangeran Bendahara, Mesjid, Samarinda Seberang',
    description:
      'Masjid tertua di Samarinda yang dibangun pada 1881 dan kini berstatus cagar budaya. Seluruh bangunannya berbahan kayu ulin dengan menara berarsitektur perpaduan Bugis dan Melayu.',
    highlights: ['Cagar budaya tahun 1881', 'Konstruksi kayu ulin', 'Wisata religi & sejarah'],
    mapsQuery: 'Masjid Shiratal Mustaqiem Samarinda',
  },
  {
    slug: 'pulau-kumala',
    name: 'Pulau Kumala',
    category: 'Rekreasi',
    distanceKm: 45,
    duration: '±1 jam 15 menit',
    city: 'Tenggarong, Kutai Kartanegara',
    address: 'Delta Sungai Mahakam, Tenggarong, Kutai Kartanegara',
    description:
      'Pulau delta di tengah Sungai Mahakam yang disulap menjadi taman rekreasi terpadu. Terhubung ke daratan lewat Jembatan Repo-Repo, dengan menara pandang dan area wahana keluarga.',
    highlights: ['Jembatan kabel Repo-Repo', 'Menara pandang delta', 'Wahana keluarga'],
    mapsQuery: 'Pulau Kumala Tenggarong',
  },
  {
    slug: 'museum-mulawarman',
    name: 'Museum Mulawarman',
    category: 'Budaya',
    distanceKm: 45,
    duration: '±1 jam 15 menit',
    city: 'Tenggarong, Kutai Kartanegara',
    address: 'Jl. Diponegoro, Panji, Tenggarong, Kutai Kartanegara',
    description:
      'Bekas istana Kesultanan Kutai Kartanegara Ing Martadipura yang kini menjadi museum. Menyimpan singgasana sultan, koleksi keramik kuno, serta benda pusaka kerajaan tertua di Nusantara.',
    highlights: ['Bekas istana Kesultanan Kutai', 'Singgasana & pusaka kerajaan', 'Koleksi keramik kuno'],
    mapsQuery: 'Museum Mulawarman Tenggarong',
  },
];

/** Warna & label per kategori, selaras dengan palet halaman fasilitas. */
export const TOURISM_CAT_META: Record<TourismCategory, { color: string; bg: string }> = {
  Budaya: { color: '#7c3aed', bg: '#f5f3ff' },
  Alam: { color: '#059669', bg: '#ecfdf5' },
  Religi: { color: '#0891b2', bg: '#ecfeff' },
  Belanja: { color: '#d97706', bg: '#fffbeb' },
  Rekreasi: { color: '#e11d48', bg: '#fff1f2' },
};

export const TOURISM_CATEGORIES = Object.keys(TOURISM_CAT_META) as TourismCategory[];

/** Tautan pencarian Google Maps untuk sebuah destinasi. */
export function mapsUrl(spot: TourismSpot) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.mapsQuery)}`;
}

/** Tautan rute Google Maps dari bandara menuju destinasi. */
export function directionsUrl(spot: TourismSpot) {
  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&origin=${encodeURIComponent('Bandara APT Pranoto Samarinda')}` +
    `&destination=${encodeURIComponent(spot.mapsQuery)}`
  );
}
