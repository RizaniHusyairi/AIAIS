import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { CalendarClock, Zap, Archive, FileUp, UserRoundPen, SendHorizontal, Check } from 'lucide-react';
import { C, FONT } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { KineticText } from '../motion/KineticText';
import { clamp, ease, pop } from '../motion/easing';
import { Glass, Skeleton } from '../ui/Glass';
import { CountUp, FlipCard } from '../ui/bits';
import { TapCursor } from '../ui/TapCursor';
import { DATA } from '../data';

const PART_B = 104;
// Nama langkah sama dengan frontend/src/app/ppid/pengajuan-informasi/bagianFormulir.tsx
const STEPS = [
  { nama: 'Berkas Syarat', icon: FileUp },
  { nama: 'Data & Permohonan', icon: UserRoundPen },
  { nama: 'Tinjau & Kirim', icon: SendHorizontal },
];
const STEP_AT = [PART_B + 22, PART_B + 46, PART_B + 70];
const STAMP = PART_B + 76;

/** 24–31 dtk: tiga golongan informasi publik (angka asli) lalu formulir permohonan tiga langkah. */
export const Ppid: React.FC = () => {
  const f = useCurrentFrame();
  const toB = ease(f, PART_B - 6, PART_B + 12);
  const kinds = [
    { nama: 'Informasi Berkala', icon: CalendarClock, color: C.sky, d: DATA.ppid.berkala },
    { nama: 'Informasi Serta Merta', icon: Zap, color: C.amber, d: DATA.ppid.sertaMerta },
    { nama: 'Informasi Setiap Saat', icon: Archive, color: C.green, d: DATA.ppid.setiapSaat },
  ];

  const stepNow = STEP_AT.filter((s) => f >= s).length; // 0..3
  const stamp = pop(f, STAMP, 8);

  return (
    <AbsoluteFill>
      <SkyBackground />
      <KineticText text="Informasi publik terbuka untuk Anda" highlight={['terbuka']} size={80} top={270} exitAt={PART_B - 8} />
      <KineticText text="Ajukan permohonan informasi secara daring" highlight={['daring']} size={76} top={270} delay={PART_B} />

      {/* Bagian A — tiga kartu yang membalik memperlihatkan jumlah dokumen asli */}
      <div style={{ position: 'absolute', top: 600, left: 90, right: 90, display: 'flex', flexDirection: 'column', gap: 34, opacity: 1 - toB, transform: `translateX(${-toB * 300}px)` }}>
        {kinds.map((k, i) => {
          const enter = pop(f, 4 + i * 5, 13);
          const flipAt = 26 + i * 12;
          const Icon = k.icon;
          const front = (
            <Glass strong radius={40} style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 30, padding: '0 44px', fontFamily: FONT, color: C.white }}>
              <div style={{ width: 120, height: 120, borderRadius: 34, background: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${k.color}` }}>
                <Icon size={64} color={C.navy} />
              </div>
              <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.1 }}>{k.nama}</div>
            </Glass>
          );
          const back = (
            <div style={{ height: '100%', borderRadius: 40, background: C.white, color: C.navy, display: 'flex', alignItems: 'center', gap: 34, padding: '0 44px', fontFamily: FONT, boxShadow: '0 30px 70px rgba(3,10,40,0.45)' }}>
              <div style={{ fontSize: 130, fontWeight: 800, letterSpacing: -4, lineHeight: 1, color: C.blue, minWidth: 170 }}>
                <CountUp to={k.d.count} from={flipAt + 4} dur={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.slate, textTransform: 'uppercase', letterSpacing: 2 }}>{k.nama.replace('Informasi ', '')}</div>
                <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.25, marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {k.d.sample.length ? k.d.sample.slice(0, 2).join(' · ') : '—'}
                </div>
              </div>
            </div>
          );
          return (
            <div key={k.nama} style={{ transform: `translateY(${(1 - enter) * 300}px)`, opacity: enter }}>
              <FlipCard at={flipAt} front={front} back={back} style={{ height: 250 }} />
            </div>
          );
        })}
      </div>

      {/* Bagian B — kartu formulir tiga langkah */}
      {toB > 0 && (
        <div style={{ position: 'absolute', top: 600, left: 80, right: 80, opacity: toB, transform: `translateX(${(1 - toB) * 300}px)`, fontFamily: FONT, color: C.white }}>
          <Glass strong radius={50} style={{ padding: 48, position: 'relative' }}>
            {/* Stepper */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginBottom: 50 }}>
              <div style={{ position: 'absolute', top: 50, left: 70, right: 70, height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'absolute', top: 50, left: 70, height: 8, borderRadius: 8, background: `linear-gradient(90deg, ${C.amber}, ${C.green})`, width: `calc((100% - 140px) * ${interpolate(f, [STEP_AT[0], STEP_AT[0] + 8, STEP_AT[1], STEP_AT[1] + 8], [0, 0.5, 0.5, 1], clamp)})` }} />
              {STEPS.map((s, i) => {
                const done = stepNow > i;
                const active = stepNow === i;
                const Icon = done ? Check : s.icon;
                const bump = i === 0 ? pop(f, PART_B + 6, 8) : pop(f, STEP_AT[i - 1], 8);
                return (
                  <div key={s.nama} style={{ position: 'relative', width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 108, height: 108, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? C.green : active ? C.amber : 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)', transform: `scale(${active || done ? 0.85 + bump * 0.15 : 0.85})`, boxShadow: active ? `0 0 40px ${C.amber}` : 'none' }}>
                      <Icon size={50} color={done || active ? C.navy : C.white} />
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, textAlign: 'center', opacity: active || done ? 1 : 0.6 }}>{s.nama}</div>
                  </div>
                );
              })}
            </div>
            {/* Isi langkah aktif: kerangka saja, tanpa identitas apa pun */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minHeight: 360 }}>
              {[0, 1, 2, 3].map((r) => {
                const p = ease(f, (stepNow ? STEP_AT[stepNow - 1] : PART_B) + 4 + r * 4, (stepNow ? STEP_AT[stepNow - 1] : PART_B) + 14 + r * 4);
                return (
                  <div key={`${stepNow}-${r}`}>
                    <Skeleton w={`${30 + r * 5}%`} h={16} o={0.35} />
                    <Glass radius={20} style={{ marginTop: 10, padding: 22 }}>
                      <Skeleton w={`${p * (55 + ((r * 13) % 35))}%`} h={20} o={0.55} />
                    </Glass>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0', borderRadius: 26, background: `linear-gradient(90deg, ${C.amber}, #fcd34d)`, color: C.navy, fontSize: 32, fontWeight: 800, transform: `scale(${Math.min(...STEP_AT.map((s) => interpolate(f, [s - 3, s, s + 4], [1, 0.94, 1], clamp)))})` }}>
              {stepNow >= 2 ? 'Kirim Permohonan' : 'Lanjut'} <SendHorizontal size={30} />
            </div>
            {/* Stempel terkirim */}
            {f >= STAMP && (
              <div style={{ position: 'absolute', right: 40, bottom: 60, transform: `rotate(-14deg) scale(${2.4 - stamp * 1.4})`, opacity: Math.min(1, stamp * 1.5), padding: '18px 36px', border: `8px solid ${C.green}`, borderRadius: 24, color: C.green, fontSize: 64, fontWeight: 800, letterSpacing: 4, background: 'rgba(6,18,58,0.75)' }}>
                TERKIRIM
              </div>
            )}
          </Glass>
          <div style={{ marginTop: 34, textAlign: 'center', fontSize: 34, fontWeight: 700, color: C.skyLight, opacity: ease(f, STAMP + 6, STAMP + 16) }}>
            Lacak status permohonan dengan nomor tiket
          </div>
          <TapCursor taps={[{ at: PART_B + 10, x: 700, y: 900 }, ...STEP_AT.map((s) => ({ at: s, x: 460, y: 760 }))]} enter={PART_B + 8} exit={STAMP - 4} />
        </div>
      )}
    </AbsoluteFill>
  );
};
