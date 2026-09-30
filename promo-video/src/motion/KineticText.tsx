import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT } from '../theme';
import { pop } from './easing';

type Props = {
  text: string;
  /** Kata yang disorot gradien (dicocokkan persis, tanpa tanda baca). */
  highlight?: string[];
  delay?: number;
  size?: number;
  top?: number;
  /** Frame (lokal) saat teks mulai keluar; kosongkan bila bertahan. */
  exitAt?: number;
  stagger?: number;
};

/** Tipografi kinetik: tiap kata melompat naik bergiliran, lalu memudar ke atas saat keluar. */
export const KineticText: React.FC<Props> = ({ text, highlight = [], delay = 0, size = 78, top = 270, exitAt, stagger = 3 }) => {
  const f = useCurrentFrame();
  const words = text.split(' ');
  const out = exitAt === undefined ? 0 : interpolate(f, [exitAt, exitAt + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 70,
        right: 70,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: `0 ${size * 0.26}px`,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: -1.5,
        textAlign: 'center',
        opacity: 1 - out,
        transform: `translateY(${-40 * out}px)`,
      }}
    >
      {words.map((w, i) => {
        const p = pop(f, delay + i * stagger, 14);
        const hot = highlight.includes(w.replace(/[^\p{L}\p{N}.]/gu, ''));
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.12 }}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * size * 1.1}px) rotate(${(1 - p) * 8}deg)`,
                opacity: Math.min(1, p * 1.4),
                color: C.white,
                ...(hot && {
                  background: `linear-gradient(90deg, ${C.amber}, #fde68a)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }),
                textShadow: hot ? 'none' : '0 6px 30px rgba(6,18,58,0.45)',
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};
