/**
 * Profil resmi Bandar Udara APT Pranoto — teks otoritatif.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id (portal v1), halaman "Profil Bandara" dan
 *             "Pejabat Bandara" — DIAMBIL LANGSUNG DARI SITUS PRODUKSI
 *             YANG SEDANG TAYANG.
 *   Diambil : 1 Agustus 2026
 *
 *   PENTING — JANGAN menyalin ulang dari repo legacy lokal
 *   (C:\laragon\www\aptp-airport-main). Repo itu SUDAH TIDAK SINKRON dengan
 *   produksi: halaman profil v1 membaca kunci `profile_*` dari tabel
 *   `settings`, dan di basis data lokal baris itu kosong sehingga Blade
 *   memakai teks cadangan yang jauh lebih lama. Perbedaannya nyata — Visi,
 *   jumlah butir Misi (5 vs 6), dan daftar rute semuanya berbeda.
 *   Bila terjadi selisih, YANG TAYANG DI aptpairport.id YANG MENANG.
 *
 *   Bagan struktur organisasi (public/profil/struktur-organisasi.jpg) berasal
 *   dari repo legacy dan bertanggal lebih awal daripada halaman pejabat: pada
 *   bagan tertulis "MURDOKO, A.Md", sedangkan halaman tayang menulis
 *   "MURDOKO, S.H.". Nama dan gelar di berkas ini mengikuti halaman tayang.
 *   Isi bagan itu sendiri sudah ditranskrip ke `lib/orgStructure.ts` dan
 *   dirender sebagai data, bukan gambar.
 *
 *   Seluruh teks bertanda "verbatim" disalin apa adanya. JANGAN merapikan
 *   ejaan, tanda baca, atau kapitalisasinya — ini kutipan dokumen resmi,
 *   bukan salinan yang boleh disunting.
 * ────────────────────────────────────────────────────────────────────────
 * PELINDUNGAN DATA PRIBADI — UU 27/2022
 *
 *   RIWAYAT PENDIDIKAN PEJABAT DIHAPUS DARI BERKAS INI, bukan sekadar
 *   disembunyikan dari tampilan.
 *
 *   Alasannya menentukan: berkas ini modul `lib/` yang ikut dibundel dan
 *   DIKIRIM KE PERAMBAN SETIAP PENGUNJUNG. Data yang hanya disembunyikan
 *   lewat CSS atau percabangan render tetap terbaca siapa pun yang membuka
 *   berkas JavaScript-nya. Satu-satunya penyensoran yang berarti adalah
 *   datanya tidak pernah berangkat dari server.
 *
 *   Yang TETAP ADA di sini dan memang wajib diumumkan: nama, nomenklatur
 *   jabatan, foto resmi kedinasan, riwayat jabatan, dan penghargaan
 *   kedinasan — UU 14/2008 tentang Keterbukaan Informasi Publik menuntutnya,
 *   dan seluruhnya melekat pada JABATAN, bukan pada pribadi pemangkunya.
 *
 *   Jangan menambahkan kembali: pendidikan, NIP, pangkat/golongan, tanggal
 *   lahir, agama, alamat rumah, nomor ponsel, atau nomor identitas apa pun.
 *   Lihat agen `.claude/agents/sensor-data-pribadi.md`.
 * ────────────────────────────────────────────────────────────────────────
 */

import { AIRPORTS, HOME_IATA } from '@/lib/airports';

/* ------------------------------------------------------------------ */
/*  Pejabat struktural                                                 */
/* ------------------------------------------------------------------ */

