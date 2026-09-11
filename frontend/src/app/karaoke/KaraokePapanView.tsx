'use client';

/**
 * Papan skor langsung — layar yang ditayangkan ke proyektor ruang acara.
 *
 * Baca saja. Semua yang bisa mengubah nilai ada di dua tempat lain: papan juri
 * bertoken (`/karaoke/[token]`) dan panel admin (`/admin/karaoke`).
 *
 * Tanpa chrome portal — `/karaoke` terdaftar di `lib/layoutChrome.ts`. Navbar
 * terang dan footer portal memakan tinggi yang justru dibutuhkan tabel
 * peringkat ketika papan ini ditayangkan ke proyektor.
 *
 * Kotak token di bawah tabel ada karena keadaan yang berulang di lapangan:
 * juri menerima tautannya lewat pesan singkat, tautannya tertelan pemformatan,
 * dan yang tersisa hanya potongan tokennya. Menempelkannya di sini sama saja
 * dengan membuka tautan utuhnya.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mic, Trophy, Star, Lock, ArrowRight, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { PALET, WARNA, nilaiTampil, rekapSah } from '@/lib/karaokeKriteria';
import type { KaraokeRekap } from '@/types';

/** Selang penyegaran papan. Cukup rapat untuk terasa hidup, cukup jarang
 *  untuk tidak membanjiri backend dari layar yang menyala sepanjang acara. */
