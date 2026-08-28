'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Lapisan partikel dekoratif untuk hero beranda.
 *
 * Terdiri dari tiga lapisan yang digambar pada satu <canvas>:
 *   1. Titik cahaya melayang (biru · putih · aksen emas) dengan glow lembut
 *   2. Garis kurva "aliran udara" yang bergerak sangat perlahan
 *   3. Jejak lintasan pesawat yang sesekali melintas dan memudar
 *
 * Catatan desain:
 *   - Opasitas diredam di sisi kiri agar tidak mengganggu keterbacaan teks hero.
 *   - Parallax ringan mengikuti kursor (maksimal beberapa piksel).
 *   - Menghormati `prefers-reduced-motion` dan berhenti saat tab tidak aktif.
 */

type Dot = {
  x: number; y: number; r: number;
  vx: number; vy: number;
  base: number;      // opasitas dasar
  depth: number;     // 0.3 – 1 untuk parallax
  tone: 'blue' | 'white' | 'gold';
  tw: number;        // kecepatan kedip
  tp: number;        // fase kedip
};

type Stream = {
  y: number; amp: number; len: number;
  speed: number; phase: number;
  width: number; alpha: number; depth: number;
};

type Trail = {
  x: number; y: number; vx: number; vy: number;
  points: { x: number; y: number }[];
  life: number; max: number;
};

const TONES: Record<Dot['tone'], [number, number, number]> = {
  blue: [96, 165, 250],   // #60a5fa
  white: [255, 255, 255],
  gold: [251, 191, 36],   // #fbbf24 — aksen sunrise
};

