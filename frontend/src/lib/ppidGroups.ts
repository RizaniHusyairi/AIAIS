/**
 * Pengelompokan dokumen PPID untuk `DocAccordion`.
 *
 * Empat halaman PPID — Regulasi, Informasi Berkala, Informasi Setiap Saat, dan
 * kelak Laporan Layanan — menerima daftar datar dari API lalu menampilkannya
 * sebagai akordeon per kategori. Backend sengaja tidak mengelompokkan: bentuk
 * respons daftar di portal ini selalu datar, dan penyaringan memang dikerjakan
 * di sisi klien. Pengelompokannya diletakkan di sini supaya keempat halaman
 * tidak menulis ulang logika yang sama.
 */

import type { InfoDoc, InfoGroup } from '@/lib/publicInfoData';

/** Satu dokumen apa adanya dari API, sebelum dikelompokkan. */
export type DokumenPpid = {
  id: number;
  category: string;
  title: string;
  /** Tanggal terbit ISO; kosong bila sumbernya tidak mencantumkan. */
  published?: string | null;
  /** Nama pejabat, khusus dokumen LHKPN. */
  pejabat?: string | null;
  url: string;
};

/**
 * Slug stabil untuk kunci akordeon.
 *
 * Judul dan nama kategori peraturan memuat titik, koma, dan garis miring yang
 * tidak layak menjadi bagian kunci React maupun target anchor.
 */
export function slugify(teks: string): string {
  return teks
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Kelompokkan daftar datar menjadi kategori, mempertahankan urutan kiriman
 * backend — baik urutan kelompoknya maupun urutan dokumen di dalamnya.
 */
export function kelompokkanDokumen(items: DokumenPpid[]): InfoGroup[] {
  const groups: InfoGroup[] = [];

  for (const item of items) {
    let group = groups.find((g) => g.title === item.category);

    if (!group) {
      group = { slug: slugify(item.category), title: item.category, docs: [] };
      groups.push(group);
    }

    const doc: InfoDoc = {
      // Id ikut masuk slug: dua dokumen dapat berjudul sama persis pada
      // kategori yang sama, mis. LHKPN untuk dua pejabat berbeda.
      slug: `${group.slug}-${item.id}`,
      title: item.title,
      url: item.url,
    };

    if (item.published) doc.published = item.published;
    if (item.pejabat) doc.pejabat = item.pejabat;

    group.docs.push(doc);
  }

  return groups;
}

/** Rentang tahun tertua–terbaru dari sekumpulan tanggal ISO. */
export function rentangTahun(tanggal: (string | null | undefined)[]): string {
  const tahun = tanggal
    .map((d) => Number(String(d ?? '').slice(0, 4)))
    .filter((n) => Number.isFinite(n) && n > 0);

  return tahun.length ? `${Math.min(...tahun)} – ${Math.max(...tahun)}` : '—';
}
