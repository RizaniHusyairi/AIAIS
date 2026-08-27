'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Kursor pesawat untuk halaman Portal Aplikasi.
 *
 * Penunjuk tetikus diganti siluet pesawat yang mengejar kursor dengan sedikit
 * kelambatan, memiringkan hidungnya ke arah gerak, dan meninggalkan jejak
 * kondensasi. Saat melewati sesuatu yang dapat diklik, pesawat "mengunci
 * sasaran": muncul cincin bidik dan jejaknya menguat. Klik memicu satu riak
 * yang memuai lalu hilang.
 *
 * ── Keputusan yang perlu diketahui ────────────────────────────────────
 * 1. TIDAK aktif bila penunjuknya kasar (`pointer: coarse` — ponsel/tablet)
 *    atau pengguna meminta gerak dikurangi. Pada kedua keadaan itu kursor
 *    bawaan dibiarkan apa adanya; kursor buatan yang tertinggal di belakang
 *    justru menyulitkan orang yang sengaja mematikan animasi.
 * 2. Ada TITIK KECIL tepat di posisi kursor sebenarnya. Badan pesawat
 *    bergerak menyusul, jadi tanpa titik ini orang tidak tahu persisnya di
 *    mana ia sedang mengklik.
 * 3. Seluruh gerak ditulis langsung ke DOM lewat ref di dalam satu putaran
 *    `requestAnimationFrame` — tidak ada state React, jadi tidak ada render
 *    ulang sama sekali. Yang berubah hanya `transform` dan `opacity`.
 * 4. Jejaknya digambar pada satu kanvas, bukan puluhan simpul DOM.
 *
 * Menyembunyikan kursor bawaan memerlukan `!important` karena stylesheet
 * peramban menetapkan `cursor: pointer` pada `<a>`; aturannya ada di
 * `app/globals.css`, dipicu atribut `data-plane-cursor` pada `<html>`.
 */

/* ---- tetapan gerak ---- */
const FOLLOW = 0.2;        // seberapa cepat badan pesawat menyusul kursor
const TURN = 0.16;         // kelembutan perubahan arah hidung
const MIN_SPEED = 0.4;     // di bawah ini arah dibekukan (mencegah pesawat berputar saat diam)
const TRAIL_MAX = 30;      // jumlah titik jejak yang disimpan
const TRAIL_LIFE = 600;    // umur satu titik jejak (ms)
const RIPPLE_LIFE = 520;   // umur riak klik (ms)

/** Selisih sudut terpendek dalam derajat, hasil di rentang -180..180. */
function selisihSudut(target: number, kini: number): number {
  return ((((target - kini) % 360) + 540) % 360) - 180;
}

