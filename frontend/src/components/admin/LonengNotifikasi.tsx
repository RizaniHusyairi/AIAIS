'use client';

/**
 * Lonceng notifikasi pada kepala panel.
 *
 * Menampilkan kiriman warga yang baru masuk lewat Pusat Bantuan. Isinya hanya
 * jenis, nomor tiket, dan tautan ke modulnya — rinciannya dibaca di modulnya
 * masing-masing. Lihat `App\Notifications\AktivitasPusatBantuan` di backend
 * untuk alasan mengapa muatannya sengaja miskin.
 *
 * Denyut 45 detik, bukan websocket. Portal ini tidak punya server soket, dan
 * menambahnya semata demi lonceng tidak sepadan — kiriman warga tidak datang
 * per detik.
 *
 * Denyut BERHENTI saat tab tidak terlihat. Panel admin lazim dibiarkan terbuka
 * seharian di tab belakang; tanpa penjaga ini, satu tab terlupakan menembak
 * seribu permintaan sehari tanpa ada yang membacanya.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import {
  ambilNotifikasi, rupaJenis, tandaiDibaca, tandaiSemuaDibaca, waktuRelatif,
  type ItemNotifikasi,
} from '@/lib/notifikasi';

const DENYUT_MS = 45_000;

export default function LonengNotifikasi() {
  const [buka, setBuka] = useState(false);
  const [items, setItems] = useState<ItemNotifikasi[]>([]);
  const [belum, setBelum] = useState(0);
  const wadah = useRef<HTMLDivElement>(null);

  const muat = useCallback(async () => {
    const res = await ambilNotifikasi();
    if (res.ok && res.data) {
      setItems(res.data.items);
      setBelum(res.data.belum_dibaca);
    }
  }, []);

  useEffect(() => {
    let hidup = true;

    // Muatan pertama lewat rantai `then`, bukan pemanggilan langsung: setState
    // yang berjalan serentak di badan efek memicu render beruntun, dan lint
    // proyek menolaknya.
    ambilNotifikasi().then((res) => {
      if (!hidup || !res.ok || !res.data) return;
      setItems(res.data.items);
      setBelum(res.data.belum_dibaca);
    });

    const tik = setInterval(() => {
      if (document.visibilityState === 'visible') muat();
    }, DENYUT_MS);

    return () => { hidup = false; clearInterval(tik); };
  }, [muat]);

  /* Tutup saat mengklik di luar. */
  useEffect(() => {
    if (!buka) return;
    const onKlik = (e: MouseEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener('mousedown', onKlik);
    return () => document.removeEventListener('mousedown', onKlik);
  }, [buka]);

  const buka1 = async (n: ItemNotifikasi) => {
    if (!n.dibaca) {
      // Ditandai di layar lebih dulu supaya angkanya turun seketika; muat
      // ulang berikutnya yang menyelaraskannya dengan server.
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, dibaca: true } : x)));
      setBelum((b) => Math.max(0, b - 1));
      await tandaiDibaca(n.id);
    }
    setBuka(false);
  };

  const semua = async () => {
    setItems((p) => p.map((x) => ({ ...x, dibaca: true })));
    setBelum(0);
    await tandaiSemuaDibaca();
  };

  return (
    <div className="relative" ref={wadah}>
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setBuka((b) => !b)}
        aria-label={belum > 0 ? `Notifikasi, ${belum} belum dibaca` : 'Notifikasi'}
        aria-expanded={buka}
        className="relative w-9 h-9 rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] text-[var(--adm-muted)] hover:text-[var(--adm-accent)] hover:border-[var(--adm-accent-line)] flex items-center justify-center transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {belum > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[var(--adm-danger)] text-white text-[10px] font-black flex items-center justify-center tabular-nums">
            {belum > 99 ? '99+' : belum}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {buka && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 mt-2 w-[330px] max-w-[92vw] rounded-2xl adm-glass border border-[var(--adm-line)] shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--adm-line)]">
              <span className="text-[12.5px] font-bold text-[var(--adm-fg)]">Notifikasi</span>
              {belum > 0 && (
                <button
                  onClick={semua}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--adm-accent)] hover:brightness-125 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Tandai semua
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12px] text-[var(--adm-dim)]">
                  Belum ada kiriman baru dari Pusat Bantuan.
                </p>
              ) : (
                items.map((n) => {
                  const rupa = rupaJenis(n.jenis);
                  const Icon = rupa.icon;
                  return (
                    <Link
                      key={n.id}
                      href={n.path}
                      onClick={() => buka1(n)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--adm-line)] last:border-0 transition-colors hover:bg-[var(--adm-hover)] ${
                        n.dibaca ? 'opacity-60' : ''
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${rupa.warna}22` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: rupa.warna }} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-bold text-[var(--adm-fg)] leading-snug">
                          {n.judul}
                        </span>
                        {n.ticket && (
                          <span className="block text-[11px] font-mono text-[var(--adm-muted)] mt-0.5">
                            {n.ticket}
                          </span>
                        )}
                        <span className="block text-[10.5px] text-[var(--adm-dim)] mt-0.5">
                          {waktuRelatif(n.created_at)}
                        </span>
                      </span>

                      {!n.dibaca && (
                        <span className="w-2 h-2 rounded-full bg-[var(--adm-accent)] flex-shrink-0 mt-2" />
                      )}
                    </Link>
                  );
                })
              )}
            </div>

            <Link
              href="/admin/notifikasi"
              onClick={() => setBuka(false)}
              className="block px-4 py-3 text-center text-[11.5px] font-bold text-[var(--adm-accent)] border-t border-[var(--adm-line)] hover:bg-[var(--adm-hover)] transition-colors"
            >
              Lihat semua notifikasi
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
