import { API_BASE_URL } from '@/lib/api';
import type { AdminUser } from '@/types';

export type { AdminUser };

/**
 * Klien panel pengelolaan.
 *
 * Permintaan TIDAK lagi ditembakkan langsung ke Laravel dengan Bearer token
 * dari `localStorage`. Sekarang semuanya same-origin ke `/api/admin/...`, dan
 * proksi di sisi server Next yang memasang tokennya dari cookie `httpOnly`.
 * Akibatnya tidak ada nilai token yang dapat dibaca skrip di halaman —
 * penting untuk panel yang bisa mengunduh scan KTP pemohon informasi publik.
 *
 * Identitas pengguna tetap disimpan di `localStorage`, tetapi hanya sebagai
 * cache tampilan (nama di bilah samping, penyaringan menu). Ia bukan bukti
 * apa pun: kewenangan sesungguhnya ada pada cookie, dan `muatSesi()`
 * memvalidasinya ke backend setiap panel dibuka.
 */

const BASE = '/api/admin';
const USER_KEY = 'aiais_admin_user';

/* ---------------- session ---------------- */

export function getUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);

    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

function simpanPengguna(user: AdminUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  try {
    sessionStorage.removeItem(SAMBUT_KEY);
  } catch {}
}

/**
 * Penanda "baru saja masuk".
 *
 * Dipasang `login()` dan dihabiskan sekali oleh `ModalAntreanMasuk`, supaya
 * pengingat antrean muncul tepat sesudah login — bukan setiap kali panel
 * dimuat ulang. Disimpan di `sessionStorage` karena memang hanya berlaku
 * untuk tab tempat petugas baru saja masuk.
 */
const SAMBUT_KEY = 'aiais_sambut_antrean';

/** Ambil sekaligus hapus penanda; `true` hanya sekali per login. */
export function ambilPenandaMasuk(): boolean {
  try {
    const ada = sessionStorage.getItem(SAMBUT_KEY) === '1';
    sessionStorage.removeItem(SAMBUT_KEY);

    return ada;
  } catch {
    return false;
  }
}

/** Alihkan ke halaman masuk setelah sesi dinyatakan tidak berlaku. */
function keHalamanMasuk() {
  clearSession();
  if (typeof window !== 'undefined') window.location.href = '/admin/login';
}

/* ---------------- requests ---------------- */

export type ApiResult<T> = { ok: boolean; data: T | null; message: string; status: number };

export async function login(email: string, password: string): Promise<ApiResult<{ user: AdminUser }>> {
  try {
    const res = await fetch('/api/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.success) {
      simpanPengguna(json.data.user);
      try {
        sessionStorage.setItem(SAMBUT_KEY, '1');
      } catch {}

      return { ok: true, data: json.data, message: json.message ?? 'Login berhasil', status: res.status };
    }

    return {
      ok: false,
      data: null,
      message: json?.message ?? (res.status === 401 ? 'Email atau kata sandi salah' : 'Gagal masuk'),
      status: res.status,
    };
  } catch {
    return { ok: false, data: null, message: 'Tidak dapat terhubung ke server. Pastikan backend berjalan.', status: 0 };
  }
}

/**
 * Pastikan sesi masih berlaku, dan ambil identitas terbaru.
 *
 * Dipanggil saat panel dibuka. Sebelumnya penjaga panel hanya memeriksa
 * ADANYA token di `localStorage` — sebuah nilai yang bisa diketik siapa saja
 * lewat konsol peramban — sehingga seluruh kerangka panel dan daftar menunya
 * tetap tampil sampai permintaan data pertama kebetulan gagal.
 */
export async function muatSesi(): Promise<AdminUser | null> {
  try {
    const res = await fetch('/api/admin/me', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const json = await res.json().catch(() => null);
    const user = json?.data?.user as AdminUser | undefined;

    if (!user) return null;

    simpanPengguna(user);

    return user;
  } catch {
    return null;
  }
}

/** Bentuk respons galat Laravel yang dipakai di sini. */
type RespondsGagal = {
  message?: string;
  errors?: Record<string, string[]>;
  data?: Record<string, string[]>;
};

/**
 * Endpoint autentikasi yang memang TIDAK bersesi: lupa dan reset kata sandi.
 *
 * Ditembak langsung ke Laravel, bukan lewat proksi `/api/admin`, karena tidak
 * ada token yang perlu dipasangkan — pemanggilnya justru orang yang sedang
 * tidak dapat masuk. `fetchApi` juga tidak dipakai: ia menelan respons 422 dan
 * menggantinya dengan pesan sambungan gagal, sehingga alasan penolakan yang
 * sebenarnya tidak pernah sampai ke pengguna.
 */
async function kirimAuth(path: string, body: Record<string, string>): Promise<ApiResult<null>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.success) {
      return { ok: true, data: null, message: json.message ?? 'Berhasil', status: res.status };
    }

    if (res.status === 429) {
      return {
        ok: false,
        data: null,
        message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
        status: 429,
      };
    }

    return gagal<null>(res, json);
  } catch {
    return { ok: false, data: null, message: 'Tidak dapat terhubung ke server', status: 0 };
  }
}

export function lupaSandi(email: string) {
  return kirimAuth('/auth/forgot-password', { email });
}

/**
 * Ganti kata sandi sendiri.
 *
 * Lewat proksi `/api/auth`, bukan `/api/admin`: endpoint ini terbuka bagi
 * setiap akun yang sudah masuk, tidak hanya pengelola panel.
 */
