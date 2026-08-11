'use client';

/**
 * Portal Aplikasi — pintu masuk sistem kedinasan pegawai.
 *
 * Sebelum halaman ini ada, alamat SIKEREN/PAS/TIM hanya terselip di dropdown
 * "Layanan" bersama layanan untuk penumpang, sementara Guma dan FIDS tidak
 * terdaftar di mana pun.
 *
 * ── Halaman ini berbeda dari halaman publik lain ──────────────────────
 * Tanpa navbar dan footer (lihat `lib/layoutChrome.ts`), setinggi tepat satu
 * layar, dan tidak menggulir. Karena chrome bersama ikut hilang, jalan pulang
 * ke portal disediakan sendiri pada bilah bawah — tanpa itu pengunjung
 * terkurung di halaman ini.
 *
 * Ukuran orbit DIUKUR, bukan dipersentasekan. Percobaan sebelumnya memakai
 * persen dari kotak dan labelnya menabrak kolom kiri/kanan begitu lebar
 * layar berubah. Sekarang jari-jarinya diturunkan dari ruang yang benar-benar
 * tersisa — lebar dikurangi (simpul + jarak + label), tinggi dikurangi simpul
 * — sehingga label mustahil keluar kotak pada ukuran layar mana pun.
 *
 * ── Gerak ─────────────────────────────────────────────────────────────
 * Konsepnya "pusat kendali digital": inti (lambang bandara) → cincin orbit →
 * simpul aplikasi → aliran data → sistem terhubung. Saat halaman dibuka,
 * lapisannya menyala berurutan seperti sistem yang melakukan inisialisasi;
 * setelah itu semuanya turun menjadi gerak menerus yang sangat pelan.
 * Seluruh irama diatur dari `./motion.ts`, bukan angka yang berserak di sini.
 *
 * Orbit hanya tampil di `xl` ke atas; di bawah itu daftarnya turun menjadi
 * ubin ringkas yang muat satu layar tanpa gulir.
 *
 * Datanya di `lib/employeeApps.ts`, lengkap dengan provenans tiap keterangan.
 * Halaman ini TIDAK menampilkan angka yang tidak dapat dihitung dari data itu
 * (jumlah pengguna, uptime, dan sejenisnya) — lihat aturan seeder di CLAUDE.md.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  motion, useMotionValue, useReducedMotion, useSpring,
} from 'framer-motion';
import SkyParticles from '@/components/effects/SkyParticles';
import PlaneCursor from '@/components/effects/PlaneCursor';
import CometField from '@/components/effects/CometField';
import { EMPLOYEE_APPS, TOTAL_EMPLOYEE_APPS, type EmployeeApp } from '@/lib/employeeApps';
import { hostOf } from '@/lib/url';
import {
  BOOT, EASE_ENTER, CORE_BREATH, RING_SPIN, AIRCRAFT_ORBIT,
  NODE_PULSE_DELAY, NODE_PULSE_DURATION, NODE_FLOAT_DURATION,
  DATA_TRIP, dataFlowsInward, GRID_DRIFT, GLOW_DRIFT, STATUS_CYCLE,
  DIMMED_OPACITY, HOVER_DURATION, COUNT_UP_MS,
} from './motion';
import {
  Wallet, CircuitBoard, IdCard, MonitorPlay, SquarePen,
  Plane, ArrowUpRight, ArrowRight, Clock, KeyRound, LayoutGrid,
  ExternalLink, LogIn, Home,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Ukuran tetap yang dipakai rumus jari-jari orbit                    */
/* ------------------------------------------------------------------ */
const NODE_R = 36;      // jari-jari lingkaran simpul (simpul = 72px)
const LABEL_W = 158;    // lebar blok label melayang
const LABEL_GAP = 14;   // jarak simpul ke label
const EDGE_PAD = 12;    // sisa napas ke tepi kotak

/** Batas jari-jari orbit. Bawah menjaga label tetangga tidak bertumpuk. */
const R_MIN = 140;
const R_MAX = 268;

/**
 * Sudut tiap simpul (derajat, 0 = kanan, searah jarum jam).
 *
 * 02 dan 05 di ±20°, bukan ±26°: pada sudut yang lebih curam blok labelnya
 * naik terlalu dekat ke label 01 di puncak dan kedua teks saling menyerempet.
 * Jarak vertikal antar-label = 0,658 × jari-jari, jadi `R_MIN` 140 menyisakan
 * ±92px — pas dua kali setengah tinggi label.
 */
const NODE_ANGLES = [-90, -20, 42, 138, -160];

/**
 * Warna aksen per aplikasi, dan ikon cadangan.
 *
 * Ikonnya hanya dipakai untuk aplikasi yang belum punya lambang resmi di
 * `EmployeeApp.logo`; SIKEREN dan Guma sudah punya, jadi entri ikonnya
 * bertahan sebagai jaring pengaman bila berkas gambarnya gagal dimuat.
 * Warnanya hiasan, tidak menambah makna pada datanya.
 */
