'use client';

/**
 * Permohonan Informasi Publik di dalam PWA.
 *
 * MEMAKAI ULANG VIEW HALAMAN PUBLIK, TIDAK MENULISNYA ULANG. Ini satu-satunya
 * layar PWA yang tidak dibangun dari nol, dan itu disengaja.
 *
 * Formulirnya wizard tiga langkah dengan dua unggahan wajib (pindaian KTP dan
 * surat pernyataan), batas 2 MB per berkas, daftar cara memperoleh dan cara
 * mendapat salinan, serta pelacakan tiket — sekitar empat ratus baris aturan
 * yang menegakkan kewajiban UU 14/2008. Menyalinnya ke sini berarti dua
 * salinan aturan yang sama, dan salinan kedua pasti tertinggal begitu yang
 * pertama disunting. Persis kekeliruan yang sedang diperbaiki pekerjaan ini
 * pada peta rute PWA, yang juga hidup di dua tempat lalu menyimpang.
 *
 * Viewnya sudah responsif sampai 375px dan berdiri sendiri (tidak menuntut
 * navbar maupun footer), jadi ia tinggal ditaruh di dalam kerangka aplikasi.
 * `scope` manifest sengaja `/` — lihat catatan di `manifest.webmanifest` —
 * sehingga unggahan berkas tetap berlangsung di dalam aplikasi terpasang.
 */

import React from 'react';
import PengajuanInformasiView from '@/app/ppid/pengajuan-informasi/PengajuanInformasiView';
import { StatusBar, AppHeader } from '@/components/pwa/ui';

export default function PermohonanInformasiScreen() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Permohonan Informasi" />
      </div>

      <PengajuanInformasiView />
    </div>
  );
}
