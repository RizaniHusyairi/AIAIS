/**
 * Struktur organisasi BLU Kantor UPBU Kelas I A.P.T. Pranoto — Samarinda.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : bagan resmi `public/profil/struktur-organisasi.jpg`
 *             (1280×901, berasal dari repo portal v1)
 *   Diambil : 7 Agustus 2026, ditranskrip langsung dari gambarnya —
 *             tiap kotak dibaca pada perbesaran penuh agar tidak ada baris
 *             yang terlewat atau tertukar antar unit.
 *   Dasar   : Peraturan Menteri Perhubungan RI Nomor PM 20 Tahun 2024
 *             (lihat `TUGAS` di lib/airportProfile.ts)
 *
 *   HALAMAN INI MENGGANTIKAN GAMBARNYA. Bagan aslinya berupa raster yang
 *   tidak terbaca di layar sempit, tidak dapat dicari, dan tidak terbaca
 *   pembaca layar. Isinya kini menjadi data agar dapat ditelusuri.
 *
 *   ATURAN SELISIH DATA — nama dan nomenklatur jabatan pejabat mengikuti
 *   `OFFICIALS` di lib/airportProfile.ts (bersumber dari halaman "Pejabat
 *   Bandara" aptpairport.id yang lebih baru), BUKAN yang tertulis di bagan.
 *   Bagan lebih lama: di sana tertulis "MURDOKO, A.Md" sedangkan halaman
 *   tayang menulis "MURDOKO, S.H.". Dari bagan hanya diambil hal yang tidak
 *   ada di tempat lain: pangkat/golongan, NIP, susunan unit, dan daftar
 *   jabatan fungsional.
 *
 *   SALAH KETIK PADA SUMBER DIPERTAHANKAN. Bagan memuat beberapa kekeliruan
 *   ketik ("Pengloah", "Penatan", "Pranatan"). Seluruhnya disalin apa adanya
 *   dan ditandai komentar di bawah — memperbaikinya berarti menerbitkan
 *   nomenklatur jabatan yang berbeda dari dokumen resminya.
 *
 *   TANDA "*)" TIDAK DIJELASKAN. Beberapa jabatan pada bagan berakhiran
 *   "*)", tetapi bagannya tidak memuat keterangan apa pun untuk tanda itu.
 *   Tandanya dipertahankan tanpa penjelasan; mengarang artinya jelas keliru.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Satu unit kerja pada bagan. */
export interface OrgUnit {
  /** Kunci stabil untuk React key dan penanda buka-tutup. */
  slug: string;
  /** Nomenklatur unit, seperti tertulis pada bagan. */
  name: string;
  /** Nama ringkas untuk layar sempit. */
  shortName: string;
  /**
   * Slug pejabat pada `OFFICIALS` (lib/airportProfile.ts). Kosong bila unit
   * itu memang tidak mencantumkan pejabat pada bagan (Dewan Pengawas, SPI,
   * dan Unit Usaha).
   */
  officialSlug?: string;
  /** Pangkat/golongan menurut bagan. */
  golongan?: string;
  /** NIP menurut bagan — data ini memang tercantum pada bagan publik. */
  nip?: string;
  /** Daftar jabatan fungsional di bawah unit tersebut. */
  jabatan: string[];
  /**
   * Hubungan garis putus-putus pada bagan: unit yang berkoordinasi dengan
   * Kepala Kantor tetapi tidak berada dalam garis komando langsung.
   */
  dashed?: boolean;
  /** Warna aksen kartu, mengikuti palet portal. */
  accent: string;
}

/* ------------------------------------------------------------------ */
/*  Puncak: Kepala Kantor                                              */
/* ------------------------------------------------------------------ */

export const ORG_HEAD = {
  slug: 'kadek',
  unit: 'Kepala Kantor UPBU Kelas I A.P.T. Pranoto Samarinda',
  golongan: 'Pembina Tk I (IV/b)',
  nip: '19760704 199803 1 001',
  /**
   * Jabatan fungsional yang pada bagan tergantung langsung pada garis
   * Kepala Kantor, di luar keempat unit di bawahnya.
   */
  jabatan: [
    'Penata Laksana Barang Penyelia',
    // "Penatan" ADA PADA BAGAN (seharusnya "Penata"). Dipertahankan.
    'Penatan Keuangan APBN Penyelia',
  ],
} as const;

