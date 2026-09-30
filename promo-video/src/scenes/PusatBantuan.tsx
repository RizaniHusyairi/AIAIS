import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { PackageSearch, MessageSquareWarning, MessagesSquare, Camera, ChevronLeft, Send } from 'lucide-react';
import { C } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { KineticText } from '../motion/KineticText';
import { clamp, ease, glide, pop } from '../motion/easing';
import { PhoneFrame } from '../ui/PhoneFrame';
import { Glass, Skeleton } from '../ui/Glass';
import { TapCursor } from '../ui/TapCursor';
import { SuccessCheck } from '../ui/bits';

const OPEN = 26;
const SEND = 84;

/**
 * 20–24 dtk: ketuk "Lapor Kehilangan" → formulir terisi → terkirim.
 * Isian formulir sengaja berupa garis kerangka: tidak ada nama atau identitas,
 * bahkan contoh fiktif, supaya video tidak mengajarkan pola data pribadi.
 */
export const PusatBantuan: React.FC = () => {
  const f = useCurrentFrame();
  const enter = glide(f, 0);
  const form = ease(f, OPEN, OPEN + 14);
  const done = ease(f, SEND + 2, SEND + 12);
  const fill = (i: number) => interpolate(f, [OPEN + 14 + i * 9, OPEN + 24 + i * 9], [0, 1], clamp);

  const menu = [
    { label: 'Lapor Kehilangan', sub: 'Barang tertinggal di bandara', icon: PackageSearch, color: '#f59e0b' },
    { label: 'Pengaduan', sub: 'Sampaikan keluhan layanan', icon: MessageSquareWarning, color: '#f43f5e' },
    { label: 'Chat Petugas', sub: 'Tanya langsung ke petugas', icon: MessagesSquare, color: C.sky },
  ];

  return (
    <AbsoluteFill>
      <SkyBackground />
      <KineticText text="Ada kendala atau barang hilang? Lapor dari ponsel" highlight={['barang', 'hilang?']} size={72} top={270} />
      <PhoneFrame y={1130 + (1 - enter) * 900} scale={0.94} rotateY={(1 - enter) * 25}>
        {/* Menu Pusat Bantuan */}
        <div style={{ position: 'absolute', top: 100, left: 30, right: 30, transform: `translateX(${-form * 120}px)`, opacity: 1 - form }}>
          <div style={{ fontSize: 22, color: '#fda4af', fontWeight: 700, letterSpacing: 2 }}>LAYANAN PENUMPANG</div>
          <div style={{ fontSize: 46, fontWeight: 800, marginBottom: 26 }}>Pusat Bantuan</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {menu.map((m, i) => {
              const p = pop(f, 6 + i * 4, 12);
              const Icon = m.icon;
              const pressed = i === 0 ? interpolate(f, [OPEN - 4, OPEN, OPEN + 4], [1, 0.95, 1], clamp) : 1;
              return (
                <Glass key={m.label} strong={i === 0} radius={30} glow={i === 0 ? 'rgba(245,158,11,0.4)' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 24, opacity: p, transform: `translateX(${(1 - p) * 200}px) scale(${pressed})` }}>
                  <div style={{ width: 78, height: 78, borderRadius: 22, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={42} color={C.white} />
                  </div>
                  <div>
                    <div style={{ fontSize: 31, fontWeight: 800 }}>{m.label}</div>
                    <div style={{ fontSize: 22, opacity: 0.75, fontWeight: 600 }}>{m.sub}</div>
                  </div>
                </Glass>
              );
            })}
          </div>
        </div>
        {/* Formulir lapor kehilangan */}
        <div style={{ position: 'absolute', top: 100, left: 30, right: 30, transform: `translateX(${(1 - form) * 200}px)`, opacity: form * (1 - done) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 700, color: C.skyLight }}>
            <ChevronLeft size={30} /> Pusat Bantuan
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, margin: '8px 0 24px' }}>Lapor Kehilangan</div>
          {['Barang yang hilang', 'Lokasi terakhir', 'Waktu kejadian', 'Ciri-ciri barang'].map((label, i) => (
            <div key={label} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.8, marginBottom: 8 }}>{label}</div>
              <Glass radius={20} style={{ padding: '22px 22px', border: fill(i) > 0 && fill(i) < 1 ? `2px solid ${C.amber}` : undefined }}>
                <Skeleton w={`${fill(i) * (i === 3 ? 90 : 60 + i * 8)}%`} h={20} o={0.55} />
              </Glass>
            </div>
          ))}
          <Glass radius={20} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 22, borderStyle: 'dashed', marginBottom: 22 }}>
            <Camera size={32} /> <span style={{ fontSize: 24, fontWeight: 700, opacity: 0.8 }}>Tambah foto</span>
          </Glass>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '26px 0', borderRadius: 26, background: `linear-gradient(90deg, ${C.amber}, #fcd34d)`, color: C.navy, fontSize: 30, fontWeight: 800, transform: `scale(${interpolate(f, [SEND - 4, SEND, SEND + 4], [1, 0.94, 1], clamp)})` }}>
            <Send size={30} /> Kirim Laporan
          </div>
        </div>
        {/* Sukses */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, opacity: done }}>
          <SuccessCheck at={SEND + 4} size={220} />
          <div style={{ fontSize: 44, fontWeight: 800, transform: `translateY(${(1 - pop(f, SEND + 12)) * 40}px)`, opacity: pop(f, SEND + 12) }}>Laporan terkirim</div>
          <div style={{ fontSize: 26, opacity: 0.8, fontWeight: 600, textAlign: 'center', padding: '0 60px' }}>Pantau statusnya lewat nomor tiket</div>
        </div>
        <TapCursor taps={[{ at: 12, x: 400, y: 700 }, { at: OPEN, x: 300, y: 300 }, { at: SEND, x: 286, y: 1030 }]} enter={10} exit={SEND + 8} />
      </PhoneFrame>
    </AbsoluteFill>
  );
};
