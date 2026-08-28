import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Playfair_Display } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PwaRegister from "@/components/pwa/PwaRegister";
import MobileRedirect from "@/components/pwa/MobileRedirect";
import PemicuEvent from "@/components/events/PemicuEvent";
import VisitorPing from "@/components/layout/VisitorPing";
import ChatLauncher from "@/components/layout/ChatLauncher";
import { THEME_INIT_SCRIPT } from "@/components/admin/themeShared";
import { SITE_THEME_INIT_SCRIPT } from "@/lib/siteThemeShared";
import { A11Y_INIT_SCRIPT } from "@/lib/aksesibilitasShared";
import { BAHASA_INIT_SCRIPT } from "@/lib/bahasaShared";
import PenyetelTema from "@/components/layout/PenyetelTema";
import PenyetelAksesibilitas from "@/components/layout/PenyetelAksesibilitas";
import PenyetelBahasa from "@/components/layout/PenyetelBahasa";
import PembacaSentuh from "@/components/layout/PembacaSentuh";
import LewatiTautan from "@/components/layout/LewatiTautan";
import PengaturGerak from "@/components/layout/PengaturGerak";
import TombolAksesibilitas from "@/components/layout/TombolAksesibilitas";
import DekorMalam from "@/components/effects/DekorMalam";
import { SITE_URL, SITE_NAME, ldBandara, ldSitus } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
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

/**
 * Font ramah baca untuk penyetelan aksesibilitas.
 *
 * Atkinson Hyperlegible dirancang Braille Institute khusus agar huruf yang
 * mudah tertukar tetap terbedakan pada penglihatan lemah. Dipakai varian
 * "Next" karena bobotnya variabel 200–800: portal ini memakai
 * `font-semibold`/`extrabold`/`black` di mana-mana, dan versi dua-bobotnya
 * akan memaksa peramban memalsukan tebal — bobot sintetis justru merusak
 * keterbacaan, tepat yang ingin dihindari penyetelan ini.
 *
 * `preload: false` disengaja. Fontnya hanya terpakai bila pengunjung
 * menyalakan penyetelannya; memuatkannya di muka untuk semua orang berarti
 * membebani setiap kunjungan demi sebagian kecil yang memakainya.
 *
 * Sama seperti `Playfair_Display` di atas: lewat `next/font`, berkasnya ikut
 * disimpan portal sendiri, jadi tidak ada permintaan pengunjung yang keluar ke
 * server Google.
 */
const fontTerbaca = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-terbaca",
  display: "swap",
  preload: false,
});

const JUDUL_BAWAAN = "Bandara APT Pranoto Samarinda (AAP) | Sistem Informasi Terpadu AIAIS";
const RINGKASAN_BAWAAN =
  "Portal resmi informasi penerbangan FIDS, berita, pengumuman, fasilitas terminal, direktori tenant, dan pengaduan online Bandara Aji Pangeran Tumenggung Pranoto Samarinda.";

