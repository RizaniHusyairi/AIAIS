'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import { Car, Bus, CarFront, ParkingSquare, Bike, ChevronRight, Headphones } from 'lucide-react';

const OPTIONS = [
  { name: 'Taksi', desc: 'Tersedia di area kedatangan', icon: Car, color: '#ea580c', bg: '#fff7ed' },
  { name: 'Bus DAMRI', desc: 'Rute ke berbagai kota', icon: Bus, color: '#2563eb', bg: '#eff6ff' },
  { name: 'Rental Mobil', desc: 'Berbagai pilihan kendaraan', icon: CarFront, color: '#059669', bg: '#ecfdf5' },
  { name: 'Parkir Kendaraan', desc: 'Area parkir luas & aman', icon: ParkingSquare, color: '#7c3aed', bg: '#f5f3ff' },
  { name: 'Ojek Online', desc: 'Titik jemput di area khusus', icon: Bike, color: '#16a34a', bg: '#f0fdf4' },
];

export default function TransportasiScreen() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Transportasi" />
      </div>

      <motion.div variants={listContainer} initial="hidden" animate="show" className="p-4 space-y-3">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          return (
            <motion.button
              key={o.name}
              variants={listItem}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 text-left"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: o.bg }}>
                <Icon className="w-6 h-6" style={{ color: o.color }} strokeWidth={2.1} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-[14.5px]">{o.name}</p>
                <p className="text-[12px] text-slate-500">{o.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </motion.button>
          );
        })}

        {/* Help card */}
        <motion.div variants={listItem} className="relative overflow-hidden bg-gradient-to-br from-[#123a8f] to-[#2563eb] rounded-3xl p-5 text-white mt-2">
          <div className="relative z-10 max-w-[70%]">
            <p className="font-bold text-[16px]">Butuh Bantuan?</p>
            <p className="text-blue-100 text-[12.5px] mt-1 leading-relaxed">Hubungi layanan kami 24/7 untuk informasi transportasi.</p>
            <button className="mt-3 bg-white text-blue-700 font-semibold text-[12.5px] px-4 py-2 rounded-full active:scale-95 transition-transform">
              Hubungi Sekarang
            </button>
          </div>
          <Headphones className="absolute -bottom-3 -right-2 w-28 h-28 text-white/15" />
        </motion.div>
      </motion.div>
    </div>
  );
}
