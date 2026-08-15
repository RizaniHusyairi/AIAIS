import type { Metadata, Viewport } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PwaRegister from "@/components/pwa/PwaRegister";
import MobileRedirect from "@/components/pwa/MobileRedirect";
import VisitorPing from "@/components/layout/VisitorPing";
import ChatLauncher from "@/components/layout/ChatLauncher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bandara APT Pranoto Samarinda (AAP) | Sistem Informasi Terpadu AIAIS",
  description: "Portal resmi informasi penerbangan FIDS, berita, pengumuman, fasilitas terminal, direktori tenant, dan pengaduan online Bandara Aji Pangeran Tumenggung Pranoto Samarinda.",
  keywords: ["APT Pranoto", "AAP Samarinda", "Bandara Samarinda", "Jadwal Penerbangan Samarinda", "FIDS AAP", "IKN Airport"],
  manifest: "/manifest.webmanifest",
  applicationName: "APT Pranoto",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "APT Pranoto",
  },
  /*
   * Ikon TIDAK didaftarkan di sini.
   *
   * `src/app/icon.png` dan `src/app/apple-icon.png` sudah ditemukan Next.js
   * lewat konvensi berkas, dan tautannya disisipkan otomatis. Mendaftarkannya
   * ulang di sini justru menghasilkan DUA tautan ikon yang bersaing, dan
   * peramban tidak sepakat mana yang menang — itu sebabnya tab sempat
   * menampilkan lambang lama meski berkasnya sudah diganti.
   *
   * Lambangnya sendiri berlatar biru lembaga, bukan transparan: lambang APT
   * berwarna emas tipis, dan pada 16px di bilah tab ia nyaris hilang di atas
   * latar terang.
   */
};

export const viewport: Viewport = {
  themeColor: "#0b1e5b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `suppressHydrationWarning` berlaku khusus untuk atribut <html> itu sendiri.
  // Panel admin menyetel `data-adm-theme` lewat skrip sebaris sebelum React
  // hidrasi — itu memang disengaja, supaya tema gelap tidak didahului kedipan
  // putih. Tanpa penanda ini React melaporkannya sebagai ketidakcocokan.
  // Cakupannya hanya satu elemen ini; anak-anaknya tetap diperiksa seperti biasa.
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
        <PwaRegister />
        <MobileRedirect />
        {/* Mencatat kunjungan halaman publik; tidak menampilkan apa pun.
            Terpisah dari <Footer /> karena footer tidak tampil di PWA
            sedangkan kunjungannya tetap dihitung. */}
        <VisitorPing />
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        {/* Peluncur Pusat Bantuan; menyembunyikan dirinya di /admin dan /app. */}
        <ChatLauncher />
      </body>
    </html>
  );
}
