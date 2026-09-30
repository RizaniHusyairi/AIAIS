import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { KineticText } from '../motion/KineticText';
import { PlaneSwoosh } from '../motion/PlaneSwoosh';
import { clamp, glide, pop } from '../motion/easing';

/** 0–3 dtk: pertanyaan pemancing + pesawat melintas + logo kecil memberi konteks resmi. */
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const badge = pop(f, 4);
  const ring = glide(f, 30);
  return (
    <AbsoluteFill>
      <SkyBackground />
      <PlaneSwoosh from={0} dur={70} y={1350} size={170} />
      {/* Cincin radar yang meluas di belakang judul */}
      {[0, 1, 2].map((i) => {
        const t = interpolate((f + i * 22) % 66, [0, 66], [0, 1], clamp);
        return (
          <div key={i} style={{ position: 'absolute', left: 540 - 450, top: 960 - 450, width: 900, height: 900, borderRadius: '50%', border: '3px solid rgba(125,211,252,0.6)', transform: `scale(${0.3 + t})`, opacity: (1 - t) * 0.6 }} />
        );
      })}
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${badge})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 30px', borderRadius: 60, background: 'rgba(255,255,255,0.14)', border: '2px solid rgba(255,255,255,0.3)', fontFamily: FONT, color: C.white, fontSize: 30, fontWeight: 700 }}>
          <Img src={staticFile('logo/logo-white-apt.svg')} style={{ height: 50 }} />
          Bandara APT Pranoto
        </div>
      </div>
      <KineticText text="Mau terbang dari Samarinda?" highlight={['Samarinda']} top={760} size={112} delay={8} stagger={4} />
      <div style={{ position: 'absolute', top: 1140, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, color: C.skyLight, fontSize: 40, fontWeight: 600, opacity: ring, transform: `translateY(${(1 - ring) * 30}px)` }}>
        Semua yang Anda perlu ada di satu tempat
      </div>
    </AbsoluteFill>
  );
};
