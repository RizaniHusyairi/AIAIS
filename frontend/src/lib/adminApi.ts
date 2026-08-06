import { API_BASE_URL } from '@/lib/api';

export type AdminUser = { id: number; name: string; email: string; role: string };

const TOKEN_KEY = 'aiais_admin_token';
const USER_KEY = 'aiais_admin_user';

/* ---------------- session ---------------- */

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: AdminUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/* ---------------- requests ---------------- */

export type ApiResult<T> = { ok: boolean; data: T | null; message: string; status: number };

export async function login(email: string, password: string): Promise<ApiResult<{ user: AdminUser; token: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.success) {
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

/** Request ke endpoint admin dengan Bearer token. */
export async function adminFetch<T>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<ApiResult<T>> {
  const token = getToken();
  if (!token) return { ok: false, data: null, message: 'Sesi tidak ditemukan', status: 401 };

  try {
    const res = await fetch(`${API_BASE_URL}/admin${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });

    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/admin/login';
      return { ok: false, data: null, message: 'Sesi berakhir, silakan masuk kembali', status: 401 };
    }

    const json = await res.json().catch(() => null);

    if (res.ok && json?.success !== false) {
      return { ok: true, data: (json?.data ?? null) as T, message: json?.message ?? 'Berhasil', status: res.status };
    }

    // Kumpulkan pesan validasi Laravel bila ada
    const errors = json?.errors ?? json?.data;
    const detail =
      errors && typeof errors === 'object'
        ? Object.values(errors).flat().join(' ')
        : '';

    return {
      ok: false,
      data: null,
      message: [json?.message, detail].filter(Boolean).join(' — ') || 'Permintaan gagal',
      status: res.status,
    };
  } catch {
    return { ok: false, data: null, message: 'Tidak dapat terhubung ke server', status: 0 };
  }
}

/**
 * Unduh berkas dari endpoint admin.
 *
 * `adminFetch` selalu mem-parsing JSON, jadi tidak bisa dipakai untuk berkas
 * biner. Tautan `<a href>` biasa juga tidak bisa: endpointnya dilindungi
 * Sanctum dan header Authorization tidak ikut terkirim pada navigasi biasa.
 * Karena itu berkasnya diambil sebagai blob lalu diunduh dari memori — tanpa
 * pernah membuat URL publik untuk scan KTP pemohon.
 */
export async function adminDownload(
  path: string,
  namaBerkas: string,
): Promise<{ ok: boolean; message: string }> {
  const token = getToken();
  if (!token) return { ok: false, message: 'Sesi tidak ditemukan' };

  try {
    const res = await fetch(`${API_BASE_URL}/admin${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/admin/login';
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
    // Dibebaskan setelah unduhan dimulai supaya blob tidak menetap di memori.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    return { ok: true, message: 'Berkas diunduh' };
  } catch {
    return { ok: false, message: 'Tidak dapat terhubung ke server' };
  }
}

export async function logout() {
  await adminFetch('/logout', { method: 'POST' }).catch(() => {});
  clearSession();
}
