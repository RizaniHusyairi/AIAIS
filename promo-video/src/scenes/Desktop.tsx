import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Plane, Building2, Car, SquareParking, Headphones, MapPin } from 'lucide-react';
import { C, FONT, FONT_DISPLAY } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { KineticText } from '../motion/KineticText';
import { clamp, ease, glide, lerp } from '../motion/easing';
import { DesktopHome, LAYANAN_INDEX, MENU_X, MENU_Y, PAGE_W, VIEW_H } from '../ui/desktop/DesktopHome';
import { DATA } from '../data';

const DATA_HERO = DATA.home?.heroBg ?? null;

/*
 * "Satu portal, semua layar" — beranda desktop aptpairport.id (digambar ulang)
 * di dalam laptop konsep, lalu berubah menjadi ponsel untuk menyambung ke
 * adegan jadwal. Seluruh ketukan waktunya di sini, dalam frame adegan.
 */
const T = {
  boot: 14, // beranda mulai menyala
  zoomIn: [36, 56],
  click: 52,
  menu: [53, 64, 72, 80], // buka → penuh → mulai tutup → tertutup
  zoomOut: [72, 90],
  tilt: [88, 100, 114, 126],
  explode: [92, 106, 112, 124],
  scroll1: [120, 136], // turun ke berita
  hover: [136, 148],
  scroll2: [146, 160], // turun ke fasilitas
  morph: [158, 186],
};

// Geometri laptop di kanvas 1080×1920.
const SCR_W = 920;
const SCALE = SCR_W / PAGE_W; // 0.639
const SCR_H = VIEW_H * SCALE; // 575
const CX = 540;
const CY = 1080;
const BEZEL = 18;

// Ponsel tujuan morph — sama dengan PhoneFrame adegan jadwal (y 1130, skala 0.94).
const PH_W = 600 * 0.94;
const PH_H = 1230 * 0.94;
const PH_CY = 1130;

/** Kursor mouse: titik-titik dalam koordinat viewport halaman (px CSS situs). */
const PATH: { at: number; x: number; y: number }[] = [
  { at: 34, x: 1260, y: 620 },
  { at: 50, x: MENU_X[LAYANAN_INDEX], y: MENU_Y },
  { at: 62, x: MENU_X[LAYANAN_INDEX] - 60, y: 150 },
  { at: 84, x: 1300, y: 520 },
  { at: T.hover[0], x: 719, y: 560 },
  { at: T.hover[1] + 6, x: 1320, y: 700 },
];

function cursorAt(f: number) {
  let x = PATH[0].x;
  let y = PATH[0].y;
  for (let i = 1; i < PATH.length; i++) {
    const t = ease(f, PATH[i - 1].at, PATH[i].at);
    x = lerp(t, x, PATH[i].x);
    y = lerp(t, y, PATH[i].y);
  }
  return { x, y };
}

