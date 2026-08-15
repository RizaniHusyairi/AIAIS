import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';
import { ambilToken, hapusToken } from '@/lib/session';

/**
 * Akhiri sesi panel.
 *
 * Token dicabut di backend lebih dulu supaya ia benar-benar mati, bukan
 * sekadar terlupakan oleh peramban. Cookie tetap dihapus meskipun pencabutan
 * gagal — kalau tidak, pengguna yang jaringannya sedang bermasalah akan
 * terjebak dalam sesi yang tak bisa ditinggalkan.
 */
export async function POST() {
  const token = await ambilToken();

  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).catch(() => null);
  }

  await hapusToken();

  return NextResponse.json({ success: true, message: 'Logout berhasil' });
}
