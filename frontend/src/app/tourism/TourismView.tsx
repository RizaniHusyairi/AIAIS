'use client';

/**
 * Panggung sinematik destinasi wisata Samarinda.
 *
 * Halaman ini disusun sebagai tiga babak, bukan sebagai daftar:
 *
 *   I.   Judul — layar penuh bergaya pembuka film, lengkap dengan bilah
 *        letterbox, judul yang tersingkap huruf demi huruf, dan parallaks
 *        saat digulir.
 *   II.  Panggung — satu destinasi memenuhi bingkai 21:9 dengan gerak Ken
 *        Burns, berpindah lewat "potongan film" (kilat putih + sapuan), dan
 *        dinavigasi lewat rol film di bawahnya.
 *   III. Direktori — seluruh destinasi dalam kisi bersorot kursor.
 *
 * ATMOSFER. Seluruh lapisan suasana — grain, berkas cahaya, bokeh, kilas
 * cahaya — dibangkitkan prosedural dari gradasi CSS dan satu tekstur SVG,
 * bukan dari berkas gambar. Warnanya mengikuti kategori destinasi yang sedang
 * tampil (`TOURISM_CAT_META.glow`/`wash`), sehingga suasana halaman berubah
 * saat pengunjung berpindah dari Alam ke Religi ke Belanja. Bila kelak plat
 * atmosfer disiapkan, isi `TOURISM_CAT_META.plate` dan lapisan itu ikut
 * ditumpuk — lihat catatan di `lib/tourismData.ts` soal batasan isinya.
 *
 * SUMBER DATA. API `/tourisms` (punya foto sampul & galeri). Bila API kosong
 * atau tidak dapat dihubungi, halaman jatuh ke direktori statis berprovenans
 * `lib/tourismData.ts` — nama, alamat, dan jaraknya tetap benar, hanya tanpa
 * foto. Tidak ada data wisata yang dikarang di berkas ini, dan tidak ada
 * gambar yang mengaku-aku sebagai foto destinasi.
 *
 * GERAK. Setiap animasi berulang dimatikan saat `prefers-reduced-motion`
 * aktif; putar-otomatis panggung juga berhenti saat tab disembunyikan atau
 * kursor sedang berada di atas bingkai.
 *
 * BIAYA GERAK. Lapisan atmosfer di halaman ini pernah menahan 42 lapisan
 * compositor sekaligus — dua kerucut cahaya 1920×1920 piksel, 34 butir
 * melayang, dan tekstur grain selebar layar ber-`mix-blend-overlay` yang
 * bergetar sembilan kali sedetik. Semuanya terus berjalan sepanjang halaman
 * dibuka, termasuk saat pembaca sudah tergulir jauh melewati panggungnya.
 * Tiga aturan yang sekarang menahannya tetap ringan:
 *
 *   1. Atmosfer hanya bergerak selama panggungnya benar-benar terlihat —
 *      lihat `useAtmosfer`.
 *   2. Lapisan yang paling mahal per piksel hanya dipasang pada layar lebar.
 *   3. Grain tidak lagi dianimasikan. Menggetarkan lapisan sebesar layar yang
 *      ber-`mix-blend-overlay` memaksa peramban memadukan ulang seluruh
 *      viewport tiap langkahnya; butirannya sendiri sudah terbaca tanpa itu.
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import Link from 'next/link';
import {
  motion, AnimatePresence, useMotionValue, useSpring, useTransform,
  useReducedMotion, useScroll,
} from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import ImageLightbox, { type LightboxImage } from '@/components/ui/ImageLightbox';
import {
  TOURISM_SPOTS, TOURISM_CAT_META, TOURISM_CATEGORIES, PARTIKEL_SPRITE,
  ilustrasiUntuk, partikelUntuk, type TourismCategory, type JenisPartikel,
} from '@/lib/tourismData';
import type { TourismItem } from '@/types';
import {
  MapPin, Clock, Route, Camera, Map as MapIcon, Heart, ArrowLeft, ArrowRight, Navigation,
  Landmark, Trees, MoonStar, ShoppingBag, FerrisWheel, Sparkles, Search, Plane, Images, X,
  ChevronDown, Play, Pause, ImageOff, Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ================================================================
   Bentuk data terpadu — API dan direktori statis dipetakan ke sini
   ================================================================ */

type Spot = {
  slug: string;
  name: string;
  category: TourismCategory;
  distanceKm: number | null;
  duration: string | null;
  city: string;
  address: string;
  shortDesc: string;
  description: string;
  highlights: string[];
  cover: string | null;
  gallery: string[];
  mapsUrl: string;
  directionsUrl: string;
};

const CAT_ICON: Record<TourismCategory, LucideIcon> = {
  Budaya: Landmark,
  Alam: Trees,
  Religi: MoonStar,
  Belanja: ShoppingBag,
  Rekreasi: FerrisWheel,
};

/** Kategori bebas dari admin dinormalkan ke lima kategori yang dikenal tampilan. */
function normalizeCat(raw: string): TourismCategory {
  const hit = TOURISM_CATEGORIES.find((c) => c.toLowerCase() === String(raw ?? '').toLowerCase());
  return hit ?? 'Rekreasi';
}

function fromApi(it: TourismItem): Spot {
  const q = `${it.name} ${it.city ?? ''}`.trim();
  return {
    slug: it.slug,
    name: it.name,
    category: normalizeCat(it.category),
    distanceKm: it.distance_km,
    duration: it.duration,
    city: it.city ?? '',
    address: it.address,
    shortDesc: it.short_desc,
    description: it.description,
    highlights: it.highlights ?? [],
    cover: it.cover_url,
    gallery: it.gallery_urls ?? [],
    mapsUrl: it.gmaps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`,
  };
}

function fromStatic(t: (typeof TOURISM_SPOTS)[number]): Spot {
  return {
    slug: t.slug,
    name: t.name,
    category: t.category,
    distanceKm: t.distanceKm,
    duration: t.duration,
    city: t.city,
    address: t.address,
    shortDesc: `${t.description.split('. ')[0]}.`,
    description: t.description,
    highlights: t.highlights,
    cover: null,
    gallery: [],
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.mapsQuery)}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t.mapsQuery)}`,
  };
}

/* ================================================================
   Gerbang biaya gerak
   ================================================================ */

/**
 * Media query yang aman dijalankan saat render server.
 *
 * `useSyncExternalStore` dipakai alih-alih `useState` + `useEffect` karena
 * pasangan itu berarti memanggil `setState` langsung di dalam efek — pola yang
 * memicu render berantai dan ditolak lint proyek ini.
 */
function useMediaQuery(kueri: string, bawaanServer: boolean) {
  const langganan = useMemo(
    () => (ubah: () => void) => {
      const mq = window.matchMedia(kueri);
      mq.addEventListener('change', ubah);
      return () => mq.removeEventListener('change', ubah);
    },
    [kueri],
  );

  return useSyncExternalStore(
    langganan,
    () => window.matchMedia(kueri).matches,
    () => bawaanServer,
  );
}

