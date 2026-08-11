'use client';

/**
 * Peluncur Pusat Bantuan yang mengambang di seluruh portal.
 *
 * Alasannya sederhana: percakapan di sini tidak punya notifikasi. Tanpa
 * penanda ini, pengunjung yang tiketnya sudah dibalas petugas harus ingat
 * sendiri untuk membuka kembali halaman bantuan — dan kebanyakan tidak.
 *
 * Disembunyikan di `/admin` (petugas punya panelnya sendiri) dan `/app` (PWA
 * punya layar bantuan tersendiri, tombol mengambang akan bertabrakan dengan
 * navigasi bawahnya).
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { getChat, savedTicket, TICKET_KEY } from '@/lib/helpdesk';
import { usesOwnChrome } from '@/lib/layoutChrome';

/** Jeda pemeriksaan balasan baru. Cukup jarang — ini hanya lencana. */
const POLL_MS = 45_000;

export default function ChatLauncher() {
  const pathname = usePathname();
  const [ticket, setTicket] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  const tersembunyi = !pathname || usesOwnChrome(pathname);

  /** Baca ulang tiket dari penyimpanan. */
  const segarkanTiket = useCallback(() => setTicket(savedTicket()), []);

  useEffect(() => {
    segarkanTiket();

    // `storage` hanya menyala di tab LAIN, jadi peristiwa buatan sendiri
    // dipakai untuk perubahan pada tab yang sama (lihat lib/helpdesk.ts).
    const onCustom = () => segarkanTiket();
    const onStorage = (e: StorageEvent) => {
      if (e.key === TICKET_KEY) segarkanTiket();
    };

    window.addEventListener('aiais:chat-ticket', onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('aiais:chat-ticket', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [segarkanTiket]);

  useEffect(() => {
    if (!ticket || tersembunyi) return;

    let hidup = true;

    const periksa = async () => {
      const res = await getChat(ticket);
      if (!hidup || !res.ok || !res.data) return;

      // Membuka percakapan menandai balasan petugas terbaca, jadi yang
      // tersisa belum terbaca adalah yang belum pernah dilihat pengunjung.
      const belum = (res.data.messages ?? []).filter(
        (m) => m.sender_type === 'admin' && !m.is_read,
      ).length;

      setUnread(belum);
    };

    periksa();
    const t = setInterval(periksa, POLL_MS);
    return () => {
      hidup = false;
      clearInterval(t);
    };
  }, [ticket, tersembunyi]);

  if (tersembunyi) return null;

  // Di halaman bantuan itu sendiri tombolnya tidak berguna.
  if (pathname.startsWith('/complaints')) return null;

  // Diturunkan saat render, bukan disetel lewat efek: tanpa tiket aktif
  // tidak ada yang perlu dihitung, dan nilai lama tak boleh tertinggal.
  const belumDibaca = ticket ? unread : 0;

  return (
    <Link
      href="/complaints"
      aria-label={
        belumDibaca > 0
          ? `Pusat Bantuan — ${belumDibaca} balasan baru dari petugas`
          : 'Buka Pusat Bantuan'
      }
      className="fixed bottom-5 right-5 z-40 group"
    >
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.6 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/30 transition-colors"
      >
        <MessageCircle className="w-6 h-6 text-white" />

        <AnimatePresence>
          {belumDibaca > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 ring-2 ring-white flex items-center justify-center"
            >
              <span className="text-[11px] font-black text-white tabular-nums">
                {belumDibaca > 9 ? '9+' : belumDibaca}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>

      {/* Label muncul saat disentuh tetikus; disembunyikan di ponsel agar
          tidak menutupi konten. */}
      <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="whitespace-nowrap bg-slate-900 text-white text-[12px] font-bold px-3 py-2 rounded-lg shadow-lg">
          {ticket ? 'Lanjutkan percakapan' : 'Pusat Bantuan'}
        </span>
      </span>
    </Link>
  );
}
