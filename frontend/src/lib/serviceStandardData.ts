/**
 * Standar Pelayanan — dokumen dan survei kepuasan masyarakat.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id (situs produksi v1),
 *             /informasi-publik/standar-pelayanan
 *   Diambil : 2 Agustus 2026
 *   Catatan : halaman v1 ini dikendalikan basis data (tabel dokumen +
 *             `skmSetting()`), jadi basis data lokal di repo legacy KOSONG
 *             dan tidak bisa dipakai sebagai sumber. Seluruh isi di bawah
 *             ditranskrip dari HTML yang benar-benar tayang.
 *
 *   ⚠ TAUTAN DOKUMEN DI v1 SEMUANYA MATI.
 *   Ketiga tombol "Lihat Dokumen" pada situs produksi menunjuk ke
 *   `drive.google.com/drive/folders/example-…` — harfiah berawalan
 *   "example-", bukan ID Google Drive yang sah. Ketiganya diperiksa pada
 *   2 Agustus 2026 dan **mengembalikan HTTP 404**. Artinya berkas aslinya
 *   belum pernah diunggah.
 *
 *   Karena itu `url` di bawah sengaja `null`, bukan disalin apa adanya.
 *   Menyalin tautan rusak berarti portal menjanjikan dokumen yang tidak ada
 *   — untuk dokumen yang justru menjadi tolok ukur pelayanan publik. Isi
 *   `url` begitu berkasnya benar-benar terbit; tampilan otomatis berubah
 *   dari "belum tersedia" menjadi tombol unduh.
 *
 *   Tautan SKM (skm.dephub.go.id) diperiksa pada tanggal yang sama dan
 *   MASIH HIDUP (HTTP 200), jadi dipakai apa adanya.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Dasar hukum halaman ini, dikutip apa adanya dari v1. */
export const SP_DASAR_HUKUM = 'Undang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik';

export const SP_PENGANTAR =
  'Sesuai Undang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik, Bandar Udara APT Pranoto menyusun dan memublikasikan Standar Pelayanan sebagai tolok ukur penyelenggaraan pelayanan, Maklumat Pelayanan sebagai pernyataan kesanggupan, serta hasil Survei Kepuasan Masyarakat sebagai bahan evaluasi berkelanjutan.';

/** Ajakan mengisi Survei Kepuasan Masyarakat. Tautannya milik Kemenhub. */
export const SKM = {
  title: 'Ikut Serta dalam Survei Kepuasan Masyarakat',
  text: 'Penilaian Anda kami olah menjadi Indeks Kepuasan Masyarakat, dan laporan hasilnya diterbitkan pada halaman ini.',
  label: 'Isi Survei Kepuasan Masyarakat',
  url: 'https://skm.dephub.go.id/ly/ApfkINxw',
} as const;

export type ServiceDoc = {
  slug: string;
  title: string;
  /** Nomor surat keputusan, bila dokumennya punya. */
  number?: string;
  description: string;
  /** Tanggal terbit, ISO agar bisa diformat sesuai lokal. */
  published: string;
  /**
   * Tautan berkas. `null` berarti dokumennya belum terbit — tampilan wajib
   * mengatakannya apa adanya, bukan memasang tombol yang berujung 404.
   */
  url: string | null;
};

export type ServiceDocGroup = {
  slug: string;
  /** Nama kelompok persis seperti di v1. */
  title: string;
  /** Ringkasan satu kalimat — label navigasi, bukan kutipan dari v1. */
  lead: string;
  docs: ServiceDoc[];
};

/**
 * Tiga kelompok dokumen.
 *
 * Urutannya mengikuti alur logis dokumen itu sendiri — standar disusun
 * lebih dulu, lalu dijanjikan lewat maklumat, lalu dievaluasi lewat survei.
 * v1 mengurutkannya alfabetis (Maklumat, Standar, Survei) karena berasal
 * dari pengelompokan basis data, bukan karena urutan itu bermakna.
 */
export const SP_GROUPS: ServiceDocGroup[] = [
  {
    slug: 'standar-pelayanan',
    title: 'Standar Pelayanan',
    lead: 'Tolok ukur yang dipakai menilai penyelenggaraan pelayanan bandara.',
    docs: [
      {
        slug: 'sp-2026',
        title: 'Standar Pelayanan Publik Bandar Udara APT Pranoto',
        number: 'SK.01/APTP/2026',
        description: 'Tolok ukur penyelenggaraan pelayanan di Bandar Udara APT Pranoto Samarinda.',
        published: '2026-01-15',
        url: null,
      },
    ],
  },
  {
    slug: 'maklumat-pelayanan',
    title: 'Maklumat Pelayanan',
    lead: 'Pernyataan kesanggupan bandara menyelenggarakan pelayanan sesuai standar.',
    docs: [
      {
        slug: 'mp-2026',
        title: 'Maklumat Pelayanan Bandar Udara APT Pranoto',
        number: 'SK.02/APTP/2026',
        description: 'Pernyataan kesanggupan menyelenggarakan pelayanan sesuai standar yang ditetapkan.',
        published: '2026-01-15',
        url: null,
      },
    ],
  },
  {
    slug: 'survei-kepuasan-masyarakat',
    title: 'Survei Kepuasan Masyarakat',
    lead: 'Hasil pengukuran kepuasan pengguna jasa sebagai bahan evaluasi.',
    docs: [
      {
        slug: 'skm-2026-1',
        title: 'Laporan Survei Kepuasan Masyarakat Semester I Tahun 2026',
        description: 'Hasil pengukuran tingkat kepuasan pengguna jasa sebagai bahan evaluasi pelayanan.',
        published: '2026-07-01',
        url: null,
      },
    ],
  },
];

/** "2026-01-15" -> "15 Januari 2026". */
export function formatTanggal(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Jumlah dokumen di seluruh kelompok. */
export const SP_TOTAL_DOKUMEN = SP_GROUPS.reduce((n, g) => n + g.docs.length, 0);

/** Berapa yang berkasnya sudah benar-benar bisa dibuka. */
export const SP_TERSEDIA = SP_GROUPS.reduce(
  (n, g) => n + g.docs.filter((d) => !!d.url).length,
  0,
);
