import type { MetadataRoute } from 'next';
import { fetchApi } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';
import { SERVICES } from '@/lib/serviceData';
import type { NewsItem, ServiceItem } from '@/types';

/**
 * Peta situs.
 *
 * Portal sebelumnya tidak punya sitemap sama sekali, dan itu mahal justru
 * karena hampir seluruh halaman publiknya Client Component yang mengambil isi
 * lewat `fetch` sesudah hidrasi: tanpa daftar alamat yang eksplisit, satu-
 * satunya cara Google menemukan `/news/<slug>` adalah menyusuri tautan yang
 * baru muncul setelah JavaScript berjalan. Sitemap memutus ketergantungan itu.
 *
 * Dibangkitkan saat permintaan (`force-dynamic`), bukan saat build. Berita dan
 * layanan dikelola petugas dari panel admin sepanjang hari; sitemap yang
 * dibekukan saat build akan menyembunyikan setiap tulisan baru sampai
 * aplikasinya dibangun ulang — persoalan yang sama yang dulu membuat halaman
 * `/layanan/[slug]` menjawab 404 (lihat catatan di berkas itu).
 */
export const dynamic = 'force-dynamic';

/** Ubah stempel waktu API menjadi Date; nilai yang tidak sah diabaikan. */
function tanggal(nilai?: string | null): Date | undefined {
  if (!nilai) return undefined;
  const d = new Date(nilai);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Halaman statis berikut bobotnya.
 *
 * `priority` hanya relatif terhadap halaman lain di situs yang sama — ia tidak
 * pernah menaikkan peringkat, hanya memberi tahu perayap mana yang lebih
 * penting bila ia harus memilih. Karena itu jadwal penerbangan dan beranda
 * berada di puncak: keduanya alasan sebagian besar pengunjung datang.
 *
 * `changeFrequency` diisi jujur. Menandai semua halaman `daily` adalah cara
 * cepat membuat seluruh berkas ini diabaikan.
 */
const STATIS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/flights', priority: 0.9, changeFrequency: 'hourly' },
  { path: '/news', priority: 0.9, changeFrequency: 'daily' },

  { path: '/layanan', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/facilities', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/profile', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/complaints', priority: 0.8, changeFrequency: 'monthly' },

  { path: '/tenants', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/tourism', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/downloads', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/peta-rute', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/aplikasi', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/tautan-terkait', priority: 0.5, changeFrequency: 'yearly' },

  // Keterbukaan informasi publik. Bobotnya tinggi bukan karena lalu lintas,
  // melainkan karena UU 14/2008 mewajibkan halaman-halaman ini dapat ditemukan.
  { path: '/ppid', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/ppid/informasi-berkala', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/ppid/informasi-serta-merta', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/ppid/informasi-setiap-saat', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/ppid/pengajuan-informasi', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/ppid/laporan-layanan-informasi', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/ppid/standar-pelayanan', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/ppid/regulasi', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/ppid/sop', priority: 0.6, changeFrequency: 'yearly' },

  { path: '/regulasi/surat-keputusan', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/regulasi/surat-edaran', priority: 0.6, changeFrequency: 'monthly' },

  { path: '/statistik', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/keuangan', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/posko-nataru', priority: 0.4, changeFrequency: 'yearly' },
];

/*
 * Yang SENGAJA tidak ada di sini:
 *
 *   /flights/[id]  — satu penerbangan hanya ada beberapa jam. Mengindeksnya
 *                    menghasilkan ribuan halaman yang sudah mati sebelum
 *                    perayapnya kembali.
 *   /akun/**, /masuk, /daftar   — ruang pemohon, sudah ditolak robots.txt.
 *   /absensi/[token], /posko/** — tautan bertoken.
 *   /app/**        — layar PWA. Alamat kanoniknya adalah lintasan publik di
 *                    atas; lihat `app/app/layout.tsx`.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sekarang = new Date();

  const statis = STATIS.map((s) => ({
    url: `${SITE_URL}${s.path}`,
    lastModified: sekarang,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  /*
   * Berita dan layanan diambil bersamaan. Bila salah satu gagal, sitemap tetap
   * terbit dengan sisanya — sitemap yang kehilangan sebagian alamat jauh lebih
   * baik daripada rute yang melempar 500 dan membuat Search Console mencatat
   * sitemapnya tidak terbaca.
   */
  const [berita, layanan] = await Promise.all([
    fetchApi<NewsItem[]>('/news').catch(() => null),
    fetchApi<ServiceItem[]>('/services').catch(() => null),
  ]);

  const entriBerita = (Array.isArray(berita?.data) ? berita.data : [])
    // Naskah draf tidak boleh masuk sitemap; halamannya belum tentu ada.
    .filter((n) => n?.slug && n.status !== 'draft')
    .map((n) => ({
      url: `${SITE_URL}/news/${n.slug}`,
      lastModified: tanggal(n.published_at) ?? sekarang,
      changeFrequency: 'yearly' as const,
      // Berita utama sedikit di atas berita biasa — itulah yang ingin
      // ditemukan lebih dulu ketika perayap hanya sanggup mengambil sebagian.
      priority: n.is_featured ? 0.7 : 0.6,
    }));

  /*
   * Slug layanan berasal dari API bila backend hidup, dan dari transkripsi v1
   * (`lib/serviceData.ts`) bila tidak. Keduanya digabung, bukan salah satu
   * saja: halaman `/layanan/[slug]` sendiri melayani kedua sumber itu, jadi
   * sitemap yang hanya memuat satu sumber akan menghilangkan alamat yang
   * sebenarnya dapat dibuka.
   */
  const slugLayanan = new Set<string>([
    ...(Array.isArray(layanan?.data) ? layanan.data : [])
      .filter((s) => s?.slug && s.is_active !== false)
      .map((s) => s.slug),
    ...SERVICES.map((s) => s.slug),
  ]);

  const entriLayanan = [...slugLayanan].map((slug) => ({
    url: `${SITE_URL}/layanan/${slug}`,
    lastModified: sekarang,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...statis, ...entriBerita, ...entriLayanan];
}
