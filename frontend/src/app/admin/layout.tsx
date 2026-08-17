import React from 'react';
import AdminShell from './AdminShell';

/**
 * Kerangka panel.
 *
 * Isinya tinggal kerangka klien di `AdminShell`.
 *
 * SKRIP PENYETEL TEMA TIDAK LAGI DI SINI. Ia pindah ke layout akar
 * (`app/layout.tsx`) — lihat komentar panjang di sana. Ringkasnya: <script>
 * yang dirender React di klien tidak pernah dieksekusi, dan segmen layout ini
 * memang dirender di klien setiap kali pengunjung berpindah dari halaman
 * publik ke `/admin`. Menjadikan berkas ini Server Component tidak mengubah
 * hal itu.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