const Pointer: React.FC<{ x: number; y: number; press: number; opacity: number }> = ({ x, y, press, opacity }) => (
  <svg width={34} height={46} viewBox="0 0 17 23" style={{ position: 'absolute', left: x - 2, top: y - 2, transform: `scale(${1 - press * 0.15})`, transformOrigin: 'top left', opacity, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))', zIndex: 50 }}>
    <path d="M1 1 L1 18 L5.5 13.8 L8.6 21 L11.6 19.7 L8.6 12.7 L14.8 12.7 Z" fill="#0f172a" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

// Akses Cepat versi ponsel untuk isi layar setelah morph (teks sama dengan desktop).
const QUICK_M = [
  { t: 'Penerbangan', icon: Plane, c: '#2563eb', bg: '#eff6ff' },
  { t: 'Fasilitas', icon: Building2, c: '#0d9488', bg: '#f0fdfa' },
  { t: 'Transportasi', icon: Car, c: '#ea580c', bg: '#fff7ed' },
  { t: 'Parkir', icon: SquareParking, c: '#7c3aed', bg: '#f5f3ff' },
  { t: 'Layanan Online', icon: Headphones, c: '#e11d48', bg: '#fff1f2' },
  { t: 'Peta Bandara', icon: MapPin, c: '#059669', bg: '#ecfdf5' },
];

export const Desktop: React.FC = () => {
  const f = useCurrentFrame();
  const inOut = { ...clamp, easing: Easing.inOut(Easing.cubic) };

  // --- laptop masuk & layar membuka
  const enter = glide(f, 0);
  const lid = interpolate(f, [4, 24], [92, 0], { ...clamp, easing: Easing.out(Easing.cubic) });

  // --- kamera: zoom ke menu Layanan lalu mundur
  const zoom = interpolate(f, [T.zoomIn[0], T.zoomIn[1], T.zoomOut[0], T.zoomOut[1]], [0, 1, 1, 0], inOut);
  const scrTop = CY - SCR_H / 2;
  const focal = { x: CX - SCR_W / 2 + MENU_X[LAYANAN_INDEX] * SCALE, y: scrTop + (MENU_Y + 90) * SCALE };
  const camZ = 1 + zoom * 1.25;
  const camTx = (CX - focal.x) * zoom;
  const camTy = (820 - focal.y) * zoom;

  // --- dropdown, terurai 3D, gulir
  const menu = interpolate(f, T.menu, [0, 1, 1, 0], clamp);
  const tilt = interpolate(f, T.tilt, [0, 1, 1, 0], inOut);
  const explode = interpolate(f, T.explode, [0, 1, 1, 0], inOut);
  const scrollY = interpolate(f, [T.scroll1[0], T.scroll1[1], T.scroll2[0], T.scroll2[1]], [0, 720, 720, 1180], inOut);
  const hoverNews = f >= T.hover[0] - 2 && f <= T.hover[1] ? 1 : -1;

  // --- morph laptop → ponsel
  const m = interpolate(f, T.morph, [0, 1], inOut);
  const baseGone = ease(f, T.morph[0] - 6, T.morph[0] + 8);
  const desktopFade = 1 - ease(f, T.morph[0] + 4, T.morph[0] + 14);
  const mobileIn = ease(f, T.morph[0] + 12, T.morph[1] - 2);
  const w = lerp(m, SCR_W + BEZEL * 2, PH_W);
  const h = lerp(m, SCR_H + BEZEL * 2 + 6, PH_H);
  const cy = lerp(m, CY, PH_CY);
  const radius = lerp(m, 26, 86 * 0.94);

  const cur = cursorAt(f);
  const press = interpolate(f, [T.click - 3, T.click, T.click + 4], [0, 1, 0], clamp);
  const curOpacity = ease(f, 32, 40) * (1 - ease(f, T.hover[1] + 4, T.hover[1] + 12));

  return (
    <AbsoluteFill style={{ perspective: 2600 }}>
      <SkyBackground />
      <KineticText text="Satu portal, semua layar" highlight={['semua', 'layar']} size={92} top={270} exitAt={T.morph[1] - 12} />
      <div style={{ position: 'absolute', top: 500, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, color: C.skyLight, fontSize: 38, fontWeight: 600, opacity: ease(f, 20, 34) * (1 - ease(f, T.zoomIn[0], T.zoomIn[0] + 8)) }}>
        aptpairport.id di desktop
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transformOrigin: `${focal.x}px ${focal.y}px`,
          transform: `translate(${camTx}px, ${camTy + (1 - enter) * 1100}px) scale(${camZ}) rotateY(${-26 * tilt}deg) rotateX(${14 * tilt}deg)`,
        }}
      >
        <div style={{ position: 'absolute', left: CX - 520, top: CY + SCR_H / 2 + 70, width: 1040, height: 90, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(3,10,40,0.45), transparent 70%)', opacity: 1 - baseGone }} />
        {/* Alas laptop */}
        <div style={{ position: 'absolute', left: CX - 560, top: CY + SCR_H / 2 + BEZEL + 2, width: 1120, height: 36, opacity: 1 - baseGone, transform: `translateY(${baseGone * 80}px)` }}>
          <div style={{ height: 26, borderRadius: '4px 4px 30px 30px', background: 'linear-gradient(180deg, #e5e7eb, #9ca3af 70%, #6b7280)', boxShadow: '0 30px 60px rgba(3,10,40,0.55)' }}>
            <div style={{ margin: '0 auto', width: 170, height: 10, borderRadius: '0 0 12px 12px', background: 'linear-gradient(180deg, #9ca3af, #d1d5db)' }} />
          </div>
        </div>

        {/* Layar (berubah bentuk menjadi ponsel) */}
        <div
          style={{
            position: 'absolute',
            left: CX - w / 2,
            top: cy - h / 2,
            width: w,
            height: h,
            borderRadius: radius,
            padding: lerp(m, BEZEL, 14),
            paddingTop: lerp(m, BEZEL + 6, 14),
            // Bingkai kaca ponsel; bezel hitam laptop di atasnya memudar selama morph.
            background: 'linear-gradient(145deg, rgba(255,255,255,0.55), rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.3))',
            boxShadow: '0 50px 120px rgba(3,10,40,0.6), 0 0 0 2px rgba(255,255,255,0.12)',
            transformOrigin: 'center bottom',
            transform: `rotateX(${lid}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, borderRadius: radius, background: '#111827', opacity: 1 - m }} />
          {/* kamera laptop */}
          {m < 0.3 && <div style={{ position: 'absolute', top: 8, left: '50%', marginLeft: -4, width: 8, height: 8, borderRadius: 4, background: '#374151', opacity: 1 - m * 3 }} />}
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: lerp(m, 4, 72), overflow: explode > 0.01 ? 'visible' : 'hidden', background: '#f8fafc', transformStyle: 'preserve-3d' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0a1a4d, #0b2a7a 55%, #0c4a8a)', opacity: ease(f, T.morph[0] + 6, T.morph[0] + 16) }} />
            {desktopFade > 0 && (
              <div style={{ position: 'absolute', left: 0, top: 0, width: PAGE_W, height: VIEW_H, transformOrigin: 'top left', transform: `scale(${SCALE})`, opacity: desktopFade, transformStyle: 'preserve-3d' }}>
                <DesktopHome f={f} bootAt={T.boot} scrollY={scrollY} menu={menu} hoverNews={hoverNews} explode={explode} />
                <Pointer x={cur.x} y={cur.y} press={press} opacity={curOpacity} />
              </div>
            )}

            {/* Isi versi ponsel setelah morph */}
            {mobileIn > 0 && (
              <div style={{ position: 'absolute', inset: 0, opacity: mobileIn, fontFamily: FONT, color: C.white, padding: '100px 30px 0' }}>
                <div style={{ fontSize: 22, color: C.skyLight, fontWeight: 700, letterSpacing: 2 }}>APT PRANOTO · AAP</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 700, lineHeight: 1.1, marginTop: 10 }}>
                  <span style={{ color: '#e3c88b' }}>A</span>ji <span style={{ color: '#e3c88b' }}>P</span>angeran <span style={{ color: '#e3c88b' }}>T</span>umenggung Pranoto
                </div>
                <div style={{ marginTop: 10, fontSize: 20, letterSpacing: 8, color: '#e3c88b', fontWeight: 600 }}>SAMARINDA</div>
                <div style={{ marginTop: 34, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {QUICK_M.map((q, i) => {
                    const Icon = q.icon;
                    const p = ease(f, T.morph[0] + 16 + i * 2, T.morph[0] + 26 + i * 2);
                    return (
                      <div key={q.t} style={{ background: '#fff', borderRadius: 24, padding: '20px 10px', textAlign: 'center', transform: `scale(${0.8 + 0.2 * p})`, opacity: p }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: q.bg, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={30} color={q.c} />
                        </div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: C.ink }}>{q.t}</div>
                      </div>
                    );
                  })}
                </div>
                {DATA_HERO && (
                  <div style={{ marginTop: 26, height: 250, borderRadius: 28, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.25)' }}>
                    <Img src={staticFile(DATA_HERO)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