export async function gantiSandi(input: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<ApiResult<null>> {
  try {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.success) {
      return { ok: true, data: null, message: json.message ?? 'Berhasil', status: res.status };
    }

    return gagal<null>(res, json);
  } catch {
    return { ok: false, data: null, message: 'Tidak dapat terhubung ke server', status: 0 };
  }
}

export function resetSandi(input: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}) {
  return kirimAuth('/auth/reset-password', input);
}

/** Terjemahkan respons gagal menjadi `ApiResult`. */
function gagal<T>(res: Response, json: RespondsGagal | null): ApiResult<T> {
  // 403 SENGAJA tidak membersihkan sesi. Ini bukan sesi berakhir melainkan
  // kewenangan kurang — mengeluarkan paksa staff yang tak sengaja membuka
  // menu khusus admin akan terasa seperti aplikasi rusak.
  const errors = json?.errors ?? json?.data;
  const detail = errors && typeof errors === 'object' ? Object.values(errors).flat().join(' ') : '';

  const bawaan = res.status === 403
    ? 'Anda tidak berwenang melakukan tindakan ini.'
    : 'Permintaan gagal';

  return {
    ok: false,
    data: null,
    message: [json?.message, detail].filter(Boolean).join(' — ') || bawaan,
    status: res.status,
  };
}

/** Request ke endpoint admin. Token dipasang proksi, bukan di sini. */
export async function adminFetch<T>(
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

/**
 * Kirim `FormData` (unggahan berkas) ke endpoint admin.
 *
 * `adminFetch` selalu men-JSON-kan badan permintaan, sehingga tidak bisa
 * membawa berkas. Di sini `Content-Type` sengaja TIDAK diisi: peramban yang
 * menentukannya sendiri berikut `boundary` multipart — mengisinya manual
 * membuat Laravel gagal mengurai bagian berkasnya. Proksi meneruskan badannya
 * mentah dengan alasan yang sama.
 *
 * Laravel tidak mengurai multipart pada permintaan PUT, jadi pembaruan yang
 * menyertakan berkas dikirim sebagai POST ke `/letters/{id}`.
 */
export async function adminUpload<T>(path: string, form: FormData): Promise<ApiResult<T>> {
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
 * Unduh berkas dari endpoint admin.
 *
 * `adminFetch` selalu mem-parsing JSON, jadi tidak bisa dipakai untuk berkas
 * biner. Tautan `<a href>` biasa juga tidak bisa: endpointnya butuh sesi yang
 * hanya dikenali proksi. Karena itu berkasnya diambil sebagai blob lalu
 * diunduh dari memori — tanpa pernah membuat URL publik untuk scan KTP.
 *
 * Mode `buka` menampilkan berkas di tab baru (pratinjau foto/PDF peramban),
 * bukan mengunduhnya. Tabnya dibuka SEBELUM `fetch`, selagi masih dalam
 * gestur klik — sesudah `await`, peramban menganggapnya popup dan
 * memblokirnya.
 */
export async function adminDownload(
  path: string,
  namaBerkas: string,
  mode: 'unduh' | 'buka' = 'unduh',
  /**
   * Berkas yang disusun dari isian (mis. laporan bertanda tangan) diminta
   * lewat POST: isiannya bisa memuat data pribadi seperti NIP, dan data
   * pribadi tidak boleh menumpang di URL yang tercatat di log server.
   */
  kiriman?: { body: unknown },
): Promise<{ ok: boolean; message: string }> {
  const tab = mode === 'buka' ? window.open('', '_blank') : null;
  const gagalkan = (message: string) => {
    tab?.close();

    return { ok: false, message };
  };

  try {
    const res = await fetch(`${BASE}${path}`, kiriman
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(kiriman.body),
          cache: 'no-store',
        }
      : { cache: 'no-store' });

    if (res.status === 401) {
      tab?.close();
      keHalamanMasuk();

      return { ok: false, message: 'Sesi berakhir, silakan masuk kembali' };
    }

    if (res.status === 403) return gagalkan('Anda tidak berwenang membuka berkas ini.');

    // Pesan backend (mis. "nilai belum diisi", "berkas tidak ditemukan")
    // diteruskan apa adanya — pesan umum membuat petugas tidak tahu apa
    // yang harus dibereskan.
    if (!res.ok) {
      const json = await res.json().catch(() => null);

      return gagalkan(json?.message || `Berkas tidak dapat diambil (HTTP ${res.status})`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    if (tab) {
      tab.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = lengkapiNama(namaBerkas, res.headers.get('content-disposition'), blob.type);
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    // Tab pratinjau butuh blobnya lebih lama daripada unduhan biasa.
    setTimeout(() => URL.revokeObjectURL(url), tab ? 60_000 : 10_000);

    return { ok: true, message: tab ? 'Berkas dibuka di tab baru' : 'Berkas diunduh' };
  } catch {
    return gagalkan('Tidak dapat terhubung ke server');
  }
}

const EKSTENSI: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/**
 * Pastikan nama unduhan berekstensi.
 *
 * Pemanggil sering hanya tahu label ("KTP-Budi"), sementara ekstensinya baru
 * diketahui server (KTP bisa JPG atau PDF). Tanpa ekstensi, Windows tidak tahu
 * aplikasi mana yang membuka berkasnya.
 */
function lengkapiNama(nama: string, disposisi: string | null, tipe: string): string {
  if (/\.[a-z0-9]{2,5}$/i.test(nama)) return nama;

  const dariServer = disposisi?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
  const ext = dariServer?.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? EKSTENSI[tipe.split(';')[0].trim()];

  return ext ? `${nama}.${ext}` : nama;
}

export async function logout() {
  await fetch('/api/session/logout', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  }).catch(() => {});

  clearSession();
}