export default function HeroParticles({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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


    let w = 0, h = 0, dpr = 1;
    let dots: Dot[] = [];
    let streams: Stream[] = [];
    let trails: Trail[] = [];

    // parallax
    const par = { x: 0, y: 0, tx: 0, ty: 0 };

    let raf = 0;
    let last = performance.now();
    let nextTrail = 2200; // ms sebelum pesawat pertama

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    /** Redam partikel di area teks (kiri) agar tetap terbaca. */
    const mask = (x: number) => {
      const t = Math.min(1, Math.max(0, (x / w - 0.28) / 0.34));
      return 0.16 + 0.84 * t;
    };

    const build = () => {
      const count = Math.round(Math.min(58, Math.max(16, (w * h) / 21000)));
      dots = Array.from({ length: count }, () => {
        const roll = Math.random();
        const tone: Dot['tone'] = roll > 0.88 ? 'gold' : roll > 0.55 ? 'white' : 'blue';
        const depth = rand(0.3, 1);
        return {
          x: rand(0, w),
          y: rand(0, h),
          r: rand(0.7, 2.1) * depth,
          vx: rand(0.05, 0.22) * depth,          // hanyut lembut ke kanan
          vy: rand(-0.09, -0.02) * depth,        // naik perlahan
          base: rand(0.25, 0.7),
          depth,
          tone,
          tw: rand(0.4, 1.3),
          tp: rand(0, Math.PI * 2),
        };
      });

      streams = Array.from({ length: 5 }, (_, i) => ({
        y: h * rand(0.18, 0.86),
        amp: rand(14, 40),
        len: rand(0.5, 0.95),
        speed: rand(0.06, 0.16),
        phase: rand(0, Math.PI * 2),
        width: rand(0.8, 1.6),
        alpha: rand(0.05, 0.12),
        depth: rand(0.35, 1),
      }));

      trails = [];
    };

    let resizeTimer = 0;
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

      // Gambar satu bingkai segera agar hero tidak pernah kosong,
      // termasuk saat rAF ter-throttle (tab latar, webview tertentu).
      render(performance.now(), 16, false);
    };

    /* ---------------- gambar ---------------- */

    const drawSunriseGlow = (t: number) => {
      // cahaya emas lembut di kanan bawah — kesan matahari terbit
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.00022);
      const cx = w * 0.82;
      const cy = h * 0.78;
      const rad = Math.max(w, h) * 0.42;
      const g = ctx.createRadialGradient(cx + par.x * 0.6, cy + par.y * 0.6, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(251,191,36,${0.1 + 0.05 * pulse})`);
      g.addColorStop(0.45, `rgba(96,165,250,${0.05 + 0.03 * pulse})`);
      g.addColorStop(1, 'rgba(96,165,250,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };

    const drawStreams = (t: number) => {
      ctx.lineCap = 'round';
      for (const s of streams) {
        const off = t * s.speed * 0.02;
        const y0 = s.y + par.y * s.depth * 0.8;
        const startX = -40 + par.x * s.depth;
        const endX = w * s.len + 60 + par.x * s.depth;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += 14) {
          const p = (x / w) * Math.PI * 2;
          const y = y0 + Math.sin(p * 1.15 + s.phase + off) * s.amp + Math.cos(p * 0.5 + off * 0.6) * (s.amp * 0.3);
          if (x === startX) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const grad = ctx.createLinearGradient(startX, 0, endX, 0);
        grad.addColorStop(0, 'rgba(147,197,253,0)');
        grad.addColorStop(0.35, `rgba(147,197,253,${s.alpha * mask(w * 0.45)})`);
        grad.addColorStop(0.7, `rgba(255,255,255,${s.alpha * 1.1})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.stroke();
      }
    };

    const drawDots = (t: number, dt: number) => {
      for (const d of dots) {
        d.x += d.vx * dt * 0.06;
        d.y += d.vy * dt * 0.06;

        if (d.x > w + 12) { d.x = -12; d.y = rand(0, h); }
        if (d.y < -12) { d.y = h + 12; d.x = rand(0, w); }

        const twinkle = 0.65 + 0.35 * Math.sin(t * 0.001 * d.tw + d.tp);
        const alpha = d.base * twinkle * mask(d.x);
        if (alpha <= 0.01) continue;

        const [r, g, b] = TONES[d.tone];
        const px = d.x + par.x * d.depth;
        const py = d.y + par.y * d.depth;

        // glow lembut
        ctx.beginPath();
        ctx.arc(px, py, d.r * 4.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.1})`;
        ctx.fill();

        // inti titik
        ctx.beginPath();
        ctx.arc(px, py, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }
    };

    const spawnTrail = () => {
      const upward = Math.random() > 0.35;
      const y = rand(h * 0.15, h * 0.7);
      const speed = rand(0.12, 0.2);
      trails.push({
        x: -60,
        y,
        vx: speed,
        vy: upward ? -speed * rand(0.12, 0.26) : speed * rand(0.05, 0.14),
        points: [],
        life: 0,
        max: rand(9000, 13000),
      });
    };

    const drawTrails = (dt: number) => {
      for (let i = trails.length - 1; i >= 0; i--) {
        const tr = trails[i];
        tr.life += dt;
        tr.x += tr.vx * dt * 0.35;
        tr.y += tr.vy * dt * 0.35;

        tr.points.push({ x: tr.x, y: tr.y });
        if (tr.points.length > 46) tr.points.shift();

        if (tr.x > w + 90 || tr.life > tr.max) { trails.splice(i, 1); continue; }

        const fade = Math.min(1, tr.life / 700) * (1 - Math.max(0, (tr.x - w * 0.86) / (w * 0.2)));
        if (fade <= 0) continue;

        // jejak memudar
        for (let p = 1; p < tr.points.length; p++) {
          const a = (p / tr.points.length) * 0.5 * fade * mask(tr.points[p].x);
          if (a <= 0.01) continue;
          ctx.beginPath();
          ctx.moveTo(tr.points[p - 1].x + par.x * 0.5, tr.points[p - 1].y + par.y * 0.5);
          ctx.lineTo(tr.points[p].x + par.x * 0.5, tr.points[p].y + par.y * 0.5);
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = 1.1 * (p / tr.points.length) + 0.3;
          ctx.stroke();
        }

        // titik cahaya di ujung jejak
        const hx = tr.x + par.x * 0.5;
        const hy = tr.y + par.y * 0.5;
        const ha = 0.85 * fade * mask(tr.x);

        ctx.beginPath();
        ctx.arc(hx, hy, 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(191,219,254,${ha * 0.16})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(hx, hy, 1.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${ha})`;
        ctx.fill();
      }
    };

    /* ---------------- loop ---------------- */

    /** Menggambar satu bingkai. Dipanggil oleh loop rAF maupun secara langsung. */
    const render = (now: number, dt: number, advance = true) => {
      // parallax halus
      par.x += (par.tx - par.x) * 0.045;
      par.y += (par.ty - par.y) * 0.045;

      /* Jaring pengaman, bukan pengganti penjagaan di `onPointer`.
         Perataan di atas tidak punya jalan pulih dari NaN, jadi satu nilai
         buruk dari sumber mana pun — kelak mungkin bukan lagi kursor — akan
         mematikan kanvas ini secara permanen. Diperiksa sekali per bingkai;
         `Number.isFinite` pada dua angka tidak terukur biayanya. */
      if (!Number.isFinite(par.x) || !Number.isFinite(par.y)) {
        par.x = 0; par.y = 0;
        par.tx = 0; par.ty = 0;
      }

      ctx.clearRect(0, 0, w, h);
      drawSunriseGlow(now);
      drawStreams(now);
      drawDots(now, dt);

      if (advance) {
        nextTrail -= dt;
        if (nextTrail <= 0) {
          spawnTrail();
          nextTrail = rand(7000, 12000);
        }
      }
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

    /*
     * Pendengarnya di `window`, bukan di kanvas — parallaxnya memang harus
     * mengikuti kursor ke mana pun ia bergerak di halaman. Konsekuensinya,
     * peristiwa tetap datang ketika kanvasnya sendiri sedang berukuran nol:
     * leluhur ber-`display:none`, hero yang menciut saat navbar menyusut, atau
     * satu bingkai di tengah peralihan tata letak.
     *
     * Pada saat itu `rect.width` bernilai 0 dan pembagian di bawah menghasilkan
     * Infinity atau NaN. Nilai itu tidak berhenti di sini: ia masuk ke
     * `par.tx`, lalu perataan di `render` menjadikan `par.x` NaN SELAMANYA —
     * `NaN + apa pun` tetap NaN — dan `createRadialGradient` melempar di setiap
     * bingkai sesudahnya. Satu gerakan tetikus pada saat yang salah mematikan
     * seluruh lapisan partikel sampai halaman dimuat ulang.
     */
    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      par.tx = -nx * 16;
      par.ty = -ny * 10;
    };
    const onLeave = () => { par.tx = 0; par.ty = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();

    if (reduceMotion) {
      // bingkai statis sudah digambar oleh resize(); tidak ada animasi lanjutan
    } else {
      start();
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerleave', onLeave);
      document.addEventListener('visibilitychange', onVisibility);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    // Layout hero dapat tumbuh setelah gambar/font selesai dimuat —
    // sinkronkan ulang ukuran kanvas beberapa saat setelah mount.
    const late = window.setTimeout(resize, 400);

    return () => {
      stop();
      ro.disconnect();
      window.clearTimeout(late);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
    />
  );
}
