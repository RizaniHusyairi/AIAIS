'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Langit malam yang menaungi seluruh portal saat tema malam aktif.
 *
 * Tiga lapisan, semuanya jauh di belakang isi halaman:
 *   1. Bintang berkelip dengan tiga kedalaman — yang paling redup paling jauh.
 *   2. Pesawat jauh yang sesekali melintas, lengkap dengan lampu navigasi
 *      merah di sayap kiri, hijau di sayap kanan, dan strobo putih yang
 *      berkedip sekali per 1,3 detik. Itulah tanda pengenal pesawat malam
 *      dari darat, dan itu pula yang membuat lapisan ini terbaca sebagai
 *      langit bandara, bukan sekadar wallpaper berbintang.
 *   3. Semburat cahaya di kaki layar — pantulan lampu apron ke awan rendah.
 *
 * Mengikuti pola `components/effects/` yang sudah ada (`SkyParticles`,
 * `CometField`): satu kanvas, satu loop rAF, tanpa state React, berhenti saat
 * tab tidak aktif, dan menghormati `prefers-reduced-motion`.
 *
 * KERAPATAN DIHITUNG DARI LUAS VIEWPORT, bukan angka mati. Jumlah bintang yang
 * pas untuk monitor 27 inci menjadi taburan yang jarang dan aneh di layar
 * ponsel 360 px, dan sebaliknya menjadi kabut kelabu di sana.
 */

type Bintang = {
  x: number; y: number; r: number;
  base: number;   // opasitas dasar
  tw: number;     // kecepatan kedip
  tp: number;     // fase kedip
  depth: number;  // 0.3 – 1, dipakai hanyutan mendatar
};

type Pesawat = {
  x: number; y: number;
  vx: number;     // px per detik; negatif berarti terbang ke kiri
  scale: number;  // makin kecil makin jauh
  t: number;      // umur, detik
  strobe: number; // fase strobo
};

/** Satu bintang per sekian piksel persegi, lalu dijepit agar wajar di kedua ujung. */
const PIKSEL_PER_BINTANG = 7800;
const BINTANG_MIN = 46;
const BINTANG_MAKS = 240;

/** Jeda antar pesawat, detik. Langit bandara ramai, tapi ini latar — bukan tontonan. */
const JEDA_PESAWAT_MIN = 7;
const JEDA_PESAWAT_MAKS = 17;

