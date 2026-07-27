'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/* marketing route -> app screen */
const TO_APP: [string, string][] = [
  ['/flights', '/app/penerbangan'],
  ['/facilities', '/app/fasilitas'],
  ['/news', '/app/berita'],
  ['/tenants', '/app/layanan'],
  ['/complaints', '/app/layanan'],
  ['/downloads', '/app/layanan'],
  ['/profile', '/app/profil'],
];

/* app screen -> marketing route (reverse) */
const TO_DESKTOP: [string, string][] = [
  ['/app/penerbangan', '/flights'],
  ['/app/fasilitas', '/facilities'],
  ['/app/peta', '/facilities'],
  ['/app/berita', '/news'],
  ['/app/layanan', '/tenants'],
  ['/app/profil', '/profile'],
];

function toAppRoute(pathname: string): string {
  // Keep the article: /news/<slug> -> /app/berita/<slug>
  if (pathname.startsWith('/news')) {
    const slug = pathname.replace(/^\/news\/?/, '').split('/')[0];
    return slug ? `/app/berita/${slug}` : '/app/berita';
  }
  for (const [from, to] of TO_APP) if (pathname.startsWith(from)) return to;
  return '/app';
}

function toDesktopRoute(pathname: string): string {
  // Keep the article: /app/berita/<slug> -> /news/<slug>
  if (pathname.startsWith('/app/berita')) {
    const slug = pathname.replace(/^\/app\/berita\/?/, '').split('/')[0];
    return slug ? `/news/${slug}` : '/news';
  }
  for (const [from, to] of TO_DESKTOP) if (pathname.startsWith(from)) return to;
  return '/';
}

function hasDesktopPref(): boolean {
  return typeof document !== 'undefined' && document.cookie.includes('aptView=desktop');
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

const AUTO_KEY = 'aptAutoMobile';

/**
 * Keeps the layout in sync with the viewport:
 *  - Phone-sized viewport on a marketing page  -> matching PWA screen.
 *  - Widened back to desktop while we auto-switched -> return to the desktop page.
 *
 * Real phones are already handled server-side by proxy.ts. An installed PWA
 * (standalone) and an explicit `aptView=desktop` choice are never overridden,
 * and opening `/app` directly on desktop stays in the app (no reverse bounce).
 */
export default function MobileRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin')) return;
    if (isStandalone()) return;

    const isApp = pathname.startsWith('/app');
    const wide = window.matchMedia('(min-width: 768px)');

    const sync = () => {
      if (hasDesktopPref()) return;

      if (!isApp && !wide.matches) {
        // Desktop/marketing page shrunk to phone size -> go to the app.
        sessionStorage.setItem(AUTO_KEY, '1');
        router.replace(toAppRoute(pathname));
      } else if (isApp && wide.matches && sessionStorage.getItem(AUTO_KEY) === '1') {
        // We only auto-switched into the app; widening returns to desktop.
        sessionStorage.removeItem(AUTO_KEY);
        router.replace(toDesktopRoute(pathname));
      }
    };

    sync();
    wide.addEventListener('change', sync);
    return () => wide.removeEventListener('change', sync);
  }, [pathname, router]);

  return null;
}
