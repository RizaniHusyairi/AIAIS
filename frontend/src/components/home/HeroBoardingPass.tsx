'use client';

/**
 * Kartu hero beranda berbentuk layar iPhone.
 *
 * Menggantikan bentuk boarding pass yang sebelumnya mengisi kolom kanan hero.
 * Bingkai ponsel dipilih karena isinya memang isi ponsel: unggahan Instagram
 * bandara. Boarding pass menjanjikan nomor kursi dan gerbang, lalu menyajikan
 * umpan media sosial — bentuk dan isinya tidak pernah benar-benar bertemu.
 *
 * ────────────────────────────────────────────────────────────────────────
 * KARTU INI SELALU TAMPIL
 *
 * Isinya yang berganti:
 *   - ada unggahan Instagram  → umpan unggahan, digulir per unggahan;
 *   - belum ada               → panel bandara: sapuan radar, kode AAP/WALS,
 *                               dan angka yang MEMANG SUDAH TAYANG di bagian
 *                               "Tentang" pada halaman yang sama.
 *
 * Sebelumnya kartunya tidak dirender sama sekali saat kosong, dan separuh
 * kanan hero menganga. Yang dulu dihindari adalah KERANGKA KOSONG — kotak abu
 * tanpa isi yang terbaca sebagai portal rusak. Panel yang memang dirancang
 * untuk keadaan itu bukan kerangka kosong.
 *
 * TIDAK ADA ANGKA BARU DI SINI. Seluruh angkanya datang dari
 * `useStatistikBandara()` — daftar yang sama dengan yang dipakai kartu
 * "Tentang" dan blok "dalam Angka" di beranda, dikelola petugas lewat
 * `/admin/angka-bandara`. Berkas ini dulu menyimpan salinannya sendiri
 * beserta catatan "bila angka di sana berubah, ubah di sini juga"; salinan
 * itu sudah dibuang. Mengarang statistik bandara pada portal resmi jelas
 * keliru, dan begitu pula menyimpan dua daftar yang boleh berbeda.
 *
 * JAMNYA JAM SUNGGUHAN, dalam WITA. Bilah status yang membeku pada "9:41" —
 * jam pada seluruh iklan Apple — adalah hal pertama yang membongkar bahwa ini
 * gambar tempelan, dan bandara justru tempat orang benar-benar memeriksa jam.
 * ────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, Plane } from 'lucide-react';
import InstagramGlyph from '@/components/icons/InstagramGlyph';
import InstagramFeed from '@/components/home/InstagramFeed';
import { AIRPORTS, HOME_IATA } from '@/lib/airports';
import type { InstagramPost } from '@/types';
import { useStatistikBandara } from '@/lib/statistikBandara';

const AKUN = 'aptpranotoairport';
const PROFIL = `https://www.instagram.com/${AKUN}`;

/* Ukuran bingkai. Lebar 300px, bukan 380px seperti kartu lama: rasio layar
   iPhone 19,5:9 membuat tinggi mengikuti lebar, dan pada 380px ponselnya
   menjulang jauh melewati kaki hero. */
const LEBAR_LAYAR = 288;
const TINGGI_LAYAR = Math.round((LEBAR_LAYAR * 19.5) / 9); // 624

/* ================================================================
   Bagian-bagian bingkai ponsel
   ================================================================ */

