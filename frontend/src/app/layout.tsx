import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PwaRegister from "@/components/pwa/PwaRegister";
import MobileRedirect from "@/components/pwa/MobileRedirect";
import PemicuEvent from "@/components/events/PemicuEvent";
import VisitorPing from "@/components/layout/VisitorPing";
import ChatLauncher from "@/components/layout/ChatLauncher";
import { THEME_INIT_SCRIPT } from "@/components/admin/themeShared";
import "./globals.css";

/**
 * Serif display untuk nama resmi bandara pada hero beranda.
 *
 * Dimuat lewat `next/font`, BUKAN tautan ke fonts.googleapis.com: berkasnya
 * ikut disimpan portal sendiri, sehingga tidak ada satu pun permintaan
 * pengunjung yang keluar ke server Google — hal yang tidak sepele pada portal
 * pemerintah — sekaligus menghilangkan pergeseran tata letak saat font selesai
 * dimuat.
 *
 * Diekspos sebagai variabel CSS dan TIDAK dipasang ke <body>: hanya nama
 * bandara yang memakainya. Menjadikannya font seluruh portal akan mengubah
 * ribuan baris teks antarmuka yang memang dirancang dengan sans.
 *
 * Bobot 500–800 saja; itu rentang yang benar-benar dipakai lockup-nya.
 */
const serifDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

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
    <html
      lang="id"
      // `variable` hanya mendaftarkan --font-display; ia tidak mengubah font
      // apa pun sampai ada elemen yang benar-benar memakainya.
      className={`h-full antialiased ${serifDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
        {/*
          Penyetel tema panel. HARUS di layout akar, bukan di `app/admin/layout.tsx`.

          Layout akar hanya dirender sekali pada dokumen awal dan tidak pernah
          dirender ulang saat berpindah halaman, jadi tag ini selalu ikut HTML
          pertama dan benar-benar dijalankan peramban.

          Sebelumnya ia ada di layout `/admin`. Menjadikan layout itu Server
          Component TIDAK menolong: segmen layout tetap dirender React di klien
          ketika pengunjung berpindah dari halaman publik ke `/admin`, dan React
          tidak pernah mengeksekusi <script> yang dirender di klien — ia hanya
          memperingatkannya di konsol. Akibatnya bukan sekadar peringatan:
          petugas bertema gelap yang membuka beranda lebih dulu lalu menyusur ke
          panel mendapat panel terang, karena tidak ada lagi yang menyetel
          atributnya.

          Skripnya ikut jalan di halaman publik. Itu tidak apa-apa — ia hanya
          membaca satu kunci localStorage dan menyetel satu atribut yang tidak
          dipakai halaman publik.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <PwaRegister />
        <MobileRedirect />
        {/* Mencatat kunjungan halaman publik; tidak menampilkan apa pun.
            Terpisah dari <Footer /> karena footer tidak tampil di PWA
            sedangkan kunjungannya tetap dihitung. */}
        <VisitorPing />
        {/* Layar sambutan perayaan. Dipasang di sini, bukan di halaman
            beranda, supaya beranda portal dan beranda PWA memakai pemicu yang
            sama — pengunjung ponsel merayakan hari yang sama. Ia menyaring
            rutenya sendiri dan tidak merender apa pun di luar kedua beranda. */}
        <PemicuEvent />
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        {/* Peluncur Pusat Bantuan; menyembunyikan dirinya di /admin dan /app. */}
        <ChatLauncher />
      </body>
    </html>
  );
}
