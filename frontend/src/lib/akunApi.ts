import type { AdminUser } from '@/types';

/**
 * Klien area akun warga.
 *
 * Bentuknya sengaja SEJAJAR dengan `adminApi.ts` — token dipasang proksi di
 * sisi server, tak pernah terbaca skrip halaman — tetapi berkas ini terpisah
 * dan tidak berbagi kode dengannya. Alasannya: satu perbedaan kecil di antara
 * keduanya adalah ke mana pengguna dilempar saat sesinya berakhir, dan
 * menyatukannya berarti satu tempat itu harus tahu ia sedang melayani siapa.
 * Kekeliruan di sana melempar warga ke layar masuk panel pengelolaan.
 *
 * Identitas pengguna disimpan di `localStorage` sebagai cache tampilan saja;
 * kewenangan sesungguhnya ada pada cookie, dan `muatSesiWarga()` memvalidasinya
 * ke backend setiap area akun dibuka.
 */

const BASE = '/api/akun';
const USER_KEY = 'aiais_akun_user';

export type ApiResult<T> = {
  ok: boolean;
  data: T | null;
  message: string;
  status: number;
  /**
   * Galat validasi per medan, apa adanya dari Laravel.
   *
   * Formulir pendaftaran punya enam medan; menggabungkan seluruh pesannya
   * menjadi satu paragraf memaksa pengisi menebak medan mana yang salah.
   */
  fieldErrors?: Record<string, string[]>;
};

/* ---------------- sesi ---------------- */

export function getWarga(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);

    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

function simpanWarga(user: AdminUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSesiWarga() {
  localStorage.removeItem(USER_KEY);
}

function keHalamanMasuk() {
  clearSesiWarga();
  if (typeof window !== 'undefined') window.location.href = '/masuk';
}

/* ---------------- masuk & daftar ---------------- */

/**
 * Masuk sebagai warga.
 *
 * Memakai endpoint sesi yang sama dengan panel — backend yang menentukan
 * kemampuan token dari peran akunnya, bukan halaman yang memintanya. Bila yang
 * masuk ternyata pengelola, `role` pada respons yang memberi tahu pemanggil ke
 * mana ia harus diarahkan.
 */
export async function masuk(email: string, password: string): Promise<ApiResult<{ user: AdminUser }>> {
  try {
    const res = await fetch('/api/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.success) {
      simpanWarga(json.data.user);

      return { ok: true, data: json.data, message: json.message ?? 'Berhasil masuk', status: res.status };
    }

    return {
      ok: false,
      data: null,
      message: json?.message ?? (res.status === 401 ? 'Surel atau kata sandi salah' : 'Gagal masuk'),
      status: res.status,
    };
  } catch {
    return { ok: false, data: null, message: 'Tidak dapat terhubung ke server.', status: 0 };
  }
}

export type DataDaftar = {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  password_confirmation: string;
};

/**
 * Daftar akun warga.
 *
 * Lewat Route Handler `/api/session/register`, bukan langsung ke Laravel:
 * tokennya disimpan sebagai cookie `httpOnly` di sisi server dan tidak pernah
 * melewati peramban. Lihat berkas rute itu untuk alasan menolak pola
 * "adopsi token" yang lebih sederhana.
 */
export async function daftar(input: DataDaftar): Promise<ApiResult<{ user: AdminUser }>> {
  try {
    const res = await fetch('/api/session/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.success) {
      simpanWarga(json.data.user);

      return { ok: true, data: json.data, message: json.message ?? 'Pendaftaran berhasil', status: res.status };
    }

    if (res.status === 429) {
      return { ok: false, data: null, message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', status: 429 };
    }

    return gagal(res, json);
  } catch {
    return { ok: false, data: null, message: 'Tidak dapat terhubung ke server.', status: 0 };
  }
}

export async function muatSesiWarga(): Promise<AdminUser | null> {
  try {
    const res = await fetch('/api/auth/me', { headers: { Accept: 'application/json' }, cache: 'no-store' });

    if (!res.ok) return null;

    const json = await res.json().catch(() => null);
    const user = json?.data?.user as AdminUser | undefined;

    if (!user) return null;

    simpanWarga(user);

    return user;
  } catch {
    return null;
  }
}

export async function keluar() {
  await fetch('/api/session/logout', { method: 'POST', headers: { Accept: 'application/json' } }).catch(() => {});
  clearSesiWarga();
}

/* ---------------- permintaan ---------------- */

type RespondsGagal = { message?: string; errors?: Record<string, string[]>; data?: Record<string, string[]> };

function gagal<T>(res: Response, json: RespondsGagal | null): ApiResult<T> {
  const errors = json?.errors ?? json?.data;
  const detail = errors && typeof errors === 'object' ? Object.values(errors).flat().join(' ') : '';

  return {
    ok: false,
    data: null,
    message: [json?.message, detail].filter(Boolean).join(' — ') || 'Permintaan gagal',
    status: res.status,
    fieldErrors: errors && typeof errors === 'object' ? errors : undefined,
  };
}

export async function akunFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });

    if (res.status === 401) {
      keHalamanMasuk();

      return { ok: false, data: null, message: 'Sesi berakhir, silakan masuk kembali', status: 401 };
    }

    const json = await res.json().catch(() => null);

    if (res.ok && json?.success !== false) {
      return { ok: true, data: (json?.data ?? null) as T, message: json?.message ?? 'Berhasil', status: res.status };
    }

    return gagal<T>(res, json);
  } catch {
    return { ok: false, data: null, message: 'Tidak dapat terhubung ke server', status: 0 };
  }
}

/** Kirim `FormData`; `Content-Type` sengaja dibiarkan diisi peramban. */
export async function akunUpload<T>(path: string, form: FormData): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
      cache: 'no-store',
    });

    if (res.status === 401) {
      keHalamanMasuk();

      return { ok: false, data: null, message: 'Sesi berakhir, silakan masuk kembali', status: 401 };
    }

    const json = await res.json().catch(() => null);

    if (res.ok && json?.success !== false) {
      return { ok: true, data: (json?.data ?? null) as T, message: json?.message ?? 'Berhasil', status: res.status };
    }

    return gagal<T>(res, json);
  } catch {
    return { ok: false, data: null, message: 'Tidak dapat terhubung ke server', status: 0 };
  }
}

/**
 * Unduh berkas syarat milik sendiri.
 *
 * Diambil sebagai blob, sama seperti `adminDownload`: berkasnya di cakram
 * privat dan tak pernah punya URL publik.
 */
export async function akunDownload(path: string, namaBerkas: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });

    if (res.status === 401) {
      keHalamanMasuk();

      return { ok: false, message: 'Sesi berakhir, silakan masuk kembali' };
    }

    if (!res.ok) return { ok: false, message: 'Berkas tidak dapat diambil' };

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaBerkas;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    return { ok: true, message: 'Berkas diunduh' };
  } catch {
    return { ok: false, message: 'Tidak dapat terhubung ke server' };
  }
}
