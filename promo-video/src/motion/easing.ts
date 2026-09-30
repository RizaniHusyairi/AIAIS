import { Easing, interpolate, spring } from 'remotion';
import { FPS } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Progres 0→1 antara dua frame dengan kurva halus. */
export function ease(frame: number, from: number, to: number, easing = Easing.bezier(0.22, 1, 0.36, 1)) {
  return interpolate(frame, [from, to], [0, 1], { ...clamp, easing });
}

/** Pegas pendek yang sedikit memantul — dipakai untuk kartu dan tombol yang "muncul". */
export function pop(frame: number, delay = 0, damping = 12) {
  return spring({ frame: frame - delay, fps: FPS, config: { damping, stiffness: 170, mass: 0.7 } });
}

/** Pegas tanpa pantulan untuk perpindahan besar (layar, ponsel). */
export function glide(frame: number, delay = 0) {
  return spring({ frame: frame - delay, fps: FPS, config: { damping: 200, stiffness: 90 } });
}

export function lerp(t: number, a: number, b: number) {
  return a + (b - a) * t;
}

export { clamp };
