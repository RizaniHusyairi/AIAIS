import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * robots.txt.
 *
 * Portal sebelumnya tidak punya berkas ini sama sekali. Ketiadaannya bukan
 * "izinkan semua yang aman" melainkan "izinkan semua tanpa kecuali": perayap
 * bebas menyusuri panel admin, halaman akun pemohon, dan tautan bertoken.
 *
 * Dibangkitkan sebagai rute, bukan berkas statis di `public/`, supaya alamat
 * sitemap ikut berpindah sendiri ketika domainnya berpindah.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Panel petugas. Sudah dilindungi token, tetapi halaman masuknya
          // tidak — dan halaman masuk yang terindeks tidak menolong siapa pun.
          '/admin',

          // Ruang pemohon: berisi berkas pengajuan milik orang per orang.
          '/akun',
          '/masuk',
          '/daftar',

          /*
           * Tautan bertoken. Token-nya memang rahasia, tetapi rahasia yang
           * pernah tertempel di satu halaman publik mana pun akan diikuti
           * perayap dan berakhir di indeks — dan sesudah itu tidak lagi
           * rahasia. Papan Posko dan daftar hadir rapat termasuk di sini.
           */
          '/absensi/',
          '/posko/',

          // Bukan halaman: proksi API milik frontend.
          '/api/',
        ],
      },
      {
        /*
         * Perayap gambar dibiarkan penuh. Foto berita dan foto fasilitas
         * adalah sebagian dari alasan orang menemukan portal ini lewat
         * Google Gambar.
         */
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
