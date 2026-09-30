import React from 'react';
import { AbsoluteFill, random, useCurrentFrame } from 'remotion';
import { C, H, W } from '../theme';

const PARTICLES = Array.from({ length: 46 }, (_, i) => ({
  x: random(`px${i}`) * W,
  y: random(`py${i}`) * H,
  r: 1.5 + random(`pr${i}`) * 3.5,
  speed: 0.3 + random(`ps${i}`) * 1.1,
  phase: random(`ph${i}`) * Math.PI * 2,
}));

/**
 * Latar langit bergerak: gradien hero situs, dua cahaya lembut yang
 * berkeliaran, dan partikel naik perlahan (padanan `SkyParticles` situs).
 */
export const SkyBackground: React.FC<{ hue?: 'day' | 'dusk' }> = ({ hue = 'day' }) => {
  const f = useCurrentFrame();
  const glowA = { x: 200 + Math.sin(f / 60) * 160, y: 420 + Math.cos(f / 75) * 120 };
  const glowB = { x: 860 + Math.cos(f / 70) * 140, y: 1500 + Math.sin(f / 55) * 140 };
  const bg =
    hue === 'day'
      ? `linear-gradient(165deg, ${C.navyDeep} 0%, ${C.navy} 30%, ${C.blue} 68%, ${C.sky} 100%)`
      : `linear-gradient(165deg, ${C.navyDeep} 0%, #1e1b4b 45%, #7c3aed 80%, #f472b6 100%)`;

  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: glowA.x - 420, top: glowA.y - 420, width: 840, height: 840, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.45), transparent 65%)' }} />
      <div style={{ position: 'absolute', left: glowB.x - 460, top: glowB.y - 460, width: 920, height: 920, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.35), transparent 65%)' }} />
      {/* Kisi halus memberi kesan "layar digital" tanpa mencuri perhatian. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '90px 90px',
          backgroundPosition: `0 ${(f * 0.6) % 90}px`,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />
      {PARTICLES.map((p, i) => {
        const y = (((p.y - f * p.speed * 2) % H) + H) % H;
        const x = p.x + Math.sin(f / 40 + p.phase) * 18;
        const o = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(f / 20 + p.phase));
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: p.r * 2, height: p.r * 2, borderRadius: '50%', background: C.white, opacity: o, boxShadow: `0 0 ${p.r * 4}px rgba(255,255,255,0.8)` }} />;
      })}
    </AbsoluteFill>
  );
};
