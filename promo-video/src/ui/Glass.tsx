import React from 'react';
import { C } from '../theme';

type Props = React.HTMLAttributes<HTMLDivElement> & { strong?: boolean; radius?: number; glow?: string };

/** Kartu kaca buram — satuan dasar seluruh UI di video. */
export const Glass: React.FC<Props> = ({ strong, radius = 34, glow, style, children, ...rest }) => (
  <div
    {...rest}
    style={{
      background: strong ? C.glassStrong : C.glass,
      border: `2px solid ${C.glassLine}`,
      borderRadius: radius,
      backdropFilter: 'blur(24px)',
      boxShadow: `0 24px 60px rgba(3,10,40,0.35)${glow ? `, 0 0 50px ${glow}` : ''}, inset 0 1px 0 rgba(255,255,255,0.35)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Garis kerangka pengganti teks — dipakai bila data kosong atau untuk isian formulir. */
export const Skeleton: React.FC<{ w: number | string; h?: number; o?: number; shimmer?: number }> = ({ w, h = 18, o = 0.28, shimmer = 0 }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: h,
      background: `linear-gradient(90deg, rgba(255,255,255,${o}) ${shimmer - 30}%, rgba(255,255,255,${o + 0.25}) ${shimmer}%, rgba(255,255,255,${o}) ${shimmer + 30}%)`,
    }}
  />
);
