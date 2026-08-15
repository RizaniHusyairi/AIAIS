import { teruskanKeBackend } from '@/lib/proxyBackend';

/**
 * Proksi area akun warga (`/api/akun/*` → `{API}/akun/*`).
 *
 * Cookie sesinya SATU dan sama dengan milik panel — yang membedakan bidang
 * bukan cookienya, melainkan kemampuan yang melekat pada token di dalamnya.
 * Token warga berkemampuan `citizen` ditolak backend di seluruh `/admin`, dan
 * token panel ditolak di seluruh `/akun`. Memisahkan cookienya justru akan
 * memberi kesan pemisahan yang penegakannya sebenarnya ada di backend.
 *
 * Seluruh logikanya ada di `lib/proxyBackend.ts`, dipakai bersama proksi
 * `/api/admin/*` dan `/api/auth/*`.
 */

type Konteks = { params: Promise<{ path: string[] }> };

const BASIS = '/akun';

export async function GET(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function POST(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function PUT(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function DELETE(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}
