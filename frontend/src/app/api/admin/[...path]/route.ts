import { teruskanKeBackend } from '@/lib/proxyBackend';

/**
 * Proksi rute panel pengelolaan (`/api/admin/*` → `{API}/admin/*`).
 *
 * Seluruh logikanya ada di `lib/proxyBackend.ts`, dipakai bersama proksi
 * `/api/auth/*`.
 */

type Konteks = { params: Promise<{ path: string[] }> };

const BASIS = '/admin';

export async function GET(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function POST(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function PUT(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function PATCH(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}

export async function DELETE(request: Request, { params }: Konteks) {
  return teruskanKeBackend(request, BASIS, (await params).path);
}