export interface Official {
  /** Kunci stabil untuk React key; bukan bagian dari data resmi. */
  slug: string;
  /** Nama lengkap beserta gelar, persis seperti tertulis di aptpairport.id. */
  name: string;
  /** Nomenklatur jabatan lengkap. */
  title: string;
  /** Nomenklatur ringkas untuk kartu dan carousel yang sempit. */
  shortTitle: string;
  /** Path publik, selalu huruf kecil (server produksi peka huruf besar-kecil). */
  photo: string;
  riwayatJabatan: string[];
  penghargaan: string[];
  /*
   * `pendidikan` SENGAJA TIDAK ADA — lihat catatan PDP di kepala berkas.
   *
   * Medannya dihapus dari antarmuka, bukan sekadar dikosongkan isinya:
   * selama medannya masih ada, penambahan data pejabat berikutnya akan
   * mengisinya kembali tanpa siapa pun menyadari bahwa itu keputusan yang
   * pernah dicabut.
   */
}

/** Instansi tempat seluruh pejabat di bawah bernaung. */
export const ORG_NAME = 'Kantor UPBU Kelas I A.P.T. Pranoto Samarinda';

/** Urutan array = urutan tampil. Jangan diurutkan ulang. */
export const OFFICIALS: Official[] = [
  {
    slug: 'kadek',
    name: 'I Kadek Yuli Sastrawan, S.Ikom., S.SiT.',
    title: 'Kepala BLU Kantor UPBU Kelas I A.P.T. Pranoto',
    shortTitle: 'Kepala Kantor',
    photo: '/pejabat/kadek.png',
    riwayatJabatan: [
      'Kepala Kantor Otoritas Bandara Wilayah VII Sepinggan – Balikpapan (Juni 2024 – Agustus 2024)',
      'Kepala Bidang Pelayanan dan Pengoperasian Bandar Udara Kantor Otoritas Bandara Wilayah IV Bali (2024-2025)',
      'Kepala BLU Kantor UPBU Kelas I A.P.T. Pranoto – Samarinda (2025 – sekarang)',
    ],
    penghargaan: [
      'Satya Lancana Karya Satya 10 Tahun (2014)',
      'Satya Lancana Karya Satya 20 Tahun (2018)',
    ],
  },
  {
    slug: 'zaldi',
    name: 'Zaldi Ardian, A.Md',
    title: 'Kepala Subbagian Keuangan dan Tata Usaha',
    shortTitle: 'Kasubbag Keuangan & Tata Usaha',
    photo: '/pejabat/zaldi.png',
    riwayatJabatan: [
      'Kepala Kantor UPBU Maratua (2020–2024)',
      'Kepala Subbagian Tata Usaha (2024–Sekarang)',
    ],
    penghargaan: ['Satya Lancana Karya Satya 10.'],
  },
  {
    slug: 'ikhsan',
    name: 'Mochamad Ikhsan Fadilah, SE, M.M.Tr',
    title: 'Kepala Seksi Keamanan Penerbangan dan Pelayanan Darurat',
    shortTitle: 'Kasi Keamanan Penerbangan & Pelayanan Darurat',
    // Aslinya JPEG berlatar putih; latarnya dibuat transparan agar sama dengan
    // foto pejabat lain yang tampil di atas kartu gradien biru.
    photo: '/pejabat/ikhsan.png',
    riwayatJabatan: [
      'Kepala Urusan Tata Usaha (2019–2020)',
      'Kepala UPBU Kelas III Yuvai Semaring (2020–2024)',
      'Kepala Seksi Teknik dan Operasi (2024–2025)',
      'Kepala Seksi Keamanan Penerbangan dan Pelayanan Darurat (2025–Sekarang).',
    ],
    penghargaan: ['Satya Lancana Karya Satya 10 Tahun 2021.'],
  },
  {
    slug: 'roslan',
    name: 'Roslan, S.E.',
    title: 'Kepala Seksi Pelayanan dan Kerjasama',
    shortTitle: 'Kasi Pelayanan & Kerjasama',
    photo: '/pejabat/roslan.png',
    riwayatJabatan: [
      'Kepala Seksi Pelayanan Bandara Juwata Tarakan (2018-2025)',
      'Kepala Seksi Pelayanan dan Kerjasama (2025-sekarang)',
    ],
    penghargaan: [
      'Satya Lancana Karya Satya 10 Tahun 2012',
      'Satya Lancana Karya Satya 20 Tahun 2020',
    ],
  },
  {
    slug: 'murdoko',
    name: 'MURDOKO, S.H.',
    title: 'Kepala Seksi Teknik dan Operasi',
    shortTitle: 'Kasi Teknik & Operasi',
    photo: '/pejabat/murdoko.png',
    riwayatJabatan: [
      'Kepala Seksi Teknik, Operasi, Keamanan dan Pelayanan UPBU Kelas II Iskandar Pangkalan Bun (2019–2023)',
      // Salah ketik "Pelayann" ADA PADA SUMBER. Dipertahankan apa adanya.
      'Kepala Seksi Keamanan Penerbangan dan Pelayann Darurat UPBU Kelas III A.P.T. Pranoto. (2023–2025)',
      'Kepala Seksi Teknik dan Operasi UPBU Kelas III A.P.T. Pranoto. (2025–Sekarang)',
    ],
    penghargaan: [
      'Satya Lancana Karya Satya 10 Tahun 2012.',
      'Satya Lancana Karya Satya 20 Tahun 2021',
    ],
  },
];

