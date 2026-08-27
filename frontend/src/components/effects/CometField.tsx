'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Komet yang sesekali melintasi halaman Portal Aplikasi, dan pecah bila
 * tertabrak kursor.
 *
 * ── Keputusan yang perlu diketahui ────────────────────────────────────
 * 1. Lapisan ini MURNI hiasan: `pointer-events-none`, `aria-hidden`, dan
 *    diletakkan di belakang konten. Ia tidak pernah menerima klik, jadi
 *    tidak mungkin menghalangi tautan aplikasi mana pun.
 * 2. Tabrakan dihitung terhadap posisi kursor SEBENARNYA — titik yang sama
 *    yang ditandai `PlaneCursor`. Badan pesawat memang tertinggal sedikit di
 *    belakang kursor, dan memakai badan pesawat sebagai penabrak akan terasa
 *    meleset.
 * 3. Mati total bila pengguna meminta gerak dikurangi.
 * 4. Satu kanvas, satu putaran `requestAnimationFrame`, tanpa state React —
 *    jadi tidak ada render ulang. Loop berhenti saat tab tidak aktif supaya
 *    tidak ada komet yang menumpuk di latar belakang.
 *
 * Jumlahnya sengaja dibatasi tiga sekaligus dengan jeda beberapa detik:
 * yang dicari kesan langit malam yang hidup, bukan hujan meteor.
 */

/* ---- tetapan ---- */
const MAX_COMET = 3;
const SPAWN_MIN = 2600;      // jeda kemunculan terpendek (ms)
const SPAWN_MAX = 6200;      // jeda kemunculan terpanjang (ms)
const TAIL_MAX = 26;         // titik ekor yang disimpan
const HIT_PAD = 18;          // kelonggaran radius tabrakan (px)
const SHARD_COUNT = 18;      // serpihan per ledakan

/** Warna komet — diambil dari aksen yang sudah dipakai halaman. */
const PALET: [number, number, number][] = [
  [125, 211, 252], // sky-300
  [167, 139, 250], // violet-400
  [252, 211, 77],  // amber-300
];

type Komet = {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  warna: [number, number, number];
  ekor: { x: number; y: number }[];
  umur: number;
};

type Serpih = {
  x: number; y: number;
  vx: number; vy: number;
  umur: number; max: number;
  ukuran: number;
  warna: [number, number, number];
};

type Gelombang = {
  x: number; y: number;
  umur: number; max: number;
  warna: [number, number, number];
};

const acak = (a: number, b: number) => a + Math.random() * (b - a);

