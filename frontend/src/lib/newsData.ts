/**
 * Kategori dan warna label berita.
 *
 * Berkas ini dulu juga memuat berita dan pengumuman contoh untuk dipajang saat
 * backend mati. Keduanya dibuang: isinya karangan, dan tidak ada cara bagi
 * pengunjung untuk membedakannya dari siaran resmi bandara.
 */

/** Kategori filter portal berita */
export const NEWS_CATEGORIES = ['Pengumuman', 'Operasional', 'Layanan', 'Kegiatan'] as const;

export const CATEGORY_STYLES: Record<string, { text: string; bg: string; solid: string }> = {
  Pengumuman: { text: '#1d4ed8', bg: '#dbeafe', solid: '#2563eb' },
  Operasional: { text: '#0e7490', bg: '#cffafe', solid: '#0891b2' },
  Layanan: { text: '#6d28d9', bg: '#ede9fe', solid: '#7c3aed' },
  Kegiatan: { text: '#c2410c', bg: '#ffedd5', solid: '#ea580c' },
};