/** Kepala kantor selalu entri pertama. */
export const HEAD_OFFICIAL = OFFICIALS[0];

/* ------------------------------------------------------------------ */
/*  Visi & Misi                                                        */
/* ------------------------------------------------------------------ */

/**
 * Visi resmi. Kalimatnya panjang: bagian pembuka menjelaskan dasar
 * penetapan, lalu pernyataan visinya sendiri berada di dalam tanda kutip.
 * Keduanya dipisah agar bagian yang dikutip dapat ditonjolkan tanpa
 * memotong kalimatnya.
 */
export const VISI = {
  /** verbatim */
  pembuka:
    'Sesuai dengan visi, misi dan arah kebijakan Kementerian Perhubungan dan Direktorat Jenderal Perhubungan Udara serta tugas pokok dan fungsi BLU Kantor UPBU Kelas I A.P.T. Pranoto – Samarinda serta memperhatikan hasil analisis lingkungan strategis bandar udara, maka ditetapkan Visi BLU Kantor UPBU Kelas I A.P.T. Pranoto – Samarinda adalah',
  /** verbatim, isi tanda kutip pada sumber */
  pernyataan:
    'Terwujudnya penyelenggaraan jasa kebandarudaraan sesuai dengan standar keselamatan, keamanan dan pelayanan Bandar Udara yang Bertaraf Internasional dalam mewujudkan visi dan misi Direktorat Jenderal Perhubungan Udara yaitu Transportasi Udara Maju Menuju Indonesia Emas 2045',
} as const;

/** verbatim, berhuruf a–f pada sumber. */
export const MISI: { label: string; text: string }[] = [
  { label: 'a', text: 'Mengembangkan infrastruktur dan layanan bandara bertaraf internasional;' },
  { label: 'b', text: 'Meningkatkan peran strategis Bandara A.P.T. Pranoto sebagai International Gateway penunjang Ibu Kota Nusantara (IKN);' },
  { label: 'c', text: 'Mewujudkan Bandara A.P.T. Pranoto sebagai Green & Smart Airport;' },
  { label: 'd', text: 'Memperkuat kapasitas SDM, tata kelola, dan manajemen risiko BLU;' },
  { label: 'e', text: 'Mendorong kemitraan, investasi, dan pengembangan ekonomi regional;' },
  { label: 'f', text: 'Meningkatkan citra dan daya tarik internasional Bandara A.P.T. Pranoto;' },
];

/* ------------------------------------------------------------------ */
/*  Sejarah                                                            */
/* ------------------------------------------------------------------ */

