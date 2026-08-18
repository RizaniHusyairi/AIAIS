'use client';

/**
 * Pesawat menarik bendera Merah Putih.
 *
 * Empat hal yang membuatnya terbaca sebagai pemandangan, bukan sebagai stiker
 * yang digeser:
 *
 *  1. KAINNYA BERGELOMBANG, BUKAN BERGOYANG. Benderanya dipotong menjadi dua
 *     puluh empat lajur tegak; tiap lajur memakai keyframes yang sama dengan
 *     jeda mulai yang bergeser, sehingga puncak gelombang MERAMBAT dari tiang
 *     ke ujung. Amplitudonya pun membesar ke arah ujung — ujung kain yang
 *     bebas memang melambai lebih jauh daripada pangkal yang tertambat.
 *
 *  2. TALINYA MELENGKUNG. Tali penarik digambar sebagai kurva, bukan garis
 *     lurus, dan pangkal bendera menggantung sedikit di bawah ekor pesawat —
 *     benda yang ditarik selalu tertinggal dan turun.
 *
 *  3. LATARNYA BERLAPIS. Tiga lapis awan melintas dengan laju berbeda; yang
 *     terdekat paling cepat. Tanpa parallaks, langit terbaca sebagai dinding.
 *
 *  4. SELURUH RANGKAIAN MENGAMBANG NAIK-TURUN pelan sambil melintas, dengan
 *     periode yang tidak kelipatan periode kibaran kain — dua gerak yang
 *     seirama akan langsung terbaca sebagai mesin.
 *
 * ---------------------------------------------------------------------------
 * DUA EKSPOR, DUA PEMAKAI
 * ---------------------------------------------------------------------------
 *
 * `Kemerdekaan` (bawaan) — adegan utuh berlatar langit. Dipakai layar sambutan
 * `SambutanEvent` dan pratinjau di `/admin/perayaan`.
 *
 * `PesawatBendera` — rangkaian pesawat+bendera saja, tanpa langit. Dipakai
 * `DekorEvent` untuk melintas di atas foto hero beranda. Butir 3 di atas tidak
 * berlaku baginya: di beranda, latarnya adalah foto bandara yang sungguhan.
 */

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Banyak lajur kain.
 *
 * Empat puluh, bukan dua puluh empat. Dengan lajur yang sedikit, beda fase
 * antara dua lajur bersebelahan cukup besar untuk terbaca sebagai LONCATAN —
 * bayangannya membentuk pita-pita tegak dan kainnya tampak seperti deretan
 * bilah, bukan permukaan. Empat puluh lajur membuat beda fasenya cukup halus
 * sehingga bayangannya menyatu jadi gradasi.
 */
const LAJUR = 40;

/** Lebar bendera dalam piksel pada layar lebar; disusutkan lewat `scale`. */
const LEBAR_BENDERA = 460;
const TINGGI_BENDERA = 150;

