/**
 * Logo mitra dan pemangku kepentingan Bandara APT Pranoto.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber : berkas logo diserahkan pengelola portal, diletakkan di
 *            `public/mitra/`; daftar dan penamaan seksinya mengikuti blok
 *            "Dipercaya oleh Mitra Terkemuka" pada beranda portal v1.
 *   Tanggal: 1 September 2026
 *
 *   Daftar ini TIDAK boleh ditambah dari ingatan. Satu entri baru berarti
 *   satu berkas logo baru di `public/mitra/` yang memang diserahkan
 *   pengelola — mencantumkan mitra yang tidak pernah diserahkan berkasnya
 *   sama saja mengaku-akui kerja sama yang belum tentu ada.
 *
 *   TIDAK DIPAKAI: `public/mitra/logo_kkp.svg`. Berkas itu berisi logo
 *   Kementerian Kelautan dan Perikanan, sedangkan "KKP" yang menjadi
 *   pemangku kepentingan bandara adalah Kantor Kesehatan Pelabuhan — dua
 *   lembaga yang berbeda sama sekali. Berkasnya sengaja dibiarkan di tempat,
 *   bukan dihapus, supaya penggantinya tinggal ditimpa; begitu logo Kantor
 *   Kesehatan Pelabuhan yang benar tersedia, tambahkan entrinya di bawah.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Pengelompokan yang menentukan di baris mana logo itu berjalan. */
export type KelompokMitra = 'maskapai' | 'instansi';

export type MitraLogo = {
  slug: string;
  /** Nama resmi — dipakai sebagai `alt`, jadi ia yang dibaca pembaca layar. */
  nama: string;
  /** Peran singkat di bandara; muncul sebagai keterangan saat logo disorot. */
  peran: string;
  kelompok: KelompokMitra;
  /** Lintasan berkas di `public/`. */
  berkas: string;
};

export const MITRA_LOGOS: MitraLogo[] = [
  /* Maskapai yang melayani APT Pranoto. Urutannya mengikuti abjad, bukan
     besar-kecilnya maskapai — portal pemerintah tidak memeringkat mitranya. */
  { slug: 'batik-air', nama: 'Batik Air', peran: 'Maskapai berjadwal', kelompok: 'maskapai', berkas: '/mitra/logo-batik.png' },
  { slug: 'citilink', nama: 'Citilink Indonesia', peran: 'Maskapai berjadwal', kelompok: 'maskapai', berkas: '/mitra/logo-citilink.png' },
  { slug: 'garuda-indonesia', nama: 'Garuda Indonesia', peran: 'Maskapai berjadwal', kelompok: 'maskapai', berkas: '/mitra/logo-garuda.png' },
  { slug: 'lion-air', nama: 'Lion Air', peran: 'Maskapai berjadwal', kelompok: 'maskapai', berkas: '/mitra/logo-lion.png' },
  { slug: 'smart-aviation', nama: 'Smart Aviation', peran: 'Maskapai perintis', kelompok: 'maskapai', berkas: '/mitra/logo-smart.jpg' },
  { slug: 'super-air-jet', nama: 'Super Air Jet', peran: 'Maskapai berjadwal', kelompok: 'maskapai', berkas: '/mitra/logo-SAJ.png' },
  { slug: 'wings-air', nama: 'Wings Air', peran: 'Maskapai berjadwal', kelompok: 'maskapai', berkas: '/mitra/logo-wings.png' },

  /* Instansi dan penyedia layanan yang bekerja di dalam kawasan bandara. */
  { slug: 'airnav', nama: 'AirNav Indonesia', peran: 'Navigasi penerbangan', kelompok: 'instansi', berkas: '/mitra/logo-airnav.png' },
  { slug: 'bmkg', nama: 'BMKG', peran: 'Informasi meteorologi penerbangan', kelompok: 'instansi', berkas: '/mitra/logo-BMKG.png' },
  { slug: 'barantin', nama: 'Badan Karantina Indonesia', peran: 'Karantina di pintu masuk', kelompok: 'instansi', berkas: '/mitra/logo-karantina.png' },
  { slug: 'karisma', nama: 'Karisma Flight Support', peran: 'Layanan pendukung penerbangan', kelompok: 'instansi', berkas: '/mitra/logo-karisma.png' },
  { slug: 'pemprov-kaltim', nama: 'Pemerintah Provinsi Kalimantan Timur', peran: 'Pemerintah daerah', kelompok: 'instansi', berkas: '/mitra/Logo-Pemprov.png' },
  { slug: 'pertamina', nama: 'Pertamina', peran: 'Penyediaan bahan bakar penerbangan', kelompok: 'instansi', berkas: '/mitra/logo-pertamina.png' },
];

export const mitraKelompok = (k: KelompokMitra) =>
  MITRA_LOGOS.filter((m) => m.kelompok === k);
