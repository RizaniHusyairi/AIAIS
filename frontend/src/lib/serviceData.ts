/**
 * Layanan Bandara — sembilan layanan pengajuan pada menu "Layanan".
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id (situs produksi v1), /layanan/<slug>
 *   Diambil : 7 Agustus 2026
 *   Catatan : seluruh judul, deskripsi, daftar persyaratan, dan alur di
 *             bawah ditranskrip dari halaman yang benar-benar tayang di v1,
 *             bukan disusun ulang. Kalimatnya sengaja dipertahankan apa
 *             adanya — ini teks layanan publik, dan menghaluskannya berarti
 *             mengubah persyaratan yang mengikat pemohon.
 *
 *   ⚠ DAFTAR DI BAWAH BUKAN LAGI SUMBER UTAMA.
 *   Isi layanan kini datang dari API (`/services`), yang membacanya dari tabel
 *   `services` warisan v1. Daftar ini tinggal sebagai BAWAAN PRESENTASI: ikon,
 *   warna aksen, serta ringkasan dan paragraf pembuka yang tidak punya kolom
 *   di basis data v1. `gabungLayanan()` di bawah menimpakan data API di
 *   atasnya.
 *
 *   ⚠ PENGAJUAN BELUM ADA DI PORTAL INI.
 *   Kesepuluh layanan berujung pada dashboard pemohon v1
 *   (`dashboard/tenant`, dst.), yang ikut mati saat v1 dipensiunkan. Sampai
 *   modul pengajuan v2 dibangun, `lintasanPengajuan()` mengembalikan `null`
 *   dan tampilan berkata "belum tersedia" — bukan memasang tautan mati.
 *
 *   Tiga layanan lain pada menu yang sama (PAS, TIM, Keuangan dan
 *   Penagihan) tidak ada di sini: ketiganya memang portal terpisah
 *   (pas.aptpairport.id, sikeren.aptpairport.id) dan tetap jadi tautan luar
 *   di Navbar.
 * ────────────────────────────────────────────────────────────────────────
 */

import type { ServiceItem } from '@/types';
import {
  Building2, ClipboardList, Users, Megaphone, FileText, Store, Plane,
  type LucideIcon,
} from 'lucide-react';

/** Kategori ruang usaha beserta tarifnya; hanya layanan Tenant yang punya. */
export type TenantRate = {
  label: string;
  /**
   * Besaran tarif apa adanya, mis. "Rp. 31.000/m²".
   *
   * Teks, bukan angka: satuannya berbeda-beda antar layanan, dan basis data
   * v1 memang menyimpannya begini. Memaksanya jadi angka berarti kehilangan
   * satuan atau mengarang normalisasi yang tidak ada di sumbernya.
   */
  priceText: string;
};

export type Service = {
  slug: string;
  /** Nama singkat pada menu dan kartu. */
  name: string;
  /** Judul halaman, sesuai v1 ("Pengajuan …"). */
  title: string;
  icon: LucideIcon;
  /** Warna aksen halaman; dipakai pada hero, kartu, dan tombol. */
  accent: string;
  /** Satu kalimat untuk kartu daftar dan `<meta name="description">`. */
  summary: string;
  /** Paragraf pembuka halaman, dikutip dari v1. */
  description: string;
  /** Berkas yang wajib disiapkan pemohon. Kosong bila v1 tidak menyebutkan. */
  requirements: string[];
  /** Alur pendaftaran, berurut. */
  steps: string[];
  /** Tarif ruang; hanya terisi pada layanan Tenant. */
  rates?: TenantRate[];
  /**
   * Tautan formulir pengajuan, atau `null` bila belum ada di portal ini.
   *
   * `null` bukan kelalaian melainkan keadaan sebenarnya: dasbor pemohon masih
   * milik v1 dan ikut mati saat cutover. Lihat `lintasanPengajuan()`.
   */
  applyUrl: string | null;
};

/**
 * Persyaratan usaha yang dipakai berulang.
 *
 * Beauty Contest, Pengiklanan, Perijinan Usaha, Sewa, dan Tenant memakai
 * daftar yang hampir sama di v1, berbeda hanya pada dua baris tambahan.
 * Disatukan supaya perubahan kebijakan cukup disunting di satu tempat.
 */
