import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import {
  Home, Info, ShieldCheck, Plane, Scale, Building2, Globe, ChevronDown, Search, Moon, LayoutGrid,
  PlaneTakeoff, CloudSun, Clock, Phone, ArrowRight, Palmtree, Car, SquareParking, Headphones, MapPin,
  Calendar, MessageSquareWarning, PackageSearch, Users, ClipboardList, ExternalLink,
} from 'lucide-react';
import { FONT_DISPLAY, FONT_SITE } from '../../theme';
import { clamp, ease, pop } from '../../motion/easing';
import { DATA, departures, tanggal } from '../../data';

/**
 * Beranda desktop aptpairport.id, digambar ulang.
 *
 * Tata letak, teks, warna, dan ukurannya disalin dari frontend/src/app/page.tsx,
 * components/layout/Navbar.tsx, components/home/NamaBandaraHero.tsx, dan
 * HeroBoardingPass.tsx pada lebar 1440 px (breakpoint `xl`). Digambar ulang —
 * bukan tangkapan layar — supaya tiap bagian bisa dianimasikan sendiri-sendiri.
 *
 * Bagian yang dilewati demi durasi: papan pengumuman, Tentang, Pejabat, Wisata,
 * Mitra. Urutan bagian yang tampil tetap sama dengan situsnya.
 */

export const PAGE_W = 1440;
export const VIEW_H = 900;

// Koordinat vertikal tiap lapisan pada halaman (px CSS situs).
const Y = { strip: 0, bar: 36, hero: 118, quick: 892, news: 1030, fac: 1600 };
export const PAGE_H = 2080;

const NAVY = '#0b1e5b';
const EMAS = 'linear-gradient(135deg, #e3c88b, #c9a227 55%, #8a6a1f)';
const BLUE = '#2563eb';

// Menu utama & isi dropdown Layanan — kamus id.ts `nav`.
const MENU = [
  { name: 'Beranda', icon: Home, active: true },
  { name: 'Informasi Publik', icon: Info, sub: true },
  { name: 'PPID', icon: ShieldCheck, sub: true },
  { name: 'Informasi', icon: Plane, sub: true },
  { name: 'Regulasi', icon: Scale, sub: true },
  { name: 'Layanan', icon: Building2, sub: true },
  { name: 'Tautan Terkait', icon: Globe, sub: true },
];
export const LAYANAN_INDEX = 5;
const LAYANAN = [
  { nama: 'Pusat Bantuan', desc: 'Pengaduan, pertanyaan, dan chat petugas', icon: MessageSquareWarning },
  { nama: 'Lapor Kehilangan Barang', desc: 'Laporkan barang yang tertinggal di area bandara', icon: PackageSearch },
  { nama: 'Beauty Contest', desc: 'Seleksi mitra usaha bandara', icon: Building2 },
  { nama: 'Extend Advance', desc: 'Perpanjangan uang muka', icon: ClipboardList },
  { nama: 'Field Trip', desc: 'Kunjungan edukasi ke area bandara', icon: Users },
];
const QUICK = [
  { judul: 'Penerbangan', desc: 'Info Jadwal', icon: Plane, color: '#2563eb', bg: '#eff6ff' },
  { judul: 'Fasilitas', desc: 'Layanan Bandara', icon: Building2, color: '#0d9488', bg: '#f0fdfa' },
  { judul: 'Transportasi', desc: 'Menuju Bandara', icon: Car, color: '#ea580c', bg: '#fff7ed' },
  { judul: 'Parkir', desc: 'Area Parkir', icon: SquareParking, color: '#7c3aed', bg: '#f5f3ff' },
  { judul: 'Layanan Online', desc: 'Pengaduan & Layanan', icon: Headphones, color: '#e11d48', bg: '#fff1f2' },
  { judul: 'Peta Bandara', desc: 'Navigasi Terminal', icon: MapPin, color: '#059669', bg: '#ecfdf5' },
];

/** Posisi (px halaman) menu Layanan — dipakai adegan untuk mengarahkan kursor. */
export const MENU_X = [244, 382, 519, 631, 757, 875, 1016];
export const MENU_Y = Y.bar + 41;