export default function LangitMalam() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, dpr = 1;
    let bintang: Bintang[] = [];
    let pesawat: Pesawat[] = [];
    let kePesawat = JEDA_PESAWAT_MIN;
    let raf = 0;
    let lalu = 0;

    const acak = (a: number, b: number) => a + Math.random() * (b - a);

    const semaiBintang = () => {
      const jumlah = Math.round(
        Math.min(BINTANG_MAKS, Math.max(BINTANG_MIN, (w * h) / PIKSEL_PER_BINTANG)),
      );
      bintang = Array.from({ length: jumlah }, () => {
        const depth = acak(0.3, 1);
        return {
          x: Math.random() * w,
          y: Math.random() * h * 0.92,
          r: acak(0.45, 1.5) * depth,
          // Bintang jauh lebih redup. Itu yang memberi kedalaman, bukan ukuran.
          base: acak(0.18, 0.85) * depth,
          tw: acak(0.5, 1.9),
          tp: Math.random() * Math.PI * 2,
          depth,
        };
      });
    };

    const resize = () => {
      const lebar = window.innerWidth;
      const tinggi = window.innerHeight;
      if (lebar === w && tinggi === h) return;

      w = lebar;
      h = tinggi;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      semaiBintang();
      pesawat = [];

      // Gambar satu bingkai SEKARANG, jangan menunggu rAF.
      //
      // `requestAnimationFrame` tidak berjalan selama halaman tidak menggambar
      // — tab latar, jendela tersembunyi, peramban yang menunda bingkai
      // pertama. Tanpa baris ini langitnya kosong sampai bingkai itu akhirnya
      // datang, dan pengunjung sempat melihat halaman malam tanpa bintang
      // sama sekali. `SkyParticles` menempuh jalan yang sama persis di dalam
      // `resize`-nya, dengan alasan yang sama.
      ctx.clearRect(0, 0, w, h);
      gambarBintang(0, 0);
    };

    const lahirkanPesawat = () => {
      const keKiri = Math.random() < 0.42;
      const scale = acak(0.55, 1.15);
      pesawat.push({
        // Berangkat dari luar layar supaya tidak pernah terlihat muncul entah dari mana.
        x: keKiri ? w + 60 : -60,
        // Sepertiga atas layar: itu tinggi jelajah dilihat dari darat.
        y: acak(h * 0.06, h * 0.42),
        vx: (keKiri ? -1 : 1) * acak(22, 46) * scale,
        scale,
        t: 0,
        strobe: Math.random() * 1.3,
      });
    };

    const gambarBintang = (dt: number, waktu: number) => {
      for (const b of bintang) {
        // Hanyutan sangat pelan ke barat — langit yang benar-benar diam terasa
        // seperti gambar tempel.
        b.x -= dt * 1.6 * b.depth;
        if (b.x < -2) b.x = w + 2;

        const kedip = kurangiGerak ? 1 : 0.55 + 0.45 * Math.sin(waktu * b.tw + b.tp);
        const alpha = b.base * kedip;
        if (alpha <= 0.02) continue;

        // Bintang besar diberi halo lembut; yang kecil cukup titik, jauh lebih murah.
        if (b.r > 1.05) {
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3.5);
          g.addColorStop(0, `rgba(214,240,255,${alpha})`);
          g.addColorStop(1, 'rgba(214,240,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(226,245,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const gambarPesawat = (dt: number) => {
      for (let i = pesawat.length - 1; i >= 0; i--) {
        const p = pesawat[i];
        p.x += p.vx * dt;
        p.t += dt;
        p.strobe += dt;

        if (p.x < -140 || p.x > w + 140) {
          pesawat.splice(i, 1);
          continue;
        }

        const arah = Math.sign(p.vx);
        const s = p.scale;
        // Memudar masuk dan keluar di tepi layar.
        const tepi = Math.min(1, Math.min(p.x + 60, w + 60 - p.x) / 120);
        const a = Math.max(0, tepi) * 0.9;
        if (a <= 0.01) continue;

        // Jejak kondensasi, memudar ke belakang.
        const panjang = 90 * s;
        const jg = ctx.createLinearGradient(p.x - arah * panjang, p.y, p.x, p.y);
        jg.addColorStop(0, 'rgba(148,190,230,0)');
        jg.addColorStop(1, `rgba(178,214,245,${0.2 * a})`);
        ctx.strokeStyle = jg;
        ctx.lineWidth = 1.1 * s;
        ctx.beginPath();
        ctx.moveTo(p.x - arah * panjang, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Badan pesawat: hanya siluet redup. Dari darat memang begitu.
        ctx.fillStyle = `rgba(203,222,240,${0.32 * a})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 5.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        const lampu = (dx: number, warna: string, kuat: number) => {
          const lx = p.x + dx * s;
          const g = ctx.createRadialGradient(lx, p.y, 0, lx, p.y, 5.5 * s);
          g.addColorStop(0, warna.replace('%A%', String(kuat * a)));
          g.addColorStop(1, warna.replace('%A%', '0'));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(lx, p.y, 5.5 * s, 0, Math.PI * 2);
          ctx.fill();
        };

        // Merah di kiri, hijau di kanan — dilihat dari belakang pesawat, jadi
        // sisinya bertukar bergantung arah terbang. Detail kecil, tapi inilah
        // yang membedakan "pesawat" dari "titik bergerak".
        lampu(arah > 0 ? -6 : 6, 'rgba(248,113,113,%A%)', 0.85);
        lampu(arah > 0 ? 6 : -6, 'rgba(74,222,128,%A%)', 0.85);

        // Strobo putih: sekejap sekali per 1,3 detik.
        if (p.strobe >= 1.3) p.strobe -= 1.3;
        if (p.strobe < 0.08) {
          const kuat = (1 - p.strobe / 0.08) * a;
          lampu(0, 'rgba(255,255,255,%A%)', kuat * 1.1);
        }
      }
    };

    const bingkai = (ts: number) => {
      const dt = lalu ? Math.min((ts - lalu) / 1000, 0.05) : 0.016;
      lalu = ts;
      const waktu = ts / 1000;

      ctx.clearRect(0, 0, w, h);
      gambarBintang(dt, waktu);

      kePesawat -= dt;
      if (kePesawat <= 0 && pesawat.length < 2) {
        lahirkanPesawat();
        kePesawat = acak(JEDA_PESAWAT_MIN, JEDA_PESAWAT_MAKS);
      }
      gambarPesawat(dt);

      raf = window.requestAnimationFrame(bingkai);
    };

    const berhenti = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      lalu = 0;
    };

    const jalan = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(bingkai);
    };

    // `resize` sudah menggambar satu bingkai diam sendiri, jadi kedua jalur di
    // bawah memakai penangan yang sama. Yang membedakan hanya satu hal: jalur
    // gerak-minimal berhenti di situ, tidak pernah menyalakan loop rAF.
    resize();
    window.addEventListener('resize', resize);

    if (kurangiGerak) {
      return () => window.removeEventListener('resize', resize);
    }

    jalan();
    const onVisibility = () => (document.hidden ? berhenti() : jalan());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      berhenti();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 w-full h-full pointer-events-none select-none"
        // `-1` menaruhnya di atas latar <body> tetapi di bawah seluruh isi
        // halaman. Dengan `0` ia justru menutupi halaman: elemen berposisi
        // digambar setelah isi alir biasa, berapa pun z-index-nya.
        style={{ zIndex: -1 }}
      />
      {/* Pantulan lampu apron pada awan rendah. CSS, bukan kanvas: ia diam,
          jadi tidak ada gunanya menggambarnya ulang enam puluh kali sedetik. */}
      <div className="tema-kabut-apron" aria-hidden="true" />
    </>
  );
}
