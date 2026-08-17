'use client';

/**
 * Enam tema perayaan selain Kemerdekaan.
 *
 * Disatukan dalam satu berkas karena keenamnya berbagi tulang punggung yang
 * sama — latar bergradien, benda yang luruh, dan siluet di kaki layar — dan
 * memisahkannya menjadi enam berkas hanya menyalin kerangka yang sama enam
 * kali. Kemerdekaan berdiri sendiri sebab kibaran kainnya memang jauh lebih
 * rumit daripada seluruh tema di sini digabung.
 *
 * SATU ATURAN YANG BERLAKU DI SELURUH TEMA: tidak ada teks Arab, aksara
 * Tionghoa, maupun kutipan keagamaan yang ditulis di sini. Kalimat sambutan
 * datang dari kolom `greeting` yang diisi petugas — merekalah yang berhak
 * menentukan bunyi ucapan resmi bandara pada hari besar keagamaan.
 */

import React from 'react';
import { motion } from 'framer-motion';

/* ================================================================
   Bahan bersama
   ================================================================ */

/** Posisi tetap untuk benda yang luruh — bukan `Math.random`.
 *
 *  Nilai acak berbeda antara render server dan klien; begitu keduanya tidak
 *  cocok, React membuang seluruh keluaran server dan merender ulang dari nol.
 *  Dua puluh empat nilai ini sudah cukup tidak beraturan bagi mata. */
const SEBARAN = [
  4, 11, 17, 23, 29, 34, 41, 47, 52, 58, 63, 69,
  74, 78, 83, 87, 91, 95, 8, 26, 44, 61, 72, 89,
];

