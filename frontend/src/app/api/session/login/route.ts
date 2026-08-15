import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';
import { simpanToken } from '@/lib/session';

/**
 * Tukar kredensial dengan cookie sesi.
 *
 * Peramban mengirim surel dan kata sandi ke sini, bukan langsung ke Laravel.
 * Tokennya diterima di sisi server lalu dikunci ke cookie `httpOnly` — dengan
 * begitu tidak pernah ada nilai token yang dapat dibaca JavaScript halaman.
 *
 * Yang dikembalikan ke peramban hanya identitas penggunanya, karena panel
 * memerlukannya untuk menyapa dan menyaring menu.
 */
export async function POST(request: Request) {
  let kredensial: { email?: string; password?: string };

  try {
    kredensial = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Permintaan tidak sah.' },
      { status: 400 },
    );
  }

  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: kredensial.email ?? '',
        password: kredensial.password ?? '',
      }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Tidak dapat terhubung ke server. Pastikan backend berjalan.' },
      { status: 503 },
    );
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    // Pesan backend diteruskan apa adanya — ia sudah membedakan kredensial
    // salah, akun belum disetujui, dan akun tanpa akses panel.
    return NextResponse.json(
      {
        success: false,
        message: json?.message ?? (res.status === 401 ? 'Email atau kata sandi salah' : 'Gagal masuk'),
      },
      { status: res.status },
    );
  }

  await simpanToken(json.data.token);

  return NextResponse.json({
    success: true,
    message: json.message ?? 'Login berhasil',
    data: { user: json.data.user },
  });
}