type Props = {
  /** Frame adegan — untuk animasi "menyala" dan kerlip kecil. */
  f: number;
  /** Frame mulai beranda menyala. */
  bootAt: number;
  scrollY: number;
  /** 0..1 dropdown Layanan terbuka. */
  menu: number;
  /** Indeks kartu berita yang disorot kursor (-1 = tidak ada). */
  hoverNews: number;
  /** 0..1 lapisan terurai dalam 3D. */
  explode: number;
};

const layer = (top: number, z: number, explode: number, scrollY: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  width: PAGE_W,
  top: top - scrollY,
  transform: `translateZ(${z * explode}px)`,
  transformStyle: 'preserve-3d',
  ...extra,
});

function JudulBagian({ kicker, judul }: { kicker: string; judul: string }) {
  return (
    <div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: BLUE }}>
        <span style={{ width: 16, height: 1, background: '#60a5fa' }} />
        {kicker}
      </span>
      <h2 style={{ margin: '6px 0 0', fontSize: 21, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{judul}</h2>
      <svg viewBox="0 0 220 14" style={{ marginTop: 8, height: 14, width: 220 }}>
        <defs>
          <linearGradient id="lintasan" x1="0" x2="1">
            <stop offset="0" stopColor="#2563eb" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d="M0 11 C 60 11, 110 3, 205 3" fill="none" stroke="url(#lintasan)" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 5" />
        <path d="M212 3 l-6 -3 v6 z" fill="#22d3ee" />
      </svg>
    </div>
  );
}

