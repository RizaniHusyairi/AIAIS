import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { PlaneTakeoff, Newspaper, LifeBuoy, FileSearch, Palmtree, Building2, Download, Globe } from 'lucide-react';
import { C, FONT } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { clamp, ease, pop } from '../motion/easing';
import { Glass } from '../ui/Glass';

const ORBIT = [PlaneTakeoff, Newspaper, LifeBuoy, FileSearch, Palmtree, Building2];

/** 31–35 dtk: ikon fitur tersedot ke logo, URL besar berdenyut, ajakan memasang aplikasi. */
export const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const suck = ease(f, 6, 30);
  const logo = pop(f, 22, 10);
  const url = pop(f, 34, 11);
  const btn = pop(f, 48, 11);
  const beat = 1 + 0.035 * Math.max(0, Math.sin((f - 34) / 4.5));
  const flash = interpolate(f, [26, 30, 44], [0, 0.7, 0], clamp);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.white }}>
      <SkyBackground />
      {/* Ikon fitur berputar lalu tersedot ke pusat */}
      {ORBIT.map((Icon, i) => {
        const a = (i / ORBIT.length) * Math.PI * 2 + f / 16;
        const r = 420 * (1 - suck);
        const x = 540 + Math.cos(a) * r;
        const y = 820 + Math.sin(a) * r;
        return (
          <Glass key={i} strong radius={36} style={{ position: 'absolute', left: x - 70, top: y - 70, width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - suck * 0.8})`, opacity: 1 - ease(f, 24, 30) }}>
            <Icon size={70} color={C.white} />
          </Glass>
        );
      })}
      <AbsoluteFill style={{ background: C.white, opacity: flash }} />
      {/* Logo */}
      <div style={{ position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${logo})` }}>
        <div style={{ width: 300, height: 300, borderRadius: 80, background: 'rgba(255,255,255,0.16)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 90px rgba(125,211,252,0.7)' }}>
          <Img src={staticFile('logo/logo-white-apt.svg')} style={{ width: 220 }} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 900, left: 0, right: 0, textAlign: 'center', opacity: logo }}>
        <div style={{ fontSize: 44, fontWeight: 700, opacity: 0.9 }}>Bandar Udara</div>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>A.P.T. Pranoto Samarinda</div>
      </div>
      {/* URL */}
      <div style={{ position: 'absolute', top: 1130, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${url * beat})`, opacity: url }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '26px 50px', borderRadius: 70, background: `linear-gradient(90deg, ${C.amber}, #fde68a)`, color: C.navy, fontSize: 76, fontWeight: 800, letterSpacing: -1.5, boxShadow: '0 30px 80px rgba(251,191,36,0.45)' }}>
          <Globe size={70} strokeWidth={2.4} /> aptpairport.id
        </div>
      </div>
      {/* Ajakan pasang aplikasi */}
      <div style={{ position: 'absolute', top: 1330, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - btn) * 60}px)`, opacity: btn }}>
        <Glass strong radius={50} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 40px', fontSize: 36, fontWeight: 800 }}>
          <Download size={40} /> Buka di ponsel & pasang aplikasinya
        </Glass>
      </div>
      {/* Logo Kemenhub — penanda portal resmi */}
      <div style={{ position: 'absolute', top: 1500, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, opacity: ease(f, 56, 70) }}>
        <div style={{ background: C.white, borderRadius: 24, padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Img src={staticFile('logo/logo-kemenhub.png')} style={{ height: 70 }} />
          <span style={{ color: C.navy, fontSize: 24, fontWeight: 700 }}>Kementerian Perhubungan</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
