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

/**
 * Warna & atmosfer per kategori.
 *
 * `color`/`bg` adalah palet terang yang dipakai kartu ringkas di beranda dan
 * PWA. `glow`/`wash`/`plate` hanya dipakai panggung sinematik `/tourism`:
 *
 * - `glow`  — warna sorot: berkas cahaya, bokeh, dan aksen antarmuka.
 * - `wash`  — gradasi silang di belakang sorot, sengaja jauh lebih pekat
 *             supaya sorot tetap menonjol di atas latar hitam.
 * - `plate` — plat atmosfer sinematik opsional (lintasan di `public/`).
 *             Selama `null`, seluruh lapisan atmosfer dibangkitkan lewat
 *             gradasi CSS. Plat hanya boleh berisi tekstur dan cahaya abstrak,
 *             bukan gambaran destinasinya: destinasi di halaman ini tempat
 *             nyata, dan fotonya harus datang dari admin lewat API.
 */
export const TOURISM_CAT_META: Record<
  TourismCategory,
  { color: string; bg: string; glow: string; wash: string; plate: string | null }
> = {
  Budaya: { color: '#7c3aed', bg: '#f5f3ff', glow: '#a78bfa', wash: '#2e1065', plate: '/bg/wisata/budaya.webp' },
  Alam: { color: '#059669', bg: '#ecfdf5', glow: '#34d399', wash: '#022c22', plate: '/bg/wisata/alam.webp' },
  Religi: { color: '#0891b2', bg: '#ecfeff', glow: '#22d3ee', wash: '#083344', plate: '/bg/wisata/religi.webp' },
  Belanja: { color: '#d97706', bg: '#fffbeb', glow: '#fbbf24', wash: '#451a03', plate: '/bg/wisata/belanja.webp' },
  Rekreasi: { color: '#e11d48', bg: '#fff1f2', glow: '#fb7185', wash: '#4c0519', plate: '/bg/wisata/rekreasi.webp' },
};

export const TOURISM_CATEGORIES = Object.keys(TOURISM_CAT_META) as TourismCategory[];

/* ================================================================
   Ilustrasi & partikel panggung sinematik
   ================================================================ */

/**
 * Ilustrasi latar per destinasi.
 *
 * PROVENANS. Berkas di sini adalah **ilustrasi sintetis buatan AI**
 * (Higgsfield, model `gpt_image_2`), BUKAN foto. Ia menggambarkan gaya dan
 * suasana destinasi, bukan wujud aslinya — bangunan, ukiran, dan lanskap di
 * dalamnya tidak sesuai kenyataan.
 *
 * Karena itu setiap tempat gambar ini tampil WAJIB memberi label bahwa ia
 * ilustrasi, dan ilustrasi tidak boleh dipakai bila admin sudah mengunggah
 * foto asli (`cover_url`). Urutannya: foto admin → ilustrasi → plat kategori.
 * Lihat `TourismView.tsx`, konstanta `LENCANA_ILUSTRASI`.
 *
 * Kunci memakai `slug` destinasi. Destinasi yang ditambahkan admin lewat API
 * tidak punya entri di sini dan jatuh ke plat kategorinya — itu memang
 * disengaja: mengarang ilustrasi untuk tempat yang belum kita kenal justru
 * memperbesar risiko yang sudah ada.
 *
 * Jangan mengisi kunci dengan lintasan berkas yang belum ada — hasilnya 404
 * dan lapisan latar yang rusak diam-diam.
 *
 * Dibangkitkan 21 Agustus 2026, `gpt_image_2`, rasio 21:9, resolusi 2k,
 * kualitas medium; dikecilkan ke lebar 1600 px dan disimpan sebagai WebP
 * kualitas 72. Prompt disusun dari `description` dan `highlights` tiap
 * destinasi di berkas ini, bergaya gelap agar teks di atasnya tetap terbaca.
 *
 * CATATAN PENTING. Hasilnya condong FOTOREALISTIS, bukan lukisan, meski
 * prompt-nya meminta gaya painterly. Beberapa di antaranya — terutama
 * `islamic-center-samarinda` dan `citra-niaga` — dapat disangka foto pada
 * pandangan sekilas. Itu justru membuat lencana penanda di `TourismView.tsx`
 * bukan sekadar formalitas melainkan syarat: tanpanya pengunjung akan mengira
 * ia melihat wujud asli tempat itu.
 */