/**
 * Apakah lapisan atmosfer perlu bergerak, dan seberapa penuh.
 *
 * `bergerak` mati begitu babak yang memakai atmosfer itu tergulir lewat.
 * Sebelum ini seluruh lapisan tetap berputar sepanjang halaman dibuka —
 * pembaca yang sudah sampai ke daftar destinasi di bawah tetap membayar 42
 * lapisan compositor untuk sesuatu yang tidak lagi ia lihat.
 *
 * DIAMATI DUA BAGIAN, bukan satu. Wadah atmosfernya sendiri `fixed inset-0`,
 * sehingga bagi IntersectionObserver ia selamanya terlihat dan tidak bisa jadi
 * penanda. Yang benar-benar tergulir adalah hero dan panggungnya; selama salah
 * satunya masih di layar, atmosfer tetap hidup. Di bawah itu, seksi daftar
 * destinasi menutupinya dengan latar 80% pekat — geraknya tidak akan terbaca
 * di sana sekalipun diteruskan.
 *
 * `layarLebar` menahan lapisan yang paling mahal per piksel agar hanya
 * DIPASANG di layar lebar. Jangkauannya sempit tapi tepat sasaran: di bawah
 * 768px `MobileRedirect` biasanya sudah melempar pembaca ke layar PWA, jadi
 * yang tersisa di sini hanyalah mereka yang memaksa mode desktop di layar
 * sempit — persis perangkat yang paling sedikit punya ruang GPU.
 *
 * DUA GERBANG INI SENGAJA DIPISAH. `layarLebar` menentukan apa yang DIPASANG,
 * `bergerak` menentukan apa yang BERGERAK. Bokeh dan kerucut cahaya karena itu
 * tetap terpasang saat panggungnya terlewat — keduanya masih rupawan dalam
 * keadaan diam, dan membiarkannya terpasang berarti tidak ada yang perlu
 * dirakit ulang saat pembaca menggulir kembali.
 *
 * Partikel dan kilas cahaya tetap dilepas saat diam: keduanya hanya terbaca
 * lewat geraknya, dan dibekukan justru menyisakan titik-titik menggantung.
 * Konsekuensinya, menggulir kembali ke atas memunculkannya bertahap selama
 * beberapa detik pertama — jeda mulai tiap butir memang sampai 9 detik. Itu
 * terbaca sebagai atmosfer yang menyala pelan, bukan sebagai cacat.
 */
function useAtmosfer(
  heroRef: React.RefObject<HTMLElement | null>,
  panggungRef: React.RefObject<HTMLElement | null>,
  diam: boolean,
) {
  const [terlihat, setTerlihat] = useState(true);
  const layarLebar = useMediaQuery('(min-width: 768px)', true);

  useEffect(() => {
    const dipantau = [heroRef.current, panggungRef.current]
      .filter((el): el is HTMLElement => el !== null);

    if (dipantau.length === 0) return;

    const tampak = new Set<Element>();

    /* Ambang longgar: geraknya dihidupkan sedikit sebelum babaknya benar-benar
       masuk layar, supaya tidak terlihat "menyala" mendadak. */
    const io = new IntersectionObserver(
      (masuk) => {
        for (const m of masuk) {
          if (m.isIntersecting) tampak.add(m.target);
          else tampak.delete(m.target);
        }
        setTerlihat(tampak.size > 0);
      },
      { rootMargin: '160px' },
    );

    dipantau.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [heroRef, panggungRef]);

  return { bergerak: !diam && terlihat, layarLebar };
}

/* ================================================================
   Lapisan atmosfer — seluruhnya prosedural
   ================================================================ */

/**
 * Tekstur grain 35mm. Dibangun sekali sebagai data-URI supaya tidak ada
 * permintaan jaringan tambahan, dan deterministik supaya render server dan
 * klien menghasilkan markup yang sama.
 */
const GRAIN_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>" +
      "<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter>" +
      "<rect width='180' height='180' filter='url(#g)' opacity='0.5'/></svg>",
  );

/**
 * Butiran film 35mm — statis.
 *
 * DULU LAPISAN INI BERGETAR delapan langkah tiap 0,9 detik. Terlihat bagus,
 * tetapi ia lapisan `fixed` seluas layar ber-`mix-blend-overlay`: setiap
 * langkah memaksa peramban memadukan ulang seluruh viewport terhadap semua
 * yang ada di bawahnya, sembilan kali sedetik, tanpa henti selama halaman
 * dibuka. Itu biaya tetap terbesar di halaman ini.
 *
 * Teksturnya sendiri tidak berubah: butirannya tetap terbaca sebagai grain
 * karena kerapatan noise-nya, bukan karena getarnya. Yang hilang hanya kesan
 * "film sedang berjalan" — dan itu ditukar dengan satu lapisan compositor
 * yang tidak pernah lagi perlu digambar ulang.
 *
 * Tanpa `will-change`: lapisan yang tidak bergerak tidak perlu dipromosikan,
 * dan mempertahankannya hanya menahan memori GPU tanpa guna.
 */
function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2] opacity-[0.16] mix-blend-overlay"
      style={{ backgroundImage: `url("${GRAIN_URI}")` }}
    />
  );
}

/**
 * Dua berkas cahaya kerucut yang berputar berlawanan arah.
 *
 * Sengaja TANPA `filter: blur`. Lapisan ini selebar 150vmax — pada layar
 * 1440px itu sekitar 4,5 megapiksel — dan memburamkan permukaan sebesar itu
 * memaksa peramban meraster ulang seluruhnya setiap frame selama ia berputar.
 * Itu penyebab utama gerak yang tersendat. Tepian kerucutnya sudah dilandaikan
 * di dalam gradasi lewat perhentian warna, jadi blur-nya memang tidak
 * dibutuhkan.
 *
 * UKURANNYA DITURUNKAN dari 150vmax ke 100vmax. Pada layar 1280px itu bukan
 * penghematan sepertiga melainkan lebih dari separuh — luas tumbuh kuadratik,
 * jadi 1920×1920 (3,7 MP) menjadi 1280×1280 (1,6 MP) per kerucut. Kerucutnya
 * berpusat di tengah dan tepiannya sudah transparan jauh sebelum sudut layar,
 * sehingga pengecilan ini tidak menyingkap tepi mana pun.
 *
 * Kerucut kedua hanya dipasang pada layar lebar (`penuh`). Persilangan dua
 * berkas itu yang memberi kesan sinematik, tetapi di ponsel ia menggandakan
 * beban raster pada perangkat yang paling sedikit sanggup menanggungnya.
 */