const APP_META: Record<string, { icon: typeof Wallet; accent: string }> = {
  sikeren: { icon: Wallet, accent: '#38bdf8' },
  elbandaap: { icon: CircuitBoard, accent: '#a78bfa' },
  pas: { icon: IdCard, accent: '#34d399' },
  fids: { icon: MonitorPlay, accent: '#fbbf24' },
  'portal-cms': { icon: SquarePen, accent: '#22d3ee' },
};

const metaOf = (slug: string) => APP_META[slug] ?? { icon: Plane, accent: '#38bdf8' };

/** Alamat yang ditampilkan: host untuk tautan luar, lintasan apa adanya untuk internal. */
const addressOf = (app: EmployeeApp) => (app.external ? hostOf(app.url) : app.url);

/* ------------------------------------------------------------------ */
/*  Angka menghitung naik saat boot                                    */
/*                                                                     */
/*  Sekali jalan, lalu berhenti pada nilai sebenarnya. Memakai rAF      */
/*  supaya tidak menimbulkan render per milidetik lewat setInterval,    */
/*  dan dibersihkan saat komponen dilepas.                              */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, delayMs: number, enabled: boolean): number {
  // Yang disimpan kemajuan 0–1, bukan angkanya. Dengan begitu mematikan
  // animasi cukup dengan mengembalikan nilai penuh saat membaca — tanpa
  // memanggil setState di dalam badan efek.
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let mulai = 0;
    const langkah = (t: number) => {
      if (!mulai) mulai = t;
      const p = Math.min(1, (t - mulai) / COUNT_UP_MS);
      setProgress(1 - Math.pow(1 - p, 3)); // easeOutCubic
      if (p < 1) raf = requestAnimationFrame(langkah);
    };

    const timer = window.setTimeout(() => { raf = requestAnimationFrame(langkah); }, delayMs);
    return () => { window.clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [delayMs, enabled]);

  return enabled ? Math.round(target * progress) : target;
}