/* ------------------------------------------------------------------ */
/*  Unit pengawasan — garis putus-putus pada bagan                     */
/* ------------------------------------------------------------------ */

export const ORG_OVERSIGHT: OrgUnit[] = [
  {
    slug: 'dewan-pengawas',
    name: 'Dewan Pengawas',
    shortName: 'Dewan Pengawas',
    // Bagan tidak mencantumkan satu pun jabatan di bawah Dewan Pengawas.
    // Dibiarkan kosong; daftar karangan akan menyesatkan.
    jabatan: [],
    dashed: true,
    accent: '#059669',
  },
  {
    slug: 'spi',
    name: 'Kepala Satuan Pemeriksaan Intern',
    shortName: 'Satuan Pemeriksaan Intern',
    jabatan: [
      'Auditor Ahli Madya',
      'Auditor Ahli Muda',
      'Auditor Ahli Pertama',
      'Auditor Penyelia',
      'Auditor Terampil',
      'Penelaah Teknis Kebijakan',
      // "Pengloah" ADA PADA BAGAN (seharusnya "Pengolah"). Dipertahankan.
      'Pengloah Data dan Informasi',
    ],
    dashed: true,
    accent: '#d97706',
  },
];

/* ------------------------------------------------------------------ */
/*  Unit pelaksana — garis komando langsung                            */
/* ------------------------------------------------------------------ */

export const ORG_UNITS: OrgUnit[] = [
  {
    slug: 'keuangan-tata-usaha',
    name: 'Subbagian Keuangan dan Tata Usaha',
    shortName: 'Keuangan & Tata Usaha',
    officialSlug: 'zaldi',
    golongan: 'Penata Tk. I (III/d)',
    nip: '19810917 200212 1 002',
    accent: '#2563eb',
    jabatan: [
      'Analis Anggaran Ahli Pertama',
      'Analis Hukum Ahli Pertama',
      'Analis Pengelolaan Keuangan APBN Ahli Pertama',
      'Analis SDM Aparatur Ahli Pertama',
      'Arsiparis Ahli Pertama',
      'Arsiparis Penyelia',
      'Arsiparis Mahir',
      'Arsiparis Terampil',
      'Penata Laksana Barang Mahir',
      'Penata Laksana Barang Terampil',
      'Perencana Ahli Pertama',
      'Pranata Hubungan Masyarakat Ahli Pertama',
      'Pranata Hubungan Masyarakat Penyelia',
      'Pranata Hubungan Masyarakat Pelaksana Lanjutan/Mahir',
      'Pranata Hubungan Masyarakat Pelaksana/Terampil',
      'Pranata Keuangan APBN Mahir',
      'Pranata Keuangan APBN Terampil',
      'Pranata Komputer Ahli Pertama',
      'Pranata Komputer Penyelia',
      'Pranata Komputer Pelaksana Lanjutan/Mahir',
      'Pranata Komputer Pelaksana/Terampil',
      'Pranata SDM Aparatur Penyelia',
      'Pranata SDM Aparatur Mahir',
      // "Pranatan" ADA PADA BAGAN (seharusnya "Pranata"). Dipertahankan.
      'Pranatan SDM Aparatur Terampil',
      'Penelaah Teknis Kebijakan',
      'Penata Layanan Operasional *)',
      'Pengelola Layanan Operasional *)',
      'Pengolah Data dan Informasi',
      'Pengadministrasi Perkantoran',
      'Pengelola Umum Operasional *)',
    ],
  },
  {
    slug: 'teknik-operasi',
    name: 'Seksi Teknik dan Operasi',
    shortName: 'Teknik & Operasi',
    officialSlug: 'murdoko',
    golongan: 'Penata Tk. I (III/d)',
    nip: '19780319 200012 1 001',
    accent: '#0891b2',
    jabatan: [
      'Teknisi Penerbangan Penyelia',
      'Teknisi Penerbangan Pelaksana Lanjutan/Mahir',
      'Teknisi Penerbangan Pelaksana/Terampil',
      'Pengevaluasian Penerbangan',
      'Penata Layanan Operasional *)',
      'Pengawas Operasional Bandar Udara',
      'Pengelola Layanan Operasional *)',
      'Personel Penerbangan',
      'Operator Layanan Operasional *)',
    ],
  },
  {
    slug: 'keamanan-darurat',
    name: 'Seksi Keamanan Penerbangan dan Pelayanan Darurat',
    shortName: 'Keamanan Penerbangan & Pelayanan Darurat',
    officialSlug: 'ikhsan',
    golongan: 'Pembina (IV/a)',
    nip: '19811011 200212 1 002',
    accent: '#dc2626',
    jabatan: [
      'Pengevaluasi Keselamatan dan Keamanan Bandar Udara',
      'Pengevaluasi Penerbangan',
      'Pengawas Personel Penerbangan',
      'Personel Teknik dan Operasional Penerbangan',
      'Penata Layanan Operasional *)',
      'Pengawas Penerbangan',
      'Personel Penerbangan',
      'Pengelola Layanan Kesehatan',
      'Pengelola Layanan Operasional *)',
      'Personel Operasional Bandar Udara',
      'Operator Layanan Operasional',
    ],
  },
  {
    slug: 'pelayanan-kerjasama',
    name: 'Seksi Pelayanan dan Kerjasama',
    shortName: 'Pelayanan & Kerjasama',
    officialSlug: 'roslan',
    golongan: 'Penata Tk. I (III/d)',
    nip: '19740919 199803 1 001',
    accent: '#7c3aed',
    jabatan: [
      'Personel Teknik dan Operasional Penerbangan',
      'Penelaah Teknis Kebijakan',
      'Penata Layanan Operasional',
      'Pengawas Operasional Bandar Udara',
      'Pengolah Data dan Informasi',
      'Operator Layanan Operasional',
    ],
  },
];

