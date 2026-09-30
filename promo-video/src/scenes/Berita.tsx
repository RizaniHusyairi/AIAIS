import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Newspaper } from 'lucide-react';
import { C, FONT } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { KineticText } from '../motion/KineticText';
import { clamp, glide } from '../motion/easing';
import { Glass, Skeleton } from '../ui/Glass';
import { TypeText } from '../ui/bits';
import { TapCursor } from '../ui/TapCursor';
import { DATA, tanggal } from '../data';

const SWIPES = [36, 66, 96];
// Sampul dari portal tayang sesuai judulnya. Matikan bila sumber data berganti ke
// basis data yang sampulnya belum dikurasi.
const SHOW_NEWS_IMAGE = true;

/** 8–12 dtk: tumpukan kartu berita asli digeser ke samping satu per satu. */
export const Berita: React.FC = () => {
  const f = useCurrentFrame();
  const items = DATA.news.length ? DATA.news : [null, null, null];
  const enter = glide(f, 0);

  return (
    <AbsoluteFill>
      <SkyBackground />
      <KineticText text="Kabar terbaru bandara, langsung dari sumbernya" highlight={['terbaru']} size={74} top={270} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 620, height: 1000, transform: `translateY(${(1 - enter) * 700}px)` }}>
        {items
          .map((n, i) => ({ n, i }))
          .reverse()
          .map(({ n, i }) => {
            // Kartu ke-i dilempar pada SWIPES[i]; kartu di bawahnya maju satu tingkat.
            const gone = i < SWIPES.length ? interpolate(f, [SWIPES[i], SWIPES[i] + 14], [0, 1], clamp) : 0;
            const rank = i - SWIPES.filter((s) => f >= s + 6).length;
            const depth = Math.max(0, rank);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 110,
                  width: 860,
                  top: depth * 44,
                  transform: `translateX(${gone * 1200}px) rotate(${gone * 22 - depth * 2}deg) scale(${1 - depth * 0.06})`,
                  opacity: gone > 0.95 ? 0 : 1 - depth * 0.18,
                  zIndex: 10 - i,
                }}
              >
                <Glass strong radius={48} style={{ overflow: 'hidden', padding: 0, fontFamily: FONT, color: C.white }}>
                  <div style={{ height: 470, position: 'relative', background: `linear-gradient(135deg, ${C.blue}, ${C.sky})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {SHOW_NEWS_IMAGE && n?.image ? (
                      <Img src={staticFile(n.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Newspaper size={170} color="rgba(255,255,255,0.55)" strokeWidth={1.3} />
                    )}
                    {n && (
                      <div style={{ position: 'absolute', top: 28, left: 28, padding: '10px 22px', borderRadius: 30, background: C.amber, color: C.navy, fontSize: 24, fontWeight: 800 }}>{n.category}</div>
                    )}
                  </div>
                  {/* Isi kartu di belakang disembunyikan agar tidak tembus lewat kaca kartu depan. */}
                  <div style={{ padding: '32px 40px 40px', minHeight: 220, opacity: depth > 0 ? 0 : 1 }}>
                    {n ? (
                      <>
                        <div style={{ fontSize: 24, color: C.skyLight, fontWeight: 700, marginBottom: 12 }}>{tanggal(n.date)}</div>
                        <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.18 }}>
                          {rank <= 0 ? <TypeText text={n.title} from={i === 0 ? 10 : SWIPES[i - 1] + 4} cps={2.4} /> : n.title}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Skeleton w="40%" />
                        <Skeleton w="90%" h={34} />
                        <Skeleton w="70%" h={34} />
                      </div>
                    )}
                  </div>
                </Glass>
              </div>
            );
          })}
        <TapCursor
          taps={SWIPES.flatMap((s) => [
            { at: s - 2, x: 430, y: 520 },
            { at: s + 10, x: 900, y: 470 },
          ])}
          enter={24}
          exit={110}
        />
      </div>
    </AbsoluteFill>
  );
};
