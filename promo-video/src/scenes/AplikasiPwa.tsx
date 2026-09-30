import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Home, Newspaper, LifeBuoy, LayoutGrid, UserRound, PlaneTakeoff, Building2, Palmtree, FileSearch, Megaphone, Store, Plane, Users, ClipboardList, PackageSearch, MessageSquareWarning, MessagesSquare, Download } from 'lucide-react';
import { C, FONT } from '../theme';
import { SkyBackground } from '../motion/SkyBackground';
import { KineticText } from '../motion/KineticText';
import { clamp, ease, glide, pop } from '../motion/easing';
import { PhoneFrame } from '../ui/PhoneFrame';
import { Glass, Skeleton } from '../ui/Glass';
import { TapCursor } from '../ui/TapCursor';

// Lima tab sama dengan frontend/src/components/pwa/nav.ts — Bantuan ditonjolkan di tengah.
const TABS = [
  { label: 'Beranda', icon: Home },
  { label: 'Berita', icon: Newspaper },
  { label: 'Bantuan', icon: LifeBuoy, utama: true },
  { label: 'Layanan', icon: LayoutGrid },
  { label: 'Akun', icon: UserRound },
];
const TAB_X = [70, 180, 286, 392, 502];
const TAPS = [
  { at: 22, tab: 1 },
  { at: 40, tab: 3 },
  { at: 58, tab: 2 },
];
const HOME_AT = 80;

const Tiles: React.FC<{ items: { label: string; icon: React.FC<any>; color: string }[]; f: number; from: number }> = ({ items, f, from }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
    {items.map((it, i) => {
      const p = pop(f, from + i * 2, 13);
      const Icon = it.icon;
      return (
        <Glass key={it.label} radius={28} style={{ padding: '24px 20px', transform: `scale(${p})`, opacity: p }}>
          <div style={{ width: 62, height: 62, borderRadius: 18, background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon size={34} color={C.white} />
          </div>
          <div style={{ fontSize: 25, fontWeight: 800 }}>{it.label}</div>
        </Glass>
      );
    })}
  </div>
);

const SCREENS = [
  { title: 'Beranda', body: (f: number, s: number) => <Tiles f={f} from={s} items={[
    { label: 'Jadwal', icon: PlaneTakeoff, color: C.sky },
    { label: 'Berita', icon: Newspaper, color: '#6366f1' },
    { label: 'Fasilitas', icon: Building2, color: '#14b8a6' },
    { label: 'Wisata', icon: Palmtree, color: '#22c55e' },
    { label: 'Bantuan', icon: LifeBuoy, color: '#f43f5e' },
    { label: 'PPID', icon: FileSearch, color: '#f59e0b' },
  ]} /> },
  { title: 'Berita', body: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <Glass key={i} radius={26} style={{ display: 'flex', gap: 18, padding: 18 }}>
          <div style={{ width: 130, height: 100, borderRadius: 18, background: `linear-gradient(135deg, ${C.blue}, ${C.sky})` }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
            <Skeleton w="35%" h={14} />
            <Skeleton w="95%" h={20} o={0.4} />
            <Skeleton w="70%" h={20} o={0.4} />
          </div>
        </Glass>
      ))}
    </div>
  ) },
  { title: 'Pusat Bantuan', body: (f: number, s: number) => <Tiles f={f} from={s} items={[
    { label: 'Pengaduan', icon: MessageSquareWarning, color: '#f43f5e' },
    { label: 'Lapor Hilang', icon: PackageSearch, color: '#f59e0b' },
    { label: 'Chat Petugas', icon: MessagesSquare, color: C.sky },
    { label: 'Info Publik', icon: FileSearch, color: '#14b8a6' },
  ]} /> },
  { title: 'Layanan', body: (f: number, s: number) => <Tiles f={f} from={s} items={[
    { label: 'Pengiklanan', icon: Megaphone, color: '#8b5cf6' },
    { label: 'Tenant', icon: Store, color: '#14b8a6' },
    { label: 'Slot Charter', icon: Plane, color: C.sky },
    { label: 'Field Trip', icon: Users, color: '#22c55e' },
    { label: 'Perizinan', icon: ClipboardList, color: '#f59e0b' },
    { label: 'Sewa Ruang', icon: Building2, color: '#6366f1' },
  ]} /> },
];
// Indeks tab → indeks layar
const SCREEN_OF_TAB: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3 };