/** Satu kata tersingkap dari bawah — padanan `KataTersingkap` di NamaBandaraHero. */
const Kata: React.FC<{ f: number; at: number; children: React.ReactNode }> = ({ f, at, children }) => {
  const p = ease(f, at, at + 20);
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: '0.08em' }}>
      <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 115}%)`, opacity: p }}>{children}</span>
    </span>
  );
};

const Emas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ background: EMAS, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{children}</span>
);

export const DesktopHome: React.FC<Props> = ({ f, bootAt, scrollY, menu, hoverNews, explode }) => {
  const b = (d: number, dur = 14) => ease(f, bootAt + d, bootAt + d + dur);
  const next = departures[0];
  const news = DATA.news.slice(0, 3);
  // Urutan kartu fasilitas sama dengan beranda: Umum dulu, yang berfoto dulu.
  const fac = [...DATA.facilities].sort((a, c) => (a.category === 'Umum' ? 0 : 2) + (a.image ? 0 : 1) - ((c.category === 'Umum' ? 0 : 2) + (c.image ? 0 : 1))).slice(0, 4);
  const ig = DATA.home?.ig?.[0];

  return (
    <div style={{ position: 'relative', width: PAGE_W, height: VIEW_H, overflow: explode > 0.01 ? 'visible' : 'hidden', background: '#f8fafc', fontFamily: FONT_SITE, color: '#0f172a', transformStyle: 'preserve-3d' }}>
      {/* ===== HERO (lapisan paling belakang) ===== */}
      <div style={layer(Y.hero, 0, explode, scrollY, { height: 822, overflow: 'hidden' })}>
        {DATA.home?.heroBg && <Img src={staticFile(DATA.home.heroBg)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.08 - b(0, 60) * 0.08})` }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.1) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #f8fafc 0%, transparent 40%)' }} />
      </div>

      {/* Teks hero */}
      <div style={layer(Y.hero + 88, 70, explode, scrollY, { left: 44, width: 660 })}>
        <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: '0.22em', color: '#b08d3f', fontWeight: 500, opacity: b(2) }}>Selamat Datang di</p>
        <p style={{ margin: '8px 0 0', fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, textTransform: 'uppercase', color: NAVY, letterSpacing: `${0.05 + b(5, 30) * 0.25}em`, opacity: b(5) }}>Bandar Udara</p>
        <h1 style={{ margin: '6px 0 0', fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 700, lineHeight: 1.06, color: NAVY }}>
          <span style={{ display: 'block' }}>
            <Kata f={f} at={bootAt + 12}><Emas>A</Emas>ji</Kata> <Kata f={f} at={bootAt + 16}><Emas>P</Emas>angeran</Kata>
          </span>
          <span style={{ display: 'block' }}>
            <Kata f={f} at={bootAt + 20}><Emas>T</Emas>umenggung</Kata> <Kata f={f} at={bootAt + 24}>Pranoto</Kata>
          </span>
        </h1>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ height: 1, width: 70, background: EMAS, transform: `scaleX(${b(32)})`, transformOrigin: 'right' }} />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.42em', color: '#b08d3f', opacity: b(35) }}>Samarinda</span>
          <span style={{ height: 1, width: 70, background: EMAS, transform: `scaleX(${b(32)})`, transformOrigin: 'left' }} />
        </div>
        <p style={{ margin: '20px 0 0', maxWidth: 448, fontSize: 16, lineHeight: 1.65, color: '#475569', opacity: b(38) }}>
          Gerbang udara Kalimantan Timur yang menghubungkan Anda ke berbagai destinasi di Indonesia dan dunia.
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
          {[
            { t: 'Cek Penerbangan', icon: Plane, primary: true },
            { t: 'Lihat Fasilitas', icon: Building2, color: BLUE },
            { t: 'Lihat Destinasi Wisata', icon: Palmtree, color: '#059669' },
          ].map((btn, i) => {
            const Icon = btn.icon;
            const p = pop(f, bootAt + 42 + i * 4, 13);
            return (
              <span key={btn.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, transform: `scale(${p})`, opacity: Math.min(1, p), ...(btn.primary ? { background: BLUE, color: '#fff', boxShadow: '0 10px 15px -3px rgba(37,99,235,0.3)' } : { background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }) }}>
                <Icon size={16} color={btn.primary ? '#fff' : btn.color} /> {btn.t} {btn.primary && <ArrowRight size={16} />}
              </span>
            );
          })}
        </div>
      </div>

      {/* Ponsel hero — HeroBoardingPass.tsx */}
      <div style={layer(Y.hero + 64, 150, explode, scrollY, { left: 1066 - 155, width: 310, transform: `translateZ(${150 * explode}px) translateY(${(1 - b(20, 24)) * 60}px)`, opacity: b(20) })}>
        <div style={{ borderRadius: 46, padding: 11, background: 'linear-gradient(180deg, #8d95a1, #616975 50%, #3f4650)', boxShadow: '0 36px 70px -24px rgba(15,23,42,0.6)' }}>
          <div style={{ position: 'relative', borderRadius: 36, background: '#fff', overflow: 'hidden', height: 624, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 10, left: '50%', marginLeft: -44, width: 88, height: 26, borderRadius: 13, background: '#000', zIndex: 3 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 28px 4px', fontSize: 13, fontWeight: 600 }}>
              <span>09:41</span>
              <span style={{ width: 22, height: 11, border: '1.5px solid #0f172a', borderRadius: 3 }} />
            </div>
            <div style={{ padding: '6px 16px 12px', background: `linear-gradient(135deg, ${NAVY}, #1d4ed8)`, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(165,243,252,0.9)' }}>Bandar Udara</p>
                <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>AAP</p>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(219,234,254,0.85)' }}>Samarinda · Kalimantan Timur</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(165,243,252,0.9)' }}>ICAO</p>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 900, lineHeight: 1 }}>WALS</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(45deg, #fbbf24, #ec4899, #9333ea)' }} />
              <span>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 900 }}>Informasi Terbaru</span>
                <span style={{ display: 'block', fontSize: 10, color: '#64748b' }}>@aptpranotoairport</span>
              </span>
            </div>
            <div style={{ flex: 1, position: 'relative', background: '#f1f5f9', overflow: 'hidden' }}>
              {ig && <Img src={staticFile(ig.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', fontSize: 11.5, fontWeight: 700, color: BLUE, display: 'flex', alignItems: 'center', gap: 6 }}>
              Lihat di Instagram <ExternalLink size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== AKSES CEPAT ===== */}
      <div style={layer(Y.quick, 110, explode, scrollY, { left: 44, width: 1352 })}>
        <div style={{ position: 'relative', background: '#fff', borderRadius: 16, boxShadow: '0 20px 25px -5px rgba(203,213,225,0.4)', border: '1px solid rgba(226,232,240,0.8)', padding: '20px 24px', overflow: 'hidden', transform: `translateY(${(1 - b(46, 18)) * 40}px)`, opacity: b(46) }}>
          <span style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: 'linear-gradient(90deg, #2563eb, #22d3ee, #2563eb)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {QUICK.map((q, i) => {
              const Icon = q.icon;
              return (
                <div key={q.judul} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderLeft: i ? '1px dashed #e2e8f0' : 'none' }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={q.color} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{q.judul}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>{q.desc}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== BERITA & PENGUMUMAN ===== */}
      <div style={layer(Y.news, 60, explode, scrollY, { left: 44, width: 1352, opacity: 1 - explode })}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <JudulBagian kicker="Kabar Terkini" judul="Berita & Pengumuman" />
          <span style={{ fontSize: 13, fontWeight: 600, color: BLUE, display: 'flex', alignItems: 'center', gap: 6 }}>Lihat Semua <ArrowRight size={16} /></span>
        </div>
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {news.map((n, i) => {
            const lift = i === hoverNews ? 1 : 0;
            return (
              <div key={n.title} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f1f5f9', transform: `translateY(${-6 * lift}px) translateZ(${40 * explode * (i + 1)}px)`, boxShadow: lift ? '0 20px 25px -5px rgba(30,58,138,0.15)' : '0 1px 2px rgba(226,232,240,0.6)' }}>
                <div style={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden', background: '#e2e8f0' }}>
                  {n.image && <Img src={staticFile(n.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + 0.05 * lift})` }} />}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.5), transparent 50%)' }} />
                  <span style={{ position: 'absolute', top: 12, left: 12, background: BLUE, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{n.category}</span>
                </div>
                <div style={{ padding: 20 }}>
                  <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#94a3b8' }}>
                    <Calendar size={14} /> {tanggal(n.date)}
                  </p>
                  <h3 style={{ margin: '8px 0 0', fontSize: 15, fontWeight: 900, lineHeight: 1.35, height: 40, overflow: 'hidden', color: lift ? BLUE : '#0f172a' }}>{n.title}</h3>
                  <span style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, color: BLUE, fontSize: 12.5, fontWeight: 700 }}>
                    Selengkapnya <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== FASILITAS UNGGULAN ===== */}
      <div style={layer(Y.fac, 90, explode, scrollY, { left: 44, width: 1352, opacity: 1 - explode })}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <JudulBagian kicker="Kenyamanan" judul="Fasilitas Unggulan" />
          <span style={{ fontSize: 13, fontWeight: 600, color: BLUE, display: 'flex', alignItems: 'center', gap: 6 }}>Lihat Semua <ArrowRight size={16} /></span>
        </div>
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {fac.map((x) => {
            const butir = x.details ?? [];
            const ringkas = butir.filter((d) => !d.includes(':'))[0] ?? x.location ?? '';
            const cip = butir.filter((d) => d.includes(':')).slice(0, 3);
            return (
              <div key={x.name} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 14px rgba(15,23,42,0.07)' }}>
                <div style={{ position: 'relative', aspectRatio: '16 / 10', background: '#f1f5f9' }}>
                  {x.image && <Img src={staticFile(x.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <span style={{ position: 'absolute', top: 12, right: 12, background: BLUE, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{x.category}</span>
                </div>
                <div style={{ position: 'relative', padding: '0 16px 16px' }}>
                  <span style={{ position: 'absolute', top: -24, left: 16, width: 48, height: 48, borderRadius: 24, background: BLUE, border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <Building2 size={20} color="#fff" />
                  </span>
                  <div style={{ paddingTop: 32, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>{x.name}</h3>
                    <span style={{ width: 32, height: 32, borderRadius: 16, background: '#2563eb1a', color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ArrowRight size={16} />
                    </span>
                  </div>
                  {ringkas && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#64748b', lineHeight: 1.6 }}>{ringkas.trim()}</p>}
                  {cip.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cip.map((c) => (
                        <span key={c} style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#f1f5f9', color: '#475569' }}>{c.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== BILAH ATAS NAVY + NAVBAR (menempel di atas, lapisan paling depan) ===== */}
      <div style={{ ...layer(0, 230, explode, 0), zIndex: 10, transform: `translateZ(${230 * explode}px) translateY(${(1 - b(0, 16)) * -118}px)` }}>
        <div style={{ height: 36, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px', fontSize: 11.5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 4, fontWeight: 900, letterSpacing: '0.05em' }}>AAP</span>
              <span style={{ color: '#dbeafe' }}>Bandar Udara APT Pranoto Samarinda</span>
            </span>
            {next && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dbeafe' }}>
                <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />
                <PlaneTakeoff size={14} color="#67e8f9" /> Berikutnya <b style={{ color: '#fff' }}>{next.number}</b> ke <b style={{ color: '#fff' }}>{next.code ?? next.city}</b> · {next.time}
              </span>
            )}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#dbeafe' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CloudSun size={14} color="#fcd34d" /> 26°C Berawan</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} color="#67e8f9" /> 09:41 WITA</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> +62 811 551 944</span>
          </span>
        </div>
        <div style={{ position: 'relative', height: 82, background: 'rgba(255,255,255,0.97)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px' }}>
          <Img src={staticFile('logo/logo-apt.svg')} style={{ height: 56 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {MENU.map((m, i) => {
              const Icon = m.icon;
              const open = i === LAYANAN_INDEX ? menu : 0;
              return (
                <span key={m.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 10px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: m.active || open > 0.5 ? '#1d4ed8' : '#475569', background: m.active ? '#eff6ff' : `rgba(239,246,255,${open})` }}>
                  <Icon size={16} /> {m.name}
                  {m.sub && <ChevronDown size={14} style={{ transform: `rotate(${open * 180}deg)` }} />}
                  {m.active && <span style={{ position: 'absolute', bottom: -2, height: 2.5, borderRadius: 2, background: 'linear-gradient(90deg, #2563eb, #22d3ee)', left: 10, right: 10 }} />}
                </span>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><Search size={18} /></span>
            <span style={{ height: 40, padding: '0 10px', borderRadius: 12, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 800, color: '#475569' }}>ID</span>
            <span style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><Moon size={18} /></span>
            <span style={{ marginLeft: 4, height: 40, padding: '0 20px', borderRadius: 999, background: BLUE, color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 15px -3px rgba(37,99,235,0.25)' }}>
              <LayoutGrid size={16} /> Portal Aplikasi
            </span>
          </div>

          {/* Mega dropdown Layanan: kepala bergaya boarding pass, persis Navbar.tsx. */}
          {menu > 0.01 && (
            <div style={{ position: 'absolute', top: 70, left: MENU_X[LAYANAN_INDEX] - 190, width: 380, paddingTop: 12, opacity: menu, transform: `translateY(${(1 - menu) * 10}px) scale(${0.98 + menu * 0.02})` }}>
              <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(148,163,184,0.35)' }}>
                <div style={{ position: 'relative', padding: '12px 16px', background: `linear-gradient(90deg, ${NAVY}, #2563eb)`, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}>
                  <svg viewBox="0 0 380 48" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <path d="M-10 38 Q 130 12 390 30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 6" pathLength={1} strokeDashoffset={0} />
                  </svg>
                  <Plane size={16} color="#67e8f9" style={{ transform: 'rotate(45deg)' }} /> Layanan
                </div>
                <div style={{ padding: 8 }}>
                  {LAYANAN.map((l, i) => {
                    const Icon = l.icon;
                    const p = interpolate(menu, [0.2 + i * 0.12, 0.6 + i * 0.1], [0, 1], clamp);
                    return (
                      <div key={l.nama} style={{ display: 'flex', gap: 12, padding: 10, borderRadius: 12, background: i === 0 ? '#f8fafc' : 'transparent', opacity: p, transform: `translateX(${(1 - p) * -10}px)` }}>
                        <span style={{ width: 36, height: 36, borderRadius: 8, background: i === 0 ? BLUE : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={16} color={i === 0 ? '#fff' : BLUE} />
                        </span>
                        <span>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: i === 0 ? '#1d4ed8' : '#0f172a' }}>{l.nama}</span>
                          <span style={{ display: 'block', fontSize: 11.5, color: '#64748b' }}>{l.desc}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
