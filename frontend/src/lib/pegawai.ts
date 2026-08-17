/**
 * Sebaran pegawai BLU Kantor UPBU Kelas I A.P.T. Pranoto — Samarinda.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : "REKAP PEGAWAI" — rekap kepegawaian resmi kantor,
 *             tertanggal 02 April 2026. Berkasnya `docs/Daftar Pegawai.xlsx`.
 *   Diambil : 15 Agustus 2026, dihitung sekali jalan dari berkas itu.
 *   Struktur: slug unit mengikuti `lib/orgStructure.ts`
 *             (Peraturan Menteri Perhubungan RI Nomor PM 20 Tahun 2024).
 *
 *   BERKAS SUMBERNYA TIDAK IKUT REPOSITORI; ia terdaftar di `.gitignore`.
 * ────────────────────────────────────────────────────────────────────────
 * BERKAS INI TIDAK MEMUAT SATU PUN DATA PRIBADI — DAN JANGAN SAMPAI MEMUATNYA
 *
 *   Yang ada di sini hanya nomenklatur jabatan dan **berapa orang** yang
 *   mengisinya. Tidak ada nama, dan tidak boleh ditambahkan.
 *
 *   Rekap aslinya punya 24 kolom: nama, NIK, NIP, ID BKN, Karpeg, jenis
 *   kelamin, agama, golongan, TMT, usia, pendidikan, alamat rumah, email, dan
 *   nomor ponsel. Tidak satu pun dibaca ke sini.
 *
 *   ALASANNYA BUKAN SEKADAR "TIDAK DITAMPILKAN". Berkas ini ikut terkirim ke
 *   peramban setiap pengunjung sebagai bagian dari bundel JavaScript. Apa pun
 *   yang tertulis di sini terbit ke publik — terlihat di halaman atau tidak.
 *   Menaruh 128 nama di sini lalu tidak merendernya berarti tetap
 *   menerbitkannya, hanya dengan cara yang lebih sulit disadari.
 *
 *   Sebaran jabatan seperti ini sudah cukup untuk memenuhi UU 14/2008 tentang
 *   Keterbukaan Informasi Publik: pengunjung dapat melihat susunan organisasi
 *   beserta kekuatan personel tiap unit, tanpa satu orang pun terpapar.
 * ────────────────────────────────────────────────────────────────────────
 * CATATAN PENYALINAN
 *
 *   NOMENKLATUR DI SINI BUKAN NOMENKLATUR BAGAN. Yang di sini adalah jabatan
 *   pelaksana menurut BKN; yang di `orgStructure.ts` berasal dari bagan
 *   organisasi resmi. Keduanya mirip tetapi tidak sama:
 *
 *       bagan  "Teknisi Penerbangan Pelaksana/Terampil"
 *       rekap  "Teknisi Penerbangan Terampil"
 *
 *   Karena itu keduanya TIDAK PERNAH disandingkan lewat pencocokan teks, dan
 *   halaman menampilkannya sebagai dua daftar berlabel.
 *
 *   KAPITALISASI DIRAPIKAN, KATA-KATANYA TIDAK. Rekap menulis sebagian jabatan
 *   dengan huruf besar semua, tidak konsisten antar baris. Dua hal dilakukan
 *   saat penyalinan, keduanya hanya menyentuh besar-kecil huruf:
 *
 *     1. Satu jabatan yang muncul dalam dua kapitalisasi digabung menjadi satu
 *        dan ditulis dengan varian huruf campurnya. Contoh: "PENGAWAS
 *        OPERASIONAL BANDAR UDARA" (2 orang) dan "Pengawas Operasional Bandar
 *        Udara" (6 orang) menjadi satu baris berisi 8 orang. Tanpa ini,
 *        halaman menampilkan jabatan yang sama dua kali dengan jumlah
 *        terbelah.
 *
 *     2. "OPERATOR LAYANAN OPERASIONAL" — satu-satunya yang tidak punya
 *        varian huruf campur di rekap — ditulis "Operator Layanan
 *        Operasional", MENGIKUTI EJAAN BAGAN RESMI, yang memakai bentuk itu
 *        di ketiga unit (lihat `orgStructure.ts`). Ini penerapan "ATURAN
 *        SELISIH DATA" yang sudah berlaku di berkas itu: bila bagan dan
 *        sumber lain berbeda, yang menang adalah sumber yang lebih resmi.
 *
 *   Yang TIDAK pernah diubah adalah kata-katanya. Nomenklatur jabatan disalin
 *   persis; menyunting katanya berarti menerbitkan jabatan yang berbeda dari
 *   dokumen resminya.
 *
 *   PEMERIKSAAN SILANG. Rekap ini mengonfirmasi kelima pemetaan `officialSlug`
 *   di `orgStructure.ts` — yang sebelumnya hanya ditranskrip dari gambar
 *   raster. Kelimanya cocok: kadek, zaldi, murdoko, ikhsan, roslan.
 *
 *   SELISIH NAMA UNIT DIPERTAHANKAN. Bagan menulis "Subbagian Keuangan dan
 *   Tata Usaha", rekap menulis "Subbagian Tata Usaha". Nama unit mengikuti
 *   bagan — sumber yang lebih resmi untuk susunan organisasi.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Tanggal rekap kepegawaian; ditampilkan agar pengunjung tahu data ini kapan. */
