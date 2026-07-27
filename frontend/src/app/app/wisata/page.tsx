'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar, AppHeader, Segmented, listContainer, listItem } from '@/components/pwa/ui';
import {
  TOURISM_SPOTS, TOURISM_CATEGORIES, TOURISM_CAT_META, TourismCategory, directionsUrl,
} from '@/lib/tourismData';
import {
  Landmark, Trees, MoonStar, ShoppingBag, FerrisWheel, Sparkles, Car, MapPin, Navigation, Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CAT_ICON: Record<TourismCategory, LucideIcon> = {
  Budaya: Landmark,
  Alam: Trees,
  Religi: MoonStar,
  Belanja: ShoppingBag,
  Rekreasi: FerrisWheel,
};

export default function WisataScreen() {
  const [cat, setCat] = useState<'all' | TourismCategory>('all');

  const rows = useMemo(
    () =>
      TOURISM_SPOTS.filter((t) => cat === 'all' || t.category === cat)
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [cat],
  );

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Wisata Terdekat" />
        <div className="px-4 pb-3">
          <Segmented
            layoutId="wisata-cat"
            value={cat}
            onChange={(v) => setCat(v)}
            options={[
              { value: 'all' as const, label: 'Semua', icon: <Sparkles className="w-3.5 h-3.5" /> },
              ...TOURISM_CATEGORIES.map((c) => {
                const Icon = CAT_ICON[c];
                return { value: c, label: c, icon: <Icon className="w-3.5 h-3.5" /> };
              }),
            ]}
          />
        </div>
      </div>

      <motion.div key={cat} variants={listContainer} initial="hidden" animate="show" className="p-4 space-y-3">
        {/* catatan jarak */}
        <motion.div variants={listItem} className="flex items-start gap-2.5 bg-blue-50 rounded-2xl p-3.5">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-slate-600 leading-relaxed">
            Jarak &amp; waktu tempuh adalah perkiraan perjalanan darat dari terminal. Pastikan kembali
            minimal 90 menit sebelum jadwal keberangkatan.
          </p>
        </motion.div>

        {rows.map((spot) => {
          const meta = TOURISM_CAT_META[spot.category];
          const Icon = CAT_ICON[spot.category];
          return (
            <motion.div
              key={spot.slug}
              variants={listItem}
              className="bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: meta.bg }}
                >
                  <Icon className="w-6 h-6" style={{ color: meta.color }} strokeWidth={2.1} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[14.5px] leading-snug">{spot.name}</p>
                  <p className="text-[11.5px] font-semibold mt-0.5" style={{ color: meta.color }}>
                    {spot.category} · {spot.city}
                  </p>
                </div>
                <span className="flex items-center gap-1 bg-slate-50 text-slate-600 text-[10.5px] font-bold px-2 py-1 rounded-full flex-shrink-0 tabular-nums">
                  <Car className="w-3 h-3" style={{ color: meta.color }} /> {spot.distanceKm} km
                </span>
              </div>

              <p className="mt-2.5 text-[12px] text-slate-500 leading-relaxed line-clamp-3">
                {spot.description}
              </p>

              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11.5px] text-slate-500 min-w-0 flex-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                  <span className="truncate">{spot.duration} dari bandara</span>
                </span>
                <a
                  href={directionsUrl(spot)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-white font-semibold text-[11.5px] px-3.5 py-2 rounded-full active:scale-95 transition-transform flex-shrink-0"
                  style={{ backgroundColor: meta.color }}
                >
                  <Navigation className="w-3.5 h-3.5" /> Rute
                </a>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
