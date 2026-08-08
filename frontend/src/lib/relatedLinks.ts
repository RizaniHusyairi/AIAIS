/**
 * Tautan terkait — portal resmi pemerintah di luar aptpairport.id.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id/tautan-terkait (situs produksi v1), dicocokkan
 *             dengan `database/seeders/ExternalLinkSeeder.php` di repo legacy.
 *   Diambil : 8 Agustus 2026
 *   Catatan : keduanya sepakat pada empat tautan dalam dua kelompok, dengan
 *             dua penyesuaian yang disengaja:
 *
 *             1. SIPPN — seeder memuat URL umum (sippn.menpan.go.id),
 *                halaman tayang memakai URL instansi yang langsung menuju
 *                profil bandara ini. Yang tayang yang dipakai, sesuai aturan
 *                proyek: pengunjung yang mengklik SIPPN ingin melihat entri
 *                bandaranya, bukan beranda nasional.
 *             2. SP4N-LAPOR! — subdomain `www` dibuang karena host itu tidak
 *                ada. Lihat komentar pada entrinya; tautan warisan ini rusak
 *                sejak v1 dan ikut tersalin ke navbar serta footer v2.
 *
 *   Seluruh tautan diperiksa hidup pada 8 Agustus 2026.
 *
 *   Di v1 daftar ini dikelola dari basis data (tabel `external_links` dengan
 *   `sort_order` dan `is_active`). Di sini bentuknya statis: isinya empat
 *   portal pemerintah yang praktis tidak pernah berubah, dan modul CRUD utuh
 *   untuk itu lebih mahal dirawat daripada manfaatnya. Bila suatu saat
 *   daftarnya tumbuh dan sering berubah, barulah pindahkan ke basis data.
 * ────────────────────────────────────────────────────────────────────────
 */

export interface RelatedLink {
  /** Kunci stabil untuk React key. */
  slug: string;
  name: string;
  url: string;
  /** Satu kalimat, verbatim dari sumber. */
  description: string;
}

export interface RelatedLinkGroup {
  slug: string;
  title: string;
  /** Penjelasan kelompok; ditulis untuk v2, bukan kutipan. */
  lead: string;
  links: RelatedLink[];
}

export const TAUTAN_PENGANTAR =
  'Portal resmi pemerintah yang berkaitan dengan penyelenggaraan pelayanan publik dan kedinasan di Bandar Udara APT Pranoto. Seluruh tautan terbuka di tab baru.';

export const RELATED_LINK_GROUPS: RelatedLinkGroup[] = [
  {
    slug: 'pelayanan-publik',
    title: 'Layanan Pengaduan & Informasi Publik',
    lead: 'Kanal nasional tempat masyarakat memeriksa standar layanan kami dan menyampaikan aspirasi di luar portal ini.',
    links: [
      {
        slug: 'sippn',
        name: 'SIPPN',
        // URL instansi, bukan beranda nasional — lihat catatan provenans.
        url: 'https://sippn.menpan.go.id/instansi/kantor-upbu-kelas-i-apt-pranoto---samarinda-1880299',
        description: 'Direktori nasional informasi pelayanan publik Kementerian PANRB.',
      },
      {
        slug: 'lapor',
        name: 'SP4N-LAPOR!',
        // Subdomain `www` DIBUANG dengan sengaja, menyimpang dari sumber.
        // Sumber v1 (dan salinannya di navbar serta footer v2) menulis
        // `https://www.lapor.go.id/`, dan host itu TIDAK ADA — diperiksa 8
        // Agustus 2026 lewat DNS publik Google: `www.lapor.go.id` gagal
        // resolve, `lapor.go.id` menjawab 200. Tautannya selama ini rusak.
        url: 'https://lapor.go.id/',
        description: 'Kanal resmi penyampaian aspirasi dan pengaduan pelayanan publik.',
      },
    ],
  },
  {
    slug: 'aplikasi-pegawai',
    title: 'Aplikasi Internal Pegawai',
    lead: 'Aplikasi kedinasan Kementerian Perhubungan. Membutuhkan akun pegawai untuk masuk.',
    links: [
      {
        slug: 'sik',
        name: 'SIK',
        url: 'https://sik.dephub.go.id/',
        description: 'Sistem Informasi Kepegawaian Kementerian Perhubungan.',
      },
      {
        slug: 'e-kinerja',
        name: 'e-Kinerja',
        url: 'https://e-kinerja.kemenhub.go.id/',
        description: 'Aplikasi penilaian kinerja pegawai Kementerian Perhubungan.',
      },
    ],
  },
];

/** Seluruh tautan tanpa pengelompokan — dipakai navbar dan footer. */
export const RELATED_LINKS: RelatedLink[] = RELATED_LINK_GROUPS.flatMap((g) => g.links);

export const TOTAL_RELATED_LINKS = RELATED_LINKS.length;