const SELANG_SEGAR = 15_000;

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export default function KaraokePapanView({ awal }: { awal: KaraokeRekap | null }) {
  const router = useRouter();
  const [data, setData] = useState<KaraokeRekap | null>(awal);
  const [token, setToken] = useState('');

  const muat = useCallback(async () => {
    const res = await fetchApi<KaraokeRekap | null>('/karaoke/live');
    if (res.success) setData(rekapSah(res.data));
  }, []);

  useEffect(() => {
    const id = setInterval(muat, SELANG_SEGAR);
    return () => clearInterval(id);
  }, [muat]);

  /** Terima token telanjang maupun tautan utuh yang ditempel apa adanya. */
  function buka() {
    const bersih = token.trim().replace(/\/+$/, '').split('/').pop() ?? '';
    if (bersih) router.push(`/karaoke/${bersih}`);
  }

  const peserta = data ? new Map(data.contestants.map((c) => [c.id, c])) : new Map();
  const peringkat = data ? [...data.totals].sort((a, b) => b.final_score - a.final_score) : [];

  return (
    <div className={`min-h-screen ${PALET.latar} ${PALET.teks} px-4 py-8 sm:px-6 sm:py-12`}>
      <div className="mx-auto w-full max-w-5xl">
        <motion.div variants={rise} initial="hidden" animate="show" className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Mic size={22} className={PALET.emas} />
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Papan Skor Lomba Karaoke</h1>
          </div>

          {data ? (
            <p className={`text-sm ${PALET.redup}`}>
              {data.event.title}
              {data.event.location ? ` — ${data.event.location}` : ''}
              {' · '}
              {new Date(data.event.held_on).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          ) : (
            <p className={`text-sm ${PALET.redup}`}>Belum ada acara lomba yang dibuat panitia.</p>
          )}

          {data?.event.status === 'locked' && (
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border ${PALET.garis} ${PALET.panelAlt} px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${PALET.emas}`}>
              <Lock size={12} /> Penilaian dikunci
            </span>
          )}
        </motion.div>

        {data && data.contestants.length > 0 && (
          <motion.div
            variants={rise}
            initial="hidden"
            animate="show"
            className={`mt-6 rounded-2xl border ${PALET.garis} ${PALET.panel} p-4 sm:p-5`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Trophy size={15} className={PALET.emas} /> Peringkat sementara
              </h2>
              <button
                onClick={muat}
                className={`inline-flex items-center gap-1.5 text-[11px] ${PALET.redup} hover:text-[#F5F1EA]`}
              >
                <RefreshCw size={12} /> Segarkan
              </button>
            </div>

            {/* Tabel lebar menggulir di dalam wadahnya sendiri — badan halaman
                tidak boleh ikut menggulir mendatar di layar ponsel. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <thead>
                  <tr className={`border-b ${PALET.garis}`}>
                    <th className={`py-2 pr-3 text-left font-medium ${PALET.redup}`}>#</th>
                    <th className={`py-2 pr-3 text-left font-medium ${PALET.redup}`}>Peserta</th>
                    {data.judges.map((j) => (
                      <th key={j.id} className={`py-2 pr-3 text-right font-medium ${PALET.redup}`}>
                        {j.name}
                      </th>
                    ))}
                    <th className={`py-2 text-right font-medium ${PALET.redup}`}>Nilai Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {peringkat.map((t, i) => {
                    const p = peserta.get(t.contestant_id);
                    return (
                      <tr key={t.contestant_id} className={`border-b ${PALET.garis}`}>
                        <td className="py-3 pr-3">
                          <span className="flex items-center gap-2">
                            {i === 0 && <Star size={14} color={WARNA.emas} fill={WARNA.emas} />}
                            <span className={i === 0 ? PALET.emas : undefined}>{i + 1}</span>
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium">
                              {p?.number ? `${p.number}. ` : ''}
                              {p?.name ?? '—'}
                            </span>
                            {p?.song_title && (
                              <span className={`text-[11px] ${PALET.redup}`}>{p.song_title}</span>
                            )}
                            {!t.is_complete && (
                              <span className={`text-[11px] ${PALET.pink}`}>belum lengkap</span>
                            )}
                          </span>
                        </td>
                        {t.by_judge.map((b) => (
                          <td key={b.judge_id} className={`py-3 pr-3 text-right ${PALET.redup}`}>
                            {nilaiTampil(b.total)}
                          </td>
                        ))}
                        <td className="py-3 text-right font-black">{nilaiTampil(t.final_score)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className={`mt-3 text-[11px] ${PALET.redup}`}>
              Nilai akhir adalah rata-rata subtotal seluruh juri. Juri yang belum menilai dihitung
              nol, jadi peringkat baru final setelah semua baris bertanda lengkap.
            </p>
          </motion.div>
        )}

        {data && data.contestants.length === 0 && (
          <p className={`mt-6 rounded-2xl border ${PALET.garis} ${PALET.panel} p-6 text-center text-sm ${PALET.redup}`}>
            Peserta belum didaftarkan panitia.
          </p>
        )}

        {/* Kotak token juri */}
        <motion.div
          variants={rise}
          initial="hidden"
          animate="show"
          className={`mt-6 rounded-2xl border ${PALET.garis} ${PALET.panel} p-4 sm:p-5`}
        >
          <h2 className="text-sm font-semibold">Anda juri?</h2>
          <p className={`mt-1 text-[13px] ${PALET.redup}`}>
            Tempelkan tautan penilaian yang diberikan panitia untuk membuka papan nilai Anda.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buka()}
              placeholder="Tautan atau kode penilaian"
              aria-label="Tautan atau kode penilaian juri"
              className={`min-w-0 flex-1 rounded-lg border ${PALET.garis} ${PALET.panelAlt} px-3 py-2 text-sm outline-none placeholder:text-[#6F6590] focus-visible:border-[#E1487C]`}
            />
            <button
              onClick={buka}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg ${PALET.emasLatar} px-4 py-2 text-sm font-semibold text-[#14101C] hover:brightness-110`}
            >
              Buka <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>

        {/* Navbar dan footer portal tidak tampil di rute ini (lihat
            `lib/layoutChrome.ts`), jadi satu baris ini yang menyebut papan
            siapa yang sedang ditayangkan ke layar ruang acara. */}
        <p className={`mt-8 text-center text-[11px] ${PALET.redup}`}>
          Bandara APT Pranoto Samarinda — papan nilai acara internal
        </p>
      </div>
    </div>
  );
}