export default function PlaneCursor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  /* Pilihan pemakai dari panel aksesibilitas. Terpisah dari `kurangiGerak`
     di dalam efek: yang itu mendengarkan preferensi SISTEM OPERASI dan sudah
     bekerja, yang ini menambahkan gerbang kedua untuk penyetelan portal.
     Nilainya masuk daftar kebergantungan efek supaya loop-nya benar-benar
     dibongkar saat penyetelannya dinyalakan di tengah halaman terbuka. */
  const kurangiGerakPemakai = useReducedMotion();
  const planeRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const halus = window.matchMedia('(pointer: fine)');
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (kurangiGerakPemakai || !halus.matches || kurangiGerak.matches) return;

    const wrap = wrapRef.current;
    const plane = planeRef.current;
    const dot = dotRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !plane || !dot || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const root = document.documentElement;
    root.setAttribute('data-plane-cursor', '');

    /* ---- keadaan ---- */
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    let sudut = 0;
    let skala = 1;
    let terlihat = false;
    let mengunci = false;          // sedang di atas elemen yang dapat diklik
    let riak = 0;                  // stempel waktu klik terakhir
    const jejak: { x: number; y: number; lahir: number }[] = [];

    let w = 0;
    let h = 0;

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

    /* ---- jejak kondensasi ---- */
    const gambarJejak = (now: number) => {
      if (jejak.length < 2) return;

      for (let i = 1; i < jejak.length; i++) {
        const a = jejak[i - 1];
        const b = jejak[i];
        const umur = (now - b.lahir) / TRAIL_LIFE;
        if (umur >= 1) continue;

        // Meruncing ke belakang: makin tua titiknya, makin tipis dan pudar.
        const sisa = 1 - umur;
        const rasio = i / jejak.length;
        const alpha = sisa * rasio * (mengunci ? 0.55 : 0.38);
        if (alpha <= 0.01) continue;

        // Lapis luar: kabut lebar dan lembut.
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(186,230,253,${alpha * 0.4})`;
        ctx.lineWidth = 5.5 * rasio * sisa + 0.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Lapis inti: garis tipis yang lebih terang.
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1.8 * rasio * sisa + 0.2;
        ctx.stroke();
      }
    };

    /* ---- riak saat diklik ---- */
    const gambarRiak = (now: number) => {
      if (!riak) return;
      const p = (now - riak) / RIPPLE_LIFE;
      if (p >= 1) { riak = 0; return; }

      const r = 6 + p * 46;
      ctx.beginPath();
      ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125,211,252,${(1 - p) * 0.55})`;
      ctx.lineWidth = 1.4 * (1 - p) + 0.3;
      ctx.stroke();
    };

    /* ---- putaran utama ---- */
    let raf = 0;
    const bingkai = (now: number) => {
      // 1. badan pesawat menyusul kursor
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      pos.x += dx * FOLLOW;
      pos.y += dy * FOLLOW;

      // 2. hidung mengikuti arah gerak; dibekukan saat nyaris diam supaya
      //    pesawat tidak berputar-putar sendiri ketika kursor berhenti
      const laju = Math.hypot(dx, dy);
      if (laju > MIN_SPEED) {
        const tujuan = (Math.atan2(dy, dx) * 180) / Math.PI;
        sudut += selisihSudut(tujuan, sudut) * TURN;
      }

      // 3. jejak
      jejak.push({ x: pos.x, y: pos.y, lahir: now });
      if (jejak.length > TRAIL_MAX) jejak.shift();
      while (jejak.length && now - jejak[0].lahir > TRAIL_LIFE) jejak.shift();

      ctx.clearRect(0, 0, w, h);
      gambarJejak(now);
      gambarRiak(now);

      // 4. pembesaran saat mengunci sasaran, diperhalus di sini alih-alih
      //    lewat transisi CSS — `transform` ditulis ulang tiap bingkai, jadi
      //    transisi CSS tidak akan pernah sempat berjalan.
      skala += ((mengunci ? 1.16 : 1) - skala) * 0.15;

      // 5. tulis transform (satu-satunya sentuhan ke DOM per bingkai)
      plane.style.transform =
        `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) rotate(${sudut}deg) scale(${skala})`;
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;

      raf = requestAnimationFrame(bingkai);
    };

    const mulai = () => { if (!raf) raf = requestAnimationFrame(bingkai); };
    const berhenti = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    /* ---- peristiwa ---- */
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!terlihat) {
        // Muncul hanya setelah kursor benar-benar bergerak — kalau tidak,
        // pesawat nangkring di tengah layar sebelum ada yang menggerakkannya.
        terlihat = true;
        pos.x = e.clientX;
        pos.y = e.clientY;
        wrap.style.opacity = '1';
      }
    };

    const dapatDiklik = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest('a, button, [role="button"], input, select, textarea');

    const onOver = (e: PointerEvent) => {
      if (dapatDiklik(e.target)) {
        mengunci = true;
        wrap.dataset.lock = 'on';
      }
    };
    const onOut = (e: PointerEvent) => {
      if (dapatDiklik(e.target)) {
        mengunci = false;
        delete wrap.dataset.lock;
      }
    };

    const onDown = () => { riak = performance.now(); };
    const onLeave = () => { wrap.style.opacity = '0'; };
    const onEnter = () => { if (terlihat) wrap.style.opacity = '1'; };
    const onVisibility = () => (document.hidden ? berhenti() : mulai());

    /* Bila pengguna mengubah preferensinya selagi halaman terbuka, hormati
       segera: kursor bawaan dikembalikan dan efeknya berhenti total. */
    const onPrefChange = () => {
      if (kurangiGerak.matches || !halus.matches) bersihkan();
    };

    ukurUlang();
    mulai();

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('resize', ukurUlang);
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('visibilitychange', onVisibility);
    kurangiGerak.addEventListener('change', onPrefChange);
    halus.addEventListener('change', onPrefChange);

    let sudahBersih = false;
    function bersihkan() {
      if (sudahBersih) return;
      sudahBersih = true;
      berhenti();
      root.removeAttribute('data-plane-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', ukurUlang);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('visibilitychange', onVisibility);
      kurangiGerak.removeEventListener('change', onPrefChange);
      halus.removeEventListener('change', onPrefChange);
      if (wrap) wrap.style.opacity = '0';
    }

    return bersihkan;
  }, [kurangiGerakPemakai]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] opacity-0 transition-opacity duration-300"
    >
      {/* Jejak kondensasi + riak klik. `pointer-events-none` diulang di sini,
          bukan hanya diwarisi dari pembungkus: kanvas ini menutupi seluruh
          layar pada z-9999, jadi jangan sampai satu suntingan pada pembungkus
          diam-diam membuatnya memblokir setiap klik di halaman. */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full" />

      {/* titik penanda posisi kursor yang sebenarnya */}
      <div
        ref={dotRef}
        className="absolute top-0 left-0 w-[5px] h-[5px] rounded-full bg-sky-200 shadow-[0_0_8px_2px_rgba(125,211,252,0.7)] will-change-transform"
      />

      {/* badan pesawat + cincin bidik */}
      <div ref={planeRef} className="absolute top-0 left-0 will-change-transform">
        {/* Cincin bidik hanya tampak saat mengunci sasaran. Kemunculannya
            dikendalikan atribut `data-lock` pada pembungkus lewat aturan CSS
            di `globals.css` — tanpa state React, tanpa render ulang. */}
        <svg
          /* Pemusatan sengaja TIDAK memakai utilitas `-translate-*`: Tailwind v4
             menuliskannya ke properti `translate`, yang akan menumpuk dengan
             `transform` milik animasi dan menggeser cincin dua kali. Keduanya
             ditangani satu deklarasi di `globals.css`. */
          className="pc-reticle absolute left-1/2 top-1/2 w-[54px] h-[54px]"
          viewBox="0 0 60 60"
          fill="none"
        >
          <circle cx="30" cy="30" r="26" stroke="rgba(125,211,252,0.55)" strokeWidth="1" strokeDasharray="5 9" />
        </svg>

        <svg
          width="34"
          height="34"
          viewBox="0 0 40 40"
          fill="none"
          className="block drop-shadow-[0_0_10px_rgba(56,189,248,0.85)]"
        >
          <defs>
            <linearGradient id="plane-cursor-body" x1="9" y1="20" x2="38" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#ffffff" />
            </linearGradient>
          </defs>
          {/* Siluet menghadap KANAN pada 0° — searah dengan hasil `atan2`,
              sehingga sudut dari putaran utama dapat dipakai apa adanya. */}
          <path
            d="M38 20 L9 31.5 L14.5 20 L9 8.5 Z"
            fill="url(#plane-cursor-body)"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