function BerkasCahaya({ glow, diam, penuh }: { glow: string; diam: boolean; penuh: boolean }) {
  const kerucut = (dari: number) =>
    `conic-gradient(from ${dari}deg at 50% 42%, transparent 0deg, ${glow}08 6deg, ${glow}20 15deg, ` +
    `${glow}08 24deg, transparent 34deg, transparent 148deg, ${glow}06 158deg, ${glow}18 168deg, ` +
    `${glow}06 178deg, transparent 190deg, transparent 360deg)`;

  const berkas = penuh
    ? [{ dur: 84, arah: 360, op: 0.6 }, { dur: 127, arah: -360, op: 0.4 }]
    : [{ dur: 84, arah: 360, op: 0.6 }];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {berkas.map((b, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 h-[100vmax] w-[100vmax]"
          style={{
            background: kerucut(i * 90),
            opacity: b.op,
            /* Penengahan lewat transform, bukan kelas `-translate-*`: kelas itu
               akan ditimpa oleh transform rotasi dari framer-motion. */
            x: '-50%',
            y: '-50%',
            willChange: 'transform',
          }}
          animate={diam ? undefined : { rotate: b.arah }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

/**
 * Bokeh melayang — posisi dan ritme ditetapkan, bukan diacak saat render.
 *
 * DELAPAN, sebelumnya delapan belas. Bokeh berukuran 40–170px dan beropasitas
 * 0,05–0,13; pada kerapatan itu selisih sepuluh butir hampir tidak terbaca
 * mata, sementara tiap butir menahan satu lapisan compositor sendiri selama
 * halaman dibuka. Pengalinya diubah agar delapan yang tersisa tetap tersebar
 * merata, bukan menumpuk di sudut yang sama seperti bila daftarnya dipotong.
 */
const BOKEH = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  left: (i * 37) % 100,
  top: (i * 61) % 100,
  size: 40 + ((i * 37) % 130),
  dur: 18 + ((i * 7) % 16),
  delay: (i * 1.9) % 11,
  drift: i % 2 ? 48 : -48,
  op: 0.05 + ((i * 13) % 9) / 100,
}));

function Bokeh({ glow, diam }: { glow: string; diam: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {BOKEH.map((b) => (
        <motion.span
          key={b.id}
          className="absolute rounded-full"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            /* Gradasi radial sudah melandai ke transparan, jadi `blur` di sini
               hanya melunakkan sesuatu yang sudah lunak — dengan biaya raster
               ulang di 18 elemen sekaligus. Kelandaiannya dipindah ke
               perhentian warna. */
            background: `radial-gradient(circle, ${glow} 0%, ${glow}80 34%, transparent 72%)`,
            opacity: b.op,
            /* Tanpa `will-change`: peramban sudah mempromosikan elemen yang
               transform-nya sedang beranimasi, dan menyatakannya sendiri di
               sini justru menahan lapisannya hidup terus — termasuk saat
               panggungnya sudah tidak terlihat dan geraknya dihentikan. */
          }}
          animate={diam ? undefined : { y: [0, -70, 0], x: [0, b.drift, 0], opacity: [b.op, b.op * 2.4, b.op] }}
          transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   Partikel per destinasi
   --------------------------------------------------------------- */

/**
 * Butir partikel — posisi dan ritme ditetapkan, bukan diacak saat render.
 *
 * SEMBILAN, sebelumnya enam belas. Butirnya berukuran 5–17px dan sebagian
 * besar waktunya beropasitas rendah atau nol; yang membuat lapisan ini terbaca
 * adalah ritme dan arah geraknya, bukan cacahnya.
 */
const BUTIR = Array.from({ length: 9 }).map((_, i) => ({
  id: i,
  left: (i * 43) % 100,
  top: (i * 71) % 100,
  size: 5 + ((i * 11) % 13),
  delay: (i * 1.3) % 9,
  dur: 9 + ((i * 5) % 11),
  sway: i % 2 ? 26 : -26,
}));

type Butir = (typeof BUTIR)[number];

/**
 * Watak gerak tiap jenis partikel.
 *
 * Seluruhnya hanya menggerakkan `x`/`y`/`rotate`/`opacity` — properti yang
 * ditangani compositor. Tidak ada `left`, `top`, `filter`, atau `background`
 * yang dianimasikan; ketiganya memaksa hitung ulang tata letak atau cat ulang
 * setiap frame, dan itulah yang membuat halaman ini tersendat sebelumnya.
 */
function gerakButir(jenis: JenisPartikel, b: Butir) {
  switch (jenis) {
    /* Jatuh dari atas dengan sedikit ayunan — percikan air. */
    case 'percik':
      return {
        animate: { y: ['-14vh', '114vh'], x: [0, b.sway * 0.35, 0], opacity: [0, 0.7, 0.7, 0] },
        dur: b.dur * 0.6,
        ease: 'easeIn' as const,
      };
    /* Naik dan meliuk, padam di ketinggian — bara pasar malam. */
    case 'bara':
      return {
        animate: { y: ['112vh', '-14vh'], x: [0, b.sway, -b.sway * 0.6, 0], opacity: [0, 0.9, 0.45, 0] },
        dur: b.dur * 1.3,
        ease: 'easeOut' as const,
      };
    /* Hanyut mendatar sambil naik-turun lembut — serbuk cahaya hutan. */
    case 'serbuk':
      return {
        animate: { x: ['-8vw', '108vw'], y: [0, -34, 22, 0], opacity: [0, 0.6, 0.6, 0] },
        dur: b.dur * 2.1,
        ease: 'linear' as const,
      };
    /* Berputar pelan sambil melayang — debu keemasan ruang koleksi. */
    case 'debu-emas':
      return {
        animate: { y: [0, -46, 0], x: [0, b.sway * 0.7, 0], rotate: [0, 180, 360], opacity: [0.15, 0.75, 0.15] },
        dur: b.dur * 1.8,
        ease: 'easeInOut' as const,
      };
    /* Mengembara dekat tempatnya sambil berdenyut — kunang-kunang. */
    case 'kunang':
    default:
      return {
        animate: { x: [0, b.sway * 0.5, -b.sway * 0.3, 0], y: [0, -26, 14, 0], opacity: [0, 0.85, 0.1, 0.7, 0] },
        dur: b.dur * 1.5,
        ease: 'easeInOut' as const,
      };
  }
}

/**
 * Lapisan partikel yang menyertai destinasi aktif.
 *
 * Sprite-nya opsional. Selama `PARTIKEL_SPRITE` masih `null`, butirnya
 * digambar dari gradasi radial dalam warna sorot kategori — geraknya sudah
 * lengkap tanpa berkas apa pun. Begitu sprite tersedia, ia menggantikan rupa
 * butirnya dengan `mix-blend-mode: screen` yang melarutkan latar hitamnya.
 */
function Partikel({ jenis, glow, diam }: { jenis: JenisPartikel; glow: string; diam: boolean }) {
  if (diam) return null;
  const sprite = PARTIKEL_SPRITE[jenis];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {BUTIR.map((b) => {
        const g = gerakButir(jenis, b);
        return (
          <motion.span
            /* `jenis` ikut jadi kunci: berganti destinasi ke watak lain
               memasang ulang butirnya, sehingga geraknya mulai dari awal
               alih-alih melanjutkan ritme watak sebelumnya. */
            key={`${jenis}-${b.id}`}
            className="absolute rounded-full"
            style={{
              left: `${b.left}%`,
              top: `${b.top}%`,
              width: b.size,
              height: b.size,
              ...(sprite
                ? { backgroundImage: `url(${sprite})`, backgroundSize: 'cover', mixBlendMode: 'screen' as const }
                : { background: `radial-gradient(circle, ${glow} 0%, ${glow}77 42%, transparent 72%)` }),
              /* Tanpa `will-change` — lihat catatan pada Bokeh. */
            }}
            animate={g.animate}
            transition={{ duration: g.dur, delay: b.delay, repeat: Infinity, ease: g.ease }}
          />
        );
      })}
    </div>
  );
}

/**
 * Kilas cahaya yang menyapu layar, meniru kebocoran cahaya pada film.
 *
 * Digeser lewat `x`, bukan `left`. Menganimasikan `left` memaksa peramban
 * menghitung ulang tata letak setiap frame; `x` menjadi transform yang
 * ditangani compositor tanpa menyentuh tata letak sama sekali.
 */
function KilasCahaya({ glow, diam }: { glow: string; diam: boolean }) {
  if (diam) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-[46vw]"
      style={{
        background: `linear-gradient(100deg, transparent, ${glow}12 30%, ${glow}2e 50%, ${glow}12 70%, transparent)`,
        willChange: 'transform',
      }}
      animate={{ x: ['-50vw', '108vw'] }}
      transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut', repeatDelay: 8 }}
    />
  );
}

/** Bilah letterbox — muncul sekali saat halaman dibuka, lalu diam. */
function Letterbox() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 z-[3] h-full">
      {(['top-0', 'bottom-0'] as const).map((sisi) => (
        <motion.div
          key={sisi}
          className={`absolute ${sisi} inset-x-0 bg-black`}
          initial={{ height: '50vh' }}
          animate={{ height: 'clamp(14px, 3.2vh, 34px)' }}
          transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1], delay: 0.15 }}
        />
      ))}
    </div>
  );
}

/* ================================================================
   Serpih antarmuka
   ================================================================ */

/** Angka yang merayap naik ke nilainya — dipakai untuk jarak tempuh. */
function AngkaMerayap({ nilai, diam }: { nilai: number; diam: boolean }) {
  const mv = useMotionValue(diam ? nilai : 0);
  const halus = useSpring(mv, { stiffness: 80, damping: 22 });
  const teks = useTransform(halus, (v) => String(Math.round(v)));
  useEffect(() => { mv.set(nilai); }, [nilai, mv]);
  return <motion.span>{diam ? String(nilai) : teks}</motion.span>;
}

