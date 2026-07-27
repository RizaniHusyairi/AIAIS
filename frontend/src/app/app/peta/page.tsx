'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StatusBar, AppHeader } from '@/components/pwa/ui';
import { Plane, ShieldCheck, ShowerHead, MoonStar, CreditCard, Info, MapPin, X } from 'lucide-react';

type Pin = { id: string; label: string; sub: string; x: number; y: number; icon: any; color: string };

const FLOORS: Record<string, Pin[]> = {
  '1': [
    { id: 'arr', label: 'Kedatangan', sub: 'Area Arrival · Lantai 1', x: 50, y: 12, icon: Plane, color: '#2563eb' },
    { id: 'sec1', label: 'Security Check', sub: 'Pemeriksaan Keamanan', x: 78, y: 30, icon: ShieldCheck, color: '#ea580c' },
    { id: 'dep', label: 'Keberangkatan', sub: 'Area Departure · Lantai 1', x: 24, y: 44, icon: Plane, color: '#2563eb' },
    { id: 'sec2', label: 'Security Check', sub: 'Pemeriksaan Keamanan', x: 70, y: 56, icon: ShieldCheck, color: '#16a34a' },
    { id: 'toilet', label: 'Toilet', sub: 'Tersedia di setiap area', x: 30, y: 70, icon: ShowerHead, color: '#0891b2' },
    { id: 'mush', label: 'Musholla', sub: 'Tempat ibadah', x: 32, y: 88, icon: MoonStar, color: '#0d9488' },
    { id: 'atm', label: 'ATM Center', sub: 'Layanan perbankan', x: 72, y: 86, icon: CreditCard, color: '#7c3aed' },
  ],
  '2': [
    { id: 'lounge', label: 'Executive Lounge', sub: 'Ruang tunggu premium', x: 40, y: 20, icon: MapPin, color: '#7c3aed' },
    { id: 'resto', label: 'Food Court', sub: 'Aneka kuliner', x: 68, y: 40, icon: Info, color: '#dc2626' },
    { id: 'toilet2', label: 'Toilet', sub: 'Tersedia di setiap area', x: 28, y: 60, icon: ShowerHead, color: '#0891b2' },
    { id: 'mush2', label: 'Musholla', sub: 'Tempat ibadah', x: 60, y: 78, icon: MoonStar, color: '#0d9488' },
  ],
  '3': [
    { id: 'office', label: 'Kantor Bandara', sub: 'Administrasi', x: 46, y: 26, icon: Info, color: '#475569' },
    { id: 'obs', label: 'Observation Deck', sub: 'Area pandang', x: 62, y: 58, icon: MapPin, color: '#2563eb' },
  ],
};

export default function PetaScreen() {
  const [floor, setFloor] = useState('1');
  const [active, setActive] = useState<Pin | null>(null);
  const pins = FLOORS[floor];

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Peta Bandara" />
        <div className="px-4 pb-3 flex gap-2">
          {['1', '2', '3'].map((f) => (
            <button
              key={f}
              onClick={() => { setFloor(f); setActive(null); }}
              className={`px-4 py-2 rounded-full text-[12.5px] font-semibold transition-colors ${
                floor === f ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Lantai {f}
            </button>
          ))}
        </div>
      </div>

      {/* Map canvas */}
      <div className="flex-1 p-4">
        <div className="relative w-full h-full min-h-[420px] rounded-3xl bg-gradient-to-b from-slate-100 to-slate-200/70 overflow-hidden ring-1 ring-slate-200">
          {/* stylised floor plan */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice">
            <rect x="8" y="6" width="84" height="118" rx="10" fill="#ffffff" opacity="0.6" />
            <rect x="40" y="6" width="20" height="118" fill="#dbeafe" opacity="0.7" />
            <path d="M50 10 V120" stroke="#93c5fd" strokeWidth="0.6" strokeDasharray="2 2" />
            <rect x="14" y="18" width="20" height="16" rx="3" fill="#e2e8f0" />
            <rect x="66" y="18" width="20" height="16" rx="3" fill="#e2e8f0" />
            <rect x="14" y="80" width="20" height="20" rx="3" fill="#e2e8f0" />
            <rect x="66" y="80" width="20" height="20" rx="3" fill="#e2e8f0" />
          </svg>

          {/* pins */}
          {pins.map((p) => {
            const Icon = p.icon;
            const isActive = active?.id === p.id;
            return (
              <motion.button
                key={p.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
                whileTap={{ scale: 0.85 }}
                onClick={() => setActive(p)}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white transition-transform ${isActive ? 'scale-125' : ''}`}
                  style={{ backgroundColor: p.color }}
                >
                  <Icon className="w-[18px] h-[18px] text-white" strokeWidth={2.3} />
                </span>
                <span className="mt-1 text-[9px] font-semibold text-slate-600 bg-white/80 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {p.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Info footer / selected detail */}
      <div className="p-4 pt-0">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/70 flex items-center gap-3"
            >
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: active.color }}>
                <active.icon className="w-5 h-5 text-white" />
              </span>
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-[14px]">{active.label}</p>
                <p className="text-[11.5px] text-slate-500">{active.sub}</p>
              </div>
              <button onClick={() => setActive(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl p-4 shadow-sm shadow-slate-200/60 flex items-center gap-3"
            >
              <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-blue-600" />
              </span>
              <div>
                <p className="font-bold text-slate-900 text-[13.5px]">Informasi</p>
                <p className="text-[11.5px] text-slate-500">Ketuk ikon pada peta untuk melihat detail lokasi.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
