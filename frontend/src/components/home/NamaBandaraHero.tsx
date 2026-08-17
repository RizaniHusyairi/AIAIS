'use client';

/**
 * Lockup nama resmi bandara pada hero beranda.
 *
 * Susunannya bertingkat, dari keterangan menuju nama:
 *
 *     Selamat Datang di            ← kecil, emas
 *     BANDAR UDARA                 ← kapital, berjarak lebar
 *     Aji Pangeran                 ← serif display; A, P, T beremas → "APT"
 *     Tumenggung Pranoto
 *     ─── S A M A R I N D A ───    ← emas, diapit garis
 *
 * ────────────────────────────────────────────────────────────────────────
 * EMPAT HAL YANG MENJAGA INI TETAP BENAR
 *
 *  1. JARAK HURUF "SAMARINDA" MEMAKAI CSS, BUKAN SPASI KETIKAN. Menulis
 *     "S A M A R I N D A" membuat pembaca layar mengeja satu per satu —
 *     "es, a, em, a, er…" — dan mesin pencari membaca kata yang tidak ada.
 *     `tracking` menghasilkan tampilan yang sama tanpa merusak katanya.
 *
 *  2. PEMENGGALAN HANYA SAMPAI KATA, TIDAK SAMPAI HURUF. Tiap kata tetap utuh
 *     di dalam satu elemen, jadi teksnya terbaca wajar tanpa perlu salinan
 *     `sr-only` seperti rancangan sebelumnya.
 *
 *  3. `prefers-reduced-motion` DIHORMATI LEWAT DURASI, BUKAN LEWAT `initial`.
 *     Server tidak tahu preferensi pemakai; begitu keluaran server dan klien
 *     berbeda, hidrasinya gagal dan React membuang seluruh hasil server lalu
 *     merender ulang dari nol di klien. Keadaan awal karenanya selalu sama.
 *
 *  4. WARNA EMAS HANYA PADA HURUF AWAL, DAN HANYA PADA "APT". Seluruh baris
 *     beremas akan menurunkan kontrasnya di bawah ambang baca pada latar
 *     terang. Ketiga huruf yang dipilih pun bukan sembarang: A-P-T adalah
 *     singkatan resmi bandara, sehingga aksennya membawa arti, bukan sekadar
 *     menghias tiap kata.
 * ────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Gradien emas untuk huruf awal dan garis hias. */
const EMAS = 'bg-gradient-to-br from-[#e3c88b] via-[#c9a227] to-[#8a6a1f]';

/** Navy resmi portal — sama dengan kop cetakan PDF dan kartu hero. */
const NAVY = '#0b1e5b';

/* Irama munculnya. Dikumpulkan di sini supaya urutannya dapat dibaca sekaligus,
   bukan tersebar sebagai angka ajaib di sepanjang berkas. */
const T = {
  sambutan: 0,
  bandarUdara: 0.18,
  /** Dua baris nama, tiap katanya menyusul dengan jeda ini. */
  nama: 0.42,
  jarakKata: 0.13,
  kota: 1.15,
} as const;

/**
 * Satu kata yang tersingkap dari bawah.
 *
 * Pembungkusnya `overflow-hidden`, isinya digeser naik dari bawah garis dasar —
 * gerak "tirai terangkat" yang lazim pada judul bergaya sertifikat, dan jauh
 * lebih tenang daripada tiap huruf yang melompat sendiri-sendiri.
 */