export const TOURISM_ILUSTRASI: Record<string, string> = {
  'desa-budaya-pampang': '/bg/wisata/desa-budaya-pampang.webp',
  'air-terjun-tanah-merah': '/bg/wisata/air-terjun-tanah-merah.webp',
  'kebun-raya-unmul': '/bg/wisata/kebun-raya-unmul.webp',
  'islamic-center-samarinda': '/bg/wisata/islamic-center-samarinda.webp',
  'tepian-mahakam': '/bg/wisata/tepian-mahakam.webp',
  'citra-niaga': '/bg/wisata/citra-niaga.webp',
  'kampung-tenun-samarinda-seberang': '/bg/wisata/kampung-tenun-samarinda-seberang.webp',
  'masjid-shiratal-mustaqiem': '/bg/wisata/masjid-shiratal-mustaqiem.webp',
  'pulau-kumala': '/bg/wisata/pulau-kumala.webp',
  'museum-mulawarman': '/bg/wisata/museum-mulawarman.webp',
};

/** Watak gerak partikel yang menyertai sebuah destinasi. */
export type JenisPartikel = 'percik' | 'bara' | 'serbuk' | 'debu-emas' | 'kunang';

/**
 * Sprite partikel per watak.
 *
 * PROVENANS. Sama seperti ilustrasi: dibangkitkan Higgsfield, dan sengaja
 * dibuat di atas latar hitam pekat — bukan transparan — supaya dapat ditumpuk
 * dengan `mix-blend-mode: screen`, yang melarutkan hitamnya tanpa bergantung
 * pada dukungan alfa.
 *
 * Selama `null`, `Partikel` menggambar butirnya sendiri dari gradasi radial
 * dalam warna sorot kategori. Geraknya sudah berjalan penuh tanpa sprite;
 * sprite hanya menggantikan rupa butirnya.
 */
export const PARTIKEL_SPRITE: Record<JenisPartikel, string | null> = {
  percik: '/bg/wisata/partikel/percik.webp',
  bara: '/bg/wisata/partikel/bara.webp',
  serbuk: '/bg/wisata/partikel/serbuk.webp',
  'debu-emas': '/bg/wisata/partikel/debu-emas.webp',
  kunang: '/bg/wisata/partikel/kunang.webp',
};

/** Watak gerak bawaan per kategori, untuk destinasi yang tidak terdaftar. */
export const PARTIKEL_KATEGORI: Record<TourismCategory, JenisPartikel> = {
  Budaya: 'debu-emas',
  Alam: 'serbuk',
  Religi: 'kunang',
  Belanja: 'bara',
  Rekreasi: 'percik',
};

/**
 * Watak gerak per destinasi.
 *
 * Hanya destinasi yang wataknya berbeda dari bawaan kategorinya yang perlu
 * ditulis di sini. Tepian Mahakam dan Pulau Kumala sama-sama Rekreasi dan
 * sama-sama berair, jadi keduanya cukup memakai bawaan; Kebun Raya Unmul
 * berkategori Alam tetapi danaunya membuat percik lebih cocok daripada serbuk.
 */
export const TOURISM_PARTIKEL: Record<string, JenisPartikel> = {
  'kebun-raya-unmul': 'percik',
  'air-terjun-tanah-merah': 'percik',
  'kampung-tenun-samarinda-seberang': 'debu-emas',
  'museum-mulawarman': 'debu-emas',
};

/** Ilustrasi untuk sebuah destinasi, bila ada. */
export function ilustrasiUntuk(slug: string): string | null {
  return TOURISM_ILUSTRASI[slug] ?? null;
}

/** Watak gerak partikel untuk sebuah destinasi. */
export function partikelUntuk(slug: string, kategori: TourismCategory): JenisPartikel {
  return TOURISM_PARTIKEL[slug] ?? PARTIKEL_KATEGORI[kategori];
}

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