export default function CometField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /* Pilihan pemakai dari panel aksesibilitas. Terpisah dari `kurangiGerak`
     di dalam efek: yang itu mendengarkan preferensi SISTEM OPERASI dan sudah
     bekerja, yang ini menambahkan gerbang kedua untuk penyetelan portal.
     Nilainya masuk daftar kebergantungan efek supaya loop-nya benar-benar
     dibongkar saat penyetelannya dinyalakan di tengah halaman terbuka. */
  const kurangiGerakPemakai = useReducedMotion();

  useEffect(() => {
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (kurangiGerakPemakai || kurangiGerak.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const konteks = canvas.getContext('2d');
    if (!konteks) return;
    // Disalin ke const yang sudah pasti tidak null: penyempitan tipe dari
    // penjaga di atas tidak terbawa ke dalam `bersihkan()` yang memakainya.
    const ctx = konteks;

    let w = 0;
    let h = 0;

    const komet: Komet[] = [];
    const serpih: Serpih[] = [];
    const gelombang: Gelombang[] = [];

    // Di luar layar sampai kursor benar-benar bergerak, supaya tidak ada
    // komet yang meledak sendiri sebelum ada yang menyentuhnya.
    const kursor = { x: -9999, y: -9999 };

    let jedaBerikut = acak(900, 2000);

    const ukurUlang = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /* ---- kemunculan ---- */
    const lahirkan = () => {
      if (komet.length >= MAX_COMET || w === 0) return;

      // Selalu menyeberang layar secara diagonal, arah kiri→kanan atau
      // sebaliknya, dengan kemiringan landai agar terbaca sebagai lintasan
      // dan bukan sekadar garis jatuh.
      const dariKiri = Math.random() > 0.45;
      const lajuX = acak(150, 240) * (dariKiri ? 1 : -1);
      const lajuY = acak(52, 116);

      komet.push({
        x: dariKiri ? -80 : w + 80,
        y: acak(-40, h * 0.55),
        vx: lajuX,
        vy: lajuY,
        r: acak(1.9, 3.2),
        warna: PALET[Math.floor(Math.random() * PALET.length)],
        ekor: [],
        umur: 0,
      });
    };

    /* ---- ledakan ---- */
    const hancurkan = (k: Komet) => {
      const [r, g, b] = k.warna;

      for (let i = 0; i < SHARD_COUNT; i++) {
        const sudut = (i / SHARD_COUNT) * Math.PI * 2 + acak(-0.22, 0.22);
        const laju = acak(70, 280);
        serpih.push({
          x: k.x,
          y: k.y,
          // Serpihan membawa sebagian momentum kometnya — tanpa ini
          // ledakannya terlihat seperti bunga api diam, bukan sesuatu yang
          // tadinya melaju.
          vx: Math.cos(sudut) * laju + k.vx * 0.24,
          vy: Math.sin(sudut) * laju + k.vy * 0.24,
          umur: 0,
          max: acak(520, 1000),
          ukuran: acak(1, 2.4),
          warna: [r, g, b],
        });
      }

      // Dua cincin kejut dengan umur berbeda: satu cepat dan tajam, satu
      // lebih lambat dan lebar.
      gelombang.push({ x: k.x, y: k.y, umur: 0, max: 420, warna: [r, g, b] });
      gelombang.push({ x: k.x, y: k.y, umur: 0, max: 760, warna: [255, 255, 255] });
    };

    /* ---- gambar ---- */
    const gambarKomet = (k: Komet) => {
      const [r, g, b] = k.warna;

      // Ekor meruncing: makin ke belakang makin tipis dan pudar.
      for (let i = 1; i < k.ekor.length; i++) {
        const a = k.ekor[i - 1];
        const c = k.ekor[i];
        const rasio = i / k.ekor.length;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${rasio * 0.34})`;
        ctx.lineWidth = k.r * 2.1 * rasio;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Halo di sekitar inti.
      const halo = ctx.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.r * 7);
      halo.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(k.x, k.y, k.r * 7, 0, Math.PI * 2);
      ctx.fill();

      // Inti putih.
      ctx.beginPath();
      ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fill();
    };

    /* ---- putaran utama ---- */
    let raf = 0;
    let sebelumnya = performance.now();

    const bingkai = (now: number) => {
      const dtMs = Math.min(48, now - sebelumnya);
      sebelumnya = now;
      const dt = dtMs / 1000;

      ctx.clearRect(0, 0, w, h);

      // kemunculan berkala
      jedaBerikut -= dtMs;
      if (jedaBerikut <= 0) {
        lahirkan();
        jedaBerikut = acak(SPAWN_MIN, SPAWN_MAX);
      }

      // komet
      for (let i = komet.length - 1; i >= 0; i--) {
        const k = komet[i];
        k.umur += dtMs;
        k.x += k.vx * dt;
        k.y += k.vy * dt;

        k.ekor.push({ x: k.x, y: k.y });
        if (k.ekor.length > TAIL_MAX) k.ekor.shift();

        // tabrakan dengan kursor
        const jarak = Math.hypot(kursor.x - k.x, kursor.y - k.y);
        if (jarak < k.r * 3 + HIT_PAD) {
          hancurkan(k);
          komet.splice(i, 1);
          continue;
        }

        // keluar layar
        if (k.x < -180 || k.x > w + 180 || k.y > h + 180) {
          komet.splice(i, 1);
          continue;
        }

        gambarKomet(k);
      }

      // cincin kejut
      for (let i = gelombang.length - 1; i >= 0; i--) {
        const gl = gelombang[i];
        gl.umur += dtMs;
        if (gl.umur >= gl.max) { gelombang.splice(i, 1); continue; }

        const p = gl.umur / gl.max;
        const jari = 4 + p * 62;
        const [r, g, b] = gl.warna;

        ctx.beginPath();
        ctx.arc(gl.x, gl.y, jari, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - p) * 0.55})`;
        ctx.lineWidth = (1 - p) * 2 + 0.2;
        ctx.stroke();
      }

      // serpihan
      for (let i = serpih.length - 1; i >= 0; i--) {
        const s = serpih[i];
        s.umur += dtMs;
        if (s.umur >= s.max) { serpih.splice(i, 1); continue; }

        const p = s.umur / s.max;
        // Perlambatan bertahap + sedikit tarikan ke bawah supaya serpihannya
        // jatuh, bukan melayang lurus selamanya.
        s.vx *= 0.985;
        s.vy = s.vy * 0.985 + 42 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const [r, g, b] = s.warna;
        const alpha = (1 - p) * 0.9;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.ukuran * (1 - p * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(bingkai);
    };

    const mulai = () => {
      if (raf) return;
      sebelumnya = performance.now();
      raf = requestAnimationFrame(bingkai);
    };
    const berhenti = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    /* ---- peristiwa ---- */
    const onMove = (e: PointerEvent) => {
      kursor.x = e.clientX;
      kursor.y = e.clientY;
    };
    const onLeave = () => { kursor.x = -9999; kursor.y = -9999; };
    const onVisibility = () => (document.hidden ? berhenti() : mulai());
    const onPref = () => { if (kurangiGerak.matches) bersihkan(); };

    ukurUlang();
    mulai();

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', ukurUlang);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    kurangiGerak.addEventListener('change', onPref);

    let sudahBersih = false;
    function bersihkan() {
      if (sudahBersih) return;
      sudahBersih = true;
      berhenti();
      komet.length = 0;
      serpih.length = 0;
      gelombang.length = 0;
      if (w && h) ctx.clearRect(0, 0, w, h);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', ukurUlang);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      kurangiGerak.removeEventListener('change', onPref);
    }

    return bersihkan;
  }, [kurangiGerakPemakai]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  );
}
