'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import {
  MoonStar, ShowerHead, Armchair, Wifi, BatteryCharging, CreditCard, Baby, Accessibility, Info, Search,
  Utensils, ShoppingBag, Coffee,
} from 'lucide-react';

type Cat = 'semua' | 'umum' | 'belanja' | 'kuliner' | 'lainnya';

const CATS: { value: Cat; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'umum', label: 'Umum' },
  { value: 'belanja', label: 'Belanja' },
  { value: 'kuliner', label: 'Kuliner' },
  { value: 'lainnya', label: 'Lainnya' },
];

const FACILITIES = [
  { name: 'Musholla', icon: MoonStar, color: '#0d9488', bg: '#f0fdfa', cat: 'umum' },
  { name: 'Toilet', icon: ShowerHead, color: '#2563eb', bg: '#eff6ff', cat: 'umum' },
  { name: 'Ruang Tunggu', icon: Armchair, color: '#ea580c', bg: '#fff7ed', cat: 'umum' },
  { name: 'Wi-Fi Gratis', icon: Wifi, color: '#2563eb', bg: '#eff6ff', cat: 'umum' },
  { name: 'Charging Station', icon: BatteryCharging, color: '#059669', bg: '#ecfdf5', cat: 'umum' },
  { name: 'ATM Center', icon: CreditCard, color: '#7c3aed', bg: '#f5f3ff', cat: 'lainnya' },
  { name: 'Area Bermain', icon: Baby, color: '#db2777', bg: '#fdf2f8', cat: 'lainnya' },
  { name: 'Kursi Roda', icon: Accessibility, color: '#0891b2', bg: '#ecfeff', cat: 'lainnya' },
  { name: 'Restoran', icon: Utensils, color: '#dc2626', bg: '#fef2f2', cat: 'kuliner' },
  { name: 'Coffee Shop', icon: Coffee, color: '#92400e', bg: '#fef3c7', cat: 'kuliner' },
  { name: 'Duty Free', icon: ShoppingBag, color: '#7c3aed', bg: '#f5f3ff', cat: 'belanja' },
  { name: 'Informasi', icon: Info, color: '#2563eb', bg: '#eff6ff', cat: 'umum' },
];

export default function FasilitasScreen() {
  const [cat, setCat] = useState<Cat>('semua');
  const items = FACILITIES.filter((f) => cat === 'semua' || f.cat === cat);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Fasilitas Bandara" />
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {CATS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCat(c.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[12.5px] font-semibold transition-colors ${
                cat === c.value ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div key={cat} variants={listContainer} initial="hidden" animate="show" className="p-4 grid grid-cols-3 gap-3">
        {items.map((f) => {
          const Icon = f.icon;
          return (
            <motion.button
              key={f.name}
              variants={listItem}
              whileTap={{ scale: 0.94 }}
              className="bg-white rounded-2xl p-4 shadow-sm shadow-slate-200/60 flex flex-col items-center gap-2.5 aspect-square justify-center"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: f.bg }}>
                <Icon className="w-6 h-6" style={{ color: f.color }} strokeWidth={2.1} />
              </div>
              <span className="text-[11.5px] font-semibold text-slate-700 text-center leading-tight">{f.name}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
