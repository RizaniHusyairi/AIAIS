'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StatusBar, listContainer, listItem } from '@/components/pwa/ui';
import { APP_VERSION } from '@/lib/version';
import { User, Bell, Bookmark, FileText, Languages, Info, Settings, ChevronRight, LogOut } from 'lucide-react';

const MENU = [
  { name: 'Profil Saya', icon: User, color: '#2563eb', bg: '#eff6ff' },
  { name: 'Notifikasi', icon: Bell, color: '#ea580c', bg: '#fff7ed' },
  { name: 'Tiket & Booking', icon: Bookmark, color: '#7c3aed', bg: '#f5f3ff' },
  { name: 'Riwayat Pengaduan', icon: FileText, color: '#0891b2', bg: '#ecfeff' },
  { name: 'Bahasa', icon: Languages, color: '#059669', bg: '#ecfdf5', value: 'Indonesia' },
  { name: 'Tentang APT Pranoto', icon: Info, color: '#db2777', bg: '#fdf2f8' },
  { name: 'Pengaturan', icon: Settings, color: '#475569', bg: '#f1f5f9' },
];

export default function ProfilScreen() {
  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#123a8f] to-[#2563eb] text-white rounded-b-[2rem]">
        <StatusBar />
        <div className="px-5 pt-3 pb-8 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center backdrop-blur">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-blue-100 text-[12px]">Selamat Datang,</p>
            <p className="font-black text-[20px] leading-tight">Pengguna</p>
            <p className="text-blue-100/80 text-[11.5px] mt-0.5">Lihat & kelola akun Anda</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <motion.div variants={listContainer} initial="hidden" animate="show" className="p-4 -mt-4 relative z-10 space-y-2.5">
        {MENU.map((m) => {
          const Icon = m.icon;
          return (
            <motion.button
              key={m.name}
              variants={listItem}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3.5 shadow-sm shadow-slate-200/60 text-left"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.bg }}>
                <Icon className="w-5 h-5" style={{ color: m.color }} strokeWidth={2.1} />
              </div>
              <span className="flex-1 font-semibold text-slate-800 text-[14px]">{m.name}</span>
              {m.value && <span className="text-[12px] text-slate-400">{m.value}</span>}
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </motion.button>
          );
        })}

        <motion.button
          variants={listItem}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 mt-2 text-rose-600 font-semibold text-[14px] py-3.5 rounded-2xl bg-rose-50 active:bg-rose-100 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" /> Keluar
        </motion.button>

        <button
          onClick={() => {
            document.cookie = 'aptView=desktop; path=/; max-age=' + 60 * 60 * 24 * 30;
            window.location.href = '/';
          }}
          className="w-full text-center text-[12px] font-semibold text-blue-600 pt-1"
        >
          Buka Versi Desktop
        </button>
        {/* Sebelumnya "Versi 1.0.0" ter-hardcode dan salah — bertentangan
            dengan package.json. Kini bersumber dari berkas VERSION. */}
        <p className="text-center text-[11px] text-slate-400 pt-1">
          APT Pranoto App · Versi {APP_VERSION}
        </p>
      </motion.div>
    </div>
  );
}