/**
 * Menyilangkan satu sumber gambar yang berganti-ganti.
 *
 * Mengembalikan gambar sekarang, gambar sebelumnya, dan `tick` yang naik tiap
 * pergantian. Pemakainya menumpuk dua lapisan tetap: lapisan bawah memegang
 * `lalu` dan diam, lapisan atas memegang `kini`, dipasang ulang lewat `tick`
 * lalu memudar masuk di atasnya.
 *
 * Bentuk ini dipilih setelah dua pendekatan lain gagal di halaman ini.
 * `AnimatePresence` menahan elemen lama selama animasi panjang di atasnya belum
 * rampung, sehingga gambar menumpuk dan yang baru tak pernah tampil. Menukar
 * dua slot secara bergantian lebih ringan, tetapi slot yang tampak tertinggal
 * satu langkah di belakang sumbernya. Di sini tidak ada yang perlu dilacak:
 * lapisan atas selalu gambar sekarang, lapisan bawah selalu yang sebelumnya.
 *
 * Keadaan disesuaikan saat render — pola resmi React untuk keadaan turunan
 * prop — bukan di dalam `useEffect`, agar tidak ada render berantai.
 */
type Silang = { kini: string; lalu: string; tick: number };

function useSilang(src: string): Silang {
  const [s, setS] = useState<Silang>({ kini: src, lalu: src, tick: 0 });
  if (s.kini !== src) setS({ kini: src, lalu: s.kini, tick: s.tick + 1 });
  return s;
}