/**
 * Unit Usaha — pada bagan digambar berkotak putus-putus di bawah Seksi
 * Pelayanan dan Kerjasama, tanpa pejabat yang dicantumkan.
 */
export const ORG_BUSINESS_UNIT: OrgUnit = {
  slug: 'unit-usaha',
  name: 'Unit Usaha',
  shortName: 'Unit Usaha',
  accent: '#0d9488',
  dashed: true,
  jabatan: [
    'Pengembang Kewirausahaan Ahli Pertama',
    'Analis Kerjasama Ahli Pertama',
    'Penelaah Teknis Kebijakan',
    'Pengolah Data dan Informasi',
    'Pengadministrasi Perkantoran *)',
  ],
};

/* ------------------------------------------------------------------ */
/*  Turunan                                                            */
/* ------------------------------------------------------------------ */

/** Seluruh unit selain Kepala Kantor, untuk pencarian dan penghitungan. */
export const ALL_ORG_UNITS: OrgUnit[] = [
  ...ORG_OVERSIGHT,
  ...ORG_UNITS,
  ORG_BUSINESS_UNIT,
];

/** Jumlah seluruh jabatan fungsional pada bagan, termasuk milik Kepala Kantor. */
export const TOTAL_JABATAN: number =
  ORG_HEAD.jabatan.length + ALL_ORG_UNITS.reduce((n, u) => n + u.jabatan.length, 0);

/**
 * Jumlah NAMA jabatan yang berbeda.
 *
 * Beberapa nomenklatur muncul di lebih dari satu unit (mis. "Penelaah Teknis
 * Kebijakan" ada di empat unit), jadi angka ini selalu lebih kecil daripada
 * `TOTAL_JABATAN` dan keduanya menjawab pertanyaan yang berbeda.
 */
export const JABATAN_UNIK: number = new Set([
  ...ORG_HEAD.jabatan,
  ...ALL_ORG_UNITS.flatMap((u) => u.jabatan),
]).size;
