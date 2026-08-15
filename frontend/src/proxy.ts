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
  // Statistik belum punya layar PWA tersendiri; diarahkan ke profil bandara
  // yang memuat informasi umum sejenis.
  if (pathname.startsWith('/statistik')) return '/app/profil';
  // Kinerja keuangan sama halnya — informasi kelembagaan tanpa layar PWA
  // tersendiri.
  if (pathname.startsWith('/keuangan')) return '/app/profil';
  // Area akun, masuk, dan daftar TIDAK dipetakan ke layar PWA mana pun, dan
  // ketiganya sengaja tidak didaftarkan pada `matcher` di bawah. Formulir
  // pengajuannya harus dapat dibuka apa adanya dari ponsel — di sanalah
  // pemohon memotret dan mengunggah surat pengantarnya. Melemparnya ke layar
  // PWA akan memutus alur itu, persis kekeliruan yang dulu menimpa
  // `/complaints`.
  // Papan Posko Nataru sengaja TIDAK didaftarkan pada `matcher` di bawah,
  // jadi pemetaan ini tidak pernah terpakai dari peramban — ia ada supaya
  // rutenya tidak jatuh ke `/app` seandainya kelak ikut dialihkan. Papan itu
  // dirancang untuk monitor terminal dan tetap harus dapat dibuka apa adanya
  // dari ponsel petugas yang memeriksanya dari jauh.
  if (pathname.startsWith('/posko-nataru')) return '/app';
  if (pathname.startsWith('/regulasi')) return '/app/layanan';
  if (pathname.startsWith('/profile')) return '/app/profil';
  return '/app';
}

/*
 * `/aplikasi` sengaja TIDAK dipetakan di sini dan tidak didaftarkan pada
 * `matcher` di bawah.
 *
 * Halaman itu untuk pegawai, bukan penumpang, dan tidak punya padanan layar
 * PWA. Melemparnya ke `/app/layanan` akan menyembunyikannya dari pengguna
 * ponsel — persis kekeliruan yang dulu menimpa `/complaints` (lihat catatan
 * di atas). Karena `matcher` bersifat daftar-putih, cukup dengan tidak
 * mendaftarkannya: ponsel menerima halamannya apa adanya, dan halaman itu
 * memang dirancang responsif.
 */

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
