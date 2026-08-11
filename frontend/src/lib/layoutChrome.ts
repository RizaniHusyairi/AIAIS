/**
 * Rute yang memakai chrome-nya sendiri.
 *
 * Navbar, Footer, dan peluncur chat publik menanyakan berkas ini sebelum
 * merender diri. Sebelumnya masing-masing menyimpan daftarnya sendiri dan
 * daftar itu sudah mulai menyimpang; satu rute baru berarti tiga suntingan
 * yang mudah terlewat salah satunya.
 */

/**
 * - `/app`      → PWA ponsel, punya bilah navigasinya sendiri.
 * - `/admin`    → panel petugas, punya tata letaknya sendiri.
 * - `/aplikasi` → Portal Aplikasi, layar penuh tanpa chrome apa pun.
 */
export const OWN_CHROME_ROUTES = ['/app', '/admin', '/aplikasi'] as const;

/**
 * Benar bila rute ini menyediakan chrome-nya sendiri.
 *
 * Pencocokan sengaja per-segmen, bukan `startsWith` mentah: `/aplikasi`
 * tidak boleh tertangkap oleh awalan `/app`, dan rute publik baru yang
 * kebetulan berawalan sama tidak ikut kehilangan navbar.
 */
export function usesOwnChrome(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return OWN_CHROME_ROUTES.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}
