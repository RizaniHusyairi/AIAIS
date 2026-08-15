import 'server-only';

import { cookies } from 'next/headers';

/**
 * Penyimpanan token panel — HANYA berjalan di sisi server.
 *
 * Sebelumnya token disimpan di `localStorage`, sehingga terbaca oleh setiap
 * skrip yang berjalan di halaman. Untuk panel yang dapat mengunduh scan KTP
 * pemohon informasi publik, itu terlalu murah harganya: satu XSS tersimpan —
 * lewat konten yang disunting admin sendiri, misalnya — berarti token bocor.
 *
 * Sekarang token tinggal di cookie `httpOnly`, dan yang memasang header
 * `Authorization` adalah proksi di `app/api/admin/[...path]`. Kode peramban
 * tidak pernah melihat nilainya.
 *
 * `import 'server-only'` di atas bukan hiasan: ia membuat build GAGAL bila
 * berkas ini tanpa sengaja terimpor dari komponen klien, alih-alih diam-diam
 * mengirimkan isinya ke peramban.
 */

/** Nama cookie sesi. Berbeda dari kunci localStorage lama supaya sisa sesi lama tidak tertukar. */
export const SESSION_COOKIE = 'aiais_session';

/**
 * Umur cookie, sedikit lebih pendek dari masa berlaku token di backend
 * (`SANCTUM_EXPIRATION`, 480 menit). Dibuat lebih pendek dengan sengaja:
 * lebih baik pengguna diminta masuk kembali oleh cookie yang habis daripada
 * menemui 401 mendadak di tengah menyimpan formulir.
 */
const COOKIE_MAX_AGE = 470 * 60;

export async function simpanToken(token: string): Promise<void> {
  const jar = await cookies();

  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Di pengembangan portal berjalan di HTTP; memaksa `secure` membuat
    // cookienya tidak pernah tersimpan dan panel tidak bisa dipakai sama sekali.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function ambilToken(): Promise<string | null> {
  const jar = await cookies();

  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function hapusToken(): Promise<void> {
  const jar = await cookies();

  jar.delete(SESSION_COOKIE);
}