const BERKAS_USAHA = [
  'Nomor Induk Berusaha',
  'Kartu Tanda Penduduk (KTP)',
  'Akta Pendirian Perusahaan',
  'NPWP',
  'Proposal Usaha',
  'Surat Pernyataan Mengikuti Aturan (bermaterai)',
  'Laporan Keuangan',
  'Bukti Bayar Pajak 3 Bulan Terakhir',
  'Service Level Agreement (jika Maskapai)',
] as const;

/** Sisipkan baris tambahan tepat setelah "Proposal Usaha", seperti pada v1. */
function berkasUsahaDengan(...tambahan: string[]): string[] {
  const dasar = [...BERKAS_USAHA];
  const posisi = dasar.indexOf('Proposal Usaha') + 1;
  return [...dasar.slice(0, posisi), ...tambahan, ...dasar.slice(posisi)];
}

/** Alur baku pengembangan usaha; sama persis pada enam layanan di v1. */
const ALUR_USAHA = [
  'Mengajukan surat permohonan kepada Kabandara',
  'Verifikasi dokumen dan persyaratan oleh petugas pengembangan usaha',
  'Presentasi bisnis sesuai dengan bidang usaha yang diajukan',
  'Melengkapi administrasi dan kontrak jika disetujui',
];


export const SERVICES: Service[] = [
  {
    slug: 'beauty-contest',
    name: 'Beauty Contest',
    title: 'Pengajuan Beauty Contest',
    icon: Building2,
    accent: '#7c3aed',
    summary: 'Seleksi mitra usaha bandara melalui proposal dan presentasi bisnis.',
    description:
      'Layanan pengajuan beauty contest merupakan sarana bagi pengusaha untuk mengajukan proposal usaha kepada Bandara APT Pranoto Samarinda dengan melalui proses verifikasi dan presentasi bisnis.',
    requirements: [...BERKAS_USAHA],
    steps: ALUR_USAHA,
    applyUrl: null,
  },

  {
    slug: 'extend-advance',
    name: 'Extend Advance',
    title: 'Pengajuan Extend Advance',
    icon: ClipboardList,
    accent: '#0891b2',
    summary: 'Permohonan perpanjangan uang muka, diproses secara daring.',
    description:
      'Layanan pengajuan permohonan extend advance yang disediakan oleh Kantor Unit Penyelenggara Bandara Udara Kelas I A.P.T Pranoto Samarinda.',
    // v1 tidak mencantumkan daftar berkas untuk layanan ini; berkasnya
    // ditentukan pada formulir. Dibiarkan kosong, bukan diisi tebakan.
    requirements: [],
    steps: [
      'Mengisi Formulir Permohonan Awal',
      'Ekspor, Cetak, dan Tandatangani Dokumen',
      'Unggah Kembali Dokumen yang Sudah Ditandatangani',
      'Menunggu Verifikasi Staf',
    ],
    applyUrl: null,
  },

  {
    slug: 'field-trip',
    name: 'Field Trip',
    title: 'Pengajuan Field Trip',
    icon: Users,
    accent: '#059669',
    summary: 'Kunjungan edukasi dan bisnis ke lingkungan bandara.',
    description:
      'Layanan pengajuan field trip untuk keperluan bisnis dan pengembangan usaha di lingkungan Bandara APT Pranoto Samarinda.',
    requirements: ['Surat Permohonan'],
    steps: ALUR_USAHA,
    applyUrl: null,
  },

  {
    slug: 'pengiklanan',
    name: 'Pengiklanan',
    title: 'Pengajuan Pengiklanan',
    icon: Megaphone,
    accent: '#ea580c',
    summary: 'Pemasangan media iklan di area terminal dan kawasan bandara.',
    description:
      'Layanan pengiklanan di Bandara APT Pranoto memungkinkan perusahaan untuk mengajukan proposal usaha dengan melalui proses verifikasi dokumen, presentasi bisnis, dan penandatanganan kontrak.',
    requirements: [...BERKAS_USAHA],
    steps: ALUR_USAHA,
    applyUrl: null,
  },

  {
    slug: 'perijinan-usaha',
    name: 'Perijinan Usaha',
    title: 'Pengajuan Perijinan Usaha',
    icon: ClipboardList,
    accent: '#2563eb',
    summary: 'Izin menjalankan kegiatan usaha di dalam area bandara.',
    description:
      'Layanan ini memfasilitasi pengusaha yang ingin menjalankan usaha di area bandara dengan proses yang terstruktur dan transparan.',
    requirements: berkasUsahaDengan('Desain Teknis Booth/Tempat Usaha'),
    steps: ALUR_USAHA,
    applyUrl: null,
  },

  {
    slug: 'sertifikat-ojt',
    name: 'Sertifikat OJT',
    title: 'Pengajuan Sertifikat OJT',
    icon: FileText,
    accent: '#0d9488',
    summary: 'Sertifikat digital bagi peserta magang yang telah menuntaskan OJT.',
    description:
      'Layanan pengajuan sertifikat untuk peserta magang (On-the-Job Training) di Bandara APT Pranoto Samarinda.',
    requirements: [
      'Scan KTP / Kartu Mahasiswa / Kartu Pelajar',
      'Pas Foto Ukuran 4x6 (Latar Belakang Merah, Kemeja Putih)',
    ],
    // Satu-satunya layanan yang alurnya bukan alur pengembangan usaha:
    // pemohonnya perorangan dan seluruh prosesnya berjalan di dashboard.
    steps: [
      'Mendaftar akun pengaju dan melakukan login',
      'Mengisi formulir berisi informasi diri, akademik, dan pengalaman magang',
      'Mengunggah dokumen persyaratan (identitas & foto)',
      'Menunggu proses verifikasi dan penilaian oleh petugas',
      "Mengunduh sertifikat digital melalui dashboard setelah status berubah menjadi 'Selesai'",
    ],
    applyUrl: null,
  },

  {
    slug: 'sewa',
    name: 'Sewa',
    title: 'Pengajuan Sewa',
    icon: Building2,
    accent: '#4f46e5',
    summary: 'Sewa ruang dan lahan untuk kegiatan usaha di bandara.',
    // Halaman Sewa v1 langsung membuka dengan daftar persyaratan, tanpa
    // paragraf pengantar. Kalimat di bawah ditulis untuk portal ini dan
    // hanya menyebutkan apa layanannya — tidak menambah ketentuan baru.
    description:
      'Layanan pengajuan sewa ruang dan lahan usaha di Bandara APT Pranoto Samarinda.',
    requirements: berkasUsahaDengan(
      'Desain Teknis Booth/Tempat Usaha',
      'Sertifikat Penjamah Makanan (untuk F&B)',
    ),
    steps: ALUR_USAHA,
    applyUrl: null,
  },

  {
    slug: 'slot-charter',
    name: 'Slot Charter',
    title: 'Pengajuan Slot Charter',
    icon: Plane,
    accent: '#0284c7',
    summary: 'Pengajuan slot waktu untuk penerbangan charter.',
    description:
      'Layanan pengajuan slot charter untuk pengembangan usaha di Bandara APT Pranoto Samarinda dengan proses verifikasi dokumen, presentasi bisnis, dan penandatanganan kontrak.',
    // Ejaan "crounus" dipertahankan apa adanya dari v1. Kemungkinan besar
    // yang dimaksud adalah Chronos (aplikasi koordinasi slot), tetapi ini
    // teks persyaratan resmi — pembetulannya urusan pengelola, bukan portal.
    requirements: ['Dokumen dari aplikasi crounus'],
    steps: ALUR_USAHA,
    applyUrl: null,
  },

  {
    slug: 'tenant',
    name: 'Tenant',
    title: 'Pengajuan Tenant',
    icon: Store,
    accent: '#db2777',
    summary: 'Pendaftaran tenant komersial beserta kategori dan tarif ruangnya.',
    description:
      'Layanan pengajuan tenant untuk calon pengguna ruang usaha di Bandara APT Pranoto Samarinda dengan berbagai kategori berdasarkan fasilitas dan kondisi ruang.',
    requirements: berkasUsahaDengan(
      'Desain Teknis Booth/Tempat Usaha',
      'Sertifikat Penjamah Makanan (untuk F&B)',
    ),
    steps: ALUR_USAHA,
    rates: [
      { label: 'Terbuka tanpa AC', priceText: 'Rp. 31.000/m²' },
      { label: 'Tertutup tanpa AC', priceText: 'Rp. 48.000/m²' },
      { label: 'Terbuka dengan AC', priceText: 'Rp. 65.000/m²' },
      { label: 'Tertutup dengan AC', priceText: 'Rp. 82.000/m²' },
    ],
    applyUrl: null,
  },
];

