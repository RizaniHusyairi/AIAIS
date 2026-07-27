import React from 'react';
import { BottomNav } from '@/components/pwa/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-slate-100 md:py-6">
      {/*
        Bingkai ponsel.

        Batas lebar sengaja dipasang mulai `md` saja, sama dengan breakpoint
        sudut membulat/bayangan di bawah ini. Sebelumnya `max-w-[440px]`
        berlaku tanpa syarat, sehingga pada 441–767px (tablet atau jendela
        yang diperkecil) isinya sudah terpotong 440px dengan pinggiran
        abu-abu padahal bingkainya belum aktif — terlihat rusak, bukan
        seperti mockup. Di bawah `md` kini memenuhi layar.
      */}
      <div className="relative w-full md:max-w-[440px] h-[100dvh] md:h-[calc(100dvh-3rem)] bg-slate-50 flex flex-col overflow-hidden md:rounded-[2.5rem] md:shadow-2xl md:ring-1 md:ring-slate-200">
        {/* Scrollable content region */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain">
          {children}
        </div>
        {/* Persistent bottom tab bar */}
        <BottomNav />
      </div>
    </div>
  );
}
