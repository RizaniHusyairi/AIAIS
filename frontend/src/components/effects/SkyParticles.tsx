'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useSiteTheme } from '@/lib/siteTheme';

/**
 * Lapisan partikel bernuansa penerbangan untuk permukaan terang.
 *
 * Berbeda dari `HeroParticles` yang dirancang untuk hero gelap, komponen ini
 * menggambar empat lapisan yang tetap terbaca di atas latar biru langit
 * maupun putih:
 *   1. Gumpalan awan lembut yang hanyut mendatar
 *   2. Butir cahaya halus yang naik perlahan sambil berkedip
 *   3. Jejak kondensasi (contrail) dengan siluet pesawat kecil di ujungnya
 *   4. Cincin "radar" yang sesekali memuai dari satu titik
 *
 * Catatan desain:
 *   - `tone="sky"`  → tanda putih/biru muda, untuk hero bergradien biru pekat.
 *   - `tone="paper"` → tanda biru beropasitas rendah, untuk latar putih/slate.
 *   - `density="low"` memangkas jumlah objek ±55% untuk layar ponsel.
 *   - Menghormati `prefers-reduced-motion` dan berhenti saat tab tidak aktif.
 */

/**
 * `night` bukan nilai yang dikirim pemanggil — ia dipilih sendiri oleh
 * komponen saat tema malam portal aktif. Lihat catatan pada `PALETTE`.
 */
type Tone = 'sky' | 'paper' | 'night';
type Density = 'low' | 'normal';

type Mote = {
  x: number; y: number; r: number;
  vx: number; vy: number;
  base: number;      // opasitas dasar
  depth: number;     // 0.35 – 1 untuk parallax
  tw: number;        // kecepatan kedip
  tp: number;        // fase kedip
};

type Cloud = {
  x: number; y: number;
  rx: number; ry: number;
  speed: number; alpha: number; depth: number;
};

type Contrail = {
  x: number; y: number; vx: number; vy: number;
  points: { x: number; y: number }[];
  life: number; max: number;
};

type Ring = { x: number; y: number; life: number; max: number };

/**
 * Warna per nada permukaan: [inti, aksen, kabut awan].
 *
 * Nada `night` dipilih komponen sendiri ketika tema malam portal aktif,
 * menimpa apa pun yang dikirim pemanggil. Itulah kenapa prop `tone` tidak
 * perlu diubah di dua belas lebih tempat pemakaian: satu tambahan di sini
 * membuat seluruhnya ikut bertema malam.
 */
const PALETTE: Record<Tone, {
  mote: [number, number, number];
  accent: [number, number, number];
  cloud: [number, number, number];
  trail: [number, number, number];
  gain: number;   // pengali opasitas keseluruhan
}> = {
  sky: {
    mote: [255, 255, 255],
    accent: [186, 230, 253],   // sky-200
    cloud: [255, 255, 255],
    trail: [255, 255, 255],
    gain: 1,
  },
  paper: {
    mote: [59, 130, 246],      // blue-500
    accent: [14, 165, 233],    // sky-500
    cloud: [186, 230, 253],    // sky-200
    trail: [37, 99, 235],      // blue-600
    gain: 0.45,
  },
  night: {
    mote: [186, 230, 253],     // sky-200
    accent: [34, 211, 238],    // cyan-400
    // Awan malam nyaris tidak terlihat — hanya kelabu kebiruan yang samar.
    cloud: [71, 105, 148],
    trail: [125, 211, 252],    // sky-300
    gain: 0.5,
  },
};

