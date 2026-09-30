import React from 'react';
import { Plane } from 'lucide-react';
import { Easing, useCurrentFrame } from 'remotion';
import { C, W } from '../theme';
import { ease } from './easing';

/** Pesawat melintas diagonal meninggalkan jejak kondensasi. */
export const PlaneSwoosh: React.FC<{ from?: number; dur?: number; y?: number; size?: number }> = ({ from = 0, dur = 34, y = 900, size = 150 }) => {
  const f = useCurrentFrame();
  const t = ease(f, from, from + dur, Easing.inOut(Easing.cubic));
  if (t <= 0) return null;
  const x = -250 + t * (W + 500);
  const py = y - t * 420 + Math.sin(t * Math.PI) * -60;
  const trailLen = Math.min(x + 250, 900);
  const fade = t >= 1 ? Math.max(0, 1 - (f - from - dur) / 15) : 1;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fade }}>
      <div
        style={{
          position: 'absolute',
          left: x - trailLen,
          top: py + size / 2 - 6,
          width: trailLen,
          height: 12,
          borderRadius: 12,
          transformOrigin: 'right center',
          transform: 'rotate(-15deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85))',
          filter: 'blur(2px)',
        }}
      />
      <div style={{ position: 'absolute', left: x - size / 2, top: py, transform: 'rotate(24deg)', filter: `drop-shadow(0 10px 30px ${C.navyDeep})` }}>
        <Plane size={size} color={C.white} fill={C.white} strokeWidth={1.2} />
      </div>
    </div>
  );
};