/** Benda kecil yang jatuh: salju, kelopak, atau abu. */
function Luruhan({
  jumlah = 24,
  warna,
  ukuran = 8,
  durasi = 11,
  bulat = true,
  diam,
}: {
  jumlah?: number;
  warna: string;
  ukuran?: number;
  durasi?: number;
  bulat?: boolean;
  diam: boolean;
}) {
  if (diam) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {SEBARAN.slice(0, jumlah).map((kiri, i) => {
        const besar = ukuran * (0.55 + ((i % 5) / 5) * 0.9);
        return (
          <span
            key={i}
            className="absolute top-0 block"
            style={{
              left: `${kiri}%`,
              width: besar,
              height: besar,
              background: warna,
              borderRadius: bulat ? '9999px' : '40% 60% 55% 45%',
              ['--geser' as string]: `${((i % 7) - 3) * 26}px`,
              animation: `luruh ${durasi + (i % 5) * 2.4}s linear infinite`,
              animationDelay: `${-(i % 9) * 1.7}s`,
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
}

/** Titik cahaya yang berkelip — bintang atau lampu kota. */
function Bintang({ jumlah = 22, diam }: { jumlah?: number; diam: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {SEBARAN.slice(0, jumlah).map((kiri, i) => (
        <span
          key={i}
          className="absolute block rounded-full bg-white"
          style={{
            left: `${kiri}%`,
            top: `${6 + ((i * 13) % 52)}%`,
            width: i % 4 === 0 ? 3 : 2,
            height: i % 4 === 0 ? 3 : 2,
            opacity: 0.55,
            animation: diam ? undefined : `kerlip ${2.4 + (i % 5) * 0.7}s ease-in-out infinite`,
            animationDelay: `${-(i % 6) * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Siluet terminal bandara di kaki layar.
 *
 * Dipakai hampir seluruh tema: perayaannya berganti, tempatnya tetap sama —
 * dan itu yang membuat layar sambutan ini terasa milik bandara, bukan kartu
 * ucapan yang bisa dipasang di situs mana pun.
 */
function SiluetTerminal({ warna = 'rgba(0,0,0,0.45)' }: { warna?: string }) {
  return (
    <svg
      className="absolute bottom-0 inset-x-0 w-full"
      height="150"
      viewBox="0 0 1200 150"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* garis tanah */}
      <path d="M0 150 L0 118 L1200 118 L1200 150 Z" fill={warna} />
      {/* bangunan terminal beratap lengkung */}
      <path d="M180 118 L180 86 Q 420 40 660 86 L660 118 Z" fill={warna} />
      {/* menara pengawas */}
      <path d="M840 118 L840 52 L856 52 L856 34 L884 34 L884 52 L900 52 L900 118 Z" fill={warna} />
      {/* garasi/hanggar */}
      <path d="M960 118 L960 92 Q 1030 68 1100 92 L1100 118 Z" fill={warna} />
    </svg>
  );
}

/** Lentera/lampion yang menggantung dan berayun. */
function Gantungan({
  kiri, tinggi, warna, lebar = 44, diam, jeda = 0,
}: { kiri: string; tinggi: number; warna: string; lebar?: number; diam: boolean; jeda?: number }) {
  return (
    <div
      className="absolute top-0 origin-top"
      style={{
        left: kiri,
        animation: diam ? undefined : 'ayunGantung 4.2s ease-in-out infinite',
        animationDelay: `${jeda}s`,
      }}
      aria-hidden="true"
    >
      <span className="block mx-auto w-px bg-white/30" style={{ height: tinggi }} />
      <span
        className="block rounded-[45%] shadow-lg"
        style={{
          width: lebar,
          height: lebar * 1.25,
          background: warna,
          boxShadow: `0 0 28px ${warna}`,
        }}
      />
      <span className="block mx-auto w-px bg-white/25" style={{ height: lebar * 0.35 }} />
    </div>
  );
}

/* ================================================================
   Tema
   ================================================================ */

/** Natal & Tahun Baru — salju, pohon, dan lampu terminal. */
export function Nataru({ diam }: { diam: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#04162e_0%,#0b3b6f_55%,#1a5fa8_100%)]">
      <Bintang diam={diam} />
      <Luruhan warna="rgba(255,255,255,0.9)" ukuran={9} durasi={12} diam={diam} />

      {/* Pesawat kecil melintas — penanda bahwa ini bandara, bukan kartu Natal. */}
      {!diam && <PesawatKecil atas="26%" durasi={17} />}

      {/* Pohon cemara berjajar di kaki layar */}
      <svg className="absolute bottom-[104px] inset-x-0 w-full" height="90" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
        {[80, 250, 430, 760, 950, 1120].map((x, i) => (
          <path
            key={x}
            d={`M${x} 90 L${x - 26} 90 L${x} 30 L${x + 26} 90 Z`}
            fill="rgba(6,40,26,0.75)"
            transform={`scale(1 ${0.8 + (i % 3) * 0.14})`}
            style={{ transformOrigin: `${x}px 90px` }}
          />
        ))}
      </svg>

      <SiluetTerminal warna="rgba(2,14,30,0.72)" />
    </div>
  );
}

/** Tahun Baru Masehi — kembang api di atas terminal. */
export function TahunBaru({ diam }: { diam: boolean }) {
  const letusan = [
    { kiri: '20%', atas: '22%', warna: '#fbbf24', jeda: 0 },
    { kiri: '48%', atas: '14%', warna: '#f472b6', jeda: 1.1 },
    { kiri: '74%', atas: '26%', warna: '#60a5fa', jeda: 2.2 },
    { kiri: '34%', atas: '34%', warna: '#4ade80', jeda: 3.1 },
    { kiri: '63%', atas: '38%', warna: '#f59e0b', jeda: 4.0 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#07061c_0%,#181245_55%,#2c1f68_100%)]">
      <Bintang jumlah={24} diam={diam} />

      {letusan.map((l) => (
        <Kembang key={l.kiri} {...l} diam={diam} />
      ))}

      <SiluetTerminal warna="rgba(4,4,20,0.8)" />
    </div>
  );
}

/** Satu letusan kembang api: percik yang memancar lalu meredup dan turun. */
function Kembang({
  kiri, atas, warna, jeda, diam,
}: { kiri: string; atas: string; warna: string; jeda: number; diam: boolean }) {
  const percik = 14;

  return (
    <div className="absolute" style={{ left: kiri, top: atas }} aria-hidden="true">
      {Array.from({ length: percik }).map((_, i) => {
        const sudut = (i / percik) * Math.PI * 2;
        const jarak = 62 + (i % 3) * 16;

        return (
          <motion.span
            key={i}
            className="absolute block w-[3px] h-[3px] rounded-full"
            style={{ background: warna, boxShadow: `0 0 8px ${warna}` }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
            animate={
              diam
                ? { x: Math.cos(sudut) * jarak * 0.6, y: Math.sin(sudut) * jarak * 0.6, opacity: 0.8 }
                : {
                    x: Math.cos(sudut) * jarak,
                    // Percik yang jatuh: gravitasi ditambahkan pada ujung geraknya.
                    y: [0, Math.sin(sudut) * jarak, Math.sin(sudut) * jarak + 34],
                    opacity: [0, 1, 0],
                    scale: [1, 1, 0.4],
                  }
            }
            transition={
              diam
                ? { duration: 0 }
                : { duration: 1.9, repeat: Infinity, repeatDelay: 3.4, delay: jeda, ease: 'easeOut' }
            }
          />
        );
      })}
    </div>
  );
}

/** Idul Fitri — bulan sabit, ketupat, dan siluet masjid. */
export function Lebaran({ diam }: { diam: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#03211a_0%,#0a4034_55%,#12705c_100%)]">
      <Bintang jumlah={20} diam={diam} />
      <BulanSabit diam={diam} />

      {/* Ketupat yang menggantung — lambang Lebaran yang paling dikenal, dan
          kebetulan bentuknya paling jelas terbaca sebagai siluet. */}
      {[
        { kiri: '12%', tinggi: 70, jeda: 0 },
        { kiri: '27%', tinggi: 108, jeda: 0.7 },
        { kiri: '73%', tinggi: 84, jeda: 1.4 },
        { kiri: '87%', tinggi: 124, jeda: 2.1 },
      ].map((k) => (
        <Ketupat key={k.kiri} {...k} diam={diam} />
      ))}

      {/* Siluet masjid */}
      <svg className="absolute bottom-0 inset-x-0 w-full" height="180" viewBox="0 0 1200 180" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 180 L0 140 L1200 140 L1200 180 Z" fill="rgba(1,20,16,0.85)" />
        <path
          d="M470 140 L470 92 Q 600 20 730 92 L730 140 Z"
          fill="rgba(1,20,16,0.85)"
        />
        <circle cx="600" cy="52" r="10" fill="rgba(1,20,16,0.85)" />
        {[420, 780].map((x) => (
          <path key={x} d={`M${x} 140 L${x} 54 Q ${x + 11} 34 ${x + 22} 54 L${x + 22} 140 Z`} fill="rgba(1,20,16,0.85)" />
        ))}
      </svg>
    </div>
  );
}

function Ketupat({ kiri, tinggi, jeda, diam }: { kiri: string; tinggi: number; jeda: number; diam: boolean }) {
  return (
    <div
      className="absolute top-0 origin-top"
      style={{
        left: kiri,
        animation: diam ? undefined : 'ayunGantung 5s ease-in-out infinite',
        animationDelay: `${jeda}s`,
      }}
      aria-hidden="true"
    >
      <span className="block mx-auto w-px bg-white/25" style={{ height: tinggi }} />
      <svg width="46" height="46" viewBox="0 0 46 46">
        <rect x="8" y="8" width="30" height="30" rx="3" transform="rotate(45 23 23)" fill="#d9b24c" opacity="0.92" />
        {/* Anyaman: dua arah garis silang, seperti daun kelapa yang dijalin. */}
        <path d="M12 23 L23 12 M17 28 L28 17 M22 33 L33 22" stroke="#8a6a1f" strokeWidth="1.4" opacity="0.6" />
        <path d="M23 12 L34 23 M18 17 L29 28 M13 22 L24 33" stroke="#b8912f" strokeWidth="1.4" opacity="0.5" />
      </svg>
    </div>
  );
}

/** Tahun Baru Islam — sabit, bintang, dan lentera. */
export function TahunBaruIslam({ diam }: { diam: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#0a1524_0%,#1b3a5c_55%,#2a5f8a_100%)]">
      <Bintang jumlah={24} diam={diam} />
      <BulanSabit diam={diam} />

      {[
        { kiri: '15%', tinggi: 74, jeda: 0 },
        { kiri: '82%', tinggi: 96, jeda: 1.3 },
      ].map((g) => (
        <Gantungan key={g.kiri} {...g} warna="rgba(217,178,76,0.85)" lebar={38} diam={diam} />
      ))}

      {!diam && <PesawatKecil atas="30%" durasi={20} />}
      <SiluetTerminal warna="rgba(5,16,28,0.8)" />
    </div>
  );
}

/** Bulan sabit yang naik pelan. */
function BulanSabit({ diam }: { diam: boolean }) {
  return (
    <motion.div
      className="absolute right-[14%] top-[16%]"
      initial={diam ? { y: 0, opacity: 1 } : { y: 26, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: diam ? 0 : 2.4, ease: 'easeOut' }}
      aria-hidden="true"
    >
      <svg width="104" height="104" viewBox="0 0 104 104">
        <defs>
          <mask id="maskSabit">
            <rect width="104" height="104" fill="black" />
            <circle cx="52" cy="52" r="34" fill="white" />
            <circle cx="66" cy="44" r="30" fill="black" />
          </mask>
        </defs>
        <circle cx="52" cy="52" r="34" fill="#f5e6b8" mask="url(#maskSabit)" />
        <circle cx="52" cy="52" r="40" fill="#f5e6b8" opacity="0.14" mask="url(#maskSabit)" />
      </svg>
    </motion.div>
  );
}

/**
 * Nyepi — sengaja hampir tanpa gerak.
 *
 * Nyepi adalah hari hening: tanpa aktivitas, tanpa cahaya, tanpa suara.
 * Layar sambutan yang meriah justru mengkhianati maknanya. Yang bergerak di
 * sini hanya bintang yang muncul perlahan dan satu nyala kecil — dan itu
 * keputusan rancangan, bukan tema yang belum selesai dibuat.
 */
export function Nyepi({ diam }: { diam: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#030308_0%,#0b0b18_55%,#121226_100%)]">
      <Bintang jumlah={24} diam={diam} />

      {/* Satu titik nyala di kaki layar. */}
      <motion.span
        className="absolute left-1/2 -translate-x-1/2 bottom-[128px] block w-2.5 h-2.5 rounded-full bg-amber-200"
        style={{ boxShadow: '0 0 26px 8px rgba(251,191,36,0.35)' }}
        animate={diam ? undefined : { opacity: [0.55, 1, 0.55], scale: [1, 1.12, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />

      <SiluetTerminal warna="rgba(2,2,8,0.9)" />
    </div>
  );
}

/** Imlek — lampion, kelopak, dan siluet terminal merah. */
export function Imlek({ diam }: { diam: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#33060a_0%,#6b0f14_55%,#9b1f26_100%)]">
      <Luruhan warna="rgba(255,196,204,0.85)" ukuran={10} durasi={13} bulat={false} diam={diam} />

      {[
        { kiri: '10%', tinggi: 58, jeda: 0 },
        { kiri: '24%', tinggi: 92, jeda: 0.6 },
        { kiri: '76%', tinggi: 74, jeda: 1.2 },
        { kiri: '89%', tinggi: 108, jeda: 1.8 },
      ].map((g) => (
        <Gantungan key={g.kiri} {...g} warna="rgba(245,197,66,0.9)" lebar={46} diam={diam} />
      ))}

      {!diam && <PesawatKecil atas="24%" durasi={19} />}
      <SiluetTerminal warna="rgba(45,4,7,0.85)" />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Pesawat kecil di kejauhan; dipakai tema yang latarnya berupa langit. */
function PesawatKecil({ atas, durasi }: { atas: string; durasi: number }) {
  return (
    <motion.svg
      className="absolute left-0 text-white/45"
      style={{ top: atas }}
      width="72"
      height="26"
      viewBox="0 0 72 26"
      initial={{ x: '-12vw' }}
      animate={{ x: '108vw' }}
      transition={{ duration: durasi, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      <path
        d="M4 15 C 10 11, 26 9, 48 9 C 58 9, 66 11, 70 13 C 66 15, 58 17, 48 17 C 26 17, 10 19, 4 15 Z"
        fill="currentColor"
      />
      <path d="M22 12 L14 3 L20 3 L32 11 Z" fill="currentColor" />
      <path d="M26 15 L18 24 L24 24 L36 16 Z" fill="currentColor" opacity="0.75" />
    </motion.svg>
  );
}
