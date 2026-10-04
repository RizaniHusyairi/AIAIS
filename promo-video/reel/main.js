import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource } from '/mediabunny.mjs';
import { W, H, FPS, DUR, prepare, drawFrame } from './reel.js';
import { makeMusic } from './audio.js';

const log = (s) => { document.getElementById('log').textContent = s; };
const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const save = (name, blob) => fetch('/__save?name=' + name, { method: 'POST', body: blob });

// Teks hanya digambar di kanvas, jadi tiap rupa huruf harus dipancing unduh dulu.
async function fonts() {
  const faces = ['900', '800', '700', '600', '500', '400'].map((w) => `${w} 100px "Inter Tight"`)
    .concat(['600 100px "Playfair Display"', 'italic 500 100px "Playfair Display"', 'italic 600 100px "Playfair Display"', '400 20px "JetBrains Mono"', '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"']);
  await Promise.all(faces.map((f) => document.fonts.load(f)));
  await document.fonts.ready;
}

// Lembar kontak beberapa titik waktu — cara cepat memeriksa gambar.
async function sheet(times, cols) {
  const s = 1 / cols, rows = Math.ceil(times.length / cols);
  const sc = new OffscreenCanvas(W, Math.round(H * s * rows));
  const sx = sc.getContext('2d');
  times.forEach((t, i) => {
    drawFrame(ctx, t);
    const x = (i % cols) * W * s, y = Math.floor(i / cols) * H * s;
    sx.drawImage(canvas, x, y, W * s, H * s);
    sx.fillStyle = '#ff0'; sx.font = '700 22px monospace'; sx.fillText(t.toFixed(2), x + 8, y + 26);
    sx.strokeStyle = '#000'; sx.strokeRect(x, y, W * s, H * s);
  });
  await save(q.get('name') || 'reel-sheet.png', await sc.convertToBlob({ type: 'image/png' }));
}

async function render() {
  const out = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const video = new CanvasSource(canvas, { codec: 'avc', bitrate: 30e6, keyFrameInterval: 1 });
  // 192 kbps: pengode AAC Windows menolak 256 kbps.
  const audio = new AudioBufferSource({ codec: 'aac', bitrate: 192_000 });
  out.addVideoTrack(video, { frameRate: FPS });
  out.addAudioTrack(audio);
  await out.start();
  log('musik…');
  await audio.add(await makeMusic(DUR));
  const N = FPS * DUR, t0 = performance.now();
  for (let i = 0; i < N; i++) {
    drawFrame(ctx, i / FPS);
    await video.add(i / FPS, 1 / FPS);
    if (i % 30 === 0) log(`frame ${i}/${N} · ${((performance.now() - t0) / 1000).toFixed(0)} dtk`);
  }
  await out.finalize();
  const blob = new Blob([out.target.buffer], { type: 'video/mp4' });
  await save('promo-reel.mp4', blob);
  return `out/promo-reel.mp4 · ${(blob.size / 1e6).toFixed(1)} MB · ${((performance.now() - t0) / 1000).toFixed(0)} dtk`;
}

async function audioCheck() {
  const b = await makeMusic(DUR);
  const d = b.getChannelData(0);
  const win = b.sampleRate / 2, rows = [];
  for (let s = 0; s < d.length; s += win) {
    let pk = 0, ss = 0;
    for (let i = s; i < Math.min(d.length, s + win); i++) { pk = Math.max(pk, Math.abs(d[i])); ss += d[i] * d[i]; }
    rows.push(`${(s / b.sampleRate).toFixed(1)}s pk ${pk.toFixed(2)} rms ${Math.sqrt(ss / win).toFixed(3)}`);
  }
  return rows.join(' | ');
}

(async () => {
  try {
    await fonts();
    await prepare();
    let msg = '';
    if (q.has('sheet')) await sheet(q.get('sheet').split(',').map(Number), +(q.get('cols') || 4));
    else if (q.has('audio')) msg = await audioCheck();
    else msg = await render();
    log('DONE ' + msg);
  } catch (e) {
    log('FAIL ' + (e?.stack || e));
  }
})();
