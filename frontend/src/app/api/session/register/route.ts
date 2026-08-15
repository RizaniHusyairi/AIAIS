import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';
import { simpanToken } from '@/lib/session';

/**
 * Daftar akun warga, lalu kunci tokennya ke cookie sesi.
 *
 * Bentuknya sengaja mengikuti `session/login`: peramban mengirim data
 * pendaftaran ke sini, dan token yang dikembalikan Laravel disimpan di sisi
 * server sebagai cookie `httpOnly`.
 *
 * ALTERNATIF YANG DITOLAK: mendaftar langsung dari peramban ke Laravel lalu
 * menitipkan tokennya ke sebuah endpoint "adopsi sesi". Endpoint semacam itu
 * menerima token dari siapa pun yang memanggilnya, sehingga halaman berbahaya
 * dapat memaksa cookie sesi pengunjung berisi token MILIK PENYERANG. Korban
 * lalu menjelajah sebagai penyerang tanpa sadar, dan berkas syarat yang
 * diunggahnya — surat pengantar berkop instansi — mendarat di akun penyerang.
 * Di sini token tidak pernah melewati peramban sama sekali, jadi tidak ada
 * yang bisa dititipkan.
 *
 * Badan permintaan diteruskan apa adanya supaya seluruh galat validasi
 * Laravel (surel sudah terpakai, nomor telepon tidak sah, konfirmasi sandi
 * tidak cocok) sampai utuh ke formulir.
 */
export async function POST(request: Request) {
  let data: unknown;

  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Permintaan tidak sah.' }, { status: 400 });
  }

  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
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
    return NextResponse.json(
      {
        success: false,
        message: json?.message ?? 'Pendaftaran gagal',
        errors: json?.errors ?? json?.data ?? null,
      },
      { status: res.status },
    );
  }

  await simpanToken(json.data.token);

  return NextResponse.json(
    { success: true, message: json.message ?? 'Pendaftaran berhasil', data: { user: json.data.user } },
    { status: 201 },
  );
}
