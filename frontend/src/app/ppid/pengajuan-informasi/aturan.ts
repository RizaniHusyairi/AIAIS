/**
 * Aturan formulir permohonan informasi publik — HARUS selaras dengan
 * `InformationRequestController::store()`.
 *
 * Dipisah dari view supaya validasi per kolom (saat kolom ditinggalkan),
 * validasi per langkah, dan pratinjau pas di samping formulir membaca satu
 * sumber aturan yang sama.
 */

export const CARA_LIHAT = 'Melihat/Membaca/Mendengarkan/Mencatat';
export const CARA_HARD = 'Mendapatkan Copy Salinan (Hard Copy)';
export const CARA_SOFT = 'Mendapatkan Copy Salinan (Soft Copy)';

export const OBTAIN_METHODS = [CARA_LIHAT, CARA_HARD, CARA_SOFT];

export const COPY_METHODS = ['Langsung', 'Kurir', 'Pos', 'Fax', 'Email', 'Whatsapp'];

/**
 * Cara salinan yang cocok untuk tiap cara memperoleh — cermin
 * SALINAN_PER_CARA di controller. Salinan kertas hanya lewat jalur fisik,
 * salinan digital hanya lewat jalur digital, dan melihat/membaca tidak
 * memerlukan salinan.
 */
export const DUKUNGAN_SALINAN: Record<string, string[]> = {
  [CARA_LIHAT]: [],
  [CARA_HARD]: ['Langsung', 'Kurir', 'Pos', 'Fax'],
  [CARA_SOFT]: ['Email', 'Whatsapp'],
};

/** Keterangan pendek per cara memperoleh, tampil di bawah labelnya. */
export const KET_CARA: Record<string, string> = {
  [CARA_LIHAT]: 'Datang dan melihat langsung, tanpa salinan',
  [CARA_HARD]: 'Salinan kertas · langsung, kurir, pos, atau fax',
  [CARA_SOFT]: 'Salinan digital · email atau WhatsApp',
};

/** Cara salinan yang sah untuk gabungan cara memperoleh yang dipilih. */
export const salinanDiizinkan = (caraMemperoleh: string[]): string[] =>
  COPY_METHODS.filter((m) => caraMemperoleh.some((c) => DUKUNGAN_SALINAN[c]?.includes(m)));

/** Apakah pilihan cara memperoleh ini memerlukan cara salinan. */
export const perluSalinan = (caraMemperoleh: string[]) => salinanDiizinkan(caraMemperoleh).length > 0;

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const ACCEPT = 'image/jpeg,image/png,application/pdf';
export const EKSTENSI_SAH = ['jpg', 'jpeg', 'png', 'pdf'];

/** Tenggat UU 14/2008 Pasal 22 — sama dengan RESPONSE_WORKING_DAYS di backend. */
export const HARI_KERJA_JAWABAN = 10;

export type Form = {
  ktp: File | null;
  request_from: string;
  name: string;
  address: string;
  occupation: string;
  npwp: string;
  phone: string;
  email: string;
  information_details: string;
  information_purpose: string;
  obtain_method: string[];
  copy_method: string[];
  /** Persetujuan menerima salinan bukti (nomor tiket) lewat surel / WhatsApp. */
  kabar_email: boolean;
  kabar_whatsapp: boolean;
};

export type Kolom = keyof Form;

export const KOSONG: Form = {
  ktp: null, request_from: '',
  name: '', address: '', occupation: '', npwp: '', phone: '', email: '',
  information_details: '', information_purpose: '',
  obtain_method: [], copy_method: [],
  kabar_email: true, kabar_whatsapp: true,
};

/** Kolom per langkah; urutannya juga urutan fokus saat ada galat. */
export const KOLOM_LANGKAH: Kolom[][] = [
  ['ktp', 'request_from'],
  ['name', 'occupation', 'address', 'npwp', 'phone', 'email',
    'information_details', 'information_purpose', 'obtain_method', 'copy_method'],
];

/** Kolom wajib — dipakai penghitung kelengkapan pada pratinjau pas. */
export const KOLOM_WAJIB: Kolom[] = KOLOM_LANGKAH.flat().filter((k) => k !== 'npwp');

/** Buang spasi, tanda hubung, titik, dan kurung — sama dengan backend. */
export const rapikanTelepon = (s: string) => s.replace(/[\s\-.()]/g, '');

const cekBerkas = (f: File | null, label: string): string | undefined => {
  if (!f) return `${label} wajib diunggah.`;
  if (f.size > MAX_FILE_BYTES) return `Ukuran ${label.toLowerCase()} tidak boleh melebihi 2MB.`;
  // `f.type` tidak bisa dipegang sendirian: sebagian browser Android dan
  // pemilih berkas galeri mengirim string kosong atau `image/jpg`. Backend
  // menilai isi berkasnya (`mimes:`), jadi di sini cukup salah satu dari
  // MIME atau ekstensi yang cocok — penolakan akhir tetap milik server.
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeSah = ACCEPT.split(',').includes(f.type) || f.type === 'image/jpg';
  if (!mimeSah && !EKSTENSI_SAH.includes(ext)) return `${label} harus berformat JPG, PNG, atau PDF.`;
  return undefined;
};

const wajib = (v: string, pesan: string) => (v.trim() ? undefined : pesan);