function KataTersingkap({
  children,
  delay,
  diam,
  className = '',
}: {
  children: React.ReactNode;
  delay: number;
  diam: boolean;
  className?: string;
}) {
  return (
    <span className="inline-block overflow-hidden align-bottom pb-[0.08em]">
      <motion.span
        className={`inline-block ${className}`}
        initial={{ y: '115%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{
          delay: diam ? 0 : delay,
          duration: diam ? 0 : 0.85,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function NamaBandaraHero() {
  const diam = !!useReducedMotion();

  /**
   * Kata-kata nama, dipenggal per baris, beserta penanda huruf awal beremas.
   *
   * Yang beremas adalah **A**ji **P**angeran **T**umenggung — persis tiga huruf
   * yang membentuk "APT", singkatan yang dipakai bandara ini di mana-mana
   * (kode, logo, nama panggilan). "Pranoto" sengaja dibiarkan polos: memberinya
   * emas juga akan mengubah aksen ini dari singkatan menjadi sekadar hiasan
   * huruf awal, dan singkatannya tidak lagi terbaca.
   */
  const baris1 = [
    { kata: 'Aji', emas: true },
    { kata: 'Pangeran', emas: true },
  ];
  const baris2 = [
    { kata: 'Tumenggung', emas: true },
    { kata: 'Pranoto', emas: false },
  ];

  let urutan = 0;
  const jeda = () => T.nama + urutan++ * T.jarakKata;

  return (
    <div className="font-[family-name:var(--font-display)]">
      {/* ---- sambutan ---- */}
      <motion.p
        className="text-[13px] sm:text-[14px] tracking-[0.22em] text-[#b08d3f] font-medium"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: diam ? 0 : T.sambutan, duration: diam ? 0 : 0.6 }}
      >
        Selamat Datang di
      </motion.p>

      {/* ---- BANDAR UDARA ----
          Jaraknya melebar saat muncul: gerak yang terasa seperti tulisan
          resmi yang sedang ditata, bukan sekadar memudar masuk. */}
      <motion.p
        className="mt-2 text-[17px] sm:text-[21px] lg:text-[24px] font-semibold uppercase"
        style={{ color: NAVY }}
        initial={{ opacity: 0, letterSpacing: '0.05em' }}
        animate={{ opacity: 1, letterSpacing: '0.3em' }}
        transition={{
          delay: diam ? 0 : T.bandarUdara,
          duration: diam ? 0 : 1,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        Bandar Udara
      </motion.p>

      {/* ---- nama ---- */}
      <h1 className="mt-1.5 leading-[1.06]">
        {/* Nama utuh dalam satu elemen bagi pembaca layar dan mesin pencari;
            baris-baris di bawahnya sekadar penataan visual dari teks yang sama. */}
        <span className="sr-only">
          Bandar Udara Aji Pangeran Tumenggung Pranoto Samarinda
        </span>

        <span aria-hidden="true">
          {[baris1, baris2].map((baris, iBaris) => (
            <span
              key={iBaris}
              className="block text-[40px] sm:text-[54px] lg:text-[64px] font-bold"
              style={{ color: NAVY }}
            >
              {baris.map(({ kata, emas }, i) => (
                <React.Fragment key={kata}>
                  <KataTersingkap delay={jeda()} diam={diam}>
                    {emas ? (
                      <>
                        {/* Huruf pertamanya beremas, sisanya navy — keduanya di
                            dalam satu kata supaya pemenggalan barisnya tidak
                            pernah memisahkan inisialnya dari badan katanya. */}
                        <span className={`${EMAS} bg-clip-text text-transparent`}>{kata[0]}</span>
                        {kata.slice(1)}
                      </>
                    ) : (
                      kata
                    )}
                  </KataTersingkap>
                  {i < baris.length - 1 && ' '}
                </React.Fragment>
              ))}
            </span>
          ))}
        </span>
      </h1>

      {/* ---- kota, diapit garis ---- */}
      <div className="mt-3 flex items-center gap-3" aria-hidden="true">
        <motion.span
          className={`h-px flex-1 max-w-[70px] ${EMAS}`}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          style={{ transformOrigin: 'right' }}
          transition={{ delay: diam ? 0 : T.kota, duration: diam ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.span
          // Kapital dan jarak hurufnya dari CSS, bukan dari teks yang diketik —
          // lihat butir 1. Pembaca layar tetap membaca "Samarinda".
          className="text-[13px] sm:text-[15px] font-semibold uppercase tracking-[0.42em] text-[#b08d3f] whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: diam ? 0 : T.kota + 0.15, duration: diam ? 0 : 0.7 }}
        >
          Samarinda
        </motion.span>
        <motion.span
          className={`h-px flex-1 max-w-[70px] ${EMAS}`}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          style={{ transformOrigin: 'left' }}
          transition={{ delay: diam ? 0 : T.kota, duration: diam ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
