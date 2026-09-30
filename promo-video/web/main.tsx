import { renderMediaOnWeb, renderStillOnWeb } from '@remotion/web-renderer';
import { ALL_FORMATS, AudioBufferSource, BlobSource, BufferTarget, EncodedPacketSink, EncodedVideoPacketSource, Input, Mp4OutputFormat, Output } from 'mediabunny';
import { Promo, SCENES, TOTAL } from '../src/Promo';
import { FPS, H, W } from '../src/theme';

const log = (s: string) => {
  (document.getElementById('log') as HTMLElement).textContent = s;
};
const params = new URLSearchParams(location.search);

/**
 * Tempel public/music.wav ke video yang sudah jadi.
 *
 * Musik TIDAK dipasang sebagai <Audio> saat render: di renderer web audio
 * didekode ulang tiap frame sehingga render melambat ±100× (170 frame dalam
 * 10 menit). Paket video disalin apa adanya; hanya audio yang dienkode (AAC).
 */
async function withMusic(video: Blob): Promise<Blob> {
  const input = new Input({ source: new BlobSource(video), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('Trek video tidak ditemukan pada hasil render');
  const decoderConfig = await track.getDecoderConfig();

  const wav = await (await fetch('/music.wav')).arrayBuffer();
  const decoded = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(wav);
  // Potong musik tepat sepanjang video.
  const len = Math.min(decoded.length, Math.round((TOTAL / FPS) * decoded.sampleRate));
  const music = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate: decoded.sampleRate });
  for (let c = 0; c < 2; c++) music.copyToChannel(decoded.getChannelData(Math.min(c, decoded.numberOfChannels - 1)).subarray(0, len), c);

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const videoSource = new EncodedVideoPacketSource(track.codec!);
  const audioSource = new AudioBufferSource({ codec: 'aac', bitrate: 192_000 });
  output.addVideoTrack(videoSource, { frameRate: FPS });
  output.addAudioTrack(audioSource);
  await output.start();

  let first = true;
  for await (const packet of new EncodedPacketSink(track).packets()) {
    await videoSource.add(packet, first ? { decoderConfig: decoderConfig! } : undefined);
    first = false;
  }
  await audioSource.add(music);
  await output.finalize();
  return new Blob([(output.target as BufferTarget).buffer!], { type: 'video/mp4' });
}

async function run() {
  const t0 = performance.now();
  const { getBlob } = await renderMediaOnWeb({
    composition: { id: 'Promo', component: Promo, durationInFrames: TOTAL, fps: FPS, width: W, height: H, calculateMetadata: null },
    inputProps: { music: false },
    container: 'mp4',
    videoCodec: 'h264',
    videoBitrate: 'high',
    muted: true,
    onProgress: (p) => log(`Progres ${(p.progress * 100).toFixed(1)}% · ${p.encodedFrames}/${TOTAL} frame`),
  });
  let blob = await getBlob();
  if (!params.has('nomusic')) {
    log('Menempel musik…');
    blob = await withMusic(blob);
  }
  // Simpan lewat endpoint dev server (vite.config.ts), bukan unduhan browser.
  const res = await fetch('/__save?name=promo.mp4', { method: 'POST', body: blob });
  log(`Selesai dalam ${((performance.now() - t0) / 1000).toFixed(0)} dtk · ${(blob.size / 1e6).toFixed(1)} MB · simpan: ${res.status}`);
}

const start = () =>
  run().catch((e) => {
    log('GAGAL: ' + (e?.stack || e));
    fetch('/__save?name=render-error.txt', { method: 'POST', body: String(e?.stack || e) });
  });
document.getElementById('go')!.addEventListener('click', start);
// ?auto → langsung render; dipakai scripts/render-web.mjs lewat Chrome headless.
if (params.has('auto')) start();

// Uji satu frame untuk memeriksa kesetiaan gambar renderer web: window.__still('jadwal', 75)
(window as any).__still = async (id: string, frame: number) => {
  const s = SCENES.find((x) => x.id === id)!;
  const r = await renderStillOnWeb({ composition: { id, component: s.C, durationInFrames: s.dur, fps: FPS, width: W, height: H }, frame, scale: 0.4, delayRenderTimeoutInMilliseconds: 15000 });
  const blob = await r.blob({ format: 'png' });
  await fetch(`/__save?name=web-${id}-${frame}.png`, { method: 'POST', body: blob });
  return blob.size;
};
