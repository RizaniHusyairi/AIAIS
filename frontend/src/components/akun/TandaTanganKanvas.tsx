'use client';

/**
 * Kanvas tanda tangan.
 *
 * Ditulis sendiri, tanpa pustaka, dan alasannya bukan penghematan dependensi.
 * Penandatangan sesungguhnya memakai JARI DI PONSEL, sambil berdiri di pintu
 * ruang rapat. Tiga hal harus disetel untuk keadaan itu, dan ketiganya yang
 * membuat komponen ini ada:
 *
 *  1. `touch-action: none` pada kanvas. Tanpa itu, goresan jari ikut menggulung
 *     halaman dan tanda tangannya putus di tengah — kegagalan paling sering
 *     pada kanvas tanda tangan di ponsel.
 *  2. Kanvas diskalakan ke `devicePixelRatio`. Tanpa itu, goresan pada layar
 *     ponsel keluar buram dan bergerigi saat dicetak di kertas A4.
 *  3. Deteksi kanvas KOSONG. Peramban selalu bersedia mengekspor kanvas putih
 *     menjadi PNG yang sah, jadi tanpa pemeriksaan ini formulirnya menerima
 *     "tanda tangan" yang sebenarnya tidak pernah digoreskan.
 *
 * Nilainya dikeluarkan sebagai data URI PNG lewat `onChange`; backend
 * memeriksa ulang bahwa isinya benar-benar PNG.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

export default function TandaTanganKanvas({
  onChange,
  tinggi = 180,
}: {
  onChange: (dataUri: string | null) => void;
  tinggi?: number;
}) {
  const kanvasRef = useRef<HTMLCanvasElement | null>(null);
  const menggores = useRef(false);
  const adaGoresan = useRef(false);
  const [terisi, setTerisi] = useState(false);

  /** Sesuaikan buffer kanvas dengan ukuran tampil dan kerapatan piksel layar. */
  const siapkanKanvas = useCallback(() => {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;

    const rasio = window.devicePixelRatio || 1;
    const lebar = kanvas.clientWidth;

    kanvas.width = lebar * rasio;
    kanvas.height = tinggi * rasio;

    const ctx = kanvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(rasio, rasio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    // Latar putih ditulis eksplisit. Kanvas yang transparan menghasilkan PNG
    // bertanda tangan hitam di atas transparan — tak terbaca begitu dicetak
    // pada kertas maupun ditempel di PDF berlatar putih.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lebar, tinggi);
  }, [tinggi]);

  useEffect(() => {
    siapkanKanvas();

    // Memutar ponsel mengubah lebar kanvas; buffernya harus disiapkan ulang.
    // Goresan yang ada memang hilang — dan itu lebih jujur daripada goresan
    // yang teregang mengikuti lebar baru.
    const onResize = () => {
      siapkanKanvas();
      adaGoresan.current = false;
      setTerisi(false);
      onChange(null);
    };

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, [siapkanKanvas, onChange]);

  const titik = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const kanvas = kanvasRef.current!;
    const kotak = kanvas.getBoundingClientRect();

    return { x: e.clientX - kotak.left, y: e.clientY - kotak.top };
  };

  const mulai = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const kanvas = kanvasRef.current;
    const ctx = kanvas?.getContext('2d');
    if (!kanvas || !ctx) return;

    // Menangkap pointer supaya goresan tetap terekam meski jari sempat keluar
    // dari kotak kanvas — di layar sempit itu sering terjadi.
    kanvas.setPointerCapture(e.pointerId);
    menggores.current = true;

    const { x, y } = titik(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Satu titik pun dihitung sebagai goresan; sebagian tanda tangan diawali
    // ketukan singkat.
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
  };

  const gores = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!menggores.current) return;

    const ctx = kanvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = titik(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!adaGoresan.current) {
      adaGoresan.current = true;
      setTerisi(true);
    }
  };

  const selesai = () => {
    if (!menggores.current) return;
    menggores.current = false;

    const kanvas = kanvasRef.current;
    if (!kanvas) return;

    // Kanvas yang belum tergores TIDAK dikirim sebagai gambar kosong.
    onChange(adaGoresan.current ? kanvas.toDataURL('image/png') : null);
  };

  const ulangi = () => {
    siapkanKanvas();
    adaGoresan.current = false;
    setTerisi(false);
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Tanda Tangan
        </span>
        <button
          type="button"
          onClick={ulangi}
          disabled={!terisi}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" /> Ulangi
        </button>
      </div>

      <div className={`relative rounded-xl overflow-hidden ring-1 transition-colors ${terisi ? 'ring-blue-400' : 'ring-slate-200'}`}>
        <canvas
          ref={kanvasRef}
          style={{ height: tinggi, touchAction: 'none' }}
          className="w-full block bg-white cursor-crosshair"
          onPointerDown={mulai}
          onPointerMove={gores}
          onPointerUp={selesai}
          onPointerCancel={selesai}
          onPointerLeave={selesai}
        />

        {!terisi && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <PenLine className="w-5 h-5 text-slate-300" />
            <p className="mt-1.5 text-[12px] text-slate-400">Goreskan tanda tangan Anda di sini</p>
          </div>
        )}
      </div>

      <p className="mt-1.5 text-[11.5px] text-slate-400">
        Gunakan jari pada layar sentuh, atau tetikus pada komputer.
      </p>
    </div>
  );
}
