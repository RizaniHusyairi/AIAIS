import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C } from '../theme';
import { clamp, ease, pop } from '../motion/easing';

/** Angka bergulir dari 0 ke nilai asli. */
export const CountUp: React.FC<{ to: number; from: number; dur?: number; style?: React.CSSProperties }> = ({ to, from, dur = 30, style }) => {
  const f = useCurrentFrame();
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{Math.round(to * ease(f, from, from + dur))}</span>;
};

/** Efek ketik dengan kursor berkedip. */
export const TypeText: React.FC<{ text: string; from: number; cps?: number; style?: React.CSSProperties }> = ({ text, from, cps = 1.6, style }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.floor((f - from) * cps));
  const done = n >= text.length;
  return (
    <span style={style}>
      {text.slice(0, n)}
      {f >= from && (!done || Math.floor(f / 8) % 2 === 0) ? <span style={{ opacity: 0.8 }}>▍</span> : null}
    </span>
  );
};

/** Kartu yang membalik 180° untuk memperlihatkan sisi belakang. */
export const FlipCard: React.FC<{ at: number; front: React.ReactNode; back: React.ReactNode; style?: React.CSSProperties }> = ({ at, front, back, style }) => {
  const f = useCurrentFrame();
  const r = interpolate(pop(f, at, 16), [0, 1], [0, 180]);
  // Sisi ditukar lewat sudut, bukan backface-visibility — renderer web (web/main.tsx)
  // tidak menghormati properti itu dan akan memperlihatkan sisi depan yang tercermin.
  const showBack = r > 90;
  return (
    <div style={{ position: 'relative', perspective: 1600, ...style }}>
      <div style={{ position: 'absolute', inset: 0, transform: `rotateY(${showBack ? r - 180 : r}deg)` }}>{showBack ? back : front}</div>
    </div>
  );
};

/** Lingkaran centang yang menggambar dirinya sendiri. */
export const SuccessCheck: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 180, color = C.green }) => {
  const f = useCurrentFrame();
  const s = pop(f, at, 9);
  const draw = interpolate(f, [at + 6, at + 20], [0, 1], clamp);
  return (
    <div style={{ width: size, height: size, transform: `scale(${s})` }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="46" fill={color} />
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
        <path d="M28 52 L44 67 L73 36" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="70" strokeDashoffset={70 * (1 - draw)} />
      </svg>
    </div>
  );
};

/** Lencana status kecil dengan titik berdenyut. */
export const StatusPill: React.FC<{ label: string; color: string }> = ({ label, color }) => {
  const f = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 30, background: `${color}33`, color, fontSize: 20, fontWeight: 700 }}>
      <span style={{ width: 10, height: 10, borderRadius: 10, background: color, boxShadow: `0 0 ${6 + pulse * 10}px ${color}`, opacity: 0.6 + pulse * 0.4 }} />
      {label}
    </span>
  );
};