/** Satu aturan per kolom; pesannya menyalin pesan validator backend. */
export const ATURAN: Record<Kolom, (f: Form) => string | undefined> = {
  ktp: (f) => cekBerkas(f.ktp, 'Scan KTP'),
  request_from: (f) => wajib(f.request_from, 'Asal surat permintaan wajib diisi.'),
  name: (f) => wajib(f.name, 'Nama lengkap wajib diisi.'),
  address: (f) => wajib(f.address, 'Alamat wajib diisi.'),
  occupation: (f) => wajib(f.occupation, 'Pekerjaan wajib diisi.'),
  npwp: () => undefined,
  kabar_email: () => undefined,
  kabar_whatsapp: () => undefined,
  phone: (f) => {
    if (!f.phone.trim()) return 'Nomor HP/WA wajib diisi.';
    if (!/^\+?\d{10,13}$/.test(rapikanTelepon(f.phone))) return 'Nomor HP/WA tidak valid (10–13 digit).';
    return undefined;
  },
  email: (f) => {
    if (!f.email.trim()) return 'Email wajib diisi.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'Email tidak valid.';
    return undefined;
  },
  information_details: (f) => wajib(f.information_details, 'Rincian informasi wajib diisi.'),
  information_purpose: (f) => wajib(f.information_purpose, 'Tujuan penggunaan informasi wajib diisi.'),
  obtain_method: (f) => (f.obtain_method.length ? undefined : 'Cara memperoleh informasi wajib dipilih.'),
  copy_method: (f) => {
    // Belum bisa dinilai sebelum cara memperoleh dipilih — dan belum lengkap:
    // tanpa baris ini formulir kosong terhitung "1/11 kolom wajib".
    if (f.obtain_method.length === 0) return 'Pilih cara memperoleh informasi terlebih dahulu.';
    const izin = salinanDiizinkan(f.obtain_method);
    if (izin.length === 0) return undefined; // tidak memerlukan salinan
    if (f.copy_method.length === 0) return 'Cara mendapat salinan informasi wajib dipilih.';
    const salah = f.copy_method.find((m) => !izin.includes(m));
    if (salah) return `Salinan lewat ${salah} tidak sesuai dengan cara memperoleh yang dipilih.`;
    return undefined;
  },
};

export const validasiLangkah = (f: Form, langkah: number): Partial<Record<Kolom, string>> => {
  const e: Partial<Record<Kolom, string>> = {};
  for (const k of KOLOM_LANGKAH[langkah] ?? []) {
    const g = ATURAN[k](f);
    if (g) e[k] = g;
  }
  return e;
};

/*
 * Tanggal kalender dihitung dalam WITA, bukan zona waktu perangkat — sama
 * dengan controller (`CetakanPdf::ZONA`). Pemohon yang membuka formulir dari
 * luar Kalimantan Timur, atau ponsel yang jamnya keliru zona, tetap melihat
 * tenggat yang sama dengan yang ditetapkan server.
 *
 * Satu tanggal kalender diwakili Date pukul 12:00 UTC (20:00 WITA) dan semua
 * aritmetikanya memakai metode UTC, sehingga tidak ada zona perangkat yang
 * bisa menggesernya ke hari lain.
 */
const ZONA = 'Asia/Makassar';

/** YYYY-MM-DD menurut WITA. Sama dengan `todayWita()` di lib/flightDate.ts. */
const ymdWita = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d);

const kalender = (ymd: string) => new Date(`${ymd}T12:00:00Z`);

/** Hari ini menurut kalender Samarinda. */
export const hariIniWita = () => kalender(ymdWita(new Date()));

/** Tanggal kalender Samarinda dari cap waktu atau tanggal ISO dari API. */
export const tanggalWita = (iso: string) => kalender(ymdWita(new Date(iso)));

const hariKerja = (d: Date) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;

/**
 * Tambah hari kerja dengan melompati Sabtu–Minggu — cermin
 * `addWorkingDays()` di controller, sehingga perkiraan di layar sama dengan
 * tanggal yang nanti ditetapkan server bila dikirim pada hari yang sama.
 */
export const tambahHariKerja = (mulai: Date, hari: number): Date => {
  const d = new Date(mulai);
  while (hari > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (hariKerja(d)) hari--;
  }
  return d;
};

/** Hari kerja dari hari ini (WITA) sampai `sampai`; negatif bila sudah lewat. */
export const sisaHariKerja = (sampai: Date, dari = hariIniWita()): number => {
  const arah = sampai >= dari ? 1 : -1;
  let n = 0;
  const d = new Date(dari);
  while (d.toISOString().slice(0, 10) !== sampai.toISOString().slice(0, 10)) {
    d.setUTCDate(d.getUTCDate() + arah);
    if (hariKerja(d)) n += arah;
  }
  return n;
};

export const fmtTanggal = (iso?: string | Date | null) => {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA });
};

/**
 * Salin ke papan klip. `navigator.clipboard` hanya ada di konteks aman
 * (HTTPS/localhost); di jaringan bandara yang diakses lewat HTTP polos ia
 * `undefined`, jadi jatuh ke `execCommand` lama yang masih didukung semua
 * browser.
 */
export async function salinTeks(teks: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    /* lanjut ke cara lama */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = teks;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
