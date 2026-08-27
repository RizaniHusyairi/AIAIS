'use client';

import React, { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Accessibility } from 'lucide-react';
import PanelAksesibilitas from './PanelAksesibilitas';

/**
 * Peluncur panel aksesibilitas yang mengambang di seluruh portal.
 *
 * MENGAMBANG, BUKAN DI DALAM NAVBAR. Navbar tidak dirender pada rute
 * ber-chrome sendiri (`/app`, `/aplikasi`), dan justru pengunjung PWA-lah yang
 * paling sering membaca portal ini di layar kecil sambil berdiri di terminal.
 * Tombol di dalam navbar berarti mereka tidak punya jalan sama sekali.
 *
 * DUA RUTE DIKECUALIKAN, dan alasannya berbeda dari `OWN_CHROME_ROUTES`
 * sehingga daftarnya ditulis sendiri di sini alih-alih menumpang daftar itu:
 *
 * - `/admin`   → panel petugas punya sistem temanya sendiri (`data-adm-theme`)
 *                dan tata letak yang rapat. Penyetelannya sendiri TETAP
 *                berlaku di sana bila petugas menyalakannya dari portal —
 *                yang tidak dipasang hanyalah tombolnya.
 * - `/absensi` → layar sekali-pakai bertoken di pintu ruang rapat; ponselnya
 *                berpindah tangan antarpeserta, dan penyetelan yang tertinggal
 *                dari peserta sebelumnya hanya membingungkan yang berikutnya.
 */
const TANPA_PELUNCUR = ['/admin', '/absensi'] as const;

export default function TombolAksesibilitas() {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);
  const tombolRef = useRef<HTMLButtonElement>(null);

  const tersembunyi =
    !pathname ||
    TANPA_PELUNCUR.some((b) => pathname === b || pathname.startsWith(`${b}/`));

  if (tersembunyi) return null;

  /* Ditumpuk di atas peluncur Pusat Bantuan (`bottom-5`, tinggi 56px) supaya
     keduanya tidak bertindihan. Di PWA tombol bantuan itu tidak dirender,
     tetapi ada bilah navigasi bawah — `env(safe-area-inset-bottom)` menjaga
     jaraknya dari batang gestur iPhone. */
  const posisi = pathname.startsWith('/app')
    ? 'bottom-[calc(88px+env(safe-area-inset-bottom))] right-4'
    : 'bottom-[92px] right-5';

  return (
    <>
      <motion.button
        ref={tombolRef}
        onClick={() => setBuka((s) => !s)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.5 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className={`group fixed ${posisi} z-40 w-12 h-12 rounded-full bg-white border border-slate-200 text-blue-700 shadow-xl shadow-slate-900/15 flex items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-200 cursor-pointer`}
        aria-label="Buka penyetelan aksesibilitas"
        aria-expanded={buka}
        aria-haspopup="dialog"
      >
        <Accessibility className="w-[22px] h-[22px]" />

        {/* Label muncul saat disentuh tetikus; disembunyikan di layar kecil
            agar tidak menutupi isi halaman. */}
        <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="whitespace-nowrap bg-slate-900 text-white text-[12px] font-bold px-3 py-2 rounded-lg shadow-lg">
            Aksesibilitas
          </span>
        </span>
      </motion.button>

      <AnimatePresence>
        {buka && (
          <PanelAksesibilitas
            tutup={() => setBuka(false)}
            kembalikanFokusKe={tombolRef}
          />
        )}
      </AnimatePresence>
    </>
  );
}
