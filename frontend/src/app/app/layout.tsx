import React from 'react';
import type { Metadata } from 'next';
import { BottomNav, SideRail } from '@/components/pwa/ui';

/**
 * Seluruh layar PWA tidak diindeks.
 *
 * Isinya bukan isi baru: setiap layar di sini menyajikan data yang sama dengan
 * lintasan publiknya (`/app/berita` ⇄ `/news`, dan seterusnya — pemetaannya
 * di `lib/pwaRoutes.ts`). Dua alamat dengan isi yang sama saling membagi
 * sinyal peringkat, dan yang seharusnya menang adalah lintasan publik: hanya
 * lintasan itu yang punya metadata, kanonik, dan tempat di sitemap.
 *
 * `follow: true`, bukan `noindex, nofollow`. Tautan di dalam layar PWA tetap
 * boleh diikuti perayap supaya halaman yang ditujunya tetap ditemukan; yang
 * dilarang hanya menaruh layar ini sendiri ke dalam indeks.
 *
 * Ini melengkapi — bukan menggantikan — penjaga perayap di `proxy.ts` dan
 * `MobileRedirect.tsx`. Penjaga itu mencegah perayap SAMPAI ke sini; penanda
 * ini yang menangani sisanya, yaitu perayap yang tiba lewat tautan langsung
 * ke /app yang pernah dibagikan seseorang.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/**
 * Kerangka PWA — dua bentuk, satu isi.
 *
 *  - `< md`  ponsel: isi memenuhi layar, navigasi di bilah bawah.
 *  - `≥ md`  tablet: navigasi pindah ke rail kiri, isi dibatasi 1120px dan
 *            dipusatkan.
 *
 * BINGKAI PONSEL 440px SENGAJA DIHAPUS. Sebelumnya `md:max-w-[440px]` membuat
 * setiap tablet menampilkan mockup ponsel di tengah lautan abu-abu — bukan
 * aplikasi yang menghormati layarnya, melainkan gambar aplikasi. Batas lebar
 * yang tersisa hanya `max-w-[1120px]`, dan itu untuk keterbacaan baris teks,
 * bukan untuk meniru perangkat.
 *
 * Tiap layar sendirilah yang memutuskan menjadi berapa kolom di `md` ke atas;
 * kerangka ini hanya menyediakan ruangnya.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-slate-100">
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1120px] bg-slate-50 md:shadow-[0_0_60px_-25px_rgba(15,23,42,0.35)]">
        <SideRail />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Wilayah yang menggulir */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain">
            {children}
          </div>

          <BottomNav />
        </div>
      </div>
    </div>
  );
}