/** verbatim, satu paragraf pada sumber; dipecah agar enak dibaca. */
export const SEJARAH: string[] = [
  'Bandar Udara Aji Pangeran Tumenggung Pranoto Samarinda beroperasi sejak tanggal 24 Mei 2018 menggantikan Bandar Udara Temindung yang resmi ditutup pada 23 Mei 2018.',
  'Bandara Aji Pangeran Tumenggung (A.P.T.) Pranoto Samarinda bermula dari kebutuhan masyarakat Samarinda dan sekitarnya akan sarana transportasi udara yang lebih memadai. Sebelumnya, Bandara Temindung yang berada di pusat kota Samarinda menjadi satu-satunya pintu gerbang udara, namun kapasitas dan panjang landas pacunya yang terbatas tidak lagi mampu menampung peningkatan jumlah penumpang serta pesawat yang lebih besar.',
  'Kondisi ini memicu pemerintah kota dan pemerintah provinsi merencanakan pembangunan bandara baru yang dapat memenuhi standar keselamatan, kapasitas, dan kenyamanan bagi penumpang.',
];

/**
 * Linimasa — hanya peristiwa yang punya dasar pada sumber resmi.
 * Entri "2011 Awal Pembangunan" dan "2019 Perpanjangan Runway" yang
 * sebelumnya ada di halaman ini dihapus: keduanya tidak muncul di sumber
 * mana pun.
 */
export const TIMELINE: { year: string; title: string; desc: string }[] = [
  {
    year: '2018',
    title: 'Mulai Beroperasi',
    desc: 'Beroperasi sejak 24 Mei 2018, menggantikan Bandar Udara Temindung yang resmi ditutup sehari sebelumnya.',
  },
  {
    year: '2023',
    title: 'Ditetapkan sebagai BLU',
    desc: 'Melalui Keputusan Menteri Keuangan No. 63/KMK.05/2023, ditetapkan sebagai instansi dengan Pola Pengelolaan Keuangan Badan Layanan Umum.',
  },
  {
    year: '2024',
    title: 'Organisasi & Tata Kerja Baru',
    desc: 'PM 20 Tahun 2024 menetapkan organisasi dan tata kerja Kantor UPBU A.P.T. Pranoto, memperkuat perannya sebagai gerbang penunjang Ibu Kota Nusantara.',
  },
];

/* ------------------------------------------------------------------ */
/*  Status BLU, Tugas & Fungsi                                         */
/* ------------------------------------------------------------------ */

export const STATUS_BLU = {
  dasar: 'Keputusan Menteri Keuangan No. 63/KMK.05/2023',
  /** verbatim */
  text: 'Berdasarkan Keputusan Menteri Keuangan No: 63/KMK.05/2023, Bandara A.P.T. Pranoto ditetapkan sebagai Instansi Pemerintah dengan Pola Pengelolaan Keuangan Badan Layanan Umum (BLU), bersama bandara lain seperti Domine Eduard Osok (Sorong) dan Sultan Babullah (Ternate).',
  bersama: ['Domine Eduard Osok (Sorong)', 'Sultan Babullah (Ternate)'],
} as const;

export const TUGAS = {
  dasar: 'Peraturan Menteri Perhubungan RI Nomor PM 20 Tahun 2024',
  /** verbatim */
  text: 'Berdasarkan Peraturan Menteri Perhubungan Republik Indonesia Nomor: PM 20 Tahun 2024 tentang Organisasi dan Tata Kerja Kantor Unit Penyelenggara Bandar Udara Aji Pangeran Tumenggung Pranoto, BLU Kantor UPBU Kelas I A.P.T. Pranoto – Samarinda mempunyai tugas melaksanakan pelayanan jasa kebandarudaraan dan jasa terkait bandar udara, kegiatan keamanan, keselamatan dan ketertiban penerbangan pada bandar udara yang belum diusahakan secara komersial dan dikecualikan pengelolaan keuangannya.',
} as const;

