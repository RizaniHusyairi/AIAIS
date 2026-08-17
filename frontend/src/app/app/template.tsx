'use client';

import { motion } from 'framer-motion';

/**
 * Transisi antarlayar PWA.
 *
 * `flex flex-col` BUKAN hiasan. Pembungkus ini berdiri di antara wadah gulir
 * dan tiap layar, dan tingginya `min-height: 100%` — artinya tinggi
 * *terhitung*-nya mengikuti isi. Layar yang meminta `h-full` karenanya
 * mengukur diri terhadap tinggi yang tidak pasti, gagal, lalu menciut
 * setinggi isinya sendiri: itulah yang membuat ruang percakapan menempelkan
 * kolom ketiknya tepat di bawah pesan pertama dan menyisakan setengah layar
 * kosong di bawahnya.
 *
 * Sebagai kolom fleks, pembungkus ini tetap merentang sampai satu layar penuh
 * dan layar yang memakai `flex-1` mengisi sisanya — tanpa persentase tinggi
 * sama sekali.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-full flex flex-col"
    >
      {children}
    </motion.div>
  );
}
