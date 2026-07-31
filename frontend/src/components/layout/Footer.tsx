'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VERSION_LABEL } from '@/lib/version';

export default function Footer() {
  const pathname = usePathname();
  // Hide the public footer inside the PWA (/app) and admin panel (/admin).
  if (pathname?.startsWith('/app') || pathname?.startsWith('/admin')) return null;

  return (
    <footer className="bg-[#091124] text-slate-300 text-xs border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand Column (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center">
            <img src="/logo-apt.svg" alt="Bandar Udara APT Pranoto Samarinda" className="h-16 w-auto" />
          </div>

          <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
            Bandar Udara APT Pranoto Samarinda siap melayani dengan aman, nyaman, dan profesional. Gerbang utama udara Ibu Kota Kalimantan Timur & Penyangga IKN.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors text-slate-400 font-bold text-xs" title="Facebook">
              f
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-colors text-slate-400 font-bold text-xs" title="Instagram">
              ig
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors text-slate-400 font-bold text-xs" title="YouTube">
              yt
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-cyan-500 hover:text-white flex items-center justify-center transition-colors text-slate-400 font-bold text-xs" title="TikTok">
              tk
            </a>
          </div>
        </div>

        {/* Informasi Links */}
        <div className="space-y-3">
          <h4 className="font-bold text-white text-sm">Informasi</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link href="/profile" className="hover:text-cyan-400 transition-colors">Profil Bandara</Link></li>
            <li><Link href="/profile#sejarah" className="hover:text-cyan-400 transition-colors">Sejarah</Link></li>
            <li><Link href="/profile#pejabat" className="hover:text-cyan-400 transition-colors">Manajemen & Pejabat</Link></li>
            <li><Link href="/tourism" className="hover:text-cyan-400 transition-colors">Pariwisata Terdekat</Link></li>
            <li><Link href="/downloads" className="hover:text-cyan-400 transition-colors">Laporan & Publikasi</Link></li>
            <li><Link href="/profile#karir" className="hover:text-cyan-400 transition-colors">Karir & Informasi</Link></li>
          </ul>
        </div>

        {/* Layanan Links */}
        <div className="space-y-3">
          <h4 className="font-bold text-white text-sm">Layanan</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link href="/tenants" className="hover:text-cyan-400 transition-colors">Layanan Online</Link></li>
            <li><Link href="/complaints" className="hover:text-cyan-400 transition-colors">Pengaduan Penumpang</Link></li>
            <li><Link href="/facilities" className="hover:text-cyan-400 transition-colors">Lost & Found</Link></li>
            <li><Link href="/facilities#peta" className="hover:text-cyan-400 transition-colors">Peta Situs Terminal</Link></li>
            <li><Link href="/downloads" className="hover:text-cyan-400 transition-colors">Syarat & Ketentuan</Link></li>
          </ul>
        </div>

        {/* Kontak Cepat & App Download Badges */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm">Kontak Cepat</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link href="/complaints" className="hover:text-cyan-400 transition-colors">Kontak Kami</Link></li>
              <li><Link href="/profile#lokasi" className="hover:text-cyan-400 transition-colors">Lokasi Bandara</Link></li>
              <li><Link href="/profile#privasi" className="hover:text-cyan-400 transition-colors">Kebijakan Privasi</Link></li>
            </ul>
          </div>

        </div>
      </div>

      {/* Logo institusi */}
      <div className="max-w-7xl mx-auto px-4 mt-14">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-6 py-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 text-center sm:text-left">
            Di Bawah Naungan
          </p>

          <div className="flex items-center gap-6 sm:gap-8">
            <img
              src="/logo-kemenhub.png"
              alt="Kementerian Perhubungan Republik Indonesia"
              title="Kementerian Perhubungan Republik Indonesia"
              className="h-14 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />

            <span className="w-px h-12 bg-white/15" />

            <img
              src="/logo-blu-speed.png"
              alt="BLU Speed"
              title="Badan Layanan Umum — BLU Speed"
              className="h-14 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-12 mt-12 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-slate-500 text-xs gap-4">
        <p>© {new Date().getFullYear()} APT Pranoto Samarinda. All Rights Reserved.</p>
        <p className="font-mono text-[11px]">
          Bandar Udara Klas I APT Pranoto Samarinda — AIAIS Portal {VERSION_LABEL}
        </p>
      </div>
    </footer>
  );
}
