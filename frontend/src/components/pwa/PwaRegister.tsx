'use client';

import { useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Only register in production to avoid interfering with dev HMR
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      // Versi disisipkan ke URL skrip supaya cache berotasi otomatis tiap
      // rilis (lihat public/sw.js). `updateViaCache: 'none'` memastikan skrip
      // worker selalu diambil dari jaringan, bukan cache HTTP.
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`, { updateViaCache: 'none' })
        .catch((err) => {
          // Jangan ditelan diam-diam: kegagalan pendaftaran berarti PWA
          // kehilangan kemampuan luring, dan itu perlu terlihat saat menyelidiki.
          console.warn('[PWA] Pendaftaran service worker gagal:', err);
        });
    };

    /**
     * Penting: efek React bisa berjalan SETELAH event `load` terlanjur menyala
     * (mis. saat berkas sudah ada di cache HTTP sehingga halaman selesai lebih
     * cepat daripada hidrasi). Kalau hanya memasang listener, pendaftaran tidak
     * pernah terjadi pada kunjungan-kunjungan berikutnya — akibatnya service
     * worker lama terus mengendalikan halaman dan cache tidak pernah berotasi
     * meski versi sudah naik.
     */
    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
