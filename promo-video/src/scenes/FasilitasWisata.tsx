import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { MapPin } from 'lucide-react';
import { C, FONT } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { KineticText } from '../motion/KineticText';
import { clamp, ease, pop } from '../motion/easing';
import { Glass } from '../ui/Glass';
import { DATA } from '../data';

const SWITCH = 62;
// Fasilitas yang paling terasa bagi penumpang (id portal aptpairport.id).
// Self Check-In (24) sengaja dilewati: fotonya memuat poster pejabat politik.
const PICK = [5, 18, 3, 19, 26, 21, 22, 25, 8];

/** 16–20 dtk: foto fasilitas asli meletup dalam kisi, lalu berganti carousel wisata yang berputar 3D. */
export const FasilitasWisata: React.FC = () => {
  const f = useCurrentFrame();
  // Foto dari portal tayang sudah sesuai labelnya, jadi nama ditempel di fotonya.
  const picked = PICK.map((id) => DATA.facilities.find((x) => x.id === id)).filter((x) => x?.image);
  const fac = (picked.length >= 6 ? picked : DATA.facilities.filter((x) => x.image)).slice(0, 9) as { name: string; image: string }[];
  const toWisata = ease(f, SWITCH, SWITCH + 16);
  const spots = DATA.tourisms.filter((t) => t.image);
  // Coverflow: indeks aktif bergeser dari kartu pertama ke terakhir.
  const idx = interpolate(f, [SWITCH + 14, 128], [0, Math.min(2, spots.length - 1)], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  return (
    <AbsoluteFill>
      <SkyBackground />
      <KineticText text="Fasilitas bandara" highlight={['Fasilitas']} size={84} top={270} exitAt={SWITCH - 4} />
      <KineticText text="& wisata Kalimantan Timur" highlight={['wisata']} size={84} top={270} delay={SWITCH} />

      {/* Kisi fasilitas */}
      <div style={{ position: 'absolute', top: 540, left: 70, right: 70, opacity: 1 - toWisata, transform: `scale(${1 - toWisata * 0.3}) translateY(${-toWisata * 200}px)` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {fac.map((x, i) => {
            const p = pop(f, 4 + i * 3, 10);
            return (
              <div key={x.name} style={{ position: 'relative', height: 300, borderRadius: 32, overflow: 'hidden', transform: `scale(${p}) rotate(${(1 - p) * (i % 2 ? 10 : -10)}deg)`, boxShadow: '0 20px 50px rgba(3,10,40,0.45)', border: '3px solid rgba(255,255,255,0.35)' }}>
                <Img src={staticFile(x.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.15 - (f / 130) * 0.1})` }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(6,18,58,0.9))' }} />
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, fontFamily: FONT, color: C.white, fontSize: 25, fontWeight: 800, lineHeight: 1.15 }}>{x.name.match(/\(([^)]+)\)$/)?.[1] ?? x.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carousel wisata berputar */}
      {toWisata > 0 && (
        <div style={{ position: 'absolute', top: 640, left: 0, right: 0, height: 1000, perspective: 2400, opacity: toWisata }}>
          <div style={{ position: 'absolute', left: 540, top: 450, transformStyle: 'preserve-3d' }}>
            {spots.map((s, i) => {
              const d = i - idx;
              return (
                <div key={s.name} style={{ position: 'absolute', left: -310, top: -440, width: 620, height: 880, transform: `translateX(${d * 470}px) translateZ(${-Math.abs(d) * 260}px) rotateY(${-d * 38}deg)`, zIndex: 10 - Math.round(Math.abs(d) * 3), opacity: 1 - Math.min(0.5, Math.abs(d) * 0.35) }}>
                  <Glass strong radius={52} style={{ width: '100%', height: '100%', overflow: 'hidden', padding: 0, position: 'relative' }}>
                    <Img src={staticFile(s.image!)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(6,18,58,0.92))' }} />
                    <div style={{ position: 'absolute', left: 40, right: 40, bottom: 44, fontFamily: FONT, color: C.white }}>
                      <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 30, background: C.amber, color: C.navy, fontSize: 24, fontWeight: 800, marginBottom: 14 }}>{s.category}</div>
                      <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.08 }}>{s.name}</div>
                      {/* Jarak/waktu tempuh hanya bila portal mengisinya — tidak ditebak. */}
                      {(s.duration || s.city) && (
                        <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.9, marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <MapPin size={28} /> {s.duration ? `${s.duration} dari bandara` : s.city}
                        </div>
                      )}
                    </div>
                    {/* Bila suatu saat sumbernya ilustrasi AI (TOURISM_ILUSTRASI), lencana ini wajib. */}
                    {s.illustration && (
                      <div style={{ position: 'absolute', top: 26, right: 26, padding: '8px 18px', borderRadius: 24, background: 'rgba(6,18,58,0.7)', border: '2px solid rgba(255,255,255,0.35)', fontFamily: FONT, color: C.white, fontSize: 22, fontWeight: 700 }}>
                        Ilustrasi
                      </div>
                    )}
                  </Glass>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