export const REKAP_TANGGAL = '2 April 2026';

/** Satu nomenklatur jabatan pada sebuah unit, beserta jumlah pengisinya. */
export interface KelompokJabatan {
  /** Nomenklatur jabatan menurut rekap BKN — BUKAN nomenklatur bagan. */
  jabatan: string;
  /** Banyaknya pegawai yang mengisi jabatan itu pada unit tersebut. */
  jumlah: number;
  /**
   * Kepala unit. Ia tetap dihitung sebagai pegawai unit, tetapi tidak diulang
   * di daftar jabatan — halaman sudah menampilkannya sebagai kartu pejabat
   * berfoto, lengkap dengan gelar dari `OFFICIALS`.
   */
  pejabat?: boolean;
}

/**
 * Pemetaan kolom "Unit Kerja" pada rekap ke slug unit pada bagan.
 *
 * Ditulis eksplisit sebagai dokumentasi penyalinan: nama unit di rekap tidak
 * selalu sama dengan di bagan (lihat catatan selisih di kepala berkas).
 */
export const UNIT_REKAP: Record<string, string> = {
  'Kantor Unit Penyelenggara Bandar Udara Kelas I Aji Pangeran Tumenggung Pranoto': 'kantor',
  'Seksi Teknik dan Operasi': 'teknik-operasi',
  'Subbagian Tata Usaha': 'keuangan-tata-usaha',
  'Seksi Keamanan Penerbangan dan Pelayanan Darurat': 'keamanan-darurat',
  'Seksi Pelayanan dan Kerjasama': 'pelayanan-kerjasama',
};

/**
 * Sebaran jabatan per unit. Urutan = kepala unit lebih dulu, lalu kelompok
 * terbesar; itulah urutan tampilnya. Unit bagan yang tidak muncul di sini
 * (Dewan Pengawas, SPI, Unit Usaha) memang tidak ada di rekap.
 */
