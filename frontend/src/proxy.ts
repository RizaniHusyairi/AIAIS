import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* Marketing route -> nearest PWA (mobile app) screen */
function toAppRoute(pathname: string): string {
  // Pertahankan id penerbangan: /flights/<id> -> /app/penerbangan/<id>.
  // Tanpa ini, tautan detail yang dibagikan akan mendarat di daftar dan
  // penerima harus mencari sendiri penerbangannya.
  if (pathname.startsWith('/flights')) {
    const id = pathname.replace(/^\/flights\/?/, '').split('/')[0];
    return id ? `/app/penerbangan/${id}` : '/app/penerbangan';
  }
  if (pathname.startsWith('/facilities')) return '/app/fasilitas';
  // Keep the article: /news/<slug> -> /app/berita/<slug>
  if (pathname.startsWith('/news')) {
    const slug = pathname.replace(/^\/news\/?/, '').split('/')[0];
    return slug ? `/app/berita/${slug}` : '/app/berita';
  }
  if (pathname.startsWith('/layanan')) return '/app/layanan';
  if (pathname.startsWith('/tenants')) return '/app/layanan';
  // Pusat Bantuan punya layar PWA sendiri. Sebelumnya rute ini mendarat di
  // /app/layanan, yang kartunya menunjuk ke dirinya sendiri — pengguna ponsel
  // terkunci dari fitur bantuan tanpa ada yang menyadarinya.
  if (pathname.startsWith('/complaints')) return '/app/layanan/bantuan';
  if (pathname.startsWith('/downloads')) return '/app/layanan';
  if (pathname.startsWith('/regulasi')) return '/app/layanan';
  if (pathname.startsWith('/profile')) return '/app/profil';
  return '/app';
}

/* Phones only (Android phones carry "Mobile"; tablets/desktop keep the responsive site) */
const PHONE_UA = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Don't touch the app itself, admin, API, or asset-like paths.
  if (pathname.startsWith('/app') || pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // User explicitly chose the desktop site.
  if (request.cookies.get('aptView')?.value === 'desktop') {
    return NextResponse.next();
  }

  // Skip router prefetches so we only redirect real navigations.
  if (request.headers.get('next-router-prefetch') || request.headers.get('purpose') === 'prefetch') {
    return NextResponse.next();
  }

  const ua = request.headers.get('user-agent') || '';
  if (!PHONE_UA.test(ua)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = toAppRoute(pathname);
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/',
    '/flights/:path*',
    '/facilities/:path*',
    '/news/:path*',
    '/tenants/:path*',
    '/complaints/:path*',
    '/downloads/:path*',
    '/profile/:path*',
  ],
};