/** Bilah status: jam WITA sungguhan, sinyal, Wi-Fi, baterai. */
function BilahStatus() {
  const [jam, setJam] = useState('');

  /* Dihitung DI DALAM efek, bukan saat render: server tidak punya jam
     peramban, dan menghitungnya saat render membuat keluaran server berbeda
     dari klien lalu menggagalkan hidrasi seluruh halaman. */
  useEffect(() => {
    const detak = () =>
      setJam(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar',
        }),
      );

    detak();
    const t = setInterval(detak, 15000);

    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative z-20 flex items-center justify-between px-7 pt-3 pb-1 text-slate-900 flex-shrink-0">
      <span className="text-[13px] font-semibold tabular-nums w-12">{jam || ' '}</span>

      <span className="flex items-center gap-1.5" aria-hidden="true">
        {/* sinyal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.4} y={8 - i * 2.6} width="3" height={3 + i * 2.6} rx="0.8" />
          ))}
        </svg>

        {/* wi-fi */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 3.4a9.6 9.6 0 0 1 13 0" />
          <path d="M3.6 6.1a6 6 0 0 1 7.8 0" />
          <path d="M6.2 8.7a2.4 2.4 0 0 1 2.6 0" />
        </svg>

        {/* baterai */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.6" y="0.6" width="21" height="10.8" rx="3" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.1" />
          <rect x="2.2" y="2.2" width="14" height="7.6" rx="1.8" fill="currentColor" />
          <path d="M23.4 4.2v3.6a2 2 0 0 0 0-3.6Z" fill="currentColor" fillOpacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Dynamic Island.
 *
 * Melayang DI ATAS bilah status, bukan mendorongnya: pada perangkat aslinya ia
 * memang menindih dan jam berada di sebelah kirinya. Karena itu bilah status
 * memakai `px-7`, bukan `px-4` — ruang tengahnya milik pulau ini.
 */
function Pulau() {
  return (
    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none" aria-hidden="true">
      <div className="relative h-[26px] w-[88px] rounded-full bg-black">
        {/* lensa kamera; pantulan kecil membuatnya tidak sekadar titik hitam */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-[#0f1420]">
          <span className="absolute right-[2px] top-[2px] w-[3px] h-[3px] rounded-full bg-sky-400/50" />
        </span>
      </div>
    </div>
  );
}

/** Garis penunjuk beranda di kaki layar. */
function GarisBeranda() {
  return (
    <div className="flex-shrink-0 flex justify-center py-2" aria-hidden="true">
      <span className="block h-[5px] w-[112px] rounded-full bg-slate-900/25" />
    </div>
  );
}

/* ================================================================
   Panel saat belum ada unggahan
   ================================================================ */

/**
 * Sapuan radar.
 *
 * Digambar dengan SVG dan animasi CSS, bukan <canvas> kedua: hero sudah punya
 * satu kanvas partikel, dan menambah kanvas lagi berarti dua gelung animasi
 * berjalan bersamaan di layar pertama.
 */
function Radar({ diam }: { diam: boolean }) {
  return (
    <div className="relative w-full aspect-square max-w-[210px] mx-auto" aria-hidden="true">
      {/* lingkaran jarak */}
      {[100, 72, 44].map((p) => (
        <span
          key={p}
          className="absolute rounded-full border border-blue-200/70"
          style={{ inset: `${(100 - p) / 2}%` }}
        />
      ))}

      {/* palang sumbu */}
      <span className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-200/60 -translate-x-1/2" />
      <span className="absolute top-1/2 left-0 right-0 h-px bg-blue-200/60 -translate-y-1/2" />

      {/* Sapuan. SELALU dirender — mencabutnya dari DOM saat `diam` membuat
          keluaran klien berbeda dari server, hidrasinya gagal, dan React
          merender ulang seluruh pohon. Yang dimatikan hanya putarannya. */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(37,99,235,0) 0deg, rgba(37,99,235,0) 300deg, rgba(37,99,235,.28) 355deg, rgba(34,211,238,.5) 360deg)',
        }}
        animate={{ rotate: diam ? 0 : 360 }}
        transition={diam ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'linear' }}
      />

      {/* titik-titik pesawat; posisinya tetap, hanya denyutnya yang hidup */}
      {[
        { x: '30%', y: '34%', d: 0 },
        { x: '68%', y: '28%', d: 1.2 },
        { x: '62%', y: '70%', d: 2.4 },
        { x: '26%', y: '64%', d: 3.6 },
      ].map((t) => (
        <motion.span
          key={`${t.x}-${t.y}`}
          className="absolute w-1.5 h-1.5 rounded-full bg-cyan-500"
          style={{ left: t.x, top: t.y }}
          animate={diam ? { opacity: 0.6, scale: 1 } : { opacity: [0.25, 1, 0.25], scale: [1, 1.5, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: t.d }}
        />
      ))}

      {/* pusat: bandaranya sendiri */}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <span className="w-9 h-9 rounded-full bg-blue-600 shadow-lg shadow-blue-600/40 flex items-center justify-center">
          <Plane className="w-4 h-4 text-white" />
        </span>
        <span className="mt-1 text-[10px] font-black tracking-[0.18em] text-blue-700">
          {HOME_IATA}
        </span>
      </span>
    </div>
  );
}

function PanelBandara({ diam }: { diam: boolean }) {
  /* Tiga kolom; angka yang ditandai petugas untuk hero dipotong pada tiga
     pertama supaya kisinya tidak pernah pincang. Menampilkan empat pada kisi
     tiga kolom menyisakan satu kartu sendirian di baris kedua. */
  const angka = useStatistikBandara().filter((a) => a.diHero).slice(0, 3);

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-center px-5 py-4">
      <Radar diam={diam} />

      <div className="mt-6 grid grid-cols-3 gap-2">
        {angka.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.slug} className="text-center">
              <Icon className="w-3.5 h-3.5 mx-auto text-blue-500" />
              <p className="mt-1 text-[15px] font-black text-slate-900 leading-none tabular-nums">
                {a.value}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 leading-tight">{a.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================ */

export default function HeroBoardingPass({ posts }: { posts: InstagramPost[] }) {
  const kurangiGerak = useReducedMotion();
  const bandara = AIRPORTS[HOME_IATA];
  const adaUnggahan = posts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: kurangiGerak ? 0 : 0.6, delay: kurangiGerak ? 0 : 0.15 }}
      className="lg:col-span-6 flex lg:justify-center"
    >
      {/* Melayang pelan, seperti ponsel yang dipegang — bukan gambar yang
          ditempel di halaman. */}
      <motion.div
        animate={kurangiGerak ? { y: 0 } : { y: [0, -9, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
        style={{ perspective: 1200 }}
      >
        {/* ---- tombol samping ---- */}
        <span
          className="absolute -left-[3px] top-[104px] w-[3px] h-8 rounded-l bg-gradient-to-b from-[#8f97a3] to-[#5c636e]"
          aria-hidden="true"
        />
        <span
          className="absolute -left-[3px] top-[152px] w-[3px] h-12 rounded-l bg-gradient-to-b from-[#8f97a3] to-[#5c636e]"
          aria-hidden="true"
        />
        <span
          className="absolute -right-[3px] top-[140px] w-[3px] h-16 rounded-r bg-gradient-to-b from-[#8f97a3] to-[#5c636e]"
          aria-hidden="true"
        />

        {/* ---- rangka titanium ---- */}
        <div
          className="relative rounded-[46px] p-[11px] bg-gradient-to-b from-[#8d95a1] via-[#616975] to-[#3f4650] shadow-[0_36px_70px_-24px_rgba(15,23,42,0.6)]"
          style={{ width: LEBAR_LAYAR + 22 }}
        >
          {/* Kilau tepi logam: satu garis terang di sisi kiri-atas, satu gelap
              di kanan-bawah. Tanpa keduanya rangkanya terbaca sebagai bingkai
              abu-abu datar. */}
          <span
            className="absolute inset-0 rounded-[46px] pointer-events-none"
            style={{
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 26%, rgba(0,0,0,0) 74%, rgba(0,0,0,0.28) 100%)',
            }}
            aria-hidden="true"
          />

          {/* ---- layar ---- */}
          <div
            className="relative rounded-[36px] bg-white overflow-hidden flex flex-col"
            style={{ width: LEBAR_LAYAR, height: TINGGI_LAYAR }}
          >
            <Pulau />
            <BilahStatus />

            {/* ---- kepala aplikasi ---- */}
            <div className="relative flex-shrink-0 px-4 pt-1.5 pb-3 bg-gradient-to-br from-[#0b1e5b] to-[#1d4ed8] text-white overflow-hidden">
              <span className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-cyan-300/20 blur-2xl pointer-events-none" />

              <div className="relative flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200/90">
                    Bandar Udara
                  </p>
                  <p className="mt-0.5 text-[22px] font-black leading-none tracking-tight">
                    {bandara.iata}
                  </p>
                  <p className="mt-1 text-[10px] text-blue-100/85 truncate">
                    {bandara.city} · Kalimantan Timur
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200/90">
                    ICAO
                  </p>
                  <p className="mt-0.5 text-[18px] font-black leading-none tracking-tight">
                    {bandara.icao}
                  </p>
                </div>
              </div>
            </div>

            {/* ---- isi ---- */}
            {adaUnggahan ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 border-b border-slate-100">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <InstagramGlyph className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-black text-slate-900 leading-tight">
                      Informasi Terbaru
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate">@{AKUN}</span>
                  </span>
                </div>

                {/* Umpannya mengisi sisa ruang sendiri lewat `flex-1 min-h-0`,
                    tanpa satu pun angka piksel — lihat butir 4 di kepala
                    `InstagramFeed`. */}
                <InstagramFeed posts={posts} />
              </div>
            ) : (
              <PanelBandara diam={!!kurangiGerak} />
            )}

            {/* ---- baris kaki ---- */}
            <div className="flex-shrink-0 mt-auto px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
              {adaUnggahan ? (
                <a
                  href={PROFIL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  <InstagramGlyph className="w-3.5 h-3.5" /> Lihat di Instagram
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">
                  {bandara.iata}·{bandara.icao}
                </span>
              )}
            </div>

            <GarisBeranda />
          </div>
        </div>

        {/* Bayangan lembut di bawah ponsel; ikut menegaskan bahwa ia melayang. */}
        <span
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[62%] h-6 rounded-[50%] bg-slate-900/20 blur-xl pointer-events-none"
          aria-hidden="true"
        />
      </motion.div>
    </motion.div>
  );
}
