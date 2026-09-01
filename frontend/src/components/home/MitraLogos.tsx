'use client';

/**
 * Dinding logo mitra dan pemangku kepentingan pada beranda.
 *
 * Menggantikan seksi "Dipercaya oleh Mitra Terkemuka" milik portal v1, yang
 * di sana berupa satu barisan logo diam.
 *
 * DUA BARIS, BUKAN SATU. Logonya berasal dari dua dunia yang berbeda —
 * maskapai yang menjual kursi, dan instansi yang bertugas di kawasan bandara.
 * Menggabungkan keduanya dalam satu barisan membuat pengunjung membaca
 * Badan Karantina sebagai maskapai. Pemisahannya dibaca dari `kelompok` di
 * `lib/mitraLogos.ts`, bukan dari urutan larik, supaya menambah satu mitra
 * cukup menyunting berkas data itu saja.
 *
 * ANIMASINYA MILIK CSS, bukan framer-motion — alasannya ada di blok
 * `mitraGeser` pada `globals.css`, termasuk mengapa isi jalurnya digandakan
 * dan mengapa angka -50% di sana terikat pada penggandaan itu.
 *
 * Yang perlu diketahui sebelum mengubah tampilannya: logo yang diserahkan
 * pengelola tidak seragam — ada yang berlatar putih (`logo-smart.jpg`), ada
 * yang hanya satu warna (`logo-SAJ.png`), ada yang lambang resmi berwarna
 * penuh. Perlakuan abu-abu-sampai-disorot di bawah bukan sekadar gaya: ia
 * satu-satunya cara membuat kumpulan seberagam itu terbaca sebagai satu
 * deretan, bukan sebagai tempelan yang saling berebut perhatian.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Handshake } from 'lucide-react';
import { useTeks } from '@/lib/kamus';
import { MITRA_LOGOS, mitraKelompok, type MitraLogo } from '@/lib/mitraLogos';

function LogoMitra({ m }: { m: MitraLogo }) {
  return (
    <div
      className="group/mitra relative flex-shrink-0 mx-3 w-[164px] h-[76px] flex items-center justify-center px-4 transition-transform duration-300 hover:-translate-y-0.5"
      title={`${m.nama} — ${m.peran}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={m.berkas}
        alt={m.nama}
        loading="lazy"
        decoding="async"
        className="max-h-11 max-w-full w-auto object-contain grayscale opacity-55 transition-all duration-300 group-hover/mitra:grayscale-0 group-hover/mitra:opacity-100"
      />

      {/* Keterangan peran muncul saat disorot. Diletakkan di atas area logo
          (absolute) supaya tinggi barisnya tidak berubah saat kursor lewat —
          jalur yang tingginya berdenyut membuat seluruh seksi bergoyang. */}
      <span className="pointer-events-none absolute inset-x-2 bottom-0 text-[9.5px] leading-tight text-center text-slate-400 opacity-0 transition-opacity duration-300 group-hover/mitra:opacity-100">
        {m.peran}
      </span>
    </div>
  );
}

function Jalur({ logos, balik, durasi }: { logos: MitraLogo[]; balik?: boolean; durasi: number }) {
  /* Salinan kedua hanya hiasan agar putarannya mulus; ia disembunyikan dari
     pembaca layar supaya daftar mitra tidak terdengar dua kali. */
  const kelompok = (kembar: boolean) => (
    <div
      className={`flex items-center ${kembar ? 'mitra-jalur--kembar' : ''}`}
      aria-hidden={kembar || undefined}
    >
      {logos.map((m) => (
        <LogoMitra key={`${kembar ? 'k' : 'a'}-${m.slug}`} m={m} />
      ))}
    </div>
  );

  return (
    <div className="mitra-panggung relative overflow-hidden py-1">
      <div
        className={`mitra-jalur ${balik ? 'mitra-jalur--balik' : ''}`}
        style={{ '--mitra-durasi': `${durasi}s` } as React.CSSProperties}
      >
        {kelompok(false)}
        {kelompok(true)}
      </div>
    </div>
  );
}

export default function MitraLogos() {
  const t = useTeks();

  const maskapai = mitraKelompok('maskapai');
  const instansi = mitraKelompok('instansi');

  if (MITRA_LOGOS.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative py-4 sm:py-6 overflow-hidden"
    >
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-black tracking-[0.14em] text-blue-700">
            <Handshake className="w-3.5 h-3.5" />
            {t.beranda.mitraKicker}
          </span>
          <h2 className="mt-3 text-[18px] sm:text-[20px] font-black text-slate-900">{t.beranda.mitraJudul}</h2>
          <p className="mt-1.5 text-slate-500 text-[12.5px] leading-relaxed max-w-xl">
            {t.beranda.mitraRingkas}
          </p>
        </div>

        <p className="text-[11px] text-slate-400 tabular-nums flex-shrink-0">
          {MITRA_LOGOS.length} {t.beranda.mitraHitung}
        </p>
      </div>

      <div className="relative mt-6 space-y-7">
        <BarisBerlabel label={t.beranda.mitraMaskapai}>
          <Jalur logos={maskapai} durasi={46} />
        </BarisBerlabel>

        <BarisBerlabel label={t.beranda.mitraInstansi}>
          <Jalur logos={instansi} balik durasi={58} />
        </BarisBerlabel>
      </div>
    </motion.div>
  );
}

/**
 * Label kelompok di sisi kiri jalur.
 *
 * Pada layar sempit label pindah ke atas jalur, bukan mengecil di sampingnya:
 * label setinggi satu baris di sebelah jalur setinggi 84px menyisakan ruang
 * kosong yang lebih mencolok daripada labelnya sendiri.
 */
function BarisBerlabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lg:flex lg:items-center lg:gap-5">
      <p className="lg:w-32 lg:flex-shrink-0 mb-2 lg:mb-0 text-[10.5px] font-black tracking-[0.12em] text-slate-400 uppercase">
        {label}
      </p>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
