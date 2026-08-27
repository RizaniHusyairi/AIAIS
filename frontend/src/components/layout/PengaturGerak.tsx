'use client';

import React from 'react';
import { MotionConfig } from 'framer-motion';
import { useAksesibilitas } from '@/lib/aksesibilitas';

/**
 * Menyalurkan penyetelan "kurangi gerak" ke SELURUH animasi framer-motion.
 *
 * framer-motion dipakai di 126 berkas portal ini; menyunting semuanya satu per
 * satu bukan pilihan yang masuk akal, dan berkas ke-127 pasti akan lupa.
 * `MotionConfig` menyelesaikannya dari satu titik: setiap `motion.*` di
 * bawahnya menghormati setelan ini, dan `useReducedMotion()` — yang sudah
 * dipanggil 14 berkas, termasuk kanvas hiasan — ikut mengembalikan `true`
 * tanpa satu pun di antaranya perlu tahu panel aksesibilitas itu ada.
 *
 * NILAI MATINYA `'user'`, BUKAN `'never'`. Pengunjung yang sudah meminta
 * gerak minimal lewat setelan sistem operasinya tetap dihormati seperti
 * sebelumnya, tanpa perlu menyalakan apa pun di portal.
 *
 * Membungkus `children` di layout akar TIDAK memaksa seluruh pohon menjadi
 * komponen klien: `children` sudah dirender di server dan hanya diteruskan ke
 * sini sebagai prop.
 */
export default function PengaturGerak({ children }: { children: React.ReactNode }) {
  const { gerak } = useAksesibilitas();

  return <MotionConfig reducedMotion={gerak ? 'always' : 'user'}>{children}</MotionConfig>;
}
