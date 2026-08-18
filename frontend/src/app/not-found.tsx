import type { Metadata } from 'next';
import Link from 'next/link';
import { Plane, Home, Newspaper, HelpCircle, LayoutGrid } from 'lucide-react';

/**
 * Halaman 404.
 *
 * Portal sebelumnya tidak punya berkas ini dan memakai bawaan Next — layar
 * putih bertuliskan "This page could not be found", dalam bahasa Inggris,
 * tanpa navigasi, dan tanpa satu pun jalan kembali. Itu bukan sekadar tidak
 * rapi: alamat yang salah ketik atau tautan lama yang sudah dipindah adalah
 * cara yang lumrah orang tiba di portal pemerintah, dan di situlah pengunjung
 * berhenti.
 *
 * Ia juga yang kini dipakai `/news/[slug]` lewat `notFound()` untuk slug yang
 * tidak dikenal — sebelumnya alamat semacam itu menjawab 200 berisi artikel
 * contoh, keadaan yang Google catat sebagai soft 404.
 *
 * Statusnya 404 yang sebenarnya; Next menyetelnya sendiri untuk berkas ini.
 */
export const metadata: Metadata = {
  title: 'Halaman Tidak Ditemukan | Bandara APT Pranoto Samarinda',
  // Halaman galat tidak pernah pantas masuk indeks, tetapi tautan di dalamnya
  // tetap boleh diikuti — di sanalah perayap menemukan jalan kembali ke isi
  // portal yang sungguh ada.
  robots: { index: false, follow: true },
};

/** Tujuan yang paling sering dicari orang yang tersesat. */
const TUJUAN = [
  { href: '/', label: 'Beranda', desc: 'Halaman utama portal', icon: Home },
  { href: '/flights', label: 'Jadwal Penerbangan', desc: 'Keberangkatan & kedatangan hari ini', icon: Plane },
  { href: '/news', label: 'Berita & Pengumuman', desc: 'Kabar terbaru dari bandara', icon: Newspaper },
  { href: '/layanan', label: 'Layanan', desc: 'Perizinan dan layanan bandara', icon: LayoutGrid },
  { href: '/faq', label: 'Tanya Jawab', desc: 'Pertanyaan yang sering diajukan', icon: HelpCircle },
];

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-[#0b1e5b] via-[#143a8f] to-slate-50">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
        <p className="text-sky-200 text-sm font-bold tracking-[0.3em] uppercase">Galat 404</p>

        <h1 className="mt-4 text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.05]">
          Halaman ini tidak ditemukan
        </h1>

        <p className="mt-5 text-blue-100/90 leading-relaxed max-w-xl">
          Alamat yang Anda tuju mungkin salah ketik, sudah dipindahkan, atau
          isinya sudah tidak diterbitkan lagi. Silakan lanjutkan dari salah satu
          tujuan di bawah.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {TUJUAN.map(({ href, label, desc, icon: Ikon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-white/40 transition hover:bg-white hover:shadow-md"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Ikon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-slate-900 group-hover:text-blue-700">{label}</span>
                <span className="block text-[13px] text-slate-500 leading-snug">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
