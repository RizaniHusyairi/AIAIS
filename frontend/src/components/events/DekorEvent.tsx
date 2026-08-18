'use client';

/**
 * Hiasan perayaan pada beranda — lapisan yang MENETAP, bukan sambutan sekejap.
 *
 * Bedanya dengan `SambutanEvent` di sebelah: layar sambutan tampil sekali per
 * kunjungan lalu pergi, sedangkan berkas ini menghias beranda selama perayaan
 * berlangsung. Pengunjung yang menutup sambutannya, atau yang tiba lewat
 * tautan langsung ke beranda setelah menontonnya, tetap mendapati portal yang
 * ikut merayakan.
 *
 * Karena menetap itulah seluruh takarannya ditahan. Tiga aturan yang menjaga
 * hiasan ini tidak berubah menjadi gangguan:
 *
 *  1. HANYA DI HERO. Seluruh isinya dikurung di dalam bagian hero yang sudah
 *     `overflow-hidden`. Konfeti yang jatuh sepanjang halaman akan melintasi
 *     jadwal penerbangan dan daftar berita — dua hal yang justru dicari orang.
 *
 *  2. TIDAK PERNAH MENANGKAP TETIKUS. `pointer-events-none` di akar. Bendera
 *     yang menghalangi tombol "Cek Penerbangan" adalah kegagalan, bukan hiasan.
 *
 *  3. GERAKNYA LAMBAT DAN SEDIKIT. Konfeti dua puluh keping dengan periode
 *     belasan detik, bukan hujan rapat. Yang dituju kesan upacara, bukan pesta
 *     ulang tahun.
 *
 * Aksesibilitas: seluruhnya `aria-hidden`, dan animasinya mati sendiri pada
 * `prefers-reduced-motion` lewat blok di ujung `globals.css`.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { usiaRI } from '@/lib/perayaanAktif';
import type { SiteEvent } from '@/lib/siteEvents';
import { PesawatBendera } from './tema/Kemerdekaan';

/** Merah bendera resmi, sama dengan yang dipakai kain di layar sambutan. */
const MERAH = '#ce1126';

/* ================================================================
   Lapisan hiasan hero
   ================================================================ */

export default function DekorEvent({ event }: { event: SiteEvent | null }) {
  // Baru tema kemerdekaan yang punya hiasan menetap. Tema lain tetap memainkan
  // layar sambutannya masing-masing; mengembalikan `null` di sini membuat
  // beranda mereka apa adanya, bukan rusak.
  if (event?.theme !== 'kemerdekaan') return null;

  return <HiasKemerdekaan />;
}

function HiasKemerdekaan() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
      {/* Semburat merah tipis di tepi atas.

          Hero aslinya berlatar putih ke biru muda; tanpa satu isyarat warna,
          untaian bendera di bawah ini terbaca sebagai tempelan yang mengambang.
          Dengan semburat ini seluruh sudut atas hero ikut berubah suasana. */}
      <div
        className="absolute inset-x-0 top-0 h-40"
        style={{ background: `linear-gradient(180deg, ${MERAH}1f 0%, ${MERAH}00 100%)` }}
      />

      <UntaianBendera />
      <Konfeti />
      <PenerbangBendera />
    </div>
  );
}

/* ================================================================
   Pesawat penarik bendera yang melintasi hero
   ================================================================ */

/** Lama satu lintasan, dari tepi kiri sampai lenyap di tepi kanan. Detik. */
const LAMA_LINTASAN = 11;

/** Jeda sunyi di antara dua lintasan. Detik. */
const JEDA_LINTASAN = 30;

/**
 * Pesawat menarik Merah Putih, melintas kiri ke kanan di paruh bawah hero.
 *
 * KENAPA DIPASANG-LEPAS, BUKAN DIBIARKAN BERPUTAR
 *
 * Kainnya empat puluh lajur, tiap lajur dua elemen — delapan puluh elemen yang
 * menganimasikan `transform` tanpa henti. Di layar sambutan itu berjalan tujuh
 * detik lalu seluruh komponennya dilepas. Di beranda tidak ada yang melepasnya:
 * pengunjung bandara membiarkan tab jadwal penerbangan terbuka berjam-jam,
 * dan delapan puluh elemen yang berdenyut sepanjang itu adalah baterai yang
 * habis tanpa ada yang menikmatinya.
 *
 * Karena itu komponennya benar-benar DILEPAS di antara lintasan — bukan
 * disembunyikan, bukan dijeda. Selama jeda tidak ada satu pun elemen kain di
 * DOM. Efek sampingnya justru yang diinginkan: lintasannya jadi terasa sebagai
 * kejadian yang ditunggu, bukan hiasan yang berputar terus.
 */
