'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Pengalih akar panel.
 *
 * Sengaja TIDAK memutuskan sendiri antara dasbor dan halaman masuk: sesi kini
 * berupa cookie httpOnly yang memang tidak terbaca dari peramban. Cukup
 * lempar ke dasbor — penjaga di `admin/layout.tsx` yang menanyakan keabsahan
 * sesinya ke backend, dan mengembalikan ke halaman masuk bila perlu.
 */
export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return null;
}