export const getService = (slug: string): Service | undefined =>
  SERVICES.find((s) => s.slug === slug);

/* ------------------------------------------------------------------ */
/*  Penggabungan dengan data dari API                                  */
/* ------------------------------------------------------------------ */

/**
 * Gabungkan satu layanan dari API dengan bawaan presentasi di atas.
 *
 * Basis data v1 menyimpan isi layanan — nama, judul, persyaratan, alur, tarif
 * — tetapi TIDAK menyimpan ikon, warna aksen, ringkasan, maupun paragraf
 * pembuka. Ketiga hal terakhir ditranskrip dari halaman v1 yang menuliskannya
 * langsung di berkas tampilan.
 *
 * Karena itu API menang untuk apa pun yang benar-benar ia punya, dan daftar di
 * atas hanya mengisi yang kosong. Begitu petugas mengisi `summary`/`description`
 * lewat panel admin, nilainya langsung dipakai; ikon dan warna tetap urusan
 * kode karena keduanya pilihan desain, bukan isi.
 */
export function gabungLayanan(api: ServiceItem): Service {
  const bawaan = getService(api.slug);

  return {
    slug: api.slug,
    name: api.name,
    title: api.title,
    icon: bawaan?.icon ?? ClipboardList,
    accent: bawaan?.accent ?? '#0891b2',
    summary: api.summary || bawaan?.summary || '',
    description: api.description || bawaan?.description || '',
    requirements: api.requirements ?? [],
    steps: api.steps ?? [],
    rates: api.pricing_info?.length
      ? api.pricing_info.map((t) => ({ label: t.name, priceText: t.price }))
      : undefined,
    applyUrl: lintasanPengajuan(api.submission_url),
  };
}

