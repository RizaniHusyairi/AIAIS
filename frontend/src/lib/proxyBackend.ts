import 'server-only';

import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';
import { ambilToken } from '@/lib/session';

/**
 * Penerus permintaan bersesi ke backend Laravel.
 *
 * Inilah tempat token dipasangkan ke header `Authorization`. Peramban cukup
 * mengirim permintaan same-origin dengan cookienya; nilai tokennya tidak
 * pernah menyeberang ke sisi klien.
 *
 * Dipakai dua rute: `/api/admin/*` untuk panel, dan `/api/auth/*` untuk
 * endpoint bersesi yang BUKAN milik panel (ganti kata sandi, profil) —
 * keduanya butuh token, tetapi yang kedua terbuka juga bagi peran non-panel.
 *
 * Tiga hal yang membuatnya tidak sesederhana "teruskan saja":
 *
 *   1. **Badan permintaan diteruskan mentah.** Panel mengirim JSON maupun
 *      `FormData`. Mem-parsing lalu menyusunnya ulang akan merusak batas
 *      multipart.
 *   2. **Respons juga diteruskan mentah.** Endpoint unduhan berkas — antara
 *      lain scan KTP pemohon — mengembalikan biner; `res.json()` merusaknya.
 *   3. **Kuerinya ikut dibawa**, karena beberapa daftar admin menyaring lewat
 *      `?status=` dan sejenisnya.
 */

/** Header yang tidak boleh diteruskan ke backend. */
const HEADER_DIBUANG = new Set([
  'host',
  'connection',
  'content-length',
  // Cookie sesi urusan Next; backend memakai Bearer token dan tidak boleh
  // ikut menerima cookie apa pun.
  'cookie',
]);

export async function teruskanKeBackend(
  request: Request,
  basis: string,
  path: string[],
): Promise<Response> {
  const token = await ambilToken();

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Sesi tidak ditemukan' },
      { status: 401 },
    );
  }

  const query = new URL(request.url).search;
  const target = `${API_BASE_URL}${basis}/${path.join('/')}${query}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HEADER_DIBUANG.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');

  const punyaBadan = !['GET', 'HEAD'].includes(request.method);

  try {
    const res = await fetch(target, {
      method: request.method,
      headers,
      body: punyaBadan ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });

    const meneruskan = new Headers(res.headers);
    meneruskan.delete('content-encoding');
    meneruskan.delete('content-length');
    meneruskan.delete('transfer-encoding');

    return new Response(res.body, { status: res.status, headers: meneruskan });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Tidak dapat terhubung ke server' },
      { status: 503 },
    );
  }
}