/** 12–16 dtk: tur bilah bawah lima slot, lalu aplikasi "dipasang" ke layar utama. */
export const AplikasiPwa: React.FC = () => {
  const f = useCurrentFrame();
  const enter = glide(f, 0);
  const passed = TAPS.filter((t) => f >= t.at);
  const tab = passed.length ? passed[passed.length - 1].tab : 0;
  const lastAt = passed.length ? passed[passed.length - 1].at : 0;
  // Indikator meluncur mulus dari tab sebelumnya ke tab aktif.
  const prevTab = passed.length > 1 ? passed[passed.length - 2].tab : 0;
  const slide = ease(f, lastAt, lastAt + 10);
  const indX = TAB_X[prevTab] + (TAB_X[tab] - TAB_X[prevTab]) * (passed.length ? slide : 0);
  const screen = SCREENS[SCREEN_OF_TAB[tab]];
  const home = ease(f, HOME_AT, HOME_AT + 18);
  const pulse = 1 + 0.08 * Math.sin(f / 4);
  const drop = pop(f, HOME_AT + 16, 9);

  return (
    <AbsoluteFill>
      <SkyBackground />
      <KineticText text="Semua dalam satu aplikasi, tanpa unduh dari toko" highlight={['satu', 'aplikasi,']} size={72} top={270} />
      <PhoneFrame y={1130 + (1 - enter) * 900} scale={0.94} rotateY={(1 - enter) * -25}>
        {/* Layar aplikasi */}
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - home, transform: `scale(${1 - home * 0.15})` }}>
          <div key={tab} style={{ position: 'absolute', top: 100, left: 30, right: 30, opacity: passed.length ? ease(f, lastAt, lastAt + 6) : 1, transform: `translateX(${passed.length ? (1 - ease(f, lastAt, lastAt + 10)) * 60 : 0}px)` }}>
            <div style={{ fontSize: 22, color: C.skyLight, fontWeight: 700, letterSpacing: 2 }}>APT PRANOTO</div>
            <div style={{ fontSize: 46, fontWeight: 800, marginBottom: 26 }}>{screen.title}</div>
            {screen.body(f, passed.length ? lastAt + 2 : 8)}
          </div>
          {/* Bilah bawah */}
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 22, height: 128, borderRadius: 44, background: 'rgba(6,18,58,0.75)', border: '2px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)' }}>
            <div style={{ position: 'absolute', top: 12, left: indX - 16 - 44, width: 88, height: 6, borderRadius: 6, background: C.amber, boxShadow: `0 0 16px ${C.amber}`, opacity: tab === 2 ? 0 : 1 }} />
            {TABS.map((t, i) => {
              const Icon = t.icon;
              const active = i === tab;
              if (t.utama) {
                return (
                  <div key={t.label} style={{ position: 'absolute', left: TAB_X[i] - 16 - 58, top: -44, width: 116, height: 116, borderRadius: '50%', background: `linear-gradient(135deg, #fb7185, #f43f5e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 8px rgba(244,63,94,0.25), 0 16px 40px rgba(244,63,94,0.6)`, transform: `scale(${pulse * (active ? 1.08 : 1)})` }}>
                    <Icon size={56} color={C.white} />
                  </div>
                );
              }
              return (
                <div key={t.label} style={{ position: 'absolute', left: TAB_X[i] - 16 - 50, top: 26, width: 100, textAlign: 'center', color: active ? C.amber : 'rgba(255,255,255,0.7)' }}>
                  <Icon size={40} style={{ transform: `translateY(${active ? -4 : 0}px)` }} />
                  <div style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{t.label}</div>
                </div>
              );
            })}
          </div>
          <TapCursor taps={[{ at: 10, x: 300, y: 700 }, ...TAPS.map((t) => ({ at: t.at, x: TAB_X[t.tab] - 16, y: t.tab === 2 ? 1085 : 1110 }))]} enter={8} exit={HOME_AT - 8} />
        </div>
        {/* Layar utama ponsel: ikon aplikasi jatuh ke slot kosong */}
        <div style={{ position: 'absolute', inset: 0, opacity: home, background: `linear-gradient(160deg, #312e81, ${C.blue} 60%, ${C.sky})` }}>
          <div style={{ position: 'absolute', top: 150, left: 50, right: 50, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: 50, columnGap: 30 }}>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                {i === 5 ? (
                  <div style={{ transform: `translateY(${(1 - drop) * -500}px) scale(${0.6 + drop * 0.4})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Img src={staticFile('logo/icon-512.png')} style={{ width: 100, height: 100, borderRadius: 26, boxShadow: `0 0 ${30 * drop}px rgba(251,191,36,0.9)` }} />
                    <div style={{ fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap' }}>APT Pranoto</div>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 100, height: 100, borderRadius: 26, background: 'rgba(255,255,255,0.18)' }} />
                    <Skeleton w={70} h={12} o={0.25} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </PhoneFrame>
      {/* Lencana "Tambahkan ke layar utama" */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1540, display: 'flex', justifyContent: 'center', opacity: interpolate(f, [HOME_AT + 4, HOME_AT + 14], [0, 1], clamp), transform: `translateY(${(1 - ease(f, HOME_AT + 4, HOME_AT + 20)) * 40}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 34px', borderRadius: 50, background: C.white, color: C.navy, fontFamily: FONT, fontSize: 32, fontWeight: 800, boxShadow: '0 20px 50px rgba(3,10,40,0.45)' }}>
          <Download size={38} /> Tambahkan ke layar utama
        </div>
      </div>
    </AbsoluteFill>
  );
};