/** Judul yang tersingkap huruf demi huruf dari balik garis potong. */
function JudulTersingkap({ teks, className }: { teks: string; className?: string }) {
  return (
    <span className={className} aria-label={teks}>
      {teks.split('').map((huruf, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '108%', rotate: 7 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.55 + i * 0.06 }}
          >
            {huruf}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Baris keterangan di dalam bingkai panggung. */
function BarisInfo({ icon: Icon, label, children, glow }: {
  icon: LucideIcon; label: string; children: React.ReactNode; glow: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: `${glow}55`, backgroundColor: `${glow}1a` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: glow }} />
      </span>
      <span className="min-w-0">
        <span className="block text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/45">{label}</span>
        <span className="block text-[12.5px] leading-snug text-white/85">{children}</span>
      </span>
    </div>
  );
}

/* ================================================================
   Halaman
   ================================================================ */

const CATATAN = [
  { icon: Camera, title: 'Abadikan Momen', desc: 'Tempat terbaik untuk mengabadikan momen berharga Anda di Samarinda.' },
  { icon: MapIcon, title: 'Jelajahi Lebih Banyak', desc: 'Masih banyak destinasi menarik lainnya yang menanti untuk Anda jelajahi.' },
  { icon: Heart, title: 'Dukung Pariwisata Lokal', desc: 'Dengan berkunjung, Anda ikut mendukung pelestarian budaya dan alam Samarinda.' },
];

/** Jeda putar-otomatis panggung, dalam milidetik. */
const JEDA_PUTAR = 7000;

export default function TourismView() {
  const heroBg = useSetting('bg_tourism');
  const kurangiGerak = useReducedMotion();
  const diam = !!kurangiGerak;

  const [spots, setSpots] = useState<Spot[]>(() => TOURISM_SPOTS.map(fromStatic));
  const [aktif, setAktif] = useState(0);
  const [cat, setCat] = useState<'all' | TourismCategory>('all');
  const [q, setQ] = useState('');
  const [galeri, setGaleri] = useState<Spot | null>(null);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);
  const [berputar, setBerputar] = useState(true);
  const [tertahan, setTertahan] = useState(false);

  const judulRef = useRef<HTMLElement | null>(null);
  const kisiRef = useRef<HTMLDivElement | null>(null);
  const panggungRef = useRef<HTMLElement | null>(null);

  /* Atmosfer hanya bergerak selama hero atau panggungnya masih di layar. */
  const atmosfer = useAtmosfer(judulRef, panggungRef, diam);
  const diamAtmosfer = !atmosfer.bergerak;

  /* Data API menggantikan cadangan statis begitu tersedia. */
  useEffect(() => {
    let batal = false;
    fetchApi<TourismItem[]>('/tourisms')
      .then((res) => {
        if (batal || !res.success || !Array.isArray(res.data) || res.data.length === 0) return;
        setSpots(res.data.map(fromApi));
        setAktif(0);
      })
      .catch(() => { /* cadangan statis sudah tampil */ });
    return () => { batal = true; };
  }, []);

  const daftar = useMemo(() => {
    const s = q.toLowerCase();
    return spots
      .filter((t) => (cat === 'all' || t.category === cat)
        && (!q || [t.name, t.category, t.city, t.description, ...t.highlights].some((v) => String(v ?? '').toLowerCase().includes(s))))
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [spots, cat, q]);

  const panggung = daftar.length ? daftar : spots;
  const idx = Math.min(aktif, Math.max(panggung.length - 1, 0));
  const kini = panggung[idx];

  const pilihKategori = (v: 'all' | TourismCategory) => { setCat(v); setAktif(0); };
  const ubahCari = (v: string) => { setQ(v); setAktif(0); };

  const geser = useCallback((arah: number) => {
    setAktif((i) => (panggung.length ? (i + arah + panggung.length) % panggung.length : 0));
  }, [panggung.length]);

  /* Panah kiri/kanan menavigasi panggung; spasi menjeda putar-otomatis. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.key === 'ArrowRight') geser(1);
      if (e.key === 'ArrowLeft') geser(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [geser]);

  /* Putar-otomatis berhenti saat tab disembunyikan supaya tidak memutar di
     latar belakang, dan saat kursor menahan bingkai supaya pengunjung sempat
     membaca keterangan destinasi. */
  useEffect(() => {
    if (diam || !berputar || tertahan || panggung.length < 2) return;
    const jalan = () => geser(1);
    let id = window.setInterval(jalan, JEDA_PUTAR);
    const onVis = () => {
      window.clearInterval(id);
      if (!document.hidden) id = window.setInterval(jalan, JEDA_PUTAR);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [diam, berputar, tertahan, panggung.length, geser]);

  /* Parallaks babak judul: isinya naik dan memudar lebih cepat dari gulirannya. */
  const { scrollYProgress } = useScroll({ target: judulRef, offset: ['start start', 'end start'] });
  const judulY = useTransform(scrollYProgress, [0, 1], ['0%', '38%']);
  const judulOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const judulSkala = useTransform(scrollYProgress, [0, 1], [1, 1.14]);

  /* Sorot kursor pada kisi direktori — dibaca CSS lewat variabel. */
  const onKisiMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = kisiRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  /* Dihitung SEBELUM keluar-awal di bawah: kait tidak boleh dilewati pada
     render mana pun. Satu instans dipakai bersama oleh latar buram dan bingkai
     panggung — keduanya menampilkan sumber yang sama, hanya beda durasi
     silangnya.

     Urutan cadangannya: foto destinasi dari admin, lalu ilustrasi AI khusus
     destinasi itu, lalu plat atmosfer kategorinya, baru gambar bawaan portal.
     Tanpa tingkat-tingkat tengah itu, seluruh destinasi yang belum berfoto
     memakai satu gambar yang persis sama sehingga bingkai tampak tidak pernah
     berganti.

     Foto asli SELALU menang. Begitu admin mengunggah `cover_url`, ilustrasi
     tidak dipakai sama sekali dan lencananya ikut hilang. */
  const metaKini = kini ? TOURISM_CAT_META[kini.category] : null;
  const ilustrasiKini = kini && !kini.cover ? ilustrasiUntuk(kini.slug) : null;
  const latarKini = kini?.cover || ilustrasiKini || metaKini?.plate || heroBg;
  const silangLatar = useSilang(latarKini);

  if (!kini || !metaKini) return null;
  const meta = metaKini;
  const IconKini = CAT_ICON[kini.category];
  const jenisPartikel = partikelUntuk(kini.slug, kini.category);

  /* Teks pengganti gambar bingkai. Ilustrasi TIDAK boleh diberi `alt` berisi
     nama destinasi saja — pembaca layar akan menyampaikannya sebagai foto
     tempat itu. */
  const altBingkai = kini.cover
    ? kini.name
    : ilustrasiKini
      ? `Ilustrasi AI bergaya ${kini.category.toLowerCase()} untuk ${kini.name} — bukan foto tempat aslinya`
      : '';

  return (
    <div className="relative overflow-hidden bg-[#03060f]">
      <Letterbox />
      <Grain />

      {/* ============ CHROME SENDIRI ============
          Halaman ini terdaftar di `OWN_CHROME_ROUTES`, jadi navbar dan footer
          portal tidak dirender. Bilah ini yang menggantikannya: tanpa jalan
          kembali, pengunjung yang mendarat langsung di sini terkurung. Sengaja
          tipis dan tembus pandang supaya tidak melawan babak judul. */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 z-[40] flex items-center justify-between gap-3 px-4 sm:px-6"
        style={{ top: 'calc(clamp(14px, 3.2vh, 34px) + 0.85rem)' }}
      >
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-black/45 py-2 pl-2.5 pr-4 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-black/65"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-white/60 transition-transform group-hover:-translate-x-0.5" />
          <img src="/logo-white-apt.svg" alt="" className="h-5 w-auto opacity-85" />
          <span className="text-[11.5px] font-bold text-white/85">Portal APT Pranoto</span>
        </Link>

        <a
          href="#destinasi"
          className="hidden items-center gap-1.5 rounded-full border border-white/12 bg-black/45 px-4 py-2.5 text-[11.5px] font-bold text-white/75 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white sm:inline-flex"
        >
          <MapIcon className="h-3.5 w-3.5" /> Semua Destinasi
        </a>
      </motion.header>

      {/* ============ LATAR ATMOSFER ============ */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Sampul destinasi aktif, dikaburkan dalam-dalam sampai tinggal warna
            dan cahayanya — bukan lagi gambar yang bisa disalahbaca. Dua slot
            tetap yang disilangkan; blur-nya statis sehingga cukup diraster
            sekali, tidak setiap frame. */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${silangLatar.lalu})`, filter: 'blur(28px) saturate(1.3)', opacity: 0.3 }}
        />
        <div
          key={silangLatar.tick}
          className="silang-masuk absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${silangLatar.kini})`,
            filter: 'blur(28px) saturate(1.3)',
            '--silang-op': '0.3',
            '--silang-dur': '1500ms',
          } as React.CSSProperties}
        />

        {/* Gradasi kategori — inilah yang membuat suasana berganti warna.

            Dua lapisan statis yang saling hanyut, bukan satu lapisan yang
            menganimasikan properti `background`. Menganimasikan `background`
            berarti peramban menafsirkan ulang string gradasi dan mengecat ulang
            seluruh layar setiap frame; transform pada lapisan yang sudah
            teraster tidak menyentuh cat sama sekali. */}
        {[
          { g: `radial-gradient(900px circle at 30% 32%, ${meta.wash}, transparent 62%)`, x: ['-6%', '8%', '-6%'], y: ['-4%', '5%', '-4%'], dur: 34 },
          { g: `radial-gradient(760px circle at 72% 68%, ${meta.glow}1c, transparent 60%)`, x: ['7%', '-7%', '7%'], y: ['5%', '-6%', '5%'], dur: 47 },
        ].map((l, i) => (
          <motion.div
            key={i}
            className="absolute inset-[-15%]"
            style={{ background: l.g, willChange: 'transform' }}
            animate={diamAtmosfer ? undefined : { x: l.x, y: l.y }}
            transition={{ duration: l.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Plat atmosfer kategori, ditumpuk dengan `screen` supaya hanya
            cahayanya yang menambah — bagian gelapnya lebur ke latar.

            Kelimanya sengaja dipasang permanen dan hanya disilangkan lewat
            `opacity`, bukan dipasang-lepas lewat `AnimatePresence`. Totalnya
            168 KB dan semuanya toh diunduh, sementara memasang-lepas di lapisan
            ini terbukti menumpuk: elemen lama tidak pernah dilepas dan yang
            baru tidak pernah menyala. Menyilang begini juga lebih benar — dua
            plat memang harus hadir bersamaan selama peralihan. */}
        {TOURISM_CATEGORIES.map((c) => {
          const p = TOURISM_CAT_META[c].plate;
          if (!p) return null;
          return (
            <div
              key={c}
              aria-hidden
              className="absolute inset-0 bg-cover bg-center mix-blend-screen transition-opacity duration-[1400ms] ease-out"
              style={{ backgroundImage: `url(${p})`, opacity: c === kini.category ? 0.42 : 0 }}
            />
          );
        })}

        <BerkasCahaya glow={meta.glow} diam={diamAtmosfer} penuh={atmosfer.layarLebar} />
        {/* Bokeh dan kilas cahaya hanya dipasang di layar lebar: keduanya
            lapisan besar yang di layar sempit nyaris tak terbaca di balik
            vignette, sementara biayanya justru paling terasa di sana. */}
        {atmosfer.layarLebar && <Bokeh glow={meta.glow} diam={diamAtmosfer} />}
        {atmosfer.layarLebar && <KilasCahaya glow={meta.glow} diam={diamAtmosfer} />}
        {/* Watak geraknya mengikuti destinasi yang sedang tampil: percik air di
            Air Terjun Tanah Merah, bara di Citra Niaga, kunang di masjid. */}
        <Partikel jenis={jenisPartikel} glow={meta.glow} diam={diamAtmosfer} />

        {/* Vignette penutup — menjaga teks tetap terbaca di seluruh babak. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_18%,rgba(3,6,15,0.82)_72%,#03060f)]" />
      </div>

      {/* ================================================================
          BABAK I — JUDUL
          ================================================================ */}
      <section ref={judulRef} className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-4 text-center">
        <motion.div style={{ y: judulY, opacity: judulOpacity, scale: judulSkala }}>
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/40 bg-amber-200/10 backdrop-blur"
          >
            <motion.span
              animate={diam ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Plane className="h-5 w-5 -rotate-45 text-amber-300" />
            </motion.span>
          </motion.span>

          {/* Eyebrow: jarak antarhuruf melebar sendiri, seperti kartu judul film. */}
          <motion.p
            initial={{ opacity: 0, letterSpacing: '0.12em' }}
            animate={{ opacity: 1, letterSpacing: '0.55em' }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            className="mt-5 pl-[0.55em] text-[10.5px] font-bold uppercase text-white/70 sm:text-[12.5px]"
          >
            Destinasi Wisata
          </motion.p>

          <JudulTersingkap
            teks="SAMARINDA"
            className="mt-2 block bg-gradient-to-b from-white via-white to-white/45 bg-clip-text text-[54px] font-black leading-[0.86] tracking-[0.01em] text-transparent drop-shadow-[0_10px_44px_rgba(0,0,0,0.75)] sm:text-[96px] lg:text-[132px]"
          />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.35 }}
            className="mx-auto mt-4 max-w-lg text-[13px] leading-relaxed text-white/55 sm:text-[14.5px]"
          >
            Jelajahi keindahan, budaya, dan spiritualitas Kota Samarinda — semuanya
            dalam jangkauan berkendara dari terminal bandara.
          </motion.p>

          {/* Strip data bergaya timecode. */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.55 }}
            className="mx-auto mt-7 flex w-fit flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-white/12 bg-black/45 px-6 py-3 backdrop-blur-md"
          >
            {[
              { k: 'Destinasi', v: String(spots.length).padStart(2, '0') },
              { k: 'Terdekat', v: `${Math.min(...spots.map((s) => s.distanceKm ?? 999))} km` },
              { k: 'Kategori', v: String(TOURISM_CATEGORIES.length).padStart(2, '0') },
            ].map((d) => (
              <span key={d.k} className="flex items-baseline gap-2">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/40">{d.k}</span>
                <span className="font-mono text-[15px] font-black tabular-nums text-amber-300">{d.v}</span>
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Isyarat gulir. */}
        <motion.a
          href="#panggung"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          style={{ opacity: judulOpacity }}
          className="absolute bottom-[max(2.2rem,5vh)] flex flex-col items-center gap-1.5 text-white/45 transition-colors hover:text-white"
          aria-label="Gulir ke panggung destinasi"
        >
          <span className="text-[9.5px] font-bold uppercase tracking-[0.3em]">Gulir</span>
          <motion.span animate={diam ? undefined : { y: [0, 7, 0] }} transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </motion.a>
      </section>

      {/* ================================================================
          BABAK II — PANGGUNG
          ================================================================ */}
      <section ref={panggungRef} id="panggung" className="relative z-10 scroll-mt-6 px-3 pb-14 sm:px-6">
        <div
          className="mx-auto w-full max-w-[1460px]"
          onPointerEnter={() => setTertahan(true)}
          onPointerLeave={() => setTertahan(false)}
        >
          {/* ---------- bingkai ---------- */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) geser(1);
              else if (info.offset.x > 70) geser(-1);
            }}
            className="relative aspect-[4/5] w-full touch-pan-y overflow-hidden rounded-[26px] border border-white/12 bg-[#060c1a] shadow-[0_50px_150px_-40px_rgba(0,0,0,0.95)] sm:aspect-[16/10] lg:aspect-[21/9]"
          >
            {/* Gerak Ken Burns dipasang pada PEMBUNGKUS, bukan pada gambarnya.
                Ia mengayun bolak-balik tanpa henti dan tidak pernah dimulai
                ulang saat destinasi berganti — sebelumnya gerak itu melekat
                pada gambar dan tersentak balik ke awal setiap pergantian,
                persis sentakan yang terlihat sebagai animasi rusak. */}
            <motion.div
              className="absolute inset-0"
              style={{ willChange: 'transform' }}
              animate={diam ? { scale: 1.04 } : {
                scale: [1.05, 1.13, 1.05],
                x: ['-1.2%', '1.2%', '-1.2%'],
                y: ['0.7%', '-0.7%', '0.7%'],
              }}
              transition={{ duration: 48, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Dua lapisan tetap: yang bawah memegang gambar sebelumnya dan
                  diam, yang atas memudar masuk. Hanya lapisan atas yang
                  dipasang ulang, jadi jumlah elemen tidak pernah bertambah. */}
              <img
                src={silangLatar.lalu}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
              <img
                key={silangLatar.tick}
                src={silangLatar.kini}
                alt={altBingkai}
                className="silang-masuk absolute inset-0 h-full w-full object-cover"
                style={{ '--silang-op': '1', '--silang-dur': '1100ms' } as React.CSSProperties}
              />
            </motion.div>

            {/* Penanda asal gambar. Tanpa ini pengunjung portal resmi akan
                menyangka ilustrasi AI sebagai foto tempat yang sebenarnya —
                dan gambar itu memang bukan wujud aslinya. Hilang sendiri
                begitu admin mengunggah foto asli. */}
            {!kini.cover && (
              <span
                className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-white/55 backdrop-blur sm:top-5"
                title={ilustrasiKini
                  ? 'Gambar ini dibangkitkan AI untuk menggambarkan suasana, bukan foto tempat aslinya.'
                  : undefined}
              >
                {ilustrasiKini ? <Wand2 className="h-3 w-3" /> : <ImageOff className="h-3 w-3" />}
                {ilustrasiKini ? 'Ilustrasi AI — bukan foto destinasi' : 'Foto destinasi belum tersedia'}
              </span>
            )}

            {/* Peredup: tegak untuk keterbacaan, mendatar supaya sisi kanan
                bingkai tetap terbaca sebagai gambar, bukan sekadar tekstur. */}
            <span className="absolute inset-0 bg-gradient-to-t from-[#03060f] via-[#03060f]/45 to-transparent" />
            <span className="absolute inset-0 bg-gradient-to-r from-[#03060f]/92 via-[#03060f]/30 to-transparent" />

            {/* Sapuan cahaya kategori saat destinasi berganti.

                Kilat putih 0,5 opacity yang dulu ada di sini sudah dibuang.
                Sampul destinasi kerap sama antar-kartu, jadi kilat itu berkedip
                tanpa ada yang sungguh berganti di baliknya — terbaca sebagai
                kerusakan, bukan sebagai potongan film. Kini peralihannya
                ditanggung silang-lapis 1,1 detik, dan sapuan ini hanya
                menyertainya. Digeser lewat `x`, bukan `left`. */}
            <motion.span
              key={`sapu-${kini.slug}`}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-2/5"
              style={{
                background: `linear-gradient(90deg, transparent, ${meta.glow}14 35%, ${meta.glow}3a 50%, ${meta.glow}14 65%, transparent)`,
                willChange: 'transform',
              }}
              initial={{ x: diam ? '260%' : '-110%' }}
              animate={{ x: '260%' }}
              transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
            />

            <span className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-inset ring-white/10" />

            {/* ---------- pencacah & putar-otomatis ---------- */}
            <div className="absolute right-4 top-4 z-20 flex items-center gap-3 sm:right-5 sm:top-5">
              <span className="font-mono text-[11px] font-bold tabular-nums tracking-widest text-white/70">
                {String(idx + 1).padStart(2, '0')}
                <span className="text-white/30"> / {String(panggung.length).padStart(2, '0')}</span>
              </span>
              <button
                onClick={() => setBerputar((v) => !v)}
                aria-label={berputar ? 'Jeda putar otomatis' : 'Lanjutkan putar otomatis'}
                className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition-colors hover:bg-white/15"
              >
                {/* Cincin kemajuan — dimulai ulang tiap kartu, berhenti saat ditahan. */}
                {berputar && !tertahan && !diam && (
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                    <motion.circle
                      key={`ring-${idx}`}
                      cx="18" cy="18" r="16" fill="none" stroke={meta.glow} strokeWidth="1.8"
                      strokeDasharray={2 * Math.PI * 16}
                      initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: JEDA_PUTAR / 1000, ease: 'linear' }}
                    />
                  </svg>
                )}
                {berputar ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* ---------- panah ---------- */}
            {panggung.length > 1 && ([
              { arah: -1, Icon: ArrowLeft, sisi: 'left-3 sm:left-5', label: 'Destinasi sebelumnya' },
              { arah: 1, Icon: ArrowRight, sisi: 'right-3 sm:right-5', label: 'Destinasi berikutnya' },
            ] as const).map(({ arah, Icon, sisi, label }) => (
              <button
                key={label}
                onClick={() => geser(arah)}
                aria-label={label}
                className={`absolute ${sisi} top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border text-white backdrop-blur transition-transform hover:scale-110 active:scale-95 sm:h-13 sm:w-13`}
                style={{ borderColor: `${meta.glow}77`, backgroundColor: `${meta.glow}2b`, boxShadow: `0 0 32px ${meta.glow}44` }}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}

            {/* ---------- keterangan destinasi ---------- */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7 lg:max-w-[62%]">
              {/* Sengaja tanpa `AnimatePresence`: keterangan cukup dipasang
                  ulang lewat `key`, sehingga stagger-nya terputar dari awal
                  tanpa perlu menunggu animasi keluar anak-anaknya selesai. */}
              <motion.div
                  key={kini.slug}
                  initial="sembunyi"
                  animate="tampil"
                  variants={{ tampil: { transition: { staggerChildren: 0.055, delayChildren: 0.42 } } }}
                >
                  {[
                    <span
                      key="chip"
                      className="inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
                        <IconKini className="h-3 w-3" />
                      </span>
                      {kini.category}
                    </span>,

                    <h2 key="nama" className="mt-3 text-[26px] font-black leading-[1.05] tracking-tight text-white drop-shadow-lg sm:text-[38px] lg:text-[46px]">
                      {kini.name}
                    </h2>,

                    <p key="ringkas" className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-white/70 sm:text-[13.5px]">
                      {kini.shortDesc}
                    </p>,

                    /* Sorotan destinasi. Datanya sudah ada di `highlights` sejak
                       awal — baik dari API maupun direktori statis — tetapi
                       tidak pernah ditampilkan di mana pun pada halaman ini. */
                    kini.highlights.length > 0 ? (
                      <div key="sorot" className="mt-3 flex max-w-xl flex-wrap gap-1.5">
                        {kini.highlights.slice(0, 4).map((h) => (
                          <span
                            key={h}
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold text-white/85 backdrop-blur-sm"
                            style={{ borderColor: `${meta.glow}4d`, backgroundColor: `${meta.glow}14` }}
                          >
                            <Sparkles className="h-2.5 w-2.5" style={{ color: meta.glow }} />
                            {h}
                          </span>
                        ))}
                      </div>
                    ) : <span key="sorot" />,

                    <div key="meta" className="mt-4 grid max-w-xl grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md sm:grid-cols-3">
                      <BarisInfo icon={MapPin} label="Lokasi" glow={meta.glow}>
                        {kini.city || kini.address || '—'}
                      </BarisInfo>
                      <BarisInfo icon={Clock} label="Waktu Tempuh" glow={meta.glow}>
                        {kini.duration ?? 'Belum tersedia'}
                      </BarisInfo>
                      <BarisInfo icon={Route} label="Jarak" glow={meta.glow}>
                        {kini.distanceKm != null
                          ? <><AngkaMerayap nilai={kini.distanceKm} diam={diam} /> km dari terminal</>
                          : 'Belum tersedia'}
                      </BarisInfo>
                    </div>,

                    <div key="aksi" className="mt-4 flex flex-wrap items-center gap-2.5">
                      <motion.button
                        onClick={() => setGaleri(kini)}
                        disabled={kini.gallery.length === 0}
                        whileHover={{ scale: kini.gallery.length ? 1.03 : 1 }}
                        whileTap={{ scale: kini.gallery.length ? 0.97 : 1 }}
                        className="relative inline-flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-full px-7 py-3.5 text-[13.5px] font-black text-[#2a1a02] disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ background: 'linear-gradient(100deg,#f7d488,#e0a53f 45%,#f7d488)' }}
                      >
                        {kini.gallery.length > 0 && !diam && (
                          <motion.span
                            aria-hidden
                            className="absolute inset-y-0 w-1/3 bg-white/45 blur-md"
                            animate={{ x: ['-140%', '340%'] }}
                            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.4 }}
                          />
                        )}
                        <Camera className="relative h-4 w-4" />
                        <span className="relative">
                          {kini.gallery.length > 0 ? `Galeri Foto (${kini.gallery.length})` : 'Galeri Belum Tersedia'}
                        </span>
                      </motion.button>

                      <a
                        href={kini.directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-[12.5px] font-bold text-white transition-colors hover:bg-white/20"
                      >
                        <Navigation className="h-4 w-4" /> Rute ke Sini
                      </a>
                    </div>,
                  ].map((anak, i) => (
                    <motion.div
                      key={i}
                      variants={{ sembunyi: { opacity: 0, y: 22 }, tampil: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {anak}
                    </motion.div>
                  ))}
                </motion.div>
            </div>
          </motion.div>

          {/* ---------- lembar informasi ----------
              Bingkai 21:9 hanya muat untuk kail: nama, ringkasan, dan angka
              tempuh. Keterangan panjang, alamat lengkap, dan seluruh sorotan
              ditaruh di sini supaya terbaca tanpa menyesaki bingkai. Semuanya
              berasal dari data destinasi — tidak ada yang ditambah-tambahkan. */}
          <motion.div
            key={`lembar-${kini.slug}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            className="mt-3 grid grid-cols-1 gap-5 rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-xl lg:grid-cols-[1.6fr_1fr] lg:p-6"
          >
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: meta.glow }}>
                <Landmark className="h-3 w-3" /> Tentang Destinasi
              </p>
              <p className="mt-2.5 text-[13px] leading-[1.75] text-white/75">{kini.description}</p>

              {kini.highlights.length > 0 && (
                <>
                  <p className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: meta.glow }}>
                    <Sparkles className="h-3 w-3" /> Yang Bisa Dinikmati
                  </p>
                  <ul className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {kini.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-white/75">
                        <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: meta.glow }} />
                        {h}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="space-y-3 lg:border-l lg:border-white/10 lg:pl-6">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: meta.glow }}>
                <MapPin className="h-3 w-3" /> Alamat & Tempuh
              </p>
              <p className="text-[12.5px] leading-relaxed text-white/75">{kini.address || kini.city || 'Alamat belum tersedia'}</p>

              <dl className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { k: 'Jarak', v: kini.distanceKm != null ? `${kini.distanceKm} km` : '—' },
                  { k: 'Tempuh', v: kini.duration ?? '—' },
                ].map((d) => (
                  <div key={d.k} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                    <dt className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/40">{d.k}</dt>
                    <dd className="mt-0.5 text-[14px] font-black tabular-nums text-white">{d.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={kini.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-white/15"
                  style={{ borderColor: `${meta.glow}55`, backgroundColor: `${meta.glow}1a` }}
                >
                  <Navigation className="h-3.5 w-3.5" /> Rute dari Bandara
                </a>
                <a
                  href={kini.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-[11.5px] font-bold text-white/85 transition-colors hover:bg-white/15"
                >
                  <MapIcon className="h-3.5 w-3.5" /> Lihat di Peta
                </a>
              </div>

              <p className="pt-1 text-[10.5px] leading-relaxed text-white/35">
                Jarak dan waktu tempuh adalah perkiraan perjalanan darat dari terminal
                pada kondisi lalu lintas normal.
              </p>

              {/* Provenans gambar. Tempatnya di sini, bukan cuma di lencana:
                  pengunjung yang membaca sampai bagian ini berhak tahu persis
                  apa yang sedang ia lihat. */}
              {ilustrasiKini && (
                <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-white/35">
                  <Wand2 className="mt-[3px] h-3 w-3 flex-shrink-0" />
                  <span>
                    Gambar latar destinasi ini adalah ilustrasi yang dibangkitkan AI untuk
                    menggambarkan suasana — <strong className="font-semibold text-white/50">bukan foto tempat aslinya</strong>.
                    Foto resmi akan menggantikannya begitu tersedia.
                  </span>
                </p>
              )}
            </div>
          </motion.div>

          {/* ---------- rol film ---------- */}
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md">
            {/* Lubang sproket di tepi atas dan bawah — penanda visual rol film. */}
            {(['top-1', 'bottom-1'] as const).map((sisi) => (
              <div key={sisi} aria-hidden className={`pointer-events-none absolute ${sisi} inset-x-0 flex justify-between px-2`}>
                {Array.from({ length: 34 }).map((_, i) => (
                  <span key={i} className="h-1 w-2.5 rounded-[1px] bg-white/12" />
                ))}
              </div>
            ))}

            <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-4">
              {panggung.map((s, i) => {
                const on = i === idx;
                const m = TOURISM_CAT_META[s.category];
                const Icon = CAT_ICON[s.category];
                const ilusRol = s.cover ? null : ilustrasiUntuk(s.slug);
                const gambarRol = s.cover || ilusRol;
                return (
                  <motion.button
                    key={s.slug}
                    onClick={() => setAktif(i)}
                    aria-label={`Tampilkan ${s.name}`}
                    aria-current={on}
                    animate={{ width: on ? 168 : 84, opacity: on ? 1 : 0.5 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                    className="relative h-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border"
                    style={{ borderColor: on ? m.glow : 'rgba(255,255,255,0.12)' }}
                  >
                    {gambarRol ? (
                      <img src={gambarRol} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${m.wash}` }}>
                        <Icon className="h-5 w-5 text-white/35" strokeWidth={1.5} />
                      </span>
                    )}
                    {/* Penanda ilustrasi juga di rol film — bingkai kecil ini
                        pun tidak boleh lolos sebagai foto. */}
                    {!s.cover && ilusRol && (
                      <span className="absolute right-1 top-1 rounded-full bg-black/65 p-1 backdrop-blur" title="Ilustrasi AI, bukan foto">
                        <Wand2 className="h-2.5 w-2.5 text-white/70" />
                      </span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                    <AnimatePresence>
                      {on && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-x-2 bottom-1.5 block truncate text-left text-[10px] font-bold text-white"
                        >
                          {s.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ---------- tiga catatan ---------- */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
            className="mt-3 grid grid-cols-1 gap-5 rounded-2xl border border-white/10 bg-black/40 px-6 py-5 backdrop-blur-xl sm:grid-cols-3"
          >
            {CATATAN.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="flex items-start gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-200/10">
                    <Icon className="h-5 w-5 text-amber-300" />
                  </span>
                  <div>
                    <p className="text-[13px] font-black text-white">{c.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/55">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          BABAK III — DIREKTORI
          ================================================================ */}
      <section id="destinasi" className="relative z-10 scroll-mt-20 border-t border-white/10 bg-[#03060f]/80 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> Direktori Destinasi
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Semua Destinasi Terdekat</h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/55">
              Diurutkan dari yang paling dekat dengan terminal. Pilih salah satu untuk menampilkannya di panggung.
            </p>
          </motion.div>

          {/* penyaring */}
          <div className="mt-8 flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:flex-row lg:items-center">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {[{ value: 'all' as const, label: 'Semua', color: '#e0a53f', icon: Sparkles },
                ...TOURISM_CATEGORIES.map((c) => ({ value: c, label: c, color: TOURISM_CAT_META[c].color, icon: CAT_ICON[c] })),
              ].map((c) => {
                const Icon = c.icon;
                const on = cat === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => pilihKategori(c.value)}
                    className={`relative flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold transition-colors ${on ? 'text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    {on && (
                      <motion.span
                        layoutId="tourism-filter"
                        className="absolute inset-0 rounded-xl"
                        style={{ backgroundColor: c.color }}
                        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                      />
                    )}
                    <Icon className="relative h-4 w-4" />
                    <span className="relative whitespace-nowrap">{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative flex-shrink-0 lg:w-64">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={q}
                onChange={(e) => ubahCari(e.target.value)}
                placeholder="Cari destinasi..."
                className="w-full rounded-xl border border-white/12 bg-white/5 py-2.5 pl-10 pr-3 text-[12.5px] text-white transition-colors placeholder:text-white/35 focus:border-amber-300/60 focus:outline-none"
              />
            </div>
          </div>

          {daftar.length === 0 ? (
            <p className="py-16 text-center text-[13.5px] text-white/50">
              Tidak ada destinasi yang cocok dengan pencarian Anda.
            </p>
          ) : (
            <div
              ref={kisiRef}
              onPointerMove={onKisiMove}
              className="group/kisi relative mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {/* Sorot yang mengikuti kursor di atas seluruh kisi. */}
              {!diam && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover/kisi:opacity-100"
                  style={{
                    background: `radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), ${meta.glow}22, transparent 70%)`,
                  }}
                />
              )}

              {daftar.map((spot, i) => {
                const m = TOURISM_CAT_META[spot.category];
                const Icon = CAT_ICON[spot.category];
                const terpilih = spot.slug === kini.slug;
                /* Foto asli menang; ilustrasi hanya mengisi kekosongan, dan
                   selalu ditandai. Plat kategori sengaja TIDAK dipakai di sini
                   — sepuluh kartu berbagi lima plat akan tampak seperti foto
                   yang keliru dipasang. */
                const ilus = spot.cover ? null : ilustrasiUntuk(spot.slug);
                const gambarKartu = spot.cover || ilus;
                return (
                  <motion.button
                    key={spot.slug}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.55, delay: (i % 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -7 }}
                    onClick={() => {
                      setAktif(i);
                      document.getElementById('panggung')?.scrollIntoView({ behavior: diam ? 'auto' : 'smooth', block: 'start' });
                    }}
                    className="group relative z-10 h-56 cursor-pointer overflow-hidden rounded-2xl border text-left"
                    style={{ borderColor: terpilih ? m.glow : 'rgba(255,255,255,0.1)' }}
                  >
                    {gambarKartu ? (
                      /* `lazy`: kisi ini ada di bawah lipatan dan berisi
                         sepuluh ilustrasi berukuran ±100 KB. Tanpa penundaan,
                         membuka halaman berarti menarik seluruh megabyte-nya
                         sekaligus padahal pengunjung mungkin tak pernah
                         menggulir sampai sini. */
                      <img
                        src={gambarKartu}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      /* Tanpa sampul maupun ilustrasi, kartu hanya diberi
                         lapisan warna kategori — bukan gambar pengganti yang
                         bisa disangka foto destinasinya. */
                      <span className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${m.wash}, #03060f)` }}>
                        <Icon className="absolute inset-0 m-auto h-12 w-12 text-white/20" strokeWidth={1} />
                      </span>
                    )}
                    {!spot.cover && (
                      <span className="absolute inset-x-0 bottom-14 z-10 flex items-center justify-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/40">
                        {ilus ? <Wand2 className="h-2.5 w-2.5" /> : <ImageOff className="h-2.5 w-2.5" />}
                        {ilus ? 'Ilustrasi AI' : 'Foto belum tersedia'}
                      </span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-[#03060f] via-[#03060f]/45 to-[#03060f]/10" />

                    <span
                      className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      {spot.category}
                    </span>
                    {spot.distanceKm != null && (
                      <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold tabular-nums text-white/85">
                        {spot.distanceKm} km
                      </span>
                    )}

                    <span className="absolute inset-x-4 bottom-4">
                      <span className="block text-[14.5px] font-black leading-snug text-white">{spot.name}</span>
                      <span className="mt-0.5 block text-[11px] text-white/55">{spot.city}</span>
                    </span>
                    <span
                      className="absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-500 group-hover:w-full"
                      style={{ backgroundColor: m.glow, width: terpilih ? '100%' : undefined }}
                    />
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/tenants" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[13.5px] font-bold text-[#0b1e5b] transition-colors hover:bg-amber-100">
              Transportasi Resmi Bandara <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/facilities" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-5 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-white/15">
              Fasilitas Terminal
            </Link>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-[11.5px] leading-relaxed text-white/40">
            Jarak dan waktu tempuh adalah perkiraan perjalanan darat dalam kondisi lalu lintas normal.
            Pastikan Anda kembali ke terminal minimal 90 menit sebelum jadwal keberangkatan.
          </p>

          {/* Penutup. Footer portal tidak dirender di rute ini, jadi jalan
              kembali ke portal harus disediakan di sini juga — pengunjung yang
              menggulir sampai dasar tidak boleh menemui jalan buntu. */}
          <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/10 pt-7 sm:flex-row sm:justify-between">
            <Link href="/" className="group inline-flex items-center gap-2.5 text-white/55 transition-colors hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <img src="/logo-white-apt.svg" alt="" className="h-5 w-auto opacity-70" />
              <span className="text-[12px] font-bold">Kembali ke Portal APT Pranoto</span>
            </Link>
            <p className="text-[11px] text-white/30">
              Bandar Udara Aji Pangeran Tumenggung Pranoto — Samarinda
            </p>
          </div>
        </div>
      </section>

      {/* ============ GALERI FOTO ============ */}
      <AnimatePresence>
        {galeri && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#03060f]/95 backdrop-blur-xl"
            onClick={() => setGaleri(null)}
          >
            <div className="flex min-h-full flex-col items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex w-full max-w-5xl items-center justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
                    <Images className="h-3.5 w-3.5" /> Galeri Foto
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white">{galeri.name}</h3>
                </div>
                <button
                  onClick={() => setGaleri(null)}
                  aria-label="Tutup galeri"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/8 text-white transition-colors hover:bg-white/15"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-3">
                {galeri.gallery.map((src, i) => (
                  <motion.button
                    key={src}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setLightbox({ src, title: galeri.name, desc: galeri.city })}
                    className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-white/10"
                  >
                    <img src={src} alt={`${galeri.name} — foto ${i + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <span className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
