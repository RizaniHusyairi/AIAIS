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
  icons: {
    icon: "/icon-app.svg",
    apple: "/icon-app.svg",
  },
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
  return (
    <html lang="id" className="h-full antialiased">
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
