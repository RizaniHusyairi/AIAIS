/**
 * Aturan formulir permohonan informasi publik — HARUS selaras dengan
 * `InformationRequestController::store()`.
 *
 * Dipisah dari view supaya validasi per kolom (saat kolom ditinggalkan),
 * validasi per langkah, dan pratinjau pas di samping formulir membaca satu
 * sumber aturan yang sama.
 */

export const OBTAIN_METHODS = [
  'Melihat/Membaca/Mendengarkan/Mencatat',
  'Mendapatkan Copy Salinan (Hard Copy)',
];

export const COPY_METHODS = ['Langsung', 'Kurir', 'Pos', 'Fax', 'Email', 'Whatsapp'];

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
};

export type Kolom = keyof Form;

export const KOSONG: Form = {
  ktp: null, request_from: '',
  name: '', address: '', occupation: '', npwp: '', phone: '', email: '',
  information_details: '', information_purpose: '',
  obtain_method: [], copy_method: [],
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
  copy_method: (f) => (f.copy_method.length ? undefined : 'Cara mendapat salinan informasi wajib dipilih.'),
};

export const validasiLangkah = (f: Form, langkah: number): Partial<Record<Kolom, string>> => {
  const e: Partial<Record<Kolom, string>> = {};
  for (const k of KOLOM_LANGKAH[langkah] ?? []) {
    const g = ATURAN[k](f);
    if (g) e[k] = g;
  }
  return e;
};

/**
 * Tambah hari kerja dengan melompati Sabtu–Minggu — cermin
 * `addWorkingDays()` di controller, sehingga perkiraan di layar sama dengan
 * tanggal yang nanti ditetapkan server bila dikirim pada hari yang sama.
 */
export const tambahHariKerja = (mulai: Date, hari: number): Date => {
  const d = new Date(mulai);
  while (hari > 0) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) hari--;
  }
  return d;
};

/** Hari kerja dari hari ini sampai `sampai`; negatif bila sudah lewat. */
export const sisaHariKerja = (sampai: Date, dari = new Date()): number => {
  const a = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate());
  const b = new Date(sampai.getFullYear(), sampai.getMonth(), sampai.getDate());
  const arah = b >= a ? 1 : -1;
  let n = 0;
  const d = new Date(a);
  while (d.getTime() !== b.getTime()) {
    d.setDate(d.getDate() + arah);
    const w = d.getDay();
    if (w !== 0 && w !== 6) n += arah;
  }
  return n;
};

export const fmtTanggal = (iso?: string | Date | null) => {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