export default function SkyParticles({
  tone = 'sky',
  density = 'normal',
  className = '',
}: {
  tone?: Tone;
  density?: Density;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useSiteTheme();
  /* Dibaca lewat hook framer-motion, BUKAN `window.matchMedia` langsung.
     Bentuk lamanya membaca preferensi satu kali di dalam efek tanpa pendengar
     perubahan, sehingga penyetelan "kurangi gerak" pada panel aksesibilitas
     tidak akan pernah sampai ke sini. Hook ini menyalurkan keduanya sekaligus:
     preferensi sistem operasi DAN pilihan pemakai lewat <PengaturGerak />. */
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pal = PALETTE[theme === 'night' ? 'night' : tone];
    const scale = density === 'low' ? 0.45 : 1;

    let w = 0, h = 0, dpr = 1;
    let motes: Mote[] = [];
    let clouds: Cloud[] = [];
    let trails: Contrail[] = [];
    let rings: Ring[] = [];

    const par = { x: 0, y: 0, tx: 0, ty: 0 };

    let raf = 0;
    let last = performance.now();
    let nextTrail = 1400;   // ms sebelum pesawat pertama melintas
    let nextRing = 3000;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const build = () => {
      const moteCount = Math.round(Math.min(46, Math.max(10, (w * h) / 26000)) * scale);
      motes = Array.from({ length: moteCount }, () => {
        const depth = rand(0.35, 1);
        return {
          x: rand(0, w),
          y: rand(0, h),
          r: rand(0.6, 1.9) * depth,
          vx: rand(0.04, 0.18) * depth,
          vy: rand(-0.08, -0.015) * depth,
          base: rand(0.25, 0.65),
          depth,
          tw: rand(0.4, 1.2),
          tp: rand(0, Math.PI * 2),
        };
      });

      const cloudCount = Math.max(2, Math.round(5 * scale));
      clouds = Array.from({ length: cloudCount }, () => {
        const depth = rand(0.35, 1);
        return {
          x: rand(-0.1, 1.1) * w,
          y: rand(0.08, 0.92) * h,
          rx: rand(90, 230) * depth,
          ry: rand(26, 62) * depth,
          speed: rand(0.004, 0.016) * depth,
          alpha: rand(0.05, 0.13),
          depth,
        };
      });

      trails = [];
      rings = [];
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nw = Math.max(1, Math.round(rect.width));
      const nh = Math.max(1, Math.round(rect.height));
      if (nw === w && nh === h) return;

      w = nw;
      h = nh;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();

      // Gambar satu bingkai segera agar area tidak pernah kosong,
      // termasuk saat rAF ter-throttle.
      render(performance.now(), 16, false);
    };

    /* ---------------- gambar ---------------- */

    const drawClouds = (dt: number) => {
      for (const c of clouds) {
        c.x += c.speed * dt;
        if (c.x - c.rx > w + 40) {
          c.x = -c.rx - 40;
          c.y = rand(0.08, 0.92) * h;
        }

        const cx = c.x + par.x * c.depth;
        const cy = c.y + par.y * c.depth;
        const [r, g, b] = pal.cloud;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.rx);
        grad.addColorStop(0, `rgba(${r},${g},${b},${c.alpha * pal.gain})`);
        grad.addColorStop(0.55, `rgba(${r},${g},${b},${c.alpha * 0.45 * pal.gain})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, c.ry / c.rx);
        ctx.translate(-cx, -cy);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, c.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawMotes = (t: number, dt: number) => {
      const [r, g, b] = pal.mote;
      const [ar, ag, ab] = pal.accent;

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += m.vx * dt * 0.06;
        m.y += m.vy * dt * 0.06;

        if (m.x > w + 10) { m.x = -10; m.y = rand(0, h); }
        if (m.y < -10) { m.y = h + 10; m.x = rand(0, w); }

        const twinkle = 0.6 + 0.4 * Math.sin(t * 0.001 * m.tw + m.tp);
        const alpha = m.base * twinkle * pal.gain;
        if (alpha <= 0.015) continue;

        // setiap butir keempat memakai warna aksen
        const useAccent = (i & 3) === 0;
        const [cr, cg, cb] = useAccent ? [ar, ag, ab] : [r, g, b];
        const px = m.x + par.x * m.depth;
        const py = m.y + par.y * m.depth;

        ctx.beginPath();
        ctx.arc(px, py, m.r * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.12})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.fill();
      }
    };

    const spawnTrail = () => {
      const climbing = Math.random() > 0.4;
      const speed = rand(0.11, 0.19);
      trails.push({
        x: -70,
        y: rand(h * 0.12, h * 0.82),
        vx: speed,
        vy: climbing ? -speed * rand(0.1, 0.24) : speed * rand(0.04, 0.13),
        points: [],
        life: 0,
        max: rand(9000, 14000),
      });
    };

    /** Siluet pesawat kecil, diputar mengikuti arah gerak. */
    const drawPlane = (x: number, y: number, angle: number, alpha: number) => {
      const [r, g, b] = pal.trail;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(7, 0);          // hidung
      ctx.lineTo(-3, 3.2);       // sayap kanan
      ctx.lineTo(-1.2, 0);       // badan
      ctx.lineTo(-3, -3.2);      // sayap kiri
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawTrails = (dt: number) => {
      const [r, g, b] = pal.trail;

      for (let i = trails.length - 1; i >= 0; i--) {
        const tr = trails[i];
        tr.life += dt;
        tr.x += tr.vx * dt * 0.34;
        tr.y += tr.vy * dt * 0.34;

        tr.points.push({ x: tr.x, y: tr.y });
        if (tr.points.length > 52) tr.points.shift();

        if (tr.x > w + 100 || tr.life > tr.max) { trails.splice(i, 1); continue; }

        // memudar saat baru muncul dan saat mendekati tepi kanan
        const fade =
          Math.min(1, tr.life / 650) *
          (1 - Math.max(0, (tr.x - w * 0.84) / (w * 0.22))) *
          pal.gain;
        if (fade <= 0) continue;

        for (let p = 1; p < tr.points.length; p++) {
          const a = (p / tr.points.length) * 0.42 * fade;
          if (a <= 0.012) continue;
          ctx.beginPath();
          ctx.moveTo(tr.points[p - 1].x + par.x * 0.5, tr.points[p - 1].y + par.y * 0.5);
          ctx.lineTo(tr.points[p].x + par.x * 0.5, tr.points[p].y + par.y * 0.5);
          ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
          ctx.lineWidth = 1.4 * (p / tr.points.length) + 0.3;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        drawPlane(
          tr.x + par.x * 0.5,
          tr.y + par.y * 0.5,
          Math.atan2(tr.vy, tr.vx),
          Math.min(0.9, fade * 1.6),
        );
      }
    };

    const drawRings = (dt: number) => {
      const [r, g, b] = pal.accent;
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.life += dt;
        if (ring.life > ring.max) { rings.splice(i, 1); continue; }

        const p = ring.life / ring.max;
        const radius = 8 + p * Math.min(w, h) * 0.28;
        const alpha = (1 - p) * 0.28 * pal.gain;
        if (alpha <= 0.012) continue;

        ctx.beginPath();
        ctx.arc(ring.x + par.x * 0.4, ring.y + par.y * 0.4, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    };

    /* ---------------- loop ---------------- */

    /** Menggambar satu bingkai. Dipakai loop rAF maupun panggilan langsung. */
    const render = (now: number, dt: number, advance = true) => {
      // Jaring pengaman: keadaan yang telanjur tercemar dipulihkan, bukan
      // dibiarkan mematikan latar sampai halaman dimuat ulang.
      if (![par.x, par.y, par.tx, par.ty].every(Number.isFinite)) {
        par.x = 0; par.y = 0; par.tx = 0; par.ty = 0;
      }

      par.x += (par.tx - par.x) * 0.045;
      par.y += (par.ty - par.y) * 0.045;

      ctx.clearRect(0, 0, w, h);
      drawClouds(dt);
      drawMotes(now, dt);

      if (advance) {
        nextTrail -= dt;
        if (nextTrail <= 0) {
          spawnTrail();
          nextTrail = rand(5200, 9500);
        }

        nextRing -= dt;
        if (nextRing <= 0) {
          rings.push({
            x: rand(w * 0.15, w * 0.9),
            y: rand(h * 0.2, h * 0.85),
            life: 0,
            max: rand(4200, 6200),
          });
          nextRing = rand(6500, 11000);
        }
      }

      drawRings(dt);
      drawTrails(dt);
    };

    const frame = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      render(now, dt);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    /* ---------------- event ---------------- */

    /**
     * Paralaks mengikuti penunjuk di SELURUH halaman, jadi peristiwa ini juga
     * tiba saat kanvasnya sendiri sedang berukuran nol — bagian yang belum
     * ditata, wadah yang tersembunyi, atau tinggi yang sedang menyusut.
     *
     * Pembagian dengan nol di sana menghasilkan Infinity (atau NaN, ketika
     * penunjuknya kebetulan tepat di tepi), dan nilai itu MENULAR: `par.x`
     * dihitung dari dirinya sendiri tiap bingkai, sehingga sekali tercemar ia
     * tidak pernah pulih. Akibatnya `createRadialGradient` melempar
     * "The provided double value is non-finite" pada setiap bingkai berikutnya
     * dan seluruh latar berhenti tergambar.
     */
    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;

      par.tx = -nx * 14;
      par.ty = -ny * 9;
    };
    const onLeave = () => { par.tx = 0; par.ty = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();

    if (!reduceMotion) {
      start();
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerleave', onLeave);
      document.addEventListener('visibilitychange', onVisibility);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    // Tinggi bagian dapat tumbuh setelah font/gambar dimuat —
    // sinkronkan ulang ukuran kanvas sesaat setelah mount.
    const late = window.setTimeout(resize, 400);

    return () => {
      stop();
      ro.disconnect();
      window.clearTimeout(late);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tone, density, theme, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
    />
  );
}
