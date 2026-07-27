'use client';

/**
 * Penafian wajib untuk setiap peta pergerakan pesawat.
 *
 * FIDS Bandara APT Pranoto tidak mengirim posisi pesawat — tidak ada ADS-B,
 * koordinat, maupun ketinggian. Posisi di peta adalah TURUNAN dari jam jadwal
 * dan status. Komponen ini ada supaya kalimat penafiannya identik di semua
 * tempat dan tidak mungkin tertinggal saat menambah tampilan baru.
 *
 * Jangan menulis ulang penafian secara inline di halaman mana pun.
 */

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, X } from 'lucide-react';
import {
  CRUISE_JET_KMH,
  CRUISE_TURBOPROP_KMH,
  GROUND_ALLOWANCE_MIN,
} from '@/lib/flightSim';

export function SimulationNotice({
  tone = 'light',
  className = '',
}: {
  /** `dark` dipakai di atas latar peta navy. */
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dark = tone === 'dark';

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1.5 rounded-full transition-colors cursor-pointer ${
          dark
            ? 'bg-white/12 border border-white/20 text-amber-100 hover:bg-white/20'
            : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
        }`}
        aria-expanded={open}
      >
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        Simulasi posisi — bukan pelacakan radar
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.16 }}
            className="absolute z-[500] mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-white shadow-xl shadow-slate-400/30 border border-slate-200 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-slate-900 text-[12.5px]">Bagaimana ini dihitung?</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 -mt-0.5 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-2 text-[11.5px] text-slate-600 leading-relaxed">
              Sistem informasi penerbangan bandara hanya mengirim <b>jam jadwal</b> dan{' '}
              <b>status</b>. Tidak ada data posisi, ketinggian, maupun radar. Karena itu letak
              pesawat di peta ini <b>diperkirakan</b>, bukan diukur.
            </p>

            <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-600">
              <li className="flex gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                Kecepatan jelajah diasumsikan {CRUISE_JET_KMH} km/jam untuk pesawat jet dan{' '}
                {CRUISE_TURBOPROP_KMH} km/jam untuk baling-baling.
              </li>
              <li className="flex gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                Ditambah {GROUND_ALLOWANCE_MIN} menit untuk taxi, lepas landas, naik, dan turun.
              </li>
              <li className="flex gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                Rute digambar sebagai lintasan terpendek di permukaan bumi, bukan jalur udara
                sebenarnya yang mengikuti jalur navigasi resmi.
              </li>
              <li className="flex gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                Bila petugas belum menyatakan berangkat, pesawat tetap digambar di bandara asal
                berapa pun jamnya.
              </li>
              <li className="flex gap-2">
                <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                Penerbangan delay tanpa waktu baru, dan penerbangan yang dibatalkan,{' '}
                <b>tidak diperkirakan posisinya</b>.
              </li>
            </ul>

            <p className="mt-3 pt-2.5 border-t border-dashed border-slate-200 text-[10.5px] text-slate-500 leading-relaxed">
              Gunakan sebagai gambaran umum. Untuk kepastian, ikuti pengumuman petugas dan
              maskapai Anda.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SimulationNotice;