/* ------------------------------------------------------------------ */
/*  Pembungkus tautan                                                  */
/*                                                                     */
/*  Empat aplikasi berada di luar portal, satu di dalam. Bedanya bukan  */
/*  kosmetik: `next/link` melakukan navigasi klien, `<a target=_blank>` */
/*  membuka tab baru. Dipusatkan di sini agar tidak salah pilih.        */
/* ------------------------------------------------------------------ */
function AppLink({
  app, className, children, ...rest
}: { app: EmployeeApp; className?: string; children: React.ReactNode }
  & { 'aria-label'?: string; onPointerEnter?: () => void; onPointerLeave?: () => void;
      onFocus?: () => void; onBlur?: () => void }) {
  if (app.external) {
    return (
      <a href={app.url} target="_blank" rel="noreferrer" className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={app.url} className={className} {...rest}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Satu simpul orbit                                                  */
/* ------------------------------------------------------------------ */
function OrbitNode({
  app, index, cx, cy, side, aktif, onSorot,
}: {
  app: EmployeeApp; index: number; cx: number; cy: number; side: 'left' | 'right';
  /** null = tidak ada yang disorot, true = simpul ini, false = simpul lain. */
  aktif: boolean | null;
  onSorot: (index: number | null) => void;
}) {
  const { icon: Icon, accent } = metaOf(app.slug);
  const reduced = useReducedMotion();

  const disorot = aktif === true;
  const diredupkan = aktif === false;

  const sorotOn = () => onSorot(index);
  const sorotOff = () => onSorot(null);

  return (
    <motion.div
      className="absolute"
      style={{ left: cx, top: cy }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{
        opacity: diredupkan ? DIMMED_OPACITY : 1,
        scale: 1,
      }}
      transition={{
        opacity: { duration: HOVER_DURATION, ease: 'easeOut' },
        scale: {
          delay: BOOT.nodes + index * BOOT.nodeStep,
          type: 'spring', stiffness: 210, damping: 20,
        },
        default: { delay: BOOT.nodes + index * BOOT.nodeStep, duration: 0.5 },
      }}
    >
      {/* Ayunan diam sangat pelan, beda fase tiap simpul — orbit yang benar-benar
          beku terlihat seperti gambar mati. Berhenti saat simpul disorot supaya
          sasaran klik tidak bergerak di bawah kursor. */}
      <motion.div
        className="relative -translate-x-1/2 -translate-y-1/2"
        animate={reduced || disorot ? { y: 0 } : { y: [0, -6, 0] }}
        transition={{
          duration: NODE_FLOAT_DURATION + index * 0.7,
          repeat: disorot ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Denyut halus: skala dan cahaya naik-turun dengan jeda berbeda tiap
            simpul. Saat disorot, denyut diganti pembesaran tetap. */}
        <motion.div
          animate={
            reduced ? { scale: 1 }
              : disorot ? { scale: 1.05 }
                : { scale: [1, 1.03, 1] }
          }
          transition={
            disorot || reduced
              ? { duration: HOVER_DURATION, ease: 'easeOut' }
              : {
                duration: NODE_PULSE_DURATION,
                repeat: Infinity,
                delay: BOOT.idle + NODE_PULSE_DELAY[index],
                ease: 'easeInOut',
              }
          }
        >
          <AppLink
            app={app}
            aria-label={`Buka ${app.name}${app.external ? ' di tab baru' : ''}`}
            onPointerEnter={sorotOn}
            onPointerLeave={sorotOff}
            onFocus={sorotOn}
            onBlur={sorotOff}
            className="group relative block w-[72px] h-[72px] rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/50"
          >
            <span
              className="absolute -inset-3 rounded-full blur-xl transition-opacity duration-300"
              style={{ backgroundColor: accent, opacity: disorot ? 1 : 0.4 }}
              aria-hidden="true"
            />
            <span
              className="absolute inset-0 rounded-full ring-1 transition-transform duration-300"
              style={{
                boxShadow: `inset 0 0 22px ${accent}${disorot ? '99' : '55'}`,
                ['--tw-ring-color' as string]: `${accent}${disorot ? 'cc' : '80'}`,
                transform: disorot ? 'scale(1.1)' : 'scale(1)',
              }}
              aria-hidden="true"
            />
            <span className="absolute inset-[7px] rounded-full bg-[#0a1633]/90 ring-1 ring-white/15 backdrop-blur-sm overflow-hidden flex items-center justify-center">
              {app.logo ? (
                /* Lambang resmi menggantikan ikon generik. `cover` mengisi
                   penuh lingkaran (ikon persegi berlatar padat), `contain`
                   disisakan napas supaya lambang beralfa tidak menyentuh tepi. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={app.logo.src}
                  alt=""
                  aria-hidden="true"
                  className={`transition-transform duration-300 ${
                    app.logo.fit === 'cover'
                      ? 'w-full h-full object-cover'
                      : 'w-[78%] h-[78%] object-contain'
                  }`}
                  style={{ transform: disorot ? 'scale(1.08)' : 'scale(1)' }}
                />
              ) : (
                <Icon
                  className="w-7 h-7 transition-all duration-300"
                  style={{ color: accent, transform: disorot ? 'scale(1.12)' : 'scale(1)', filter: disorot ? 'brightness(1.25)' : 'none' }}
                />
              )}
            </span>
          </AppLink>
        </motion.div>

        {/* riak radar di belakang simpul */}
        {!reduced && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border pointer-events-none"
            style={{ borderColor: `${accent}70` }}
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{
              duration: NODE_PULSE_DURATION,
              repeat: Infinity,
              delay: BOOT.idle + NODE_PULSE_DELAY[index],
              ease: 'easeOut',
            }}
          />
        )}

        {/* label melayang ke sisi luar orbit */}
        <motion.div
          className={`absolute top-1/2 -translate-y-1/2 ${
            side === 'right' ? 'left-[calc(100%+14px)]' : 'right-[calc(100%+14px)] text-right'
          }`}
          style={{ width: LABEL_W }}
          initial={{ opacity: 0, x: side === 'right' ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: BOOT.nodes + 0.2 + index * BOOT.nodeStep, duration: 0.45, ease: EASE_ENTER }}
        >
          <p
            className="text-[14px] font-black tracking-wide uppercase leading-tight transition-colors duration-300"
            style={{ color: disorot ? accent : '#ffffff' }}
          >
            {app.name}
          </p>
          <p className="mt-0.5 text-[10.5px] font-mono text-slate-400 truncate">{addressOf(app)}</p>
          {/* Dipangkas dua baris: keterangan utuh membuat blok label setinggi
              ±130px dan sudut-sudutnya menyerempet label tetangga. Teks
              lengkapnya tetap tampil pada ubin di layar sempit. */}
          <p
            className="mt-1 text-[11px] leading-snug line-clamp-2 transition-colors duration-300"
            style={{ color: disorot ? 'rgb(203 213 225)' : 'rgb(148 163 184 / 0.8)' }}
          >
            {app.description}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Diagram orbit                                                      */
/* ------------------------------------------------------------------ */
function OrbitDiagram() {
  const reduced = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [sorot, setSorot] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setBox({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Parallax halus mengikuti kursor; diredam pegas supaya tidak menyentak. */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const ty = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });

  const geom = useMemo(() => {
    const { w, h } = box;
    if (!w || !h) return null;

    // Jari-jari terbesar yang masih menyisakan ruang untuk label dan simpul.
    const byWidth = w / 2 - (NODE_R + LABEL_GAP + LABEL_W);
    const byHeight = h / 2 - (NODE_R + EDGE_PAD);
    const R = Math.min(R_MAX, Math.max(R_MIN, Math.min(byWidth, byHeight)));
    if (byWidth < R_MIN || byHeight < R_MIN) return null;

    const cx = w / 2;
    const cy = h / 2;
    const disc = Math.min(250, Math.max(120, 2 * (R - NODE_R - 22)));

    const nodes = NODE_ANGLES.map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      return {
        x: cx + R * dx,
        y: cy + R * dy,
        // pangkal & ujung garis penghubung, dipotong di tepi cakram dan simpul
        inti: { x: cx + (disc / 2 + 10) * dx, y: cy + (disc / 2 + 10) * dy },
        simpul: { x: cx + (R - NODE_R - 8) * dx, y: cy + (R - NODE_R - 8) * dy },
        side: (dx < -0.05 ? 'left' : 'right') as 'left' | 'right',
      };
    });

    // Ketiga cincin orbit, dari dalam ke luar. Putarannya di `RING_SPIN`.
    const rings = [
      { r: R * 0.80, dash: '2 26', stroke: 'rgba(125,211,252,0.16)', width: 1 },
      { r: R, dash: '4 13', stroke: 'rgba(125,211,252,0.30)', width: 1.4 },
      { r: R * 1.17, dash: '3 34', stroke: 'rgba(125,211,252,0.14)', width: 1 },
    ];

    return { w, h, cx, cy, R, disc, nodes, rings };
  }, [box]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || !geom) return;
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    px.set(((e.clientX - r.left) / r.width - 0.5) * 26);
    py.set(((e.clientY - r.top) / r.height - 0.5) * 18);
  };
  const onLeave = () => { px.set(0); py.set(0); };

  const adaSorot = sorot !== null;

  return (
    <div
      ref={boxRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative w-full h-full"
    >
      {geom && (
        <motion.div className="absolute inset-0" style={reduced ? undefined : { x: tx, y: ty }}>
          {/* ---- cincin, garis penghubung, paket data ---- */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox={`0 0 ${geom.w} ${geom.h}`}
            fill="none"
            aria-hidden="true"
          >
            {/* Tiga cincin orbit. Masing-masing berputar dengan kecepatan dan
                arah berbeda; sumbu putarnya dikunci ke titik pusat lewat
                transform-origin dalam koordinat viewBox. */}
            {geom.rings.map((ring, i) => (
              <motion.g
                key={`ring-${i}`}
                style={{ transformOrigin: `${geom.cx}px ${geom.cy}px`, transformBox: 'view-box' }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={
                  reduced
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 1, scale: 1, rotate: RING_SPIN[i].deg }
                }
                transition={{
                  opacity: { delay: BOOT.rings[i], duration: 0.7, ease: EASE_ENTER },
                  scale: { delay: BOOT.rings[i], duration: 0.7, ease: EASE_ENTER },
                  rotate: { duration: RING_SPIN[i].duration, repeat: Infinity, ease: 'linear' },
                }}
              >
                <circle
                  cx={geom.cx} cy={geom.cy} r={ring.r}
                  stroke={ring.stroke} strokeWidth={ring.width} strokeDasharray={ring.dash}
                />
                {/* satu busur terang per cincin — penanda arah putaran */}
                <circle
                  cx={geom.cx} cy={geom.cy} r={ring.r}
                  stroke={i === 1 ? 'rgba(56,189,248,0.5)' : 'rgba(167,139,250,0.32)'}
                  strokeWidth={ring.width + 0.6}
                  strokeLinecap="round"
                  strokeDasharray={`${ring.r * 0.42} ${ring.r * 9}`}
                />
              </motion.g>
            ))}

            {/* garis pusat ↔ simpul, digambar berurutan */}
            {geom.nodes.map((n, i) => {
              const accent = metaOf(EMPLOYEE_APPS[i].slug).accent;
              const aktif = sorot === i;
              return (
                <motion.line
                  key={`l-${i}`}
                  x1={n.inti.x} y1={n.inti.y} x2={n.simpul.x} y2={n.simpul.y}
                  stroke={accent}
                  strokeWidth={aktif ? 1.8 : 1.2}
                  strokeDasharray="2 6"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: aktif ? 0.85 : adaSorot ? 0.16 : 0.34 }}
                  transition={{
                    pathLength: { delay: BOOT.lines + i * 0.1, duration: 0.6, ease: EASE_ENTER },
                    opacity: { duration: HOVER_DURATION, ease: 'easeOut' },
                  }}
                />
              );
            })}

            {/* Paket data. Arah berselang-seling: simpul ganjil mengirim ke
                inti, genap menerima — supaya terbaca sebagai komunikasi dua
                arah, bukan siaran satu arah. Melaju lebih cepat saat disorot. */}
            {!reduced && geom.nodes.map((n, i) => {
              const accent = metaOf(EMPLOYEE_APPS[i].slug).accent;
              const aktif = sorot === i;
              const masuk = dataFlowsInward(i);
              const dari = masuk ? n.simpul : n.inti;
              const ke = masuk ? n.inti : n.simpul;
              return (
                <motion.circle
                  key={`d-${i}`}
                  r={aktif ? 3.2 : 2.4}
                  fill={accent}
                  initial={{ cx: dari.x, cy: dari.y, opacity: 0 }}
                  animate={{
                    cx: [dari.x, ke.x],
                    cy: [dari.y, ke.y],
                    opacity: aktif ? [0, 1, 0] : [0, 0.75, 0],
                  }}
                  transition={{
                    duration: aktif ? DATA_TRIP.active : DATA_TRIP.idle,
                    repeat: Infinity,
                    delay: aktif ? 0 : BOOT.idle + i * DATA_TRIP.step,
                    ease: 'easeInOut',
                    times: [0, 0.5, 1],
                  }}
                />
              );
            })}
          </svg>

          {/* ---- sapuan radar ---- */}
          {!reduced && (
            <motion.div
              aria-hidden="true"
              className="absolute rounded-full pointer-events-none"
              style={{
                width: geom.R * 2, height: geom.R * 2,
                left: geom.cx - geom.R, top: geom.cy - geom.R,
                background:
                  'conic-gradient(from 0deg, rgba(56,189,248,0) 0deg, rgba(56,189,248,0.12) 34deg, rgba(56,189,248,0) 62deg)',
                maskImage: 'radial-gradient(circle, transparent 34%, black 60%, transparent 99%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 34%, black 60%, transparent 99%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              transition={{
                opacity: { delay: BOOT.rings[1], duration: 0.9 },
                rotate: { duration: RING_SPIN[0].duration / 3, repeat: Infinity, ease: 'linear' },
              }}
            />
          )}

          {/* ---- pesawat menyusuri cincin terluar ---- */}
          {!reduced && (
            <motion.div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                width: geom.R * 2.34, height: geom.R * 2.34,
                left: geom.cx - geom.R * 1.17, top: geom.cy - geom.R * 1.17,
              }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              transition={{
                opacity: { delay: BOOT.rings[2], duration: 0.9 },
                rotate: { duration: AIRCRAFT_ORBIT, repeat: Infinity, ease: 'linear' },
              }}
            >
              <Plane className="absolute left-1/2 -top-[9px] -translate-x-1/2 w-[18px] h-[18px] text-sky-300/80 rotate-90" />
            </motion.div>
          )}

          {/* ---- inti: lambang bandara ---- */}
          <motion.div
            className="absolute"
            style={{
              width: geom.disc, height: geom.disc,
              left: geom.cx - geom.disc / 2, top: geom.cy - geom.disc / 2,
            }}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: BOOT.core, duration: 0.85, ease: EASE_ENTER }}
          >
            {/* riak berkala dari inti */}
            {!reduced && [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-sky-400/40"
                animate={{ scale: [1, 1.55], opacity: [0.45, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: BOOT.idle + i * 1.5, ease: 'easeOut' }}
              />
            ))}

            {/* Tanggapan inti saat sebuah simpul disorot: satu denyut cincin,
                bukan perubahan bentuk. Inti tidak pernah berputar. */}
            <motion.span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full border border-sky-300/50"
              animate={{
                scale: adaSorot ? [1, 1.1, 1.04] : 1,
                opacity: adaSorot ? [0.7, 0.35, 0.5] : 0,
              }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
            />

            {/* Napas inti: cahaya latar naik-turun sangat pelan, dan menguat
                sedikit saat ada simpul yang disorot. */}
            <motion.span
              className="absolute -inset-10 rounded-full bg-sky-500/20 blur-3xl"
              aria-hidden="true"
              animate={
                reduced ? { opacity: 0.8 }
                  : adaSorot ? { opacity: 1.15, scale: 1.08 }
                    : { opacity: [0.62, 1, 0.62], scale: CORE_BREATH.scale }
              }
              transition={
                adaSorot || reduced
                  ? { duration: HOVER_DURATION, ease: 'easeOut' }
                  : { duration: CORE_BREATH.duration * 1.3, repeat: Infinity, ease: 'easeInOut' }
              }
            />

            {/* Cakram inti bernapas: skala 1 → 1,025. Tidak berputar, tidak
                memantul — hanya tanda bahwa sistem menyala. */}
            <motion.span
              className="absolute inset-0 rounded-full bg-gradient-to-b from-[#123a8f] to-[#071539] ring-1 ring-sky-400/40 shadow-[0_0_80px_rgba(56,189,248,0.35)]"
              aria-hidden="true"
              animate={reduced ? { scale: 1 } : { scale: CORE_BREATH.scale }}
              transition={{ duration: CORE_BREATH.duration, repeat: Infinity, ease: 'easeInOut', delay: BOOT.idle }}
            />
            <span className="absolute inset-[7%] rounded-full ring-1 ring-white/10" aria-hidden="true" />

            <motion.span
              className="absolute inset-0 flex items-center justify-center p-[19%]"
              animate={reduced ? { opacity: 1 } : { opacity: [0.88, 1, 0.88] }}
              transition={{ duration: CORE_BREATH.duration, repeat: Infinity, ease: 'easeInOut', delay: BOOT.idle }}
            >
              {/* Proyek ini memakai <img> polos di mana-mana (lihat Navbar &
                  Footer); next/image belum dipakai sama sekali. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mini-apt.svg"
                alt="Lambang Bandar Udara APT Pranoto Samarinda"
                className="w-full h-full object-contain drop-shadow-[0_0_18px_rgba(56,189,248,0.5)]"
              />
            </motion.span>
          </motion.div>

          {/* ---- lima simpul ---- */}
          {EMPLOYEE_APPS.map((app, i) => (
            <OrbitNode
              key={app.slug}
              app={app}
              index={i}
              cx={geom.nodes[i].x}
              cy={geom.nodes[i].y}
              side={geom.nodes[i].side}
              aktif={sorot === null ? null : sorot === i}
              onSorot={setSorot}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ubin ringkas (layar sempit)                                        */
/* ------------------------------------------------------------------ */
function AppTile({ app, index }: { app: EmployeeApp; index: number }) {
  const { icon: Icon, accent } = metaOf(app.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: BOOT.nodes * 0.55 + index * BOOT.nodeStep, duration: 0.45, ease: EASE_ENTER }}
      className={index === EMPLOYEE_APPS.length - 1 ? 'col-span-2' : ''}
    >
      <AppLink
        app={app}
        aria-label={`Buka ${app.name}${app.external ? ' di tab baru' : ''}`}
        className="group relative flex items-center gap-3 h-full rounded-2xl bg-white/[0.04] ring-1 ring-white/10 hover:ring-white/25 hover:bg-white/[0.08] p-3 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/50"
      >
        <span className="relative w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center">
          <span
            className="absolute inset-0 rounded-xl opacity-25 blur-md group-hover:opacity-50 transition-opacity duration-300"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <span className="absolute inset-0 rounded-xl ring-1 ring-white/15 bg-[#0a1633]/90" aria-hidden="true" />
          {app.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={app.logo.src}
              alt=""
              aria-hidden="true"
              className={`relative group-hover:scale-110 transition-transform duration-300 ${
                app.logo.fit === 'cover'
                  ? 'w-full h-full object-cover rounded-xl'
                  : 'w-[74%] h-[74%] object-contain'
              }`}
            />
          ) : (
            <Icon
              className="relative w-5 h-5 group-hover:scale-110 transition-transform duration-300"
              style={{ color: accent }}
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-black text-white uppercase tracking-wide truncate">
              {app.name}
            </span>
            {app.external
              ? <ExternalLink className="w-3 h-3 text-slate-500 flex-shrink-0" />
              : <ArrowUpRight className="w-3 h-3 text-slate-500 flex-shrink-0" />}
          </span>
          <span className="block mt-0.5 text-[10px] font-mono text-slate-500 truncate">
            {addressOf(app)}
          </span>
        </span>
      </AppLink>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

/** Judul yang masuk kata demi kata dari kabur ke tajam. */
function BlurWords({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="inline-block"
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: delay + i * BOOT.headlineWord, duration: 0.6, ease: EASE_ENTER }}
        >
          {w}&nbsp;
        </motion.span>
      ))}
    </span>
  );
}

const STATUS_LABEL = ['Terintegrasi', 'Terhubung', 'Satu Pintu'];

export default function AplikasiView() {
  const reduced = useReducedMotion();
  const [clock, setClock] = useState('--:--');

  /* Jam WITA berjalan — panel status tanpa jam terasa mati.
     Sama seperti navbar: satu menit sekali sudah cukup untuk format HH:mm. */
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar',
      }));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  /* Kunci gulir dokumen selama halaman ini terbuka. Tinggi isinya sudah
     dikunci satu layar; tanpa ini sebagian peramban tetap menyisakan bilah
     gulir setinggi beberapa piksel akibat pembulatan `dvh`. */
  useEffect(() => {
    const html = document.documentElement;
    const sebelumnya = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = sebelumnya; };
  }, []);

  // Angka pada panel dihitung dari data, bukan diketik manual — supaya tidak
  // pernah menyimpang saat daftarnya berubah. Yang dianimasikan hanya cara
  // angkanya muncul; nilai akhirnya tetap nilai sebenarnya.
  const externalCount = EMPLOYEE_APPS.filter((a) => a.external).length;
  const jumlahAplikasi = useCountUp(TOTAL_EMPLOYEE_APPS, BOOT.panel * 1000, !reduced);
  const jumlahEksternal = useCountUp(externalCount, (BOOT.panel + BOOT.panelRow) * 1000, !reduced);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#040b22]">
      {/* Kursor pesawat. Menempel pada halaman ini saja, dan menonaktifkan
          dirinya sendiri pada layar sentuh maupun `prefers-reduced-motion`. */}
      <PlaneCursor />

      {/* ============ LATAR ============ */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#040b22] via-[#071539] to-[#0a1f52]"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 opacity-[0.55]" aria-hidden="true">
        <SkyParticles tone="sky" />
      </div>

      {/* Komet lewat. Ditaruh di antara latar dan konten — melintas di
          belakang orbit dan panel, bukan menutupi teks. Kanvasnya tidak
          menerima klik sama sekali. */}
      <CometField />

      {/* Kisi digital yang hanyut sangat pelan. Dibuat lebih besar dari layar
          lalu digeser dengan transform, bukan `background-position`, supaya
          tidak memicu penataan ulang. */}
      <motion.div
        className="absolute -inset-24 opacity-[0.06] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, #7dd3fc 1px, transparent 1px), linear-gradient(to bottom, #7dd3fc 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent)',
        }}
        animate={reduced ? undefined : { x: [0, 32, 0], y: [0, -24, 0] }}
        transition={{ duration: GRID_DRIFT, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        aria-hidden="true"
        className="absolute -top-52 left-1/3 w-[62rem] h-[42rem] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none"
        animate={reduced ? undefined : { x: [0, 60, 0], y: [0, 26, 0] }}
        transition={{ duration: GLOW_DRIFT[0], repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -bottom-64 -left-32 w-[40rem] h-[40rem] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none"
        animate={reduced ? undefined : { x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: GLOW_DRIFT[1], repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ============ ISI SATU LAYAR ============
           `overflow-y-auto` di bawah `xl` adalah katup pengaman: pada ponsel
           mendatar yang sangat pendek, isinya tetap dapat dijangkau alih-alih
           terpotong permanen. Di `xl` ke atas benar-benar tanpa gulir. */}
      <div className="relative h-full flex flex-col overflow-y-auto xl:overflow-hidden px-4 sm:px-6 lg:px-9 py-4 lg:py-5">
        {/* ---- bilah atas ---- */}
        <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-3.5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: BOOT.logo, duration: 0.6, ease: EASE_ENTER }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-white-apt.svg"
                alt="Bandar Udara APT Pranoto Samarinda"
                className="h-8 lg:h-9 w-auto"
              />
            </motion.div>

            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: BOOT.eyebrow, duration: 0.55, ease: EASE_ENTER }}
              className="hidden sm:flex items-center gap-2.5 pl-3.5 border-l border-white/15 text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-300"
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.7)]"
                animate={reduced ? undefined : { opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: BOOT.idle }}
              />
              Aplikasi Internal
            </motion.span>
          </div>

          {/* Sengaja BUKAN sapaan "selamat datang, pegawai": halaman ini publik
              dan tidak tahu siapa yang membukanya. Yang ditawarkan pintu masuk
              pengelolaan portal, satu-satunya sistem di daftar ini yang
              login-nya memang berada di dalam portal. */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: BOOT.eyebrow, duration: 0.55, ease: EASE_ENTER }}
          >
            <Link
              href="/admin/login"
              className="group inline-flex items-center gap-3 rounded-2xl bg-white/[0.06] ring-1 ring-white/12 hover:ring-white/30 hover:bg-white/[0.12] hover:shadow-[0_0_24px_rgba(56,189,248,0.18)] backdrop-blur-sm pl-3 pr-4 py-2 transition-all duration-300"
            >
              <span className="w-8 h-8 rounded-xl bg-sky-500/15 ring-1 ring-sky-400/30 group-hover:bg-sky-500/25 flex items-center justify-center transition-colors duration-300">
                <LogIn className="w-4 h-4 text-sky-300" />
              </span>
              <span className="text-left leading-tight">
                <span className="block text-[10px] text-slate-400">Petugas portal</span>
                <span className="block text-[12px] font-bold text-white">Masuk Pengelolaan</span>
              </span>
              {/* Panah bergeser 5px ke kanan saat disorot. */}
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-[5px] transition-all duration-300" />
            </Link>
          </motion.div>
        </header>

        {/* ---- badan ---- */}
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[268px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_300px] gap-6 xl:gap-x-5 xl:gap-y-4 items-center py-4 xl:py-2">
          {/* ======== KIRI: judul ======== */}
          <div>
            <h1 className="text-[2rem] sm:text-4xl 2xl:text-5xl font-black tracking-tight leading-[1.06]">
              <BlurWords text="Satu Portal," className="block text-white" delay={BOOT.headline} />
              <BlurWords text="Semua Solusi." className="block text-sky-400" delay={BOOT.headline + 0.25} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: BOOT.desc, duration: 0.6, ease: EASE_ENTER }}
              className="mt-4 text-[13px] text-slate-400 leading-relaxed max-w-md"
            >
              Akses cepat ke seluruh aplikasi kedinasan Bandar Udara APT Pranoto,
              lengkap dengan keterangan gunanya masing-masing.
            </motion.p>
          </div>

          {/* ======== TENGAH: orbit (xl ke atas) ======== */}
          <div className="hidden xl:block h-full min-h-0 xl:row-span-2 2xl:row-span-1">
            <OrbitDiagram />
          </div>

          {/* ======== TENGAH (layar sempit): ubin ======== */}
          <div className="xl:hidden grid grid-cols-2 gap-2.5">
            {EMPLOYEE_APPS.map((app, i) => (
              <AppTile key={app.slug} app={app} index={i} />
            ))}
          </div>

          {/* ======== KANAN: panel status ======== */}
          <motion.aside
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: BOOT.panel, duration: 0.65, ease: EASE_ENTER }}
            className="relative rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-sm p-5 overflow-hidden"
          >
            <Plane className="absolute -top-3 -right-4 w-24 h-24 text-sky-400/10 -rotate-12 pointer-events-none" aria-hidden="true" />

            <h2 className="relative text-[14px] font-black leading-snug tracking-tight">
              <span className="text-sky-400">Terhubung. Terintegrasi.</span>
              <br />
              <span className="text-white">Terbang lebih tinggi.</span>
            </h2>

            <p className="relative mt-3 text-[12px] text-slate-400 leading-relaxed">
              Seluruh sistem kedinasan dikumpulkan di satu halaman, agar tidak ada
              lagi alamat yang perlu dihafal.
            </p>

            {/* garis pemisah yang melebar sendiri saat panel muncul */}
            <motion.div
              className="relative my-4 h-px bg-gradient-to-r from-sky-400/40 via-white/10 to-transparent origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: BOOT.panel + 0.2, duration: 0.7, ease: EASE_ENTER }}
            />

            {/* Ketiga angka berikut dihitung dari data, bukan diketik manual.
                Dua yang pertama menghitung naik sekali saat boot lalu berhenti
                pada nilai sebenarnya; jam memakai waktu asli WITA dan tidak
                pernah dianimasikan. Statistik yang tidak dapat diverifikasi
                (jumlah pengguna, uptime) sengaja tidak ditampilkan. */}
            <div className="relative space-y-3">
              {[
                { icon: LayoutGrid, value: String(jumlahAplikasi), label: 'Aplikasi terdaftar', tone: 'text-sky-300 bg-sky-500/12 ring-sky-400/25' },
                { icon: ExternalLink, value: String(jumlahEksternal), label: 'Sistem di luar portal', tone: 'text-violet-300 bg-violet-500/12 ring-violet-400/25' },
                { icon: Clock, value: clock, label: 'Waktu Indonesia Tengah', tone: 'text-emerald-300 bg-emerald-500/12 ring-emerald-400/25' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: BOOT.panel + (i + 1) * BOOT.panelRow, duration: 0.45, ease: EASE_ENTER }}
                    className="flex items-center gap-3.5"
                  >
                    <span className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center flex-shrink-0 ${s.tone}`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span>
                      <span className="block text-xl font-black text-white leading-none tabular-nums">{s.value}</span>
                      <span className="block mt-1 text-[11px] text-slate-400">{s.label}</span>
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <div className="relative mt-4 pt-4 border-t border-white/10 flex items-center gap-2.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
              <span className="text-[11px] text-slate-400 leading-snug">
                Seluruhnya memerlukan akun kedinasan
              </span>
            </div>
          </motion.aside>
        </div>

        {/* ---- bilah bawah: status sistem + jalan pulang ----
             Jalan pulang wajib ada. Navbar dan footer tidak dirender di rute
             ini, jadi ini satu-satunya jalan kembali ke portal tanpa menekan
             tombol mundur. */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: BOOT.footer, duration: 0.7 }}
          className="flex-shrink-0 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 pt-3 border-t border-white/[0.07]"
        >
          {/* Tiga penanda status yang menguat-melemah bergantian — bukan
              berkedip tajam; ini indikator sistem, bukan peringatan. */}
          <div className="flex items-center gap-4">
            {STATUS_LABEL.map((label, i) => (
              <span key={label} className="flex items-center gap-1.5">
                <motion.span
                  className="w-1 h-1 rounded-full bg-sky-400"
                  animate={reduced ? { opacity: 0.7 } : { opacity: [0.25, 0.9, 0.25] }}
                  transition={{
                    duration: STATUS_CYCLE.duration,
                    repeat: Infinity,
                    delay: BOOT.idle + i * STATUS_CYCLE.step,
                    ease: 'easeInOut',
                  }}
                />
                <motion.span
                  className="text-[9.5px] font-bold uppercase tracking-[0.28em] text-slate-600"
                  animate={reduced ? undefined : { color: ['rgb(71 85 105)', 'rgb(148 163 184)', 'rgb(71 85 105)'] }}
                  transition={{
                    duration: STATUS_CYCLE.duration,
                    repeat: Infinity,
                    delay: BOOT.idle + i * STATUS_CYCLE.step,
                    ease: 'easeInOut',
                  }}
                >
                  {label}
                </motion.span>
              </span>
            ))}
          </div>

          <nav className="flex items-center gap-1.5 text-[12px] font-semibold">
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.07] transition-colors duration-300"
            >
              <Home className="w-3.5 h-3.5 group-hover:-translate-y-px transition-transform duration-300" /> Beranda
            </Link>
            <Link
              href="/tautan-terkait"
              className="text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.07] transition-colors duration-300"
            >
              Tautan Terkait
            </Link>
            <Link
              href="/complaints"
              className="group inline-flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-[#04122e] px-4 py-1.5 rounded-full font-bold transition-colors duration-300"
            >
              Pusat Bantuan
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-[5px] transition-transform duration-300" />
            </Link>
          </nav>
        </motion.footer>
      </div>
    </div>
  );
}
