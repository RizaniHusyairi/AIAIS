'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import { Search, MessageCircle, PackageSearch, Calendar, Plane, Briefcase, CircleHelp, ChevronRight, Palmtree } from 'lucide-react';

const SERVICES = [
  { name: 'Pusat Bantuan', desc: 'Tanya petugas, adukan, atau lacak tiket', icon: MessageCircle, color: '#2563eb', bg: '#eff6ff', href: '/app/layanan/bantuan' },
  { name: 'Lost & Found', desc: 'Layanan barang hilang', icon: PackageSearch, color: '#059669', bg: '#ecfdf5', href: '/app/layanan' },
  { name: 'Booking Fasilitas', desc: 'Pesan ruang meeting & fasilitas', icon: Calendar, color: '#7c3aed', bg: '#f5f3ff', href: '/app/layanan' },
  { name: 'Informasi Penerbangan', desc: 'Jadwal & status penerbangan', icon: Plane, color: '#0891b2', bg: '#ecfeff', href: '/app/penerbangan' },
  { name: 'Wisata Terdekat', desc: 'Destinasi wisata di sekitar bandara', icon: Palmtree, color: '#16a34a', bg: '#f0fdf4', href: '/app/wisata' },
  { name: 'Karir', desc: 'Lowongan pekerjaan di bandara', icon: Briefcase, color: '#ea580c', bg: '#fff7ed', href: '/app/layanan' },
  { name: 'FAQ', desc: 'Pertanyaan yang sering diajukan', icon: CircleHelp, color: '#db2777', bg: '#fdf2f8', href: '/faq' },
];

export default function LayananScreen() {
  const [q, setQ] = useState('');
  const items = SERVICES.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Layanan" back={false} />
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari layanan..."
              className="w-full bg-slate-100 rounded-2xl pl-11 pr-4 py-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-[13px] font-bold text-slate-900 mb-3">Layanan Online</h2>
        <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
          {items.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.name} variants={listItem}>
                <Link
                  href={s.href}
                  className="w-full flex items-center gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.98] transition-transform"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
                    <Icon className="w-5 h-5" style={{ color: s.color }} strokeWidth={2.1} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-[14px]">{s.name}</p>
                    <p className="text-[11.5px] text-slate-500 truncate">{s.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </Link>
              </motion.div>
            );
          })}
          {items.length === 0 && (
            <p className="text-center text-slate-400 text-[13px] py-10">Tidak ada layanan yang cocok.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
