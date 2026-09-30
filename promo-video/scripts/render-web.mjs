/**
 * Render video lengkap tanpa ffmpeg: Vite menyajikan web/ (renderer WebCodecs),
 * Chrome headless bawaan Remotion membukanya dengan ?auto, hasilnya ditulis ke
 * out/promo.mp4 lewat endpoint /__save (vite.config.ts).
 *
 * Ada karena Smart App Control Windows memblokir ffmpeg.exe bawaan Remotion.
 * Chrome headless dipakai (bukan tab biasa) karena tab tersembunyi menahan
 * pemuatan gambar sehingga render macet. Progres dibaca lewat DevTools Protocol.
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out', 'promo.mp4');
// Utamakan Chrome/Edge terpasang: mode --headless=new-nya memakai GPU, sedangkan
// chrome-headless-shell bawaan Remotion jatuh ke GL perangkat lunak dan merayap
// pada adegan 3D (±1 frame/dtk). Bisa dipaksa lewat env RENDER_BROWSER.
const CANDIDATES = [
  process.env.RENDER_BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  join(ROOT, 'node_modules', '.remotion', 'chrome-headless-shell', 'win64', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
].filter(Boolean);
const CHROME = CANDIDATES.find((c) => existsSync(c)) ?? CANDIDATES.at(-1);
const IS_SHELL = CHROME.includes('headless-shell');
const PORT_DEBUG = 9333;
const LIMIT_MS = 15 * 60_000;

if (!existsSync(CHROME)) {
  console.error('Chrome headless belum ada — jalankan sekali `npx remotion still Promo out/x.png` agar Remotion mengunduhnya.');
  process.exit(1);
}
if (existsSync(OUT)) unlinkSync(OUT);

// root diambil dari vite.config.ts (web/); jangan ditimpa di sini.
const server = await createServer({ configFile: join(ROOT, 'vite.config.ts'), logLevel: 'error' });
await server.listen();
const url = `http://localhost:${server.config.server.port}/?auto${process.argv.includes('--nomusic') ? '&nomusic' : ''}`;

console.log('Peramban:', CHROME);
const chrome = spawn(CHROME, [
  ...(IS_SHELL ? [] : ['--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio']),
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'promo-render-'))}`,
  `--remote-debugging-port=${PORT_DEBUG}`,
  '--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  // GPU sungguhan: dengan GL perangkat lunak (bawaan headless) transformasi 3D
  // membuat render ±100× lebih lambat.
  '--use-angle=d3d11',
  '--enable-gpu-rasterization',
  '--ignore-gpu-blocklist',
  '--window-size=1280,900',
  'about:blank',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function cleanup(code) {
  chrome.kill();
  await server.close();
  process.exit(code);
}

// Sambungkan CDP ke tab pertama.
let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT_DEBUG}/json`)).json()).find((t) => t.type === 'page');
  } catch {}
}
if (!target) {
  console.error('Tidak bisa tersambung ke Chrome headless.');
  await cleanup(1);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.consoleAPICalled' && process.env.RENDER_DEBUG) {
    console.log('[konsol]', msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
  } else if (msg.method === 'Runtime.exceptionThrown') {
    console.error('Galat halaman:', msg.params.exceptionDetails.exception?.description?.slice(0, 400));
  }
});
const cdp = (method, params = {}) =>
  new Promise((r) => {
    const id = ++seq;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, returnByValue: true }))?.result?.value;

await cdp('Runtime.enable');
// Pastikan halaman menganggap dirinya terlihat — rAF & pemuatan gambar tidak ditahan.
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
await cdp('Page.enable');
await cdp('Page.navigate', { url });
console.log('Membuka', url);

const t0 = Date.now();
let last = '';
while (Date.now() - t0 < LIMIT_MS) {
  await sleep(2000);
  const status = (await evaluate(`[document.visibilityState, typeof window.__still, document.getElementById('log')?.textContent ?? ''].join(' | ')`)) ?? '';
  if (status !== last) {
    console.log(status.slice(0, 300));
    last = status;
  }
  if (status.includes('GAGAL')) await cleanup(1);
  if (status.includes('Selesai') && existsSync(OUT)) {
    console.log(`out/promo.mp4 (${(statSync(OUT).size / 1e6).toFixed(1)} MB) dalam ${Math.round((Date.now() - t0) / 1000)} dtk`);
    await cleanup(0);
  }
}
console.error('Melewati batas waktu 15 menit.');
await cleanup(1);
