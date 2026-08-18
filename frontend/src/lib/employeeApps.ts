/**
 * Aplikasi kedinasan yang dipakai pegawai Bandar Udara APT Pranoto.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Diambil : 9 Agustus 2026
 *   Sumber per entri:
 *     - SIKEREN, PAS, TIM  → verbatim dari dropdown "Layanan" pada
 *       `components/layout/Navbar.tsx` (tiga tautan ini sudah tayang di sana
 *       sejak v2 rilis; halaman ini memberi mereka tempat yang semestinya).
 *     - Guma               → keterangan langsung dari pengelola portal,
 *       9 Agustus 2026. Tidak ada jejaknya di kode maupun portal v1.
 *       Namanya dikoreksi dari "ELBANDAAP" menjadi "Guma" pada 10 Agustus
 *       2026 — alamat hostnya tidak ikut berubah.
 *     - Lambang SIKEREN & Guma → berkas dari pengelola portal, 10 Agustus
 *       2026 (`logo aplikasi/minilogo-sikeren.png`, `apple-touch-icon.png`),
 *       diperkecil ke 256×256 dan disimpan di `public/apps/`. BERKAS
 *       SUMBERNYA TIDAK IKUT REPOSITORI — aslinya beberapa megabyte dan
 *       tidak pernah dibaca kode; ia terdaftar di `.gitignore` dan disimpan
 *       pengelola portal. Yang dipakai runtime hanya hasil perkecilannya.
 *     - FIDS               → alamat subdomain dari pengelola portal. LIHAT
 *       catatan pada entrinya; kode memakai alamat IP, bukan subdomain ini.
 *     - Portal APT Pranoto → rute nyata `app/admin/login` di repo ini.
 *
 *   Jangan menambah aplikasi, singkatan, atau kalimat keterangan yang tidak
 *   berasal dari salah satu sumber di atas.
 *
 *   Daftar ini statis, bukan dari basis data: isinya lima sistem kedinasan
 *   yang praktis tidak berubah, dan modul CRUD utuh untuk itu lebih mahal
 *   dirawat daripada manfaatnya — pertimbangan yang sama seperti
 *   `lib/relatedLinks.ts`. Bila daftarnya tumbuh dan sering berubah, barulah
 *   pindahkan ke basis data.
 * ────────────────────────────────────────────────────────────────────────
 */

export interface EmployeeAppShortcut {
  label: string;
  url: string;
}

/**
 * Lambang resmi aplikasi, bila ada.
 *
 * `fit` menentukan cara memasangnya di dalam lingkaran simpul:
 *  - `contain` untuk lambang beralfa yang berdiri sendiri (diberi napas),
 *  - `cover`   untuk ikon aplikasi persegi berlatar padat — dipangkas
 *              menjadi lingkaran penuh supaya latarnya tidak muncul sebagai
 *              kotak terang di atas simpul gelap.
 */
export interface EmployeeAppLogo {
  src: string;
  fit: 'contain' | 'cover';
}

export interface EmployeeApp {
  /** Kunci stabil untuk React key dan pencocokan gaya di view. */
  slug: string;
  name: string;
  /** Lambang resmi. Tanpa ini, view memakai ikon generik dari `APP_META`. */
  logo?: EmployeeAppLogo;
  /** Satu kalimat; lihat blok provenans untuk asal-usulnya. */
  description: string;
  url: string;
  /**
   * `false` berarti tautan internal portal ini — dirender dengan `next/link`
   * dan tidak membuka tab baru.
   */
  external: boolean;
  /** Label kecil pada kartu: siapa yang memakai / di mana letaknya. */
  badge: string;
  /** Jalan pintas ke halaman dalam, bila alamat akarnya bukan tujuan akhir. */
  shortcuts?: EmployeeAppShortcut[];
}

export const APLIKASI_PENGANTAR =
  'Sistem kedinasan yang digunakan pegawai Bandar Udara APT Pranoto. Seluruhnya memerlukan akun kedinasan; hubungi unit pengelola masing-masing bila akses belum tersedia.';

export const EMPLOYEE_APPS: EmployeeApp[] = [
  {
    slug: 'sikeren',
    name: 'SIKEREN',
    // Emblem "Sikeren BLU" beralfa; dipangkas dan diperkecil dari berkas
    // aslinya (2500×2500, 4,9 MB) ke 256×256 agar tidak membebani halaman.
    logo: { src: '/apps/sikeren.png', fit: 'contain' },
    // Verbatim dari Navbar.tsx — jangan diperluas tanpa sumber.
    description: 'Sistem keuangan dan penagihan.',
    url: 'https://sikeren.aptpairport.id',
    external: true,
    badge: 'Keuangan',
  },
  {
    // Slug dan alamatnya tetap `elbandaap` — yang berubah hanya nama yang
    // ditampilkan. Host `elbandaap.aptpairport.id` masih itu juga, jadi
    // menyamakan slug dengan nama baru justru memutus jejaknya.
    slug: 'elbandaap',
    name: 'Guma',
    // Ikon aplikasi persegi berlatar terang, karena itu `cover`.
    logo: { src: '/apps/guma.png', fit: 'cover' },
    description:
      'Monitoring peralatan elektronika serta dokumentasi hasil inspeksi terminal dan sisi udara.',
    url: 'https://elbandaap.aptpairport.id',
    external: true,
    badge: 'Teknik Operasi',
  },
  {
    slug: 'pas',
    name: 'PAS & TIM',
    description:
      'Pas bandara untuk orang dan Tanda Izin Mengemudi sisi udara.',
    url: 'https://pas.aptpairport.id',
    external: true,
    badge: 'Perizinan',
    // Navbar menaut langsung ke dua halaman dalam ini. Akar subdomainnya yang
    // dipakai sebagai tujuan kartu, tapi kedua jalan pintas lama dipertahankan
    // supaya tidak ada yang kehilangan pintasan yang sudah dihafal.
    shortcuts: [
      { label: 'PAS Orang', url: 'https://pas.aptpairport.id/website/layanan/pas_orang.html' },
      { label: 'TIM', url: 'https://pas.aptpairport.id/website/layanan/tim.html' },
    ],
  },
  {
    slug: 'fids',
    name: 'FIDS',
    description: 'Tampilan informasi jadwal penerbangan.',
    // Perlu verifikasi: subdomain ini berasal dari pengelola portal dan belum
    // pernah muncul di kode. Server FIDS yang dibaca portal justru diakses
    // lewat IP — lihat `FlightController::FIDS_BASE` (backend) dan
    // `FIDS_ORIGIN` di `lib/api.ts`. Keduanya bisa saja mesin yang sama;
    // jangan diam-diam diganti IP sebelum ada konfirmasi.
    url: 'https://fids.aptpairport.id',
    external: true,
    badge: 'Operasi Sisi Udara',
  },
  {
    slug: 'portal-cms',
    name: 'Portal APT Pranoto',
    description: 'Pengelolaan informasi yang tayang di portal ini.',
    // Satu-satunya tautan internal pada daftar ini.
    url: '/admin/login',
    external: false,
    badge: 'Portal ini',
  },
];

export const TOTAL_EMPLOYEE_APPS = EMPLOYEE_APPS.length;
