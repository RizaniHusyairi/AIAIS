/**
 * Tabel layar daftar dokumen di dalam PWA.
 *
 * Sembilan daftar berbentuk sama — judul, keterangan, satu tautan berkas —
 * tetapi bentuk barisnya berbeda-beda karena tabelnya warisan v1 yang tidak
 * seragam (`document_link`, `document_path`, `file_url`, `link_url`). Berkas
 * ini yang menampung ketidakseragaman itu, sehingga
 * `components/pwa/DaftarDokumen.tsx` cukup mengenal satu bentuk.
 *
 * Slug di sini HARUS sama dengan lintasan pada `lib/pwaRoutes.ts`; kalau tidak,
 * pengalihan dari halaman publik mendarat di 404.
 */

import type { Dokumen } from '@/components/pwa/DaftarDokumen';
import type {
  PpidRegulation, PeriodicDocument, EvergreenInformation, ImmediateInformation,
  InformationServiceReport, ServiceStandard, DocumentItem, Letter,
} from '@/types';

/** Tanggal ISO → "12 Agustus 2026". String kosong bila tidak ada tanggalnya. */
export function tanggalPanjang(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Gabungkan potongan keterangan, membuang yang kosong. */
const meta = (...bagian: (string | null | undefined)[]) =>
  bagian.filter(Boolean).join(' · ');

/**
 * Satu layar daftar dokumen.
 *
 * `adaptor` sengaja `(baris: never) => Dokumen` di tipe gabungan ini tidak
 * dipakai — tiap entri menyimpan adaptornya sendiri yang sudah bertipe pas,
 * dan pemanggilnya meneruskannya apa adanya ke `DaftarDokumen<T>`.
 */
export type LayarDokumen = {
  judul: string;
  endpoint: string;
  /** Kalimat saat daftarnya kosong; menjelaskan apa yang seharusnya ada. */
  keteranganKosong?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adaptor: (baris: any) => Dokumen;
};

/* ------------------------------------------------------------------ */
/*  PPID                                                               */
/* ------------------------------------------------------------------ */

export const LAYAR_PPID: Record<string, LayarDokumen> = {
  'regulasi': {
    judul: 'Regulasi PPID',
    endpoint: '/ppid-regulations',
    keteranganKosong: 'Dasar hukum penyelenggaraan PPID belum diunggah petugas.',
    adaptor: (r: PpidRegulation): Dokumen => ({
      id: r.id,
      judul: r.title,
      kelompok: r.category,
      meta: tanggalPanjang(r.published_date),
      tautan: r.document_link,
    }),
  },

  'berkala': {
    judul: 'Informasi Berkala',
    endpoint: '/periodic-documents',
    keteranganKosong: 'Dokumen informasi berkala belum diunggah petugas.',
    adaptor: (d: PeriodicDocument): Dokumen => ({
      id: d.id,
      judul: d.title,
      kelompok: d.category,
      // Nama pejabat hanya terisi pada dokumen LHKPN, yang memang diumumkan
      // per pejabat — tanpa itu seluruh barisnya berjudul sama.
      meta: meta(d.pejabat_name, tanggalPanjang(d.published_date)),
      tautan: d.document_path,
    }),
  },

  'setiap-saat': {
    judul: 'Informasi Setiap Saat',
    endpoint: '/evergreen-information',
    keteranganKosong: 'Dokumen informasi setiap saat belum diunggah petugas.',
    adaptor: (e: EvergreenInformation): Dokumen => ({
      id: e.id,
      judul: e.title,
      kelompok: e.category,
      meta: tanggalPanjang(e.published_date),
      tautan: e.document_link,
    }),
  },

  'serta-merta': {
    judul: 'Informasi Serta-Merta',
    endpoint: '/immediate-information',
    keteranganKosong: 'Belum ada pengumuman serta-merta yang berlaku saat ini.',
    adaptor: (i: ImmediateInformation): Dokumen => ({
      id: i.id,
      judul: i.uraian,
      meta: i.keterangan,
      tautan: i.link_url,
      labelTautan: i.link_text || 'Buka',
    }),
  },

  'laporan': {
    judul: 'Laporan Layanan Informasi',
    endpoint: '/information-service-reports',
    keteranganKosong: 'Laporan tahunan penyelenggaraan PPID belum diunggah petugas.',
    adaptor: (l: InformationServiceReport): Dokumen => ({
      id: l.id,
      judul: l.title,
      meta: `Tahun ${l.publication_year}`,
      tautan: l.document_link,
    }),
  },

  'standar-pelayanan': {
    judul: 'Standar Pelayanan',
    endpoint: '/service-standards',
    keteranganKosong: 'Dokumen standar dan maklumat pelayanan belum diunggah petugas.',
    adaptor: (s: ServiceStandard): Dokumen => ({
      id: s.id,
      judul: s.title,
      kelompok: s.type,
      meta: meta(s.document_number, tanggalPanjang(s.published_date)),
      tautan: s.document_url,
    }),
  },
};

/* ------------------------------------------------------------------ */
/*  Regulasi & unduhan                                                 */
/* ------------------------------------------------------------------ */

const layarSurat = (jenis: 'keputusan' | 'edaran', judul: string): LayarDokumen => ({
  judul,
  endpoint: `/letters?type=${jenis}`,
  keteranganKosong: `Belum ada ${judul.toLowerCase()} yang diunggah petugas.`,
  adaptor: (l: Letter): Dokumen => ({
    id: l.id,
    judul: l.title,
    meta: meta(l.number, tanggalPanjang(l.issue_date)),
    tautan: l.file_url,
  }),
});

export const LAYAR_REGULASI: Record<string, LayarDokumen> = {
  'keputusan': layarSurat('keputusan', 'Surat Keputusan'),
  'edaran': layarSurat('edaran', 'Surat Edaran'),
};

export const LAYAR_UNDUHAN: LayarDokumen = {
  judul: 'Pusat Unduhan',
  endpoint: '/documents',
  keteranganKosong: 'Belum ada dokumen atau formulir publik yang diunggah petugas.',
  adaptor: (d: DocumentItem): Dokumen => ({
    id: d.id,
    judul: d.title,
    kelompok: d.category,
    meta: meta(d.file_type?.toUpperCase(), d.file_size),
    tautan: d.file_url,
    labelTautan: 'Unduh',
  }),
};