export default function Kemerdekaan({ diam }: { diam: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* ---------- langit ---------- */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b1e5b_0%,#1a49a8_48%,#4b91e2_100%)]" />

      {/* Matahari rendah — sumber cahaya yang menjelaskan arah bayangan awan. */}
      <div className="absolute -top-24 right-[12%] w-[28rem] h-[28rem] rounded-full bg-amber-200/20 blur-[90px]" />

      {/* ---------- awan berlapis ---------- */}
      {!diam && <LapisanAwan atas="12%" durasi={78} opasitas={0.1} skala={1.5} />}
      {!diam && <LapisanAwan atas="38%" durasi={52} opasitas={0.16} skala={1.05} />}
      {!diam && <LapisanAwan atas="66%" durasi={34} opasitas={0.22} skala={0.75} />}

      <PesawatBendera diam={diam} />

      {/* ---------- burung kecil di kejauhan, memberi skala ---------- */}
      {!diam && (
        <motion.svg
          className="absolute top-[22%] left-0 text-white/25"
          width="60"
          height="20"
          viewBox="0 0 60 20"
          initial={{ x: '104vw' }}
          animate={{ x: '-12vw' }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear', delay: 2 }}
          aria-hidden="true"
        >
          <path d="M2 10 q5-5 10 0 q5-5 10 0" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <path d="M34 6 q4-4 8 0 q4-4 8 0" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </motion.svg>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Rangkaian pesawat + tali + bendera, TANPA langit di belakangnya.
 *
 * Dipisahkan dari adegan di atas supaya beranda dapat memakainya sebagai
 * lapisan tembus pandang — di sana yang dikehendaki hanya pesawatnya melintas
 * di atas foto bandara, bukan langit bergradasi yang menutupi seluruh hero.
 *
 * Geometri, laju kibaran, dan warnanya sengaja tidak diubah sedikit pun saat
 * dipisahkan: keduanya harus tampil sebagai benda yang sama, dan alasan tiap
 * angka di sini sudah dijelaskan di kepala berkas.
 */
export function PesawatBendera({
  diam, skala = 'scale-[0.52] sm:scale-75 lg:scale-100',
}: {
  diam: boolean;
  /** Kelas skala Tailwind; beranda memakainya lebih kecil daripada layar sambutan. */
  skala?: string;
}) {
  const lebarLajur = LEBAR_BENDERA / LAJUR;

  return (
    <motion.div
      className="absolute top-[34%] left-0"
      initial={diam ? { x: '18vw', y: 0 } : { x: '-70vw', y: 0 }}
      animate={
        diam
          ? { x: '18vw', y: 0 }
          : {
              x: ['-70vw', '112vw'],
              // Periode 3,7 detik — sengaja bukan kelipatan periode kain
              // (1,15 detik), supaya keduanya tidak pernah seirama.
              y: [0, -16, 6, -10, 0],
            }
      }
      transition={
        diam
          ? { duration: 0 }
          : {
              // Melintas SEKALI. Kedua pemakainya sama-sama mengurus
              // pengulangan lewat umur komponennya sendiri: layar sambutan
              // menutup sesudah 7,2 detik, dan beranda memasang-melepas
              // komponen ini tiap lintasan (lihat `DekorEvent`). Mengulang di
              // sini berarti kain tetap berdenyut selama jeda, yang justru
              // ingin dihindari.
              x: { duration: 9.5, ease: 'linear' },
              y: { duration: 3.7, repeat: Infinity, ease: 'easeInOut' },
            }
      }
    >
      {/* URUTANNYA BENDERA DULU, PESAWAT BELAKANGAN — dan itu wajib.

          Pesawatnya digambar menghadap KANAN (kokpit di x≈200, sirip ekor di
          x≈26) dan bergerak ke kanan. Benda yang ditarik selalu tertinggal DI
          BELAKANG penariknya, jadi kainnya harus berada di sisi kiri, tertambat
          pada ekor. Menaruh bendera sesudah pesawat di dalam flex ini
          mendaratkannya di depan hidung — pesawatnya jadi seperti mendorong
          bendera, bukan menariknya. */}
      <div className={`flex items-start origin-left ${skala}`}>
        {/* ---------- bendera ---------- */}
        <div
          className="mt-[52px] flex-shrink-0"
          style={{ width: LEBAR_BENDERA, height: TINGGI_BENDERA }}
        >
          <div className="relative w-full h-full flex">
            {Array.from({ length: LAJUR }).map((_, i) => {
              // 1 di ujung bebas (kiri, terjauh dari pesawat), 0 di tiang
              // (kanan, tertambat pada tali). Dihitung terbalik dari nomor
              // lajur karena kainnya kini terentang ke kiri.
              const maju = 1 - i / (LAJUR - 1);
              return (
                <span
                  key={i}
                  className="relative block h-full flex-shrink-0"
                  style={{
                    // Tumpang 1,2px. Lajur yang bersebelahan persis akan
                    // memperlihatkan celah sub-piksel saat digeser tegak;
                    // tumpang sebesar ini menutupnya tanpa terlihat.
                    width: lebarLajur + 1.2,
                    marginRight: -1.2,
                    // Amplitudo membesar ke ujung: pangkal yang tertambat
                    // nyaris diam, ujung yang bebas melambai paling jauh.
                    // Sampai ±26px pada kain setinggi 150px — kira-kira
                    // seperenam tingginya. Lebih kecil dari itu, kainnya
                    // terbaca sebagai papan yang kaku.
                    ['--amp' as string]: (1.5 + maju * maju * 25).toFixed(2),
                    animation: diam ? undefined : 'kibarKain 1.15s ease-in-out infinite',
                    animationDelay: `${(-maju * 0.7).toFixed(3)}s`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Merah di atas, putih di bawah — dua blok, satu lajur. */}
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-[#ce1126]" />
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-white" />

                  {/* Bayangan lipatan, setengah periode di belakang geraknya. */}
                  <span
                    className="absolute inset-0 bg-[#0b1e5b]"
                    style={{
                      opacity: diam ? 0.08 : 0.12,
                      animation: diam ? undefined : 'kilauKain 1.15s ease-in-out infinite',
                      animationDelay: `${(-maju * 0.7 - 0.575).toFixed(3)}s`,
                    }}
                  />
                </span>
              );
            })}

            {/* Tepi ujung yang berjumbai halus — kain tidak berujung lurus.
                Di KIRI, karena ujung bebasnya kini yang terjauh dari pesawat. */}
            <span className="absolute left-0 inset-y-0 w-3 bg-gradient-to-r from-black/15 to-transparent" />
          </div>
        </div>

        {/* ---------- tali penarik ---------- */}
        <svg
          width="86"
          height="120"
          viewBox="0 0 86 120"
          /* Ditarik masuk ke badan pesawat: ujung kanan tali harus mendarat di
             pangkal sirip ekor (x≈34 pada svg pesawat), bukan menggantung di
             udara sebelum badannya mulai. */
          className="-mr-[34px] mt-[26px] flex-shrink-0"
        >
          {/* Melengkung TURUN ke arah bendera: tali penarik selalu kendur, dan
              benda yang ditarik menggantung sedikit di bawah ekor penariknya. */}
          <path
            d="M86 22 Q 46 44 4 30"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        <Pesawat diam={diam} />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

/** Satu lapis awan yang melintas terus-menerus. */
function LapisanAwan({
  atas, durasi, opasitas, skala,
}: { atas: string; durasi: number; opasitas: number; skala: number }) {
  return (
    <div className="absolute inset-x-0 pointer-events-none" style={{ top: atas }} aria-hidden="true">
      {/* Dua salinan berdampingan lalu digeser -50%: perulangan tanpa jeda. */}
      <div
        className="flex w-[200%]"
        style={{ animation: `awanLintas ${durasi}s linear infinite`, opacity: opasitas }}
      >
        {[0, 1].map((salinan) => (
          <div key={salinan} className="flex w-1/2 justify-around flex-shrink-0">
            {[0, 1, 2, 3].map((i) => (
              <svg
                key={i}
                width={220 * skala}
                height={80 * skala}
                viewBox="0 0 220 80"
                fill="white"
                style={{ transform: `translateY(${(i % 3) * 18}px)` }}
              >
                <ellipse cx="70" cy="52" rx="60" ry="24" />
                <ellipse cx="118" cy="40" rx="46" ry="30" />
                <ellipse cx="162" cy="54" rx="48" ry="20" />
              </svg>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Pesawat tampak samping.
 *
 * Digambar tangan, bukan ikon: ikon pesawat lucide bersudut pandang atas dan
 * akan terbaca seperti stiker peta yang ditempel di langit.
 */
function Pesawat({ diam }: { diam: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      {/* Semburan mesin di belakang — memberi arah gerak. */}
      {!diam && (
        <motion.span
          className="absolute left-[6px] top-[40px] h-[7px] w-16 rounded-full bg-gradient-to-l from-white/40 to-transparent blur-[3px]"
          animate={{ opacity: [0.5, 0.85, 0.5], scaleX: [1, 1.18, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        />
      )}

      <svg width="230" height="96" viewBox="0 0 230 96" fill="none" aria-hidden="true">
        {/* sayap belakang (lebih gelap — berada di sisi jauh) */}
        <path d="M96 48 L58 74 L86 74 L118 54 Z" fill="#b9c6d8" />

        {/* badan */}
        <path
          d="M30 50 C 40 40, 74 34, 132 34 C 176 34, 206 40, 220 47 C 222 48.4, 222 49.6, 220 51 C 206 58, 176 62, 132 62 C 74 62, 40 58, 30 50 Z"
          fill="url(#badanPesawat)"
        />

        {/* garis lambung */}
        <path d="M40 51 C 80 57, 180 56, 214 50" stroke="#cbd5e1" strokeWidth="1.1" fill="none" />

        {/* jendela kokpit */}
        <path d="M200 42 C 208 43, 213 45.5, 216 47.5 L206 48 Z" fill="#1e293b" opacity="0.85" />

        {/* deretan jendela penumpang */}
        {Array.from({ length: 13 }).map((_, i) => (
          <circle key={i} cx={78 + i * 9.4} cy="45.5" r="1.9" fill="#334155" opacity="0.7" />
        ))}

        {/* sirip ekor tegak */}
        <path d="M34 48 L26 12 L46 12 L62 44 Z" fill="url(#siripEkor)" />
        {/* aksen merah-putih pada sirip — bendera kecil di ekor */}
        <path d="M30 16 L44 16 L47 24 L31 24 Z" fill="#ce1126" />
        <path d="M31 24 L47 24 L50 32 L33 32 Z" fill="#ffffff" />

        {/* sayap depan (lebih terang — sisi dekat) */}
        <path d="M112 52 L84 84 L120 84 L150 58 Z" fill="#e2e8f0" />

        {/* mesin */}
        <rect x="104" y="60" width="34" height="15" rx="7.5" fill="#94a3b8" />
        <rect x="104" y="60" width="7" height="15" rx="3.5" fill="#64748b" />

        <defs>
          <linearGradient id="badanPesawat" x1="30" y1="34" x2="30" y2="62">
            <stop stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#eef2f7" />
            <stop offset="1" stopColor="#b6c2d2" />
          </linearGradient>
          <linearGradient id="siripEkor" x1="26" y1="12" x2="60" y2="48">
            <stop stopColor="#f1f5f9" />
            <stop offset="1" stopColor="#c3cedd" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