function PenerbangBendera() {
  const kurangiGerak = !!useReducedMotion();
  const [terbang, setTerbang] = useState(false);
  const [terlihat, setTerlihat] = useState(true);
  const kotak = useRef<HTMLDivElement>(null);

  /* Berhenti menjadwalkan saat hero tergulir keluar layar. Menganimasikan
     delapan puluh elemen yang tidak dilihat siapa pun adalah pemborosan
     murni — dan yang paling merasakan akibatnya justru pengunjung yang sedang
     membaca berita di bawah. */
  useEffect(() => {
    const el = kotak.current;
    if (!el) return;

    const pengamat = new IntersectionObserver(
      ([masuk]) => setTerlihat(masuk.isIntersecting),
      // Sedikit longgar: hero yang tinggal sejengkal di tepi layar masih
      // pantas menerbangkan pesawatnya sampai selesai.
      { rootMargin: '80px' },
    );

    pengamat.observe(el);

    return () => pengamat.disconnect();
  }, []);

  /* Daur pasang-lepas.

     Saat hero tak terlihat, efek ini cukup BERHENTI MENJADWALKAN — pembersihnya
     yang membatalkan jam berjalan. Menyetel `terbang` kembali ke false di sini
     tidak perlu, karena yang menentukan tampil-tidaknya adalah `tampil` di
     bawah, yang sudah memperhitungkan keterlihatan. */
  useEffect(() => {
    if (kurangiGerak || !terlihat) return;

    let jam: ReturnType<typeof setTimeout>;

    const jadwalkan = (nyala: boolean, tunda: number) => {
      jam = setTimeout(() => {
        // Tab yang tersembunyi tidak menerima apa pun; menerbangkan pesawat ke
        // layar yang tidak ada di depan mata sama saja dengan tidak
        // menerbangkannya. Coba lagi sebentar kemudian.
        if (document.hidden) {
          jadwalkan(nyala, 5000);
          return;
        }

        setTerbang(nyala);
        jadwalkan(!nyala, (nyala ? LAMA_LINTASAN : JEDA_LINTASAN) * 1000);
      }, tunda);
    };

    // Lintasan pertama diberi jeda pendek, bukan langsung: pengunjung yang baru
    // tiba sedang membaca nama bandara, dan pesawat yang melintas pada detik
    // nol akan merebut perhatian tepat dari kalimat yang paling penting.
    jadwalkan(true, 2600);

    return () => clearTimeout(jam);
  }, [kurangiGerak, terlihat]);

  /* Gerak dikurangi: TIDAK DIRENDER SAMA SEKALI.

     Beda perlakuannya dengan untaian bendera di atas disengaja. Untaian yang
     berhenti berayun tetap terbaca sebagai untaian bendera; pesawat yang
     membeku di tengah udara terbaca sebagai stiker yang lupa dilepas. */
  const tampil = terbang && terlihat && !kurangiGerak;

  return (
    <div ref={kotak} className="absolute inset-0 overflow-hidden">
      {tampil && (
        <div
          /* Pita bawah hero — di bawah tombol ajakan, di atas lampu landasan.

             Bukan di paruh atas: pita itu sudah dihuni untaian bendera, dan
             lockup nama bandara adalah satu-satunya isi hero yang tidak boleh
             tersaingi. Bukan pula di tengah: di situ pesawatnya persis
             membelah paragraf dan deretan tombol.

             Lapisan ini tetap berada di dalam kotak latar hero yang ber-z di
             bawah isinya, jadi kalaupun tepiannya menyerempet tombol, ia lewat
             DI BELAKANG — bukan menutupi, dan tetap tidak bisa diklik. */
          className="absolute inset-x-0 top-[64%] sm:top-[62%] lg:top-[60%]"
        >
          {/* Skala lebih kecil daripada di layar sambutan: di beranda ia lalu
              lintas latar, bukan tokoh utama. */}
          <PesawatBendera
            diam={false}
            skala="scale-[0.34] sm:scale-[0.46] lg:scale-[0.62]"
          />
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Untaian bendera segitiga
   ================================================================ */

/**
 * Banyak segitiga pada satu untaian.
 *
 * Ganjil, supaya segitiga tengah tepat berada di titik terendah lengkungan
 * talinya — untaian yang genap membuat lengkungannya terbelah oleh celah dan
 * pusatnya terbaca sebagai kesalahan.
 */
const JUMLAH_UMBUL = 27;

/** Kedalaman lengkungan tali, dalam persen tinggi kotak SVG. */
const LENGKUNG = 42;

function UntaianBendera() {
  /**
   * Posisi tiap segitiga sepanjang tali.
   *
   * Talinya lengkung, jadi segitiga tidak boleh sekadar dijejer rata: yang di
   * tengah harus menggantung lebih rendah, dan yang di tepi hampir menyentuh
   * tepi atas. Kurvanya parabola sederhana — cukup untuk mata, dan jauh lebih
   * murah daripada menghitung katenari sungguhan tiap render.
   */
  const umbul = useMemo(
    () =>
      Array.from({ length: JUMLAH_UMBUL }).map((_, i) => {
        const t = i / (JUMLAH_UMBUL - 1);        // 0 di kiri, 1 di kanan
        const turun = 4 * t * (1 - t);           // 0 di tepi, 1 di tengah

        return {
          kiri: t * 100,
          atas: turun * LENGKUNG,
          // Jeda mulai bergeser sepanjang untaian: ayunannya MERAMBAT dari
          // kiri ke kanan seperti angin yang lewat, bukan berayun serentak.
          // Serentak akan terbaca sebagai satu benda kaku yang digoyang.
          jeda: -(t * 1.6),
          merah: i % 2 === 0,
        };
      }),
    [],
  );

  return (
    <div className="absolute inset-x-0 top-0 h-32 sm:h-40">
      {/* Tali. Digambar sebagai SVG melengkung yang merentang penuh, dengan
          `preserveAspectRatio="none"` supaya lengkungannya ikut melebar
          mengikuti layar dan tetap menyentuh kedua tepi. */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d={`M0 2 Q 50 ${2 + LENGKUNG * 2} 100 2`}
          stroke="rgba(15,23,42,0.28)"
          strokeWidth="0.4"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {umbul.map((u, i) => (
        <span
          key={i}
          className="absolute block origin-top"
          style={{
            left: `${u.kiri}%`,
            top: `${u.atas}%`,
            // Setengah lebar segitiga; menempatkan titik gantungnya persis di
            // tali, bukan tepi kirinya.
            marginLeft: -9,
            animation: 'ayunUmbul 2.9s ease-in-out infinite',
            animationDelay: `${u.jeda.toFixed(2)}s`,
          }}
        >
          <svg width="18" height="30" viewBox="0 0 18 30">
            {/* Segitiga menghadap bawah, sedikit cekung di sisi kiri-kanan —
                kain yang digantung tidak pernah bertepi lurus sempurna. */}
            <path
              d="M0 0 L18 0 Q 15 16 9 30 Q 3 16 0 0 Z"
              fill={u.merah ? MERAH : '#ffffff'}
              stroke={u.merah ? 'rgba(0,0,0,0.08)' : 'rgba(15,23,42,0.18)'}
              strokeWidth="0.6"
            />
            {/* Bayangan lipatan di sisi kanan; memberi kesan kain punya tebal. */}
            <path d="M18 0 Q 15 16 9 30 L 9 0 Z" fill="rgba(11,30,91,0.10)" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* ================================================================
   Konfeti merah-putih
   ================================================================ */

/**
 * Jumlah keping.
 *
 * Dua puluh. Cukup untuk selalu ada beberapa keping di layar pada saat mana
 * pun, dan cukup sedikit untuk tidak pernah menutupi teks hero. Angka ini
 * pernah lebih besar; di atas kira-kira empat puluh keping, hero berhenti
 * terbaca sebagai halaman resmi.
 */
const JUMLAH_KONFETI = 20;

/**
 * Sebaran semu yang dihitung dari nomor keping.
 *
 * BUKAN `Math.random()`. Dua alasan, dan yang kedua yang menentukan:
 *
 *  1. Mengacak saat render melanggar kemurnian komponen — React 19 menandainya
 *     sebagai galat lint, dan alasannya nyata: beranda merender ulang tiap
 *     enam detik untuk pergantian foto pejabat, dan nilai yang diacak ulang
 *     akan membuat tiap keping meloncat ke posisi baru pada tiap pergantian.
 *
 *  2. Hasilnya tetap sama antara server dan klien. Hiasan ini memang baru
 *     muncul sesudah jawaban API tiba, tetapi menggantungkan tampilan pada
 *     urutan itu adalah utang yang akan ditagih begitu ada yang merender
 *     bagian ini lebih awal.
 *
 * Perkalian bilangan tak bulat lalu diambil bagian pecahannya: cukup untuk
 * memutus keteraturan yang tertangkap mata, tanpa perlu pembangkit acak.
 */
const sebar = (i: number, benih: number) => {
  const x = (i + 1) * benih;
  return x - Math.floor(x);
};

function Konfeti() {
  const keping = useMemo(
    () =>
      Array.from({ length: JUMLAH_KONFETI }).map((_, i) => ({
        kiri: (i * 5.3 + sebar(i, 12.9898) * 4) % 100,
        // Jeda negatif: sebagian keping sudah "di tengah jalan" pada bingkai
        // pertama. Tanpa itu, hero mulai bersih lalu tiba-tiba dihujani
        // serentak — bocoran paling khas bahwa hiasannya baru saja dipasang.
        jeda: -(sebar(i, 78.233) * 14),
        durasi: 11 + sebar(i, 43.7585) * 7,
        geser: Math.round(sebar(i, 21.4771) * 70 - 35),
        lebar: 5 + Math.round(sebar(i, 9.3721) * 4),
        tinggi: 8 + Math.round(sebar(i, 33.1247) * 6),
        merah: i % 2 === 0,
        puncak: (0.45 + sebar(i, 57.6431) * 0.35).toFixed(2),
      })),
    [],
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      // Jarak jatuh sengaja MELEBIHI tinggi hero mana pun. Arah kesalahannya
      // penting: keping yang jatuh terlalu jauh cuma terpotong tepi bawah —
      // tidak terlihat sama sekali. Keping yang jatuhnya kurang berhenti di
      // tengah udara lalu lenyap, dan itu langsung tertangkap mata.
      style={{ ['--jatuh' as string]: '900px' }}
    >
      {keping.map((k, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-[1px]"
          style={{
            left: `${k.kiri}%`,
            width: k.lebar,
            height: k.tinggi,
            background: k.merah ? MERAH : '#ffffff',
            // Keping putih di atas latar hero yang juga terang perlu tepi,
            // kalau tidak ia hilang sama sekali di separuh kiri hero.
            boxShadow: k.merah ? 'none' : '0 0 0 1px rgba(15,23,42,0.14)',
            animation: `luruhKonfeti ${k.durasi.toFixed(1)}s linear infinite`,
            animationDelay: `${k.jeda.toFixed(1)}s`,
            ['--geser' as string]: `${k.geser}px`,
            ['--puncak' as string]: k.puncak,
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================
   Pita ucapan
   ================================================================ */

/**
 * Lencana "Dirgahayu" di atas nama bandara.
 *
 * Dirender SEBARIS di dalam kolom teks hero, bukan sebagai lapisan menumpuk.
 * Ucapan yang melayang di atas judul akan bertabrakan dengan lockup nama
 * bandara pada layar sempit — dan lockup itu satu-satunya hal di hero yang
 * benar-benar tidak boleh tertutupi.
 *
 * Terpisah dari `DekorEvent` karena tempat pasangnya memang berbeda: yang satu
 * lapisan latar, yang ini isi kolom.
 */
export function PitaPerayaan({ event }: { event: SiteEvent | null }) {
  if (event?.theme !== 'kemerdekaan') return null;

  const usia = usiaRI(event.starts_on);

  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full pl-2 pr-4 py-1.5 bg-white/85 backdrop-blur-sm ring-1 ring-[#ce1126]/25 shadow-sm"
      // Tidak `aria-hidden`: ini satu-satunya bagian hiasan yang membawa
      // INFORMASI, dan pembaca layar pantas mendengarnya.
    >
      {/* Bendera mungil sebagai penanda, bukan emoji: emoji bendera dirender
          berbeda-beda tiap sistem operasi dan pada sebagian Windows tidak
          muncul sama sekali. */}
      <span className="flex flex-col w-6 h-4 rounded-[2px] overflow-hidden ring-1 ring-black/10 flex-shrink-0">
        <span className="h-1/2" style={{ background: MERAH }} />
        <span className="h-1/2 bg-white" />
      </span>

      <span className="text-[13px] font-bold tracking-wide text-slate-800">
        {usia ? `Dirgahayu Republik Indonesia ke-${usia}` : 'Dirgahayu Republik Indonesia'}
      </span>
    </div>
  );
}
