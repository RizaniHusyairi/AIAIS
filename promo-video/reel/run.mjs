/**
 * Render motion reel aptpairport.id tanpa ffmpeg — `npm run reel` (atau
 * `node reel/run.mjs "<kueri>"`).
 *
 * Menyajikan reel/ beserta aset promo-video (public/img, public/logo, snapshot
 * data), membuka Chrome headless terpasang, lalu menunggu halaman menulis DONE
 * atau FAIL ke #log. Kueri: `render` → out/promo-reel.mp4; `sheet=1,2.5,…`
 * → lembar kontak PNG untuk memeriksa gambar; `audio` → ringkasan level musik.
 * Chrome terpasang dipakai (bukan bawaan Remotion) karena memakai GPU.
 */
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const REEL = dirname(fileURLToPath(import.meta.url));
const ROOT = join(REEL, '..');
const OUT = join(ROOT, 'out');
const PORT = 5299, DEBUG = 9344;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const CHROME = [process.env.RENDER_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((c) => c && existsSync(c));
if (!CHROME) { console.error('Chrome/Edge tidak ditemukan — set RENDER_BROWSER.'); process.exit(1); }

function resolve(path) {
  if (path === '/mediabunny.mjs') return join(ROOT, 'node_modules/mediabunny/dist/bundles/mediabunny.mjs');
  if (path === '/data/snapshot.json') return join(ROOT, 'src/data/snapshot.json');
  if (path.startsWith('/img/') || path.startsWith('/logo/')) return join(ROOT, 'public', normalize(path));
  return join(REEL, path === '/' ? 'index.html' : normalize(path));
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__save') {
    const name = (u.searchParams.get('name') || 'x.bin').replace(/[^\w.-]/g, '');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { mkdirSync(OUT, { recursive: true }); writeFileSync(join(OUT, name), Buffer.concat(chunks)); res.end('ok'); });
    return;
  }
  const file = resolve(decodeURIComponent(u.pathname));
  if (!existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));

const chrome = spawn(CHROME, [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'reel-'))}`,
  `--remote-debugging-port=${DEBUG}`,
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  // GPU sungguhan: kanvas 1080p 60 fps dengan blur terlalu lambat di GL perangkat lunak.
  '--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist',
  '--window-size=1280,900', 'about:blank',
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const quit = (code) => { chrome.kill(); server.close(); process.exit(code); };

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${DEBUG}/json`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!target) { console.error('Tidak bisa tersambung ke Chrome headless.'); quit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') console.error('Galat halaman:', m.params.exceptionDetails.exception?.description?.slice(0, 600));
});
const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await cdp('Runtime.enable');
await cdp('Page.enable');
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
await cdp('Page.navigate', { url: `http://localhost:${PORT}/?${process.argv[2] || 'render'}` });

const t0 = Date.now(); let last = '';
while (Date.now() - t0 < 20 * 60_000) {
  await sleep(1000);
  const s = (await cdp('Runtime.evaluate', { expression: `document.getElementById('log')?.textContent ?? ''`, returnByValue: true }))?.result?.value ?? '';
  if (s !== last) { console.log(s); last = s; }
  if (s.startsWith('DONE')) quit(0);
  if (s.startsWith('FAIL')) quit(1);
}
console.error('Melewati batas waktu 20 menit.'); quit(1);
