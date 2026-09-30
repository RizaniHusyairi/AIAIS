import React from 'react';
import { C, FONT } from '../theme';

export const PHONE_W = 600;
export const PHONE_H = 1230;

type Props = {
  children: React.ReactNode;
  /** Posisi pusat ponsel di kanvas. */
  x?: number;
  y?: number;
  scale?: number;
  rotateY?: number;
  rotateX?: number;
  opacity?: number;
  /** Warna latar layar; default gelap agar kartu kaca terbaca. */
  screen?: string;
  statusDark?: boolean;
};

/**
 * Ponsel konsep: bingkai tipis bercahaya, layar gelap bergradien.
 * Sengaja tidak meniru merek ponsel tertentu.
 */
export const PhoneFrame: React.FC<Props> = ({ children, x = 540, y = 1060, scale = 1, rotateY = 0, rotateX = 0, opacity = 1, screen, statusDark = false }) => (
  <div
    style={{
      position: 'absolute',
      left: x - PHONE_W / 2,
      top: y - PHONE_H / 2,
      width: PHONE_W,
      height: PHONE_H,
      opacity,
      transform: `perspective(2200px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${scale})`,
      borderRadius: 86,
      padding: 14,
      background: 'linear-gradient(145deg, rgba(255,255,255,0.55), rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.3))',
      boxShadow: '0 60px 140px rgba(3,10,40,0.6), 0 0 0 2px rgba(255,255,255,0.15), inset 0 0 30px rgba(255,255,255,0.2)',
    }}
  >
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 72,
        overflow: 'hidden',
        background: screen ?? `linear-gradient(180deg, #0a1a4d 0%, #0b2a7a 55%, #0c4a8a 100%)`,
        fontFamily: FONT,
        color: C.white,
      }}
    >
      {/* Status bar + pulau kamera */}
      <div style={{ position: 'absolute', top: 22, left: 0, right: 0, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', fontSize: 24, fontWeight: 700, color: statusDark ? C.ink : C.white, zIndex: 20 }}>
        <span>9:41</span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 30, height: 16, borderRadius: 4, border: `2px solid currentColor`, position: 'relative' }}>
            <span style={{ position: 'absolute', inset: 2, width: 18, background: 'currentColor', borderRadius: 2 }} />
          </span>
        </span>
      </div>
      <div style={{ position: 'absolute', top: 20, left: '50%', marginLeft: -80, width: 160, height: 46, borderRadius: 30, background: '#000', zIndex: 21 }} />
      {children}
    </div>
  </div>
);
