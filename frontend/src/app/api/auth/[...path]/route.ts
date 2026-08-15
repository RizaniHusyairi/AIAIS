import { teruskanKeBackend } from '@/lib/proxyBackend';

/**
 * Proksi endpoint bersesi yang BUKAN milik panel (`/api/auth/*`).
 *
 * Bedanya dengan `/api/admin/*`: rute di bawah `/auth` hanya menuntut token
 * yang sah, tanpa peran admin atau staff. Ganti kata sandi dan `me` ada di
 * sini justru supaya akun berperan `user` — pemohon perizinan warisan v1, dan
 * kelak modul pengajuan — tetap dapat memakainya tanpa menerima 403.
 *
 * `/api/session/login` dan `/api/session/logout` TIDAK lewat sini: keduanya
 * mengurus cookie, bukan meneruskan permintaan bersesi.
 */

type Konteks = { params: Promise<{ path: string[] }> };

const BASIS = '/auth';

export async function GET(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function POST(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function PUT(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}