/**
 * Terjemahkan `submission_url` menjadi tautan yang benar-benar dapat dibuka.
 *
 * Nilai warisan v1 berbentuk lintasan dasbor pemohon ("dashboard/tenant").
 * Dasbor itu ikut mati saat portal v1 dipensiunkan, sehingga memasangnya
 * sebagai tautan berarti menjanjikan formulir yang tidak ada. `null` di sini
 * membuat tampilan berkata "belum tersedia" — jujur, dan berubah sendiri
 * begitu modul pengajuan v2 mendarat dan nilainya diperbarui.
 */
function lintasanPengajuan(url: string | null): string | null {
  const nilai = (url ?? '').trim();

  if (!nilai) return null;
  if (nilai.startsWith('http://') || nilai.startsWith('https://')) return nilai;
  if (nilai.startsWith('/')) return nilai;

  // Sisanya lintasan relatif gaya v1 — belum punya padanan di portal ini.
  return null;
}

/** Layanan yang dilayani portal terpisah; ditampilkan sebagai tautan luar. */
export const EXTERNAL_SERVICES = [
  {
    name: 'PAS Bandara',
    summary: 'Pas bandara untuk orang, diterbitkan lewat portal PAS.',
    url: 'https://pas.aptpairport.id/website/layanan/pas_orang.html',
  },
  {
    name: 'TIM',
    summary: 'Tanda Izin Mengemudi kendaraan di sisi udara.',
    url: 'https://pas.aptpairport.id/website/layanan/tim.html',
  },
  {
    name: 'Keuangan dan Penagihan',
    summary: 'Sistem keuangan dan penagihan bandara (SIKEREN).',
    url: 'https://sikeren.aptpairport.id',
  },
] as const;
