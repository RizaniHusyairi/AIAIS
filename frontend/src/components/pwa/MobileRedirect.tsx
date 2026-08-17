'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toAppRoute, toDesktopRoute, keepResponsive } from '@/lib/pwaRoutes';

function hasDesktopPref(): boolean {
  return typeof document !== 'undefined' && document.cookie.includes('aptView=desktop');
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

const AUTO_KEY = 'aptAutoMobile';

/**
 * Menjaga tata letak tetap sejalan dengan lebar viewport:
 *  - Halaman publik menyempit ke ukuran ponsel -> layar PWA yang sepadan.
 *  - Dilebarkan lagi setelah kita sendiri yang mengalihkan -> kembali ke
 *    halaman publiknya.
 *
 * Peta rutenya diimpor dari `lib/pwaRoutes.ts`, sumber yang sama dengan
 * `proxy.ts`. Ponsel sungguhan sudah ditangani proxy di sisi server; PWA
 * terpasang (standalone) dan pilihan `aptView=desktop` tidak pernah ditimpa,
 * dan membuka `/app` langsung dari desktop tetap tinggal di aplikasi.
 */
export default function MobileRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin')) return;
    if (keepResponsive(pathname)) return;
    if (isStandalone()) return;

    const isApp = pathname.startsWith('/app');
    const wide = window.matchMedia('(min-width: 768px)');

    const sync = () => {
      if (hasDesktopPref()) return;

      if (!isApp && !wide.matches) {
        // Halaman publik menyempit ke ukuran ponsel -> masuk ke aplikasi.
        sessionStorage.setItem(AUTO_KEY, '1');
        router.replace(toAppRoute(pathname));
      } else if (isApp && wide.matches && sessionStorage.getItem(AUTO_KEY) === '1') {
        // Hanya yang kita alihkan sendiri yang dikembalikan saat dilebarkan.
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
