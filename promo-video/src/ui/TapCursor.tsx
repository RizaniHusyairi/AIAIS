import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { clamp, ease } from '../motion/easing';

export type Tap = { at: number; x: number; y: number };

/**
 * Jari virtual yang berpindah antar titik ketuk. Pada tiap `at` ia menekan
 * (mengecil) dan memancarkan riak — isyarat visual bahwa UI "dipakai".
 * Koordinat relatif terhadap induknya.
 */
export const TapCursor: React.FC<{ taps: Tap[]; enter?: number; exit?: number }> = ({ taps, enter = 0, exit }) => {
  const f = useCurrentFrame();
  if (!taps.length) return null;

  // Cari segmen perjalanan aktif: jari tiba di titik 12 frame sebelum ketukan.
  let x = taps[0].x;
  let y = taps[0].y;
  for (let i = 1; i < taps.length; i++) {
    const t = ease(f, taps[i].at - 16, taps[i].at - 2);
    x = x + (taps[i].x - x) * t;
    y = y + (taps[i].y - y) * t;
  }
  const appear = ease(f, enter, enter + 10);
  const gone = exit === undefined ? 0 : ease(f, exit, exit + 8);
  const press = Math.max(...taps.map((t) => interpolate(f, [t.at - 3, t.at, t.at + 5], [0, 1, 0], clamp)));

  return (
    <>
      {taps.map((t, i) => {
        const r = interpolate(f, [t.at, t.at + 18], [0, 1], clamp);
        if (r <= 0 || r >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: t.x - 70,
              top: t.y - 70,
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: '5px solid rgba(255,255,255,0.9)',
              transform: `scale(${0.2 + r * 1.1})`,
              opacity: 1 - r,
              zIndex: 60,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: x - 34,
          top: y - 34,
          width: 68,
          height: 68,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.85)',
          border: '4px solid rgba(255,255,255,1)',
          boxShadow: '0 10px 30px rgba(3,10,40,0.45), 0 0 0 10px rgba(255,255,255,0.18)',
          transform: `scale(${(1 - press * 0.28) * appear * (1 - gone)})`,
          zIndex: 61,
        }}
      />
    </>
  );
};