/** verbatim, berhuruf a–l pada sumber. */
export const FUNGSI: { label: string; text: string }[] = [
  { label: 'a', text: 'Pelaksanaan penyusunan rencana dan program, Rencana Strategis Bisnis, dan rencana bisnis dan anggaran;' },
  { label: 'b', text: 'Pelaksanaan pengoperasian fasilitas keselamatan, sisi udara, sisi darat, dan alat-alat besar Bandar Udara, serta fasilitas penunjang;' },
  { label: 'c', text: 'Pelaksanaan perawatan dan perbaikan fasilitas keselamatan, sisi udara, sisi darat, dan alat-alat besar Bandar Udara, serta fasilitas penunjang;' },
  { label: 'd', text: 'Pelaksanaan pelayanan pengaturan pergerakan pesawat udara serta penyusunan jadwal penerbangan;' },
  { label: 'e', text: 'Pelaksanaan pengamanan pelayanan pengangkutan penumpang, awak pesawat udara, barang, jinjingan, pos dan kargo, serta barang berbahaya dan senjata;' },
  { label: 'f', text: 'Pelaksanaan pengawasan, pengendalian keamanan dan ketertiban di lingkungan kerja, pelaksanaan pengoperasian, perawatan dan perbaikan fasilitas keamanan penerbangan, dan pelayanan darurat Bandar Udara;' },
  // Salah ketik "kerja sarna" (seharusnya "kerja sama") ADA PADA SUMBER.
  // Sengaja dipertahankan: butir ini kutipan PM 20/2024 dari aptpairport.id.
  // Jangan diperbaiki tanpa memperbaiki sumbernya lebih dulu.
  { label: 'g', text: 'Pelaksanaan kerja sarna dan pengembangan usaha jasa kebandarudaraan dan jasa terkait Bandar Udara;' },
  { label: 'h', text: 'Pelaksanaan koordinasi dengan instansi/lembaga terkait penyelenggaraan Bandar Udara;' },
  { label: 'i', text: 'Pelaksanaan pengoperasian dan pelayanan fasilitas terminal penumpang, kargo dan penunjang, serta pengelolaan dan pengendalian higiene dan sanitasi;' },
  { label: 'j', text: 'Pelaksanaan pemeriksaan intern;' },
  { label: 'k', text: 'Pelaksanaan pengelolaan keuangan dan barang milik negara, pelaksanaan urusan kepegawaian, ketatausahaan, kerumahtanggaan, hukum dan hubungan masyarakat; dan' },
  { label: 'l', text: 'Pelaksanaan evaluasi dan pelaporan;' },
];

/* ------------------------------------------------------------------ */
/*  Rute, kontak, bagan                                                */
/* ------------------------------------------------------------------ */

export const ROUTES = {
  reguler: ['Jakarta', 'Surabaya', 'Yogyakarta', 'Denpasar', 'Berau'],
  perintis: ['Long Apung', 'Maratua', 'Datah Dawai', 'Muara Wahau'],
} as const;

export const CONTACT = {
  address: 'Jl. Poros Samarinda – Bontang, Kel. Sungai Siring, Samarinda – Kalimantan Timur 75119',
  phone: '+62 811 551 944',
  /** Untuk href="tel:" — tanpa spasi. */
  phoneHref: '+62811551944',
  email: 'mail.aptpranotoairport@gmail.com',
  /** Jam operasi bandara (bukan jam kantor). */
  operationalHours: '07.00 – 20.00 WITA',
  /** Koordinat sengaja dibaca dari airports.ts agar hanya ada satu sumber. */
  lat: AIRPORTS[HOME_IATA].lat,
  lon: AIRPORTS[HOME_IATA].lon,
} as const;

/*
 * `ORG_CHART` (gambar bagan struktur organisasi) sudah tidak ada di sini.
 * Bagannya kini dirender sebagai data terstruktur di `lib/orgStructure.ts`,
 * bukan sebagai berkas gambar. Berkas `public/profil/struktur-organisasi.jpg`
 * tetap disimpan sebagai arsip sumber transkripsinya.
 */

/** Tautan peta eksternal; tanpa peta tersemat agar tetap berguna tanpa internet. */
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${CONTACT.lat},${CONTACT.lon}`;