export const metadata: Metadata = {
  /*
   * Tanpa `metadataBase`, setiap `alternates.canonical` di seluruh halaman
   * ditulis Next sebagai lintasan relatif ("/faq"), dan tag kanonik relatif
   * tidak menggabungkan sinyal apa pun — sama saja dengan tidak memasangnya.
   * Nilainya berasal dari `lib/seo.ts`, bukan literal, agar pindah domain
   * cukup disunting di satu tempat.
   */
  metadataBase: new URL(SITE_URL),

  /*
   * Judul ditulis utuh di tiap halaman, TANPA `template`.
   *
   * Godaannya besar untuk memakai `template: "%s – Bandara APT Pranoto
   * Samarinda"`, tetapi 31 halaman yang sudah ada menuliskan judulnya secara
   * lengkap sampai "... | Bandara APT Pranoto Samarinda" — templat akan
   * menempelkan nama portal untuk KEDUA kalinya pada semuanya sekaligus.
   * Judul sepanjang itu dipotong Google jauh sebelum kata terakhirnya terbaca.
   */
  title: JUDUL_BAWAAN,
  description: RINGKASAN_BAWAAN,
  keywords: ["APT Pranoto", "AAP Samarinda", "Bandara Samarinda", "Jadwal Penerbangan Samarinda", "FIDS AAP", "IKN Airport"],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  alternates: { canonical: "/" },

  /*
   * Kartu bagi bawaan, berlaku untuk SETIAP rute yang tidak menimpanya —
   * termasuk halaman yang belum sempat diberi metadata sendiri. Sebelumnya
   * tidak ada satu pun tag Open Graph di portal, sehingga tautan yang
   * dibagikan lewat WhatsApp (kanal utama pengumuman bandara) muncul telanjang
   * tanpa judul maupun gambar.
   *
   * Gambarnya sengaja tidak disebut: `app/opengraph-image.tsx` sudah
   * dilampirkan Next ke seluruh rute lewat konvensi berkas, dan menyebutnya
   * ulang di sini menghasilkan dua tag og:image yang bersaing — persoalan
   * yang sama dengan ikon tab pada catatan di bawah.
   */
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: JUDUL_BAWAAN,
    description: RINGKASAN_BAWAAN,
  },
  twitter: {
    card: "summary_large_image",
    title: JUDUL_BAWAAN,
    description: RINGKASAN_BAWAAN,
  },

  /*
   * `max-image-preview:large` inilah yang membuat foto berita tampil besar di
   * hasil pencarian; tanpanya Google membatasi diri pada thumbnail kecil.
   * Halaman yang TIDAK boleh terindeks tidak diatur di sini melainkan di
   * `robots.ts` dan pada metadata halamannya masing-masing.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  /*
   * Verifikasi kepemilikan di Google Search Console.
   *
   * Lewat variabel lingkungan, bukan literal: token ini milik satu akun
   * Google tertentu, dan menuliskannya di dalam repo berarti siapa pun yang
   * membaca kode dapat mengetahui akun mana yang memegang properti portal.
   * Bila kosong, tagnya tidak dikirim sama sekali — jadi tidak ada
   * `<meta name="google-site-verification" content="undefined">` yang justru
   * menggagalkan verifikasi.
   *
   * Cara memakainya: ambil token dari Search Console (metode "tag HTML"),
   * isi NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION di .env produksi, lalu build.
   */
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),

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
  /*
   * `maximumScale` SENGAJA TIDAK DISETEL.
   *
   * Sebelumnya bernilai 1, dan itu mengunci cubit-zoom di ponsel — tepat
   * gerakan yang paling diandalkan pembaca berpenglihatan lemah untuk
   * membesarkan teks yang di portal ini banyak ditulis dalam piksel mutlak.
   * WCAG 1.4.4 mensyaratkan halaman dapat diperbesar sampai 200%. Peramban
   * modern pun sudah mengabaikan kunci ini di sebagian kasus; menuliskannya
   * hanya menyisakan kerugian tanpa manfaat.
   */
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
      // Dirender `id-ID`, sama dengan yang ditulis BAHASA_INIT_SCRIPT untuk
      // pengunjung berbahasa Indonesia, supaya atributnya tidak berubah dua
      // kali pada gambar pertama.
      lang="id-ID"
      // `variable` hanya mendaftarkan --font-display; ia tidak mengubah font
      // apa pun sampai ada elemen yang benar-benar memakainya.
      className={`h-full antialiased ${serifDisplay.variable} ${fontTerbaca.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
        {/*
          Tautan lompat isi. HARUS elemen pertama <body> — gunanya justru
          menjadi perhentian Tab yang PERTAMA, sebelum tujuh dropdown navbar
          yang kalau tidak dilewati harus ditekan satu per satu di setiap
          halaman oleh pemakai papan tik dan pembaca layar.

          Komponen klien semata-mata karena teksnya ikut berganti bahasa —
          layout ini Server Component dan tidak boleh memanggil `useTeks()`.
          Tersembunyi di luar layar sampai menerima fokus (lihat
          `.lewati-tautan` di globals.css).
        */}
        <LewatiTautan />
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
        {/*
          Dua penyetel tema dalam satu tag, karena keduanya harus jalan sebelum
          gambar pertama dan alasannya sama persis: `data-adm-theme` untuk panel
          petugas, `data-site-theme` untuk portal publik. Keduanya berdiri
          sendiri — petugas boleh memakai panel gelap sambil membaca portal
          dalam tema terang, dan sebaliknya.

          Sesudah gambar pertama, atribut publiknya menjadi urusan
          <PenyetelTema /> di bawah; skrip ini tidak pernah jalan lagi karena
          Next berpindah halaman tanpa memuat ulang dokumen.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              THEME_INIT_SCRIPT + SITE_THEME_INIT_SCRIPT + A11Y_INIT_SCRIPT + BAHASA_INIT_SCRIPT,
          }}
        />
        <PenyetelTema />
        {/* Penyetelan aksesibilitas. Tidak menyaring rute seperti
            <PenyetelTema />: kontras tinggi dan teks besar berlaku di mana pun
            pengunjungnya berada, termasuk di panel petugas. */}
        <PenyetelAksesibilitas />
        {/* Bahasa portal. Yang disetelnya atribut `lang` pada <html> — bukan
            hiasan: pembaca layar memilih fonemnya dari sana, dan atribut yang
            salah membuat halaman berbahasa Inggris dilafalkan dengan fonem
            Indonesia. Teks halamannya sendiri diambil tiap komponen lewat
            `useTeks()`. */}
        <PenyetelBahasa />
        {/* Pembacaan yang mengikuti kursor. Di layout akar, bukan di dalam
            panel aksesibilitas: panelnya dilepas begitu ditutup, sedangkan
            pembacaannya justru baru berguna sesudah itu — saat pemakai
            kembali menyusuri halaman. */}
        <PembacaSentuh />
        {/*
          Penyalur penyetelan "kurangi gerak" ke seluruh animasi
          framer-motion sekaligus. Membungkus di sini, bukan di tiap
          halaman: 126 berkas memakai framer-motion, dan berkas ke-127 pasti
          akan lupa mendaftarkan dirinya. Lihat komponennya untuk alasan
          kenapa nilai matinya `'user'` dan bukan `'never'`.
        */}
        <PengaturGerak>
          {/*
            Data terstruktur tingkat situs.

            Hanya dua skema yang benar-benar menggambarkan SELURUH portal yang
            boleh ada di sini — identitas bandara dan identitas situsnya. Skema
            yang menggambarkan satu jenis isi (berita, tanya jawab, remah jejak)
            dipasang halamannya sendiri; menaburkannya dari layout akar berarti
            menjanjikan kepada Google isi yang tidak ada di halaman itu, dan
            Google memperlakukan janji yang meleset sebagai sinyal buruk.

            Ikut terkirim di /admin dan /app juga. Itu tidak merugikan: keduanya
            tidak diindeks (lihat robots.ts), dan muatannya di bawah 1 KB.
          */}
          <JsonLd data={[ldBandara(), ldSitus()]} />
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
          {/* Langit berbintang, pesawat jauh, dan lampu pendekatan landasan.
              Merender `null` di luar tema malam dan di rute ber-chrome sendiri,
              jadi pengunjung siang tidak menanggung satu pun loop animasi.
              Sebelum <Navbar /> supaya ia berada di lapisan paling belakang. */}
          <DekorMalam />
          <Navbar />
          {/* `id` dipakai dua hal sekaligus: sasaran tautan lompat isi di atas,
              dan sumber teks yang dibacakan fitur baca nyaring. */}
          <main id="konten-utama" className="flex-grow">{children}</main>
          <Footer />
          {/* Peluncur Pusat Bantuan; menyembunyikan dirinya di /admin dan /app. */}
          <ChatLauncher />
          {/* Peluncur panel aksesibilitas. Sesudah <ChatLauncher /> supaya
              keduanya bertumpuk dengan urutan yang tetap di pojok kanan. */}
          <TombolAksesibilitas />
        </PengaturGerak>
      </body>
    </html>
  );
}