export const PEGAWAI_PER_UNIT: Record<string, KelompokJabatan[]> = {
  kantor: [
    { jabatan: 'Kepala Kantor Unit Penyelenggara Bandar Udara Kelas I Aji Pangeran Tumenggung Pranoto', jumlah: 1, pejabat: true },
    { jabatan: 'Penelaah Teknis Kebijakan', jumlah: 3 },
  ],
  'keuangan-tata-usaha': [
    { jabatan: 'Kepala Subbagian Tata Usaha', jumlah: 1, pejabat: true },
    { jabatan: 'Penelaah Teknis Kebijakan', jumlah: 16 },
    { jabatan: 'Penata Layanan Operasional', jumlah: 12 },
    { jabatan: 'Pengadministrasi Perkantoran', jumlah: 5 },
    { jabatan: 'Pengolah Data dan Informasi', jumlah: 2 },
  ],
  'teknik-operasi': [
    { jabatan: 'Kepala Seksi Teknik dan Operasi', jumlah: 1, pejabat: true },
    { jabatan: 'Teknisi Penerbangan Terampil', jumlah: 13 },
    { jabatan: 'Operator Layanan Operasional', jumlah: 8 },
    { jabatan: 'Pengawas Operasional Bandar Udara', jumlah: 8 },
    { jabatan: 'Penata Layanan Operasional', jumlah: 5 },
    { jabatan: 'Teknisi Penerbangan Penyelia', jumlah: 4 },
    { jabatan: 'Teknisi Penerbangan Mahir', jumlah: 3 },
    { jabatan: 'Pengelola Layanan Operasional', jumlah: 1 },
    { jabatan: 'Personel Penerbangan', jumlah: 1 },
  ],
  'keamanan-darurat': [
    { jabatan: 'Kepala Seksi Keamanan Penerbangan dan Pelayanan Darurat', jumlah: 1, pejabat: true },
    { jabatan: 'Pengevaluasi Keselamatan dan Keamanan Bandar Udara Bidang Avsec', jumlah: 9 },
    { jabatan: 'Pengevaluasi Keselamatan dan Keamanan Bandar Udara Bidang PKP-PK', jumlah: 6 },
    { jabatan: 'Operator Layanan Operasional', jumlah: 5 },
    { jabatan: 'Pengawas Personel Penerbangan Bidang PKP-PK', jumlah: 5 },
    { jabatan: 'Personel Operasional Bandar Udara', jumlah: 3 },
    { jabatan: 'Personel Penerbangan Bidang PKP-PK', jumlah: 2 },
    { jabatan: 'Personel Teknik dan Operasional Penerbangan Bidang Faskampen', jumlah: 2 },
    { jabatan: 'Personel Penerbangan Bidang Avsec', jumlah: 1 },
    { jabatan: 'Teknisi Penerbangan Terampil', jumlah: 1 },
  ],
  'pelayanan-kerjasama': [
    { jabatan: 'Kepala Seksi Pelayanan dan Kerjasama', jumlah: 1, pejabat: true },
    { jabatan: 'Penelaah Teknis Kebijakan', jumlah: 4 },
    { jabatan: 'Operator Layanan Operasional', jumlah: 1 },
    { jabatan: 'Penata Layanan Operasional', jumlah: 1 },
    { jabatan: 'Pengolah Data dan Informasi', jumlah: 1 },
    { jabatan: 'Personel Teknik dan Operasional Penerbangan', jumlah: 1 },
  ],
};

/* ------------------------------------------------------------------ */
/*  Turunan — dihitung, bukan ditulis tangan, supaya tidak bisa meleset
    dari data di atas ketika kelak ada pemutakhiran.                    */
/* ------------------------------------------------------------------ */

/** Jumlah pegawai per slug unit; unit tanpa pegawai tidak punya kunci di sini. */
export const JUMLAH_PEGAWAI_UNIT: Record<string, number> = Object.fromEntries(
  Object.entries(PEGAWAI_PER_UNIT).map(([unit, kel]) => [
    unit,
    kel.reduce((n, k) => n + k.jumlah, 0),
  ]),
);

export const TOTAL_PEGAWAI = Object.values(JUMLAH_PEGAWAI_UNIT).reduce((n, j) => n + j, 0);

/** Jabatan sebuah unit tanpa kepala unitnya — itulah yang dirender sebagai daftar. */
export function jabatanUnit(slugUnit: string): KelompokJabatan[] {
  return (PEGAWAI_PER_UNIT[slugUnit] ?? []).filter((k) => !k.pejabat);
}
