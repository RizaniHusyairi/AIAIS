import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
// Audio dari @remotion/media: satu-satunya yang didukung renderer web (web/main.tsx) sekaligus CLI.
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, springTiming, TransitionPresentation } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { fade } from '@remotion/transitions/fade';
import timeline from './timeline.json';
import { Hook } from './scenes/Hook';
import { Desktop } from './scenes/Desktop';
import { Jadwal } from './scenes/Jadwal';
import { Berita } from './scenes/Berita';
import { AplikasiPwa } from './scenes/AplikasiPwa';
import { FasilitasWisata } from './scenes/FasilitasWisata';
import { PusatBantuan } from './scenes/PusatBantuan';
import { Ppid } from './scenes/Ppid';
import { Cta } from './scenes/Cta';

const T = timeline.transition; // durasi tiap transisi (frame)

// Durasi ada di timeline.json — dibaca juga scripts/make-music.mjs.
const COMPONENTS: Record<string, React.FC> = {
  hook: Hook,
  desktop: Desktop,
  jadwal: Jadwal,
  berita: Berita,
  pwa: AplikasiPwa,
  fasilitas: FasilitasWisata,
  bantuan: PusatBantuan,
  ppid: Ppid,
  cta: Cta,
};
export const SCENES: { id: string; C: React.FC; dur: number }[] = timeline.scenes.map((s) => ({ ...s, C: COMPONENTS[s.id] }));

const PRESENTATIONS: TransitionPresentation<any>[] = [
  slide({ direction: 'from-bottom' }),
  // Desktop berakhir sebagai ponsel di posisi yang sama dengan ponsel adegan jadwal: cukup memudar.
  fade(),
  slide({ direction: 'from-right' }),
  wipe({ direction: 'from-bottom-left' }),
  slide({ direction: 'from-left' }),
  wipe({ direction: 'from-right' }),
  slide({ direction: 'from-bottom' }),
  fade(),
];

/** Transisi saling tumpang, jadi total = Σ durasi − (n−1)·T. */
export const TOTAL = SCENES.reduce((s, x) => s + x.dur, 0) - (SCENES.length - 1) * T;

/**
 * Musik dari scripts/make-music.mjs (`npm run music` → public/music.wav).
 * Dipasang lewat prop, bukan deteksi getStaticFiles(): fungsi itu kosong di
 * renderer web (web/main.tsx) sehingga musik diam-diam hilang.
 */
export const Promo: React.FC<{ music?: boolean }> = ({ music = true }) => {
  return (
    <AbsoluteFill style={{ background: '#06123a' }}>
      <TransitionSeries>
        {SCENES.flatMap(({ id, C, dur }, i) => {
          const seq = (
            <TransitionSeries.Sequence key={id} durationInFrames={dur}>
              <C />
            </TransitionSeries.Sequence>
          );
          if (i === SCENES.length - 1) return [seq];
          return [
            seq,
            <TransitionSeries.Transition
              key={`${id}-t`}
              presentation={PRESENTATIONS[i]}
              timing={i % 2 ? linearTiming({ durationInFrames: T }) : springTiming({ durationInFrames: T, config: { damping: 200 } })}
            />,
          ];
        })}
      </TransitionSeries>
      {music && <Audio src={staticFile('music.wav')} volume={(f) => Math.min(1, f / 15) * Math.min(1, (TOTAL - f) / 30)} />}
    </AbsoluteFill>
  );
};
