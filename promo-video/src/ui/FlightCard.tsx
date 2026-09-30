import React from 'react';
import { Img, staticFile } from 'remotion';
import { PlaneTakeoff } from 'lucide-react';
import { C, FONT } from '../theme';
import { Flight, STATUS_COLOR } from '../data';
import { Glass } from './Glass';
import { StatusPill } from './bits';

/** Baris penerbangan ringkas di dalam layar ponsel. */
export const FlightRow: React.FC<{ f: Flight; style?: React.CSSProperties; highlight?: number }> = ({ f, style, highlight = 0 }) => (
  <Glass
    radius={28}
    strong={highlight > 0.5}
    glow={highlight > 0 ? `rgba(251,191,36,${0.5 * highlight})` : undefined}
    style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 22px', ...style }}
  >
    <div style={{ width: 64, height: 64, borderRadius: 18, background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {f.logo ? <Img src={staticFile(f.logo)} style={{ width: 52, height: 52, objectFit: 'contain' }} /> : <PlaneTakeoff size={34} color={f.color} />}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 30, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.city}</div>
      <div style={{ fontSize: 21, opacity: 0.75, fontWeight: 600 }}>
        {f.number} · {f.airline}
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 30, fontWeight: 800 }}>{f.time.replace(' WITA', '')}</div>
      <StatusPill label={f.status} color={STATUS_COLOR[f.status] ?? C.skyLight} />
    </div>
  </Glass>
);

/**
 * Boarding pass besar — kartu penerbangan yang "keluar" dari ponsel.
 * Tanpa nama penumpang: yang tampil hanya data jadwal publik.
 */
export const BoardingPassCard: React.FC<{ f: Flight; style?: React.CSSProperties }> = ({ f, style }) => (
  <div
    style={{
      width: 860,
      fontFamily: FONT,
      borderRadius: 44,
      background: C.white,
      color: C.ink,
      boxShadow: '0 50px 120px rgba(3,10,40,0.55)',
      overflow: 'hidden',
      ...style,
    }}
  >
    <div style={{ background: `linear-gradient(120deg, ${C.navy}, ${C.blue} 60%, ${C.sky})`, color: C.white, padding: '30px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 3 }}>BOARDING PASS</div>
      <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.9 }}>{f.number}</div>
    </div>
    <div style={{ padding: '36px 44px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>AAP</div>
        <div style={{ fontSize: 26, color: C.slate, fontWeight: 600 }}>Samarinda</div>
      </div>
      <div style={{ flex: 1, margin: '0 30px', position: 'relative', height: 0, borderTop: `5px dashed ${C.sky}` }}>
        <PlaneTakeoff size={62} color={C.blue} style={{ position: 'absolute', left: '50%', top: -30, marginLeft: -31, background: C.white, padding: 6 }} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{f.code ?? '···'}</div>
        <div style={{ fontSize: 26, color: C.slate, fontWeight: 600 }}>{f.city}</div>
      </div>
    </div>
    {/* Sobekan berlubang ala tiket */}
    <div style={{ position: 'relative', height: 0, margin: '0 44px', borderTop: '3px dashed #cbd5e1' }}>
      <div style={{ position: 'absolute', left: -70, top: -26, width: 52, height: 52, borderRadius: '50%', background: C.navy }} />
      <div style={{ position: 'absolute', right: -70, top: -26, width: 52, height: 52, borderRadius: '50%', background: C.navy }} />
    </div>
    <div style={{ padding: '28px 44px 36px', display: 'flex', justifyContent: 'space-between' }}>
      {[
        ['Maskapai', f.airline],
        ['Berangkat', f.time],
        ['Status', f.status],
      ].map(([k, v]) => (
        <div key={k}>
          <div style={{ fontSize: 20, color: C.slate, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>{k}</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{v}</div>
        </div>
      ))}
    </div>
  </div>
);
