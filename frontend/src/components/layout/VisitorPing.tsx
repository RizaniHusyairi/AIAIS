'use client';

/**
 * Pencatat kunjungan halaman. Tidak menampilkan apa pun.
 *
 * Sengaja terpisah dari `Footer`, meski keduanya dipasang berdampingan:
 * footer disembunyikan di dalam PWA (`/app`), sedangkan kunjungan di sana
 * tetap harus terhitung — PWA adalah kanal publik yang sah. Menumpangkan
 * pencatatan pada footer akan membuat seluruh lalu lintas ponsel hilang dari
 * statistik tanpa ada yang menyadarinya.
 *
 * `/admin` dikecualikan: aktivitas petugas bukan kunjungan publik, dan
 * memasukkannya akan menggelembungkan angka yang tayang di footer.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordVisit } from '@/lib/visitors';

export default function VisitorPing() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    recordVisit(pathname);
  }, [pathname]);

  return null;
}
