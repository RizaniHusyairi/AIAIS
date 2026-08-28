'use client';

import Link from 'next/link';
import { Plane, Home, Newspaper, HelpCircle, LayoutGrid } from 'lucide-react';
import { useTeks } from '@/lib/kamus';

/**
 * Isi halaman 404.
 *
 * Dipisahkan dari `not-found.tsx` semata-mata karena teksnya ikut berganti
 * bahasa: berkas itu mengekspor `metadata`, jadi ia wajib Server Component dan
 * tidak boleh memanggil `useTeks()`. Pemisahan tipis yang sama sudah dipakai
 * seluruh halaman publik lain (`page.tsx` + `*View.tsx`).
 *
 * Halaman ini justru yang paling perlu diterjemahkan: pengunjung asing yang
 * salah ketik alamat mendarat di sini sebelum sempat menemukan tombol bahasa,
 * dan lima tujuan di bawah adalah satu-satunya jalan keluarnya.
 */
export default function NotFoundView() {
  const t = useTeks();

  /** Tujuan yang paling sering dicari orang yang tersesat. */
  const tujuan = [
    { href: '/', icon: Home, ...t.galat404.tujuan.beranda },
    { href: '/flights', icon: Plane, ...t.galat404.tujuan.penerbangan },
    { href: '/news', icon: Newspaper, ...t.galat404.tujuan.berita },
    { href: '/layanan', icon: LayoutGrid, ...t.galat404.tujuan.layanan },
    { href: '/faq', icon: HelpCircle, ...t.galat404.tujuan.faq },
  ];

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-[#0b1e5b] via-[#143a8f] to-slate-50">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
        <p className="text-sky-200 text-sm font-bold tracking-[0.3em] uppercase">{t.galat404.kode}</p>

        <h1 className="mt-4 text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.05]">
          {t.galat404.judul}
        </h1>

        <p className="mt-5 text-blue-100/90 leading-relaxed max-w-xl">{t.galat404.ringkas}</p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {tujuan.map(({ href, label, desc, icon: Ikon }) => (
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
