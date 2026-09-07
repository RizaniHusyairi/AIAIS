'use client';

import dynamic from 'next/dynamic';
import { Box, Move3D, ScanEye } from 'lucide-react';
import SkyParticles from '@/components/effects/SkyParticles';

const TerminalViewer = dynamic(() => import('@/components/airport/TerminalViewer'), {
  ssr: false,
  loading: () => <div role="status" className="flex h-[580px] items-center justify-center bg-slate-100 text-slate-600">Menyiapkan penampil 3D…</div>,
});

export default function TerminalView() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-900 via-sky-700 to-cyan-600 px-5 pb-24 pt-36 text-white">
        <SkyParticles tone="sky" density="low" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-100"><Box size={17} /> Eksplorasi terminal</div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">APT Pranoto, dari segala sudut.</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-sky-100 sm:text-lg">Kenali siluet atap, fasad kaca, dan garbarata terminal melalui model tiga dimensi yang bisa Anda putar dan perbesar.</p>
        </div>
      </section>
      <div className="relative mx-auto -mt-12 max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"><TerminalViewer /></div>
        <div className="mt-6 grid gap-5 rounded-2xl border border-dashed border-slate-300 bg-white p-6 md:grid-cols-2">
          <div className="flex gap-3"><ScanEye className="mt-1 shrink-0 text-sky-700" size={22} /><div><h2 className="font-bold text-slate-800">Rekonstruksi dari foto</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">Model konsep berdasarkan foto referensi, termasuk detail kanopi dan selasar depan. Proporsi, detail, dan lanskap disederhanakan; belum menggunakan ukuran survei. Bukan denah navigasi atau gambar teknis.</p></div></div>
          <div className="flex gap-3"><Move3D className="mt-1 shrink-0 text-sky-700" size={22} /><div><h2 className="font-bold text-slate-800">Jelajahi sesuai keinginan</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">Pilih sisi depan, sisi apron, atau lengkung atap. Kontrol juga dapat digunakan dengan keyboard. Putaran otomatis dimulai saat Anda menekan tombolnya.</p></div></div>
        </div>
      </div>
    </div>
  );
}
