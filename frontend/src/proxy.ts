import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { toAppRoute, simpanQuery, keepResponsive } from '@/lib/pwaRoutes';

/*
 * Pengalihan pengunjung ponsel ke layar PWA.
 *
 * Peta rutenya TIDAK ditulis di sini — lihat `lib/pwaRoutes.ts`, yang juga
 * dipakai `components/pwa/MobileRedirect.tsx`. Dulu keduanya menyimpan
 * daftarnya masing-masing dan sudah menyimpang.
 *
 * `/aplikasi`, `/masuk`, `/daftar`, dan `/akun` sengaja tidak didaftarkan pada
 * `matcher`. Portal Aplikasi dirancang responsif dan memang untuk dibuka apa
 * adanya, sementara formulir pengajuan harus dapat dibuka dari ponsel — di
 * sanalah pemohon memotret dan mengunggah surat pengantarnya.
 */

/*
 * Ponsel DAN tablet — keduanya kini punya tata letaknya sendiri di dalam PWA
 * (bilah bawah untuk ponsel, rail kiri untuk tablet), jadi tidak ada lagi
 * alasan menahan tablet di portal desktop.
 *
 * Android membedakan keduanya lewat token "Mobile": ponsel memuatnya, tablet
 * tidak. Karena itu `Android` tanpa syarat sudah mencakup keduanya.
 *
 * SATU PERANGKAT SENGAJA TIDAK TERTANGKAP: iPad dengan iPadOS 13 ke atas
 * menyamar sebagai "Macintosh" dan hanya dapat dibedakan lewat `maxTouchPoints`
 * di sisi klien — mustahil dari header. iPad itu menerima portal desktop yang
 * memang responsif, dan pemiliknya tetap dapat membuka `/app` langsung.
 */
const MOBILE_UA = /iPhone|iPod|iPad|Android|Windows Phone|BlackBerry|IEMobile|Opera Mini|Tablet|Silk|Kindle|PlayBook/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Don't touch the app itself, admin, API, or asset-like paths.
  if (pathname.startsWith('/app') || pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Halaman tanpa padanan layar PWA disajikan apa adanya.
  if (keepResponsive(pathname)) {
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
  if (!MOBILE_UA.test(ua)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = toAppRoute(pathname);
  // Query dibuang kecuali rutenya memang memakainya sebagai keadaan awal
  // layar — `/complaints?mode=hilang` satu-satunya hari ini. Membawa seluruh
  // query tanpa pandang bulu berarti parameter kampanye dan sisa formulir
  // ikut menempel di lintasan PWA yang tidak mengenalnya.
  if (!simpanQuery(pathname)) url.search = '';
  return NextResponse.redirect(url);
}

/*
 * `matcher` HARUS literal statis — Next membacanya saat build, jadi ia tidak
 * dapat dibangkitkan dari `AWALAN_PUBLIK`. Skrip verifikasi membandingkan
 * keduanya supaya baris baru di tabel tidak diam-diam kehilangan
 * pengalihannya.
 */
export const config = {
  matcher: [
    '/',
    '/flights/:path*',
    '/facilities/:path*',
    '/news/:path*',
    '/tourism/:path*',
    '/tenants/:path*',
    '/complaints/:path*',
    '/downloads/:path*',
    '/faq/:path*',
    '/tautan-terkait/:path*',
    '/profile/:path*',
    '/layanan/:path*',
    '/regulasi/:path*',
    '/ppid/:path*',
  ],
};
