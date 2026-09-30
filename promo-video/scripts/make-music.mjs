/**
 * Sintesis musik latar video → public/music.wav.
 *
 * Dibuat sendiri dari osilator agar bebas masalah lisensi. Trek 120 BPM
 * (1 ketuk = 15 frame video), progresi C–G–Am–F; struktur mengikuti adegan:
 * intro menanjak selama hook, "drop" tepat saat adegan jadwal masuk, lalu
 * mereda di CTA. Pakai: `npm run music`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SR = 44100;
// Panjang & titik adegan dari src/timeline.json — musik selalu pas dengan video.
const TL = JSON.parse(await readFile(join(ROOT, 'src', 'timeline.json'), 'utf8'));
const START = {};
{
  let at = 0;
  for (const [i, sc] of TL.scenes.entries()) {
    START[sc.id] = (at - i * TL.transition) / TL.fps; // detik mulai tiap adegan
    at += sc.dur;
  }
}
const DUR = (TL.scenes.reduce((a, x) => a + x.dur, 0) - (TL.scenes.length - 1) * TL.transition) / TL.fps;
const BPM = 120;
const BEAT = 60 / BPM;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

// Dikuantisasi ke ketukan terdekat agar tetap sejalan dengan irama.
const onBeat = (sec) => Math.round(sec / BEAT) * BEAT;
const DROP = onBeat(START.desktop); // "drop" saat laptop muncul
const OUTRO = onBeat(START.cta);

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
// Akor per bar (4 ketuk): C, G, Am, F — dalam nada MIDI.
const CHORDS = [
  [60, 64, 67],
  [59, 62, 67],
  [57, 60, 64],
  [57, 60, 65],
];
const ROOTS = [36, 43, 45, 41];

function add(buf, i, v) {
  if (i >= 0 && i < N) buf[i] += v;
}
function addStereo(i, v, pan = 0) {
  add(L, i, v * (1 - Math.max(0, pan)));
  add(R, i, v * (1 + Math.min(0, pan)));
}

// ---- Instrumen ---------------------------------------------------------

function kick(t0, gain = 1) {
  const s = Math.floor(t0 * SR);
  for (let i = 0; i < 0.35 * SR; i++) {
    const t = i / SR;
    const f = 45 + 110 * Math.exp(-t * 28);
    const ph = 2 * Math.PI * (45 * t + (110 / 28) * (1 - Math.exp(-t * 28)));
    const env = Math.exp(-t * 9);
    addStereo(s + i, Math.sin(ph) * env * 0.9 * gain + (i < 90 ? (Math.random() - 0.5) * 0.3 * gain : 0));
    void f;
  }
}

function hat(t0, gain = 0.18, open = false) {
  const s = Math.floor(t0 * SR);
  let prev = 0;
  const len = (open ? 0.18 : 0.05) * SR;
  for (let i = 0; i < len; i++) {
    const n = Math.random() * 2 - 1;
    const hp = n - prev; // high-pass kasar
    prev = n;
    addStereo(s + i, hp * Math.exp(-i / SR * (open ? 18 : 70)) * gain, 0.3);
  }
}

function clap(t0, gain = 0.35) {
  const s = Math.floor(t0 * SR);
  for (let i = 0; i < 0.22 * SR; i++) {
    const t = i / SR;
    // Tiga ketukan rapat khas clap, lalu ekor.
    const burst = [0, 0.011, 0.022].some((b) => t >= b && t < b + 0.008) ? 1 : 0;
    const env = burst + Math.exp(-t * 22) * 0.6;
    addStereo(s + i, (Math.random() * 2 - 1) * env * gain, -0.15);
  }
}

function bass(t0, dur, note, gain = 0.32) {
  const s = Math.floor(t0 * SR);
  const f = midi(note);
  let lp = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    const saw = 2 * ((f * t) % 1) - 1;
    const sub = Math.sin(2 * Math.PI * f * t);
    const cutoff = 0.08 + 0.25 * Math.exp(-t * 10);
    lp += cutoff * (saw - lp);
    const env = Math.min(1, t * 200) * Math.min(1, (dur - t) * 60);
    addStereo(s + i, (lp * 0.6 + sub * 0.7) * env * gain);
  }
}

function pad(t0, dur, notes, gain = 0.07) {
  const s = Math.floor(t0 * SR);
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.4) * Math.min(1, (dur - t) / 0.4);
    let l = 0;
    let r = 0;
    for (const n of notes) {
      const f = midi(n);
      l += Math.sin(2 * Math.PI * f * 0.997 * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
      r += Math.sin(2 * Math.PI * f * 1.003 * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    }
    add(L, s + i, l * env * gain);
    add(R, s + i, r * env * gain);
  }
}

function pluck(t0, note, gain = 0.16, pan = 0) {
  const s = Math.floor(t0 * SR);
  const f = midi(note);
  for (let i = 0; i < 0.4 * SR; i++) {
    const t = i / SR;
    const sq = Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.4 + Math.sin(2 * Math.PI * f * t);
    const env = Math.exp(-t * 11) * Math.min(1, t * 400);
    addStereo(s + i, sq * env * gain, pan);
  }
}

function riser(t0, t1, gain = 0.25) {
  const s = Math.floor(t0 * SR);
  let prev = 0;
  for (let i = 0; i < (t1 - t0) * SR; i++) {
    const p = i / ((t1 - t0) * SR);
    const n = Math.random() * 2 - 1;
    const a = 0.02 + p * 0.5; // makin terang
    prev += a * (n - prev);
    const tone = Math.sin(2 * Math.PI * (200 + 1400 * p * p) * (i / SR)) * 0.25;
    addStereo(s + i, (prev + tone) * p * p * gain);
  }
}

function impact(t0, gain = 0.6) {
  const s = Math.floor(t0 * SR);
  for (let i = 0; i < 1.6 * SR; i++) {
    const t = i / SR;
    const boom = Math.sin(2 * Math.PI * (38 + 40 * Math.exp(-t * 6)) * t) * Math.exp(-t * 2.5);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 5) * 0.25;
    addStereo(s + i, (boom + noise) * gain);
  }
}

// ---- Aransemen ---------------------------------------------------------

const totalBeats = Math.floor(DUR / BEAT);
for (let b = 0; b < totalBeats; b++) {
  const t = b * BEAT;
  const bar = Math.floor(b / 4);
  const ch = CHORDS[bar % 4];
  const root = ROOTS[bar % 4];
  const inDrop = t >= DROP && t < OUTRO;
  const inIntro = t < DROP;

  // Pad sepanjang lagu, dimulai tiap bar.
  if (b % 4 === 0) pad(t, BEAT * 4, ch, inIntro ? 0.05 : 0.07);

  // Pluck arpeggio 1/8 — sudah ada sejak intro supaya hook tidak sepi.
  for (let k = 0; k < 2; k++) {
    const arp = [0, 1, 2, 1][(b * 2 + k) % 4];
    const oct = (b * 2 + k) % 8 >= 4 ? 12 : 0;
    pluck(t + k * BEAT / 2, ch[arp] + oct, inIntro ? 0.1 : 0.14, k ? 0.35 : -0.35);
  }

  if (inDrop) {
    kick(t);
    if (b % 2 === 1) clap(t);
    hat(t + BEAT / 2, 0.2, b % 4 === 3);
    hat(t + BEAT / 4, 0.08);
    hat(t + (3 * BEAT) / 4, 0.08);
    // Bass off-beat ala dance pop.
    bass(t + BEAT / 2, BEAT / 2 * 0.9, root);
    if (b % 4 === 3) bass(t + BEAT * 0.75, BEAT / 4 * 0.9, root + 12, 0.22);
  } else if (!inIntro) {
    // Outro: ketukan menipis, sisakan kick setengah waktu.
    if (b % 2 === 0) kick(t, 0.7);
  } else if (b >= 2) {
    // Intro: kick redam per ketuk menjelang drop.
    kick(t, 0.35 + (b / 6) * 0.3);
  }
}

// Riser menuju drop dan penekanan di awal tiap adegan besar.
riser(DROP - 2.2, DROP);
impact(DROP);
impact(OUTRO, 0.5);
impact(onBeat(START.jadwal), 0.35);
// Isian snare roll sebelum adegan PPID (±detik 24) dan CTA.
for (const at of [onBeat(START.jadwal), onBeat(START.ppid), OUTRO]) {
  for (let k = 0; k < 8; k++) clap(at - BEAT * 2 + (k * BEAT) / 4, 0.12 + k * 0.03);
}

// ---- Efek & master -----------------------------------------------------

// Reverb sederhana: beberapa gema berumpan-balik, silang kiri-kanan.
const out = [new Float32Array(N), new Float32Array(N)];
const taps = [
  [0.031, 0.35],
  [0.047, 0.3],
  [0.071, 0.25],
  [0.113, 0.2],
];
for (let i = 0; i < N; i++) {
  let wl = L[i];
  let wr = R[i];
  for (const [d, g] of taps) {
    const j = i - Math.floor(d * SR);
    if (j >= 0) {
      wl += out[1][j] * g * 0.5;
      wr += out[0][j] * g * 0.5;
    }
  }
  out[0][i] = wl;
  out[1][i] = wr;
}

let peak = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[c][i]));
const drive = 1.6 / peak;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.05) * Math.min(1, (DUR - t) / 2.5);
  for (let c = 0; c < 2; c++) {
    const v = Math.tanh(out[c][i] * drive) * 0.85 * fade; // pembatas lunak
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 4 + c * 2);
  }
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

await writeFile(join(ROOT, 'public', 'music.wav'), Buffer.concat([header, pcm]));
console.log(`public/music.wav — ${DUR} dtk, ${BPM} BPM, drop di ${DROP.toFixed(1)} dtk`);
