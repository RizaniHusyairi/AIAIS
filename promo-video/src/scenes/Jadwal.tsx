import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { KineticText } from '../motion/KineticText';
import { clamp, glide, pop } from '../motion/easing';
import { PhoneFrame } from '../ui/PhoneFrame';
import { FlightRow, BoardingPassCard } from '../ui/FlightCard';
import { TapCursor } from '../ui/TapCursor';
import { Skeleton } from '../ui/Glass';
import { departures, arrivals } from '../data';

const TAP_DEP = 34;
const LIFT = 92;

/** 3–8 dtk: tab Keberangkatan diketuk, daftar asli berjatuhan, satu kartu terangkat jadi boarding pass. */
export const Jadwal: React.FC = () => {
  const f = useCurrentFrame();
  // Ponsel sudah hadir: adegan Desktop berakhir dengan layar laptop yang berubah
  // menjadi ponsel tepat di posisi ini, jadi tanpa animasi masuk.
  const enter = 1;
  // Sebelum ketukan tampil kedatangan, sesudahnya keberangkatan — indikator tab meluncur.
  const tab = interpolate(f, [TAP_DEP, TAP_DEP + 10], [0, 1], clamp);
  const list = tab < 0.5 ? arrivals : departures;
  const listStart = tab < 0.5 ? 6 : TAP_DEP + 4;
  const lift = glide(f, LIFT);
  const hero = departures[0];

  return (
    <AbsoluteFill>
      <SkyBackground />
      <KineticText text="Cek jadwal keberangkatan & kedatangan" highlight={['jadwal']} size={76} top={270} />
      <PhoneFrame y={1130 + (1 - enter) * 900} rotateX={(1 - enter) * 20} scale={0.94}>
        <div style={{ position: 'absolute', top: 100, left: 34, right: 34 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.skyLight, letterSpacing: 2 }}>APT PRANOTO · AAP</div>
          <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 22 }}>Jadwal Hari Ini</div>
          {/* Segmented control */}
          <div style={{ position: 'relative', display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: 26, padding: 6, marginBottom: 24 }}>
            <div style={{ position: 'absolute', top: 6, bottom: 6, width: 'calc(50% - 6px)', left: `calc(6px + ${(1 - tab) * 50}% - ${(1 - tab) * 6}px)`, borderRadius: 22, background: `linear-gradient(90deg, ${C.amber}, #fcd34d)` }} />
            {['Keberangkatan', 'Kedatangan'].map((t, i) => (
              <div key={t} style={{ position: 'relative', flex: 1, textAlign: 'center', padding: '16px 0', fontSize: 25, fontWeight: 800, color: (i === 0 ? tab : 1 - tab) > 0.5 ? C.navy : C.white }}>
                {t}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {list.length === 0
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} w="100%" h={100} o={0.15} />)
              : list.slice(0, 5).map((fl, i) => {
                  const p = pop(f, listStart + i * 4, 13);
                  const isHero = tab >= 0.5 && i === 0;
                  return (
                    <div key={fl.type + fl.number + i} style={{ opacity: isHero ? 1 - lift * 0.8 : p, transform: `translateY(${(1 - p) * -80}px) scale(${0.9 + p * 0.1})` }}>
                      <FlightRow f={fl} highlight={isHero ? interpolate(f, [LIFT - 20, LIFT - 8], [0, 1], clamp) : 0} />
                    </div>
                  );
                })}
          </div>
        </div>
        <TapCursor taps={[{ at: 20, x: 440, y: 600 }, { at: TAP_DEP, x: 170, y: 262 }, { at: LIFT - 10, x: 300, y: 380 }]} enter={14} exit={LIFT} />
      </PhoneFrame>
      {/* Kartu teratas terangkat keluar dari ponsel dan membesar menjadi boarding pass. */}
      {hero && lift > 0.01 && (
        <div style={{ position: 'absolute', left: 110, top: interpolate(lift, [0, 1], [640, 1040]), transform: `perspective(1800px) rotateX(${(1 - lift) * 30}deg) rotateZ(${-4 * lift}deg) scale(${0.7 + lift * 0.3})`, opacity: Math.min(1, lift * 2) }}>
          <BoardingPassCard f={hero} />
        </div>
      )}
    </AbsoluteFill>
  );
};
