/**
 * Perayaan bertanggal yang memicu animasi sambutan di beranda.
 *
 * Tanggalnya datang dari basis data, bukan dari berkas ini — lihat migrasi
 * `create_site_events_table`. Yang ada di sini hanya urusan tampilan: nama
 * tema, palet, dan kalimat bawaannya.
 */

export type TemaEvent =
  | 'kemerdekaan'
  | 'nataru'
  | 'tahun-baru'
  | 'lebaran'
  | 'tahun-baru-islam'
  | 'nyepi'
  | 'imlek';

export interface SiteEvent {
  id: number;
  name: string;
  theme: TemaEvent;
  starts_on: string;
  ends_on: string;
  greeting: string | null;
  subgreeting: string | null;
  is_active: boolean;
  priority: number;
}

/**
 * Keterangan tiap tema.
 *
 * CERMIN KONSTANTA BACKEND — kuncinya harus sama persis dengan
 * `App\Models\SiteEvent::THEMES`. Backend memvalidasi dengan aturan `in:`,
 * jadi tema yang hanya ada di satu sisi ditolak 422 saat petugas menyimpannya,
 * atau — lebih buruk — tersimpan tetapi tidak memainkan apa pun di beranda.
 */
export const TEMA_EVENT: Record<
  TemaEvent,
  {
    label: string;
    /** Kalimat bawaan bila petugas mengosongkan `greeting`. */
    sambutan: string;
    subsambutan: string;
    /** Latar layar sambutan; dipakai juga sebagai pratinjau di panel. */
    latar: string;
    /** Warna tulisan sambutan. */
    tulisan: string;
    aksen: string;
  }
> = {
  'kemerdekaan': {
    label: 'Hari Kemerdekaan RI',
    sambutan: 'Dirgahayu Republik Indonesia',
    subsambutan: 'Bandar Udara APT Pranoto Samarinda',
    latar: 'linear-gradient(180deg,#0b1e5b 0%,#123a8f 45%,#2b6fd6 100%)',
    tulisan: '#ffffff',
    aksen: '#e11d2f',
  },
  'nataru': {
    label: 'Natal & Tahun Baru',
    sambutan: 'Selamat Hari Natal & Tahun Baru',
    subsambutan: 'Selamat datang di Bandar Udara APT Pranoto',
    latar: 'linear-gradient(180deg,#06203f 0%,#0b3b6f 55%,#124e8c 100%)',
    tulisan: '#ffffff',
    aksen: '#e11d2f',
  },
  'tahun-baru': {
    label: 'Tahun Baru Masehi',
    sambutan: 'Selamat Tahun Baru',
    subsambutan: 'Semoga tahun ini membawa perjalanan yang aman dan lancar',
    latar: 'linear-gradient(180deg,#0a0a23 0%,#181245 55%,#2a1d63 100%)',
    tulisan: '#ffffff',
    aksen: '#fbbf24',
  },
  'lebaran': {
    label: 'Idul Fitri',
    sambutan: 'Selamat Idul Fitri',
    subsambutan: 'Mohon maaf lahir dan batin',
    latar: 'linear-gradient(180deg,#04231c 0%,#0a4034 55%,#116050 100%)',
    tulisan: '#ffffff',
    aksen: '#d9b24c',
  },
  'tahun-baru-islam': {
    label: 'Tahun Baru Islam',
    sambutan: 'Selamat Tahun Baru Islam',
    subsambutan: 'Semoga menjadi tahun yang penuh keberkahan',
    latar: 'linear-gradient(180deg,#0d1b2a 0%,#1b3a5c 55%,#25567f 100%)',
    tulisan: '#ffffff',
    aksen: '#d9b24c',
  },
  'nyepi': {
    label: 'Hari Raya Nyepi',
    sambutan: 'Selamat Hari Raya Nyepi',
    subsambutan: 'Semoga tercipta kedamaian dan keheningan',
    latar: 'linear-gradient(180deg,#050510 0%,#0d0d1f 55%,#14142b 100%)',
    tulisan: '#f1f5f9',
    aksen: '#94a3b8',
  },
  'imlek': {
    label: 'Tahun Baru Imlek',
    sambutan: 'Gong Xi Fa Cai',
    subsambutan: 'Selamat Tahun Baru Imlek',
    latar: 'linear-gradient(180deg,#3d0709 0%,#6b0f14 55%,#8c1a20 100%)',
    tulisan: '#ffffff',
    aksen: '#f5c542',
  },
};

/** Daftar tema untuk pilihan di panel admin. */
export const DAFTAR_TEMA = Object.entries(TEMA_EVENT).map(([nilai, meta]) => ({
  nilai: nilai as TemaEvent,
  label: meta.label,
}));

/**
 * Kunci penanda "sudah ditonton" di `sessionStorage`.
 *
 * `session`, bukan `localStorage`: animasinya sambutan pembuka, dan pengunjung
 * yang kembali keesokan harinya pantas melihatnya lagi. Yang tidak pantas
 * adalah memutarnya ulang tiap kali ia berpindah halaman lalu kembali ke
 * beranda dalam kunjungan yang sama.
 *
 * Id perayaan ikut ke dalam kunci supaya perayaan berikutnya tetap tampil
 * meski tab-nya tidak pernah ditutup.
 */
export const kunciTonton = (id: number) => `aiais_event_${id}`;
