/**
 * Motion reel aptpairport.id — 60 dtk, 1920×1080, 60 fps, 80 BPM.
 *
 * Tiap frame adalah fungsi murni dari waktu, digambar langsung ke kanvas 2D;
 * tidak ada kunci animasi. Setiap adegan menerima waktu LOKAL `u` (detik sejak
 * adegan mulai) dan menulis seluruh pewaktuannya dalam KETUK lewat `bp()`,
 * sehingga mengganti tempo di timeline.js cukup di satu tempat.
 *
 * Aturan isi sama dengan video promo Remotion (lihat README): semua data —
 * penerbangan, statistik LLAU, fasilitas, wisata, berita, PPID, surat, FAQ,
 * linimasa — dibaca dari src/data/snapshot.json. Foto "Self Check-In" dilewati
 * (memuat poster pejabat politik); formulir hanya kerangka garis.
 */
import { BEAT, SCENES, DUR } from './timeline.js';

export const W = 1920, H = 1080, FPS = 60;
export { DUR };

// Palet keluarga hero portal (from-[#0b1e5b] via-blue-700 to-sky-500) + aksen amber & emas nama bandara.
const C = {
  deep: '#06123A', navy: '#0B1E5B', navy2: '#13296F', blue: '#1D4ED8', sky: '#0EA5E9', skyL: '#7DD3FC',
  amber: '#FBBF24', gold: '#E3C88B', green: '#34D399', paper: '#F3F6FB', card: '#FFFFFF', ink: '#0F172A', slate: '#64748B',
};
const F = {
  disp: '"Inter Tight", "Arial Black", sans-serif',
  serif: '"Playfair Display", Georgia, serif',
  mono: '"JetBrains Mono", Consolas, monospace',
};

// ---------- matematika & easing ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
/** Progres dalam satuan ketuk: bp(u, 1, 2) = 0→1 antara ketuk ke-1 dan ke-2. */
const bp = (u, a, b) => prog(u, a * BEAT, b * BEAT);
const TAU = Math.PI * 2;
const E = {
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
/** Pegas teredam 0→1 (melewati sasaran), t dalam detik sejak dilepas. */
function spring(t, freq = 2, damp = 0.4) {
  if (t <= 0) return 0;
  const w = TAU * freq;
  return 1 - Math.exp(-damp * w * t) * Math.cos(w * Math.sqrt(1 - damp * damp) * t);
}
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(t)))).join(',')})`;
};
const mk = (w = W, h = H) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d')]; };

// ---------- bantuan gambar ----------
function bg(ctx, col) { ctx.fillStyle = col; ctx.fillRect(-60, -60, W + 120, H + 120); }
function skyBg(ctx, a = C.navy, b = C.deep) {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.35, 80, W * 0.5, H * 0.5, W * 0.75);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
}
// Bokeh langit yang melayang — kedalaman untuk latar gelap.
function bokeh(ctx, t, n = 26, alpha = 0.16, seed = 3) {
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = 0.3 + r() * 0.7, rad = 20 + r() * 90 * z;
    const x = ((r() * (W + 400) + t * 30 * z) % (W + 400)) - 200, y = r() * H + Math.sin(t * 0.5 + i) * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const col = r() < 0.7 ? '125,211,252' : '251,191,36';
    g.addColorStop(0, `rgba(${col},${alpha * z})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.restore();
}
function glyphs(ctx, text) {
  const g = []; let prev = 0;
  for (let i = 0; i < text.length; i++) {
    const w = ctx.measureText(text.slice(0, i + 1)).width;
    g.push({ ch: text[i], x: prev, w: w - prev }); prev = w;
  }
  return { g, w: prev };
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function cover(ctx, img, x, y, w, h, zoom = 1, fx = 0.5, fy = 0.5) {
  if (!img) { ctx.fillStyle = C.navy2; ctx.fillRect(x, y, w, h); return; }
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) * fx, (img.height - sh) * fy, sw, sh, x, y, w, h);
}
function wrap(ctx, text, maxW, maxLines) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const tryL = line ? line + ' ' + w : w;
    if (ctx.measureText(tryL).width > maxW && line) { lines.push(line); line = w; } else line = tryL;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
  return lines;
}
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tanggal = (iso) => { const d = new Date(iso); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const ribuan = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// Isian gradien dengan pita kilau yang menyapu dari kiri ke kanan (p 0→1).
function shine(ctx, x0, x1, p, base, glint = '#FFFFFF') {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  const c = clamp(p * 1.4 - 0.2, -0.2, 1.2);
  g.addColorStop(0, base);
  if (c - 0.12 > 0 && c - 0.12 < 1) g.addColorStop(c - 0.12, base);
  if (c > 0 && c < 1) g.addColorStop(c, glint);
  if (c + 0.12 > 0 && c + 0.12 < 1) g.addColorStop(c + 0.12, base);
  g.addColorStop(1, base);
  return g;
}
const label = (ctx, text, x, y, col = C.skyL, a = 0.75, size = 17) => {
  ctx.save(); ctx.font = `500 ${size}px ${F.mono}`; ctx.letterSpacing = '3px'; ctx.fillStyle = col; ctx.globalAlpha *= a;
  ctx.fillText(text, x, y); ctx.restore();
};
function pill(ctx, text, x, y, fill, fg, size = 15) {
  ctx.save(); ctx.font = `700 ${size}px ${F.mono}`; ctx.letterSpacing = '2px';
  const w = ctx.measureText(text).width + 28;
  ctx.fillStyle = fill; rr(ctx, x, y, w, size + 19, (size + 19) / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.fillText(text, x + 14, y + size + 4);
  ctx.restore();
  return w;
}

// Pesawat tampak atas, hidung ke +x.
const PLANE = new Path2D('M30 0 L18 -3 L4 -3 L-6 -22 L-12 -22 L-6 -3 L-20 -3 L-26 -10 L-30 -10 L-27 0 L-30 10 L-26 10 L-20 3 L-6 3 L-12 22 L-6 22 L4 3 L18 3 Z');
function plane(ctx, x, y, ang, s, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s); ctx.fillStyle = col; ctx.fill(PLANE); ctx.restore(); }

// ---------- transisi ----------
// Sapuan ubin 60 px menutup layar secara diagonal.
function tileWipe(ctx, p, col) {
  if (p <= 0) return;
  ctx.fillStyle = col;
  for (let r = 0; r < 18; r++) for (let c = 0; c < 32; c++) {
    const d = (c + r) / 48 * 0.55;
    const f = E.outExpo(clamp((p - d) / 0.45));
    if (f <= 0) continue;
    const q = 62 * f;
    ctx.fillRect(c * 60 + 30 - q / 2, r * 60 + 30 - q / 2, q, q);
  }
}
// Bilah miring dua sisi: p 0→0,5 menutup (adegan keluar), 0,5→1 membuka (adegan masuk).
function slab(ctx, p, col, accent = C.amber) {
  if (p <= 0 || p >= 1) return;
  const sk = 420, span = W + sk * 2;
  const a = p < 0.5 ? -sk : lerp(-sk, W + sk, E.inOutCubic((p - 0.5) * 2));
  const b = p < 0.5 ? lerp(-sk, W + sk, E.inOutCubic(p * 2)) : W + sk;
  const quad = (x0, x1, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x0, -60); ctx.lineTo(x1 + sk, -60); ctx.lineTo(x1, H + 60); ctx.lineTo(x0 - sk, H + 60); ctx.closePath(); ctx.fill(); };
  quad(a, b, col);
  // garis aksen di tepi depan
  const edge = p < 0.5 ? b : a;
  ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(edge, -60); ctx.lineTo(edge + 26 + sk, -60); ctx.lineTo(edge + 26, H + 60); ctx.lineTo(edge - sk, H + 60); ctx.closePath();
  if (p > 0.03 && p < 0.97) ctx.fill();
  void span;
}
function blinds(ctx, p, col) {
  if (p <= 0) return;
  ctx.fillStyle = col;
  for (let k = 0; k < 8; k++) ctx.fillRect(k * W / 8 - 1, -60, W / 8 + 2, (H + 120) * E.inOutExpo(clamp(p * 1.25 - k * 0.03)));
}

// ---------- data & aset ----------
let D, IMG = {}, LOGO;
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
let FAC, WIS, NEWS, DEP, ARR, DOCS;
export async function prepare() {
  D = await (await fetch('/data/snapshot.json')).json();
  FAC = D.facilities.filter((f) => f.image && f.name !== 'Self Check-In');
  WIS = D.tourisms;
  NEWS = D.news;
  DEP = D.flights.filter((f) => f.type === 'departure').slice(0, 5);
  ARR = D.flights.filter((f) => f.type === 'arrival').slice(0, 5);
  DOCS = [...D.ppid.berkala.sample, ...D.ppid.setiapSaat.sample];
  const srcs = new Set([...FAC, ...WIS, ...NEWS, ...D.flights].map((x) => x.image || x.logo).filter(Boolean));
  if (D.home?.heroBg) srcs.add(D.home.heroBg);
  await Promise.all([...srcs].map(async (s) => { IMG[s] = await loadImg('/' + s); }));
  LOGO = await loadImg('/logo/logo-white-apt.svg');
  prepParticles();
}

// ======================================================================
// 00 PEMBUKA — titik, antisipasi, landasan pacu, lepas landas, iris
// ======================================================================
function sIntro(ctx, u) {
  const climb = E.inOutCubic(bp(u, 3, 6));
  skyBg(ctx, mix(C.navy, '#123A8C', climb), C.deep);
  bokeh(ctx, u, 22, 0.12 + 0.1 * climb);
  const cy0 = H / 2 + 40;
  // Kamera ikut naik bersama pesawat: dunia turun.
  const cam = climb * 260;
  const cx = W / 2, cy = cy0 + cam;

  // Awan parallax melintas saat menanjak.
  if (climb > 0) {
    const r = rng(11);
    for (let i = 0; i < 9; i++) {
      const z = 0.4 + r() * 0.6, x = ((r() * W * 1.6 - u * 380 * z) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3;
      const y = 120 + r() * 520 + cam * z * 0.6;
      ctx.globalAlpha = 0.07 * z * climb; ctx.fillStyle = C.paper;
      ctx.beginPath(); ctx.ellipse(x, y, 260 * z, 50 * z, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 120 * z, y - 26 * z, 160 * z, 46 * z, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const bin = E.outExpo(bp(u, 2, 2.6)), bout = E.inExpo(bp(u, 5.4, 6));
  if (bin > 0 && bout < 1) {
    ctx.strokeStyle = C.paper; ctx.lineWidth = 3; ctx.globalAlpha = 1 - bout;
    const ex = lerp(1400, 820, bin) + bout * 600, ey = lerp(800, 440, bin) + bout * 400;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * ex, H / 2 + sy * ey - sy * 70); ctx.lineTo(cx + sx * ex, H / 2 + sy * ey); ctx.lineTo(cx + sx * ex - sx * 70, H / 2 + sy * ey);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // "Samarinda" naik dari balik garis landasan, berkilau.
  const rise = 1 - E.inExpo(bp(u, 5.3, 5.9));
  if (u > 1.4 * BEAT && rise > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, -60, W, cy - 2 + 60); ctx.clip();
    ctx.font = `italic 500 240px ${F.serif}`;
    const L = glyphs(ctx, 'Samarinda');
    const x0 = cx - L.w / 2;
    ctx.fillStyle = shine(ctx, x0, x0 + L.w, bp(u, 2.6, 4.2), C.paper, C.gold);
    L.g.forEach((g, j) => {
      const p = E.outExpo(bp(u, 1.5 + j * 0.06, 2.3 + j * 0.06)) * rise;
      if (j === 0) { ctx.save(); ctx.fillStyle = C.gold; ctx.fillText(g.ch, x0 + g.x, cy - 40 + (1 - p) * 310); ctx.restore(); }
      else ctx.fillText(g.ch, x0 + g.x, cy - 40 + (1 - p) * 310);
    });
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(0, cy + 2, W, H); ctx.clip();
    ctx.font = `500 24px ${F.mono}`; ctx.letterSpacing = '7px'; ctx.fillStyle = C.skyL;
    const s = 'BANDAR UDARA A.P.T. PRANOTO  ·  AAP / WALS';
    const n = Math.floor(s.length * bp(u, 1.8, 3.0));
    const full = ctx.measureText(s).width;
    ctx.globalAlpha = rise;
    ctx.fillText(s.slice(0, n), cx - full / 2, cy + 62 - (1 - rise) * 40);
    if (n < s.length && Math.floor(u * 8) % 2 === 0) ctx.fillRect(cx - full / 2 + ctx.measureText(s.slice(0, n)).width, cy + 40, 14, 26);
    ctx.restore();
  }

  // Titik → landasan pacu (lampu garis tengah mengalir) → mengerut lagi.
  if (u < BEAT) {
    const pop = E.outBack(bp(u, 0.05, 0.6), 3);
    const sq = Math.sin(Math.PI * bp(u, 0.6, 1)) * 0.3;
    ctx.fillStyle = C.amber;
    ctx.beginPath(); ctx.ellipse(cx, cy, 16 * pop * (1 + sq), 16 * pop * (1 - sq), 0, 0, TAU); ctx.fill();
    // cincin denyut
    ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.globalAlpha = 1 - bp(u, 0.1, 0.9);
    ctx.beginPath(); ctx.arc(cx, cy, 16 + 120 * E.outExpo(bp(u, 0.1, 0.9)), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (u < 6.4 * BEAT) {
    const st = E.outExpo(bp(u, 1, 1.8)), col = E.inExpo(bp(u, 5.6, 6.4));
    const th = lerp(32, 4, E.outExpo(bp(u, 1, 1.4)));
    const w = 1300 * st * (1 - col), thick = lerp(th, 32, col);
    ctx.fillStyle = mix(C.amber, C.paper, bp(u, 1, 1.4));
    rr(ctx, cx - w / 2 - thick / 2, cy - thick / 2, w + thick, thick, thick / 2); ctx.fill();
    ctx.fillStyle = C.amber;
    for (let k = 0; k < 44; k++) {
      const x = ((k * 32 - u * 900) % 1408 + 1408) % 1408 - 704;
      if (Math.abs(x) < w / 2) { ctx.globalAlpha = 0.75; ctx.fillRect(cx + x, cy + 12, 14, 3); }
    }
    // lampu tepi landasan berkedip berurutan
    for (let k = -9; k <= 9; k++) {
      const x = cx + k * 70;
      if (Math.abs(x - cx) > w / 2) continue;
      ctx.globalAlpha = 0.35 + 0.65 * Math.max(0, Math.sin(u * 9 - k * 0.5));
      ctx.fillStyle = k % 2 ? C.skyL : C.amber; ctx.beginPath(); ctx.arc(x, cy - 16, 3, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Pesawat lepas landas dengan jejak kondensasi; kamera ikut.
  const pf = bp(u, 2.6, 6.2);
  if (pf > 0 && pf < 1) {
    const e = E.inOutCubic(pf);
    const pt = (q) => [lerp(cx - 600, cx + 980, q), cy - 8 - Math.pow(q, 2.0) * (640 + cam)];
    for (const off of [-7, 7]) {
      const tr = ctx.createLinearGradient(...pt(Math.max(0, e - 0.4)), ...pt(e));
      tr.addColorStop(0, 'rgba(243,246,251,0)'); tr.addColorStop(1, 'rgba(243,246,251,0.55)');
      ctx.strokeStyle = tr; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const [x, y] = pt(Math.max(0, e - 0.4) + (Math.min(0.4, e) * i) / 40); i ? ctx.lineTo(x, y + off) : ctx.moveTo(x, y + off); }
      ctx.stroke();
    }
    const [x, y] = pt(e), [x2, y2] = pt(e + 0.01);
    plane(ctx, x, y, Math.atan2(y2 - y, x2 - x), 1.9, C.amber);
  }

  // Iris biru langit menelan layar.
  if (u >= 6.4 * BEAT) {
    const e = E.inOutCubic(bp(u, 6.4, 7.95));
    const R = lerp(16, 1200, e);
    ctx.lineWidth = 6;
    [[1.24, C.amber], [1.12, C.skyL]].forEach(([k, col]) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, R * k + 10, 0, TAU); ctx.stroke(); });
    ctx.fillStyle = mix(C.paper, C.sky, bp(u, 6.4, 6.6));
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  }
}

// ======================================================================
// 01 PORTAL — "SATU PORTAL. SEMUA INFO." satu kata per ketuk, tembus huruf O
// ======================================================================
const WORDS = [
  { w: 'SATU', bg: C.sky, fg: C.deep },
  { w: 'PORTAL.', bg: C.navy, fg: C.paper },
  { w: 'SEMUA', bg: C.blue, fg: C.paper },
  { w: 'INFO.', bg: C.amber, fg: C.deep },
];
const counterCache = {};
// Ukur lubang huruf O dengan memindai piksel — topeng portal yang presisi.
function oCounter(size) {
  const k = Math.round(size);
  if (counterCache[k]) return counterCache[k];
  const [c, x] = mk(Math.ceil(size * 1.2), Math.ceil(size * 1.2));
  x.font = `900 ${size}px ${F.disp}`; x.fillStyle = '#000';
  const ow = x.measureText('O').width, base = size;
  x.fillText('O', 0, base);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const a = (px, py) => d[(Math.round(py) * c.width + Math.round(px)) * 4 + 3];
  const mx = ow / 2, my = base - size * 0.364;
  let l = mx, r = mx, t = my, b = my;
  while (l > 0 && a(l, my) < 128) l--;
  while (r < c.width && a(r, my) < 128) r++;
  while (t > 0 && a(mx, t) < 128) t--;
  while (b < c.height && a(mx, b) < 128) b++;
  return (counterCache[k] = { cx: (l + r) / 2, cy: (t + b) / 2 - base, rx: (r - l) / 2, ry: (b - t) / 2 });
}
let portal;
function sPortal(ctx, u) {
  const i = Math.min(3, Math.floor(u / BEAT)), v = u / BEAT - i; // v: 0→1 dalam ketuk
  const Wd = WORDS[i], prev = WORDS[Math.max(0, i - 1)];
  bg(ctx, prev.bg);
  ctx.fillStyle = Wd.bg;
  for (let k = 0; k < 8; k++) ctx.fillRect(k * W / 8 - 1, -60, W / 8 + 2, (H + 120) * E.outExpo(prog(v, k * 0.02, k * 0.02 + 0.24)));
  // Kata sebelumnya membayang raksasa di latar.
  ctx.save(); ctx.font = `900 ${H * 0.9}px ${F.disp}`; ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.textAlign = 'center';
  ctx.fillText(Wd.w.replace('.', ''), W / 2 - v * 300, H * 0.82); ctx.restore();

  ctx.font = `900 100px ${F.disp}`;
  const size = Math.min(640, (1560 / ctx.measureText(Wd.w).width) * 100);
  ctx.font = `900 ${size}px ${F.disp}`; ctx.letterSpacing = `${-size * 0.035}px`;
  const L = glyphs(ctx, Wd.w);
  const x0 = W / 2 - (L.w + size * 0.035) / 2;
  const capH = size * 0.727, base = H / 2 + capH / 2;

  ctx.save();
  const z = i === 3 ? E.inExpo(prog(v, 0.5, 1)) : 0;
  const punch = 1 + 0.07 * (1 - E.outExpo(prog(v, 0, 0.5)));
  let oc;
  if (i === 3) {
    const j = Wd.w.indexOf('O'), g = L.g[j], cc = oCounter(size);
    oc = { x: x0 + g.x + cc.cx, y: base + cc.cy, rx: cc.rx, ry: cc.ry };
    const S = lerp(1, 46, z);
    ctx.translate(lerp(oc.x, W / 2, z), lerp(oc.y, H / 2, z)); ctx.scale(S, S); ctx.translate(-oc.x, -oc.y);
  }
  ctx.translate(W / 2, H / 2); ctx.scale(punch, punch); ctx.translate(-W / 2, -H / 2);

  L.g.forEach((g, j) => {
    const d = j * 0.05, p = E.outExpo(prog(v, d, d + 0.4));
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 + g.x - size * 0.2, base - capH * 1.6, g.w + size * 0.4, capH * 1.6 + size * 0.06); ctx.clip();
    ctx.translate(x0 + g.x, base + (1 - p) * capH * 1.15);
    ctx.transform(1, 0, -0.35 * (1 - p), 1, 0, 0);
    if (i === 1) {
      const rot = (j % 2 ? 1 : -1) * 0.18 * Math.exp(-v * 6) * Math.sin(v * 26);
      ctx.translate(g.w / 2, 0); ctx.rotate(rot); ctx.translate(-g.w / 2, 0);
    }
    const step = Math.floor(v * 8);
    if (i === 2 && v > 0.2 && hash(j * 13 + step * 7) > 0.55) {
      ctx.font = `italic 600 ${size}px ${F.serif}`; ctx.letterSpacing = '0px';
      ctx.fillStyle = C.amber;
      ctx.fillText(g.ch, (g.w - ctx.measureText(g.ch).width) / 2, 0);
    } else {
      ctx.fillStyle = shine(ctx, -g.x, L.w - g.x, prog(v, 0.35, 0.9), Wd.fg, i === 3 ? '#FFF7D6' : C.skyL);
      ctx.fillText(g.ch, 0, 0);
    }
    ctx.restore();
  });

  // Portal: adegan profil sudah hidup di dalam lubang O; kamera menembusnya.
  if (i === 3 && v > 0.5) {
    if (!portal) portal = mk();
    portal[1].save(); renderLocal(portal[1], 'profil', 0); portal[1].restore();
    ctx.beginPath(); ctx.ellipse(oc.x, oc.y, oc.rx + 1, oc.ry + 1, 0, 0, TAU); ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = prog(v, 0.5, 0.62);
    ctx.drawImage(portal[0], 0, 0);
  }
  ctx.restore();
}

// ======================================================================
// 02 PROFIL & LINIMASA — kamera menyusuri garis waktu, lalu visi
// ======================================================================
function sProfil(ctx, u) {
  const P = D.profile;
  const pan = E.inOutSine(bp(u, 0.5, 4.0));
  const up = E.inOutCubic(bp(u, 3.9, 4.7));
  // Foto beranda bandara sebagai latar parallax.
  cover(ctx, IMG[D.home.heroBg], -80 - pan * 120, -80 - up * 40, W + 260, H + 160, 1.08 + 0.05 * bp(u, 0, 8));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(6,18,58,0.78)'); g.addColorStop(1, 'rgba(6,18,58,0.95)');
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
  bokeh(ctx, u + 20, 18, 0.14, 7);

  label(ctx, P.org.toUpperCase(), 110, 160, C.gold, 0.9 * (1 - up));
  ctx.save(); ctx.globalAlpha = 1 - up;
  ctx.font = `italic 600 92px ${F.serif}`; ctx.fillStyle = C.paper; ctx.fillText('Perjalanan', 110, 250);
  const tw = ctx.measureText('Perjalanan ').width;
  ctx.font = `800 92px ${F.disp}`; ctx.fillStyle = shine(ctx, 110 + tw, 110 + tw + 400, bp(u, 0.6, 2.2), C.skyL); ctx.fillText('kami', 110 + tw, 250);
  ctx.restore();

  // Garis waktu lebih lebar dari layar; kamera bergeser dari simpul pertama ke terakhir.
  const N = P.timeline.length, gap = 820, lineY = 600 - up * 380;
  const ox = 260 - pan * (gap * (N - 1) - (W - 2 * 260 - 700) ) ;
  ctx.save(); ctx.globalAlpha = 1 - up;
  const lineP = E.outExpo(bp(u, 0.2, 1.6));
  ctx.strokeStyle = 'rgba(125,211,252,0.45)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(ox - 200, lineY); ctx.lineTo(ox - 200 + (gap * (N - 1) + 900) * lineP, lineY); ctx.stroke();
  // titik-titik kecil berjalan di sepanjang garis
  ctx.fillStyle = C.skyL;
  for (let k = 0; k < 40; k++) { const x = ox - 200 + ((k * 60 + u * 140) % (gap * (N - 1) + 900)); if (x < ox - 200 + (gap * (N - 1) + 900) * lineP) ctx.fillRect(x, lineY - 1, 6, 2); }
  P.timeline.forEach((ev, k) => {
    const at = 0.8 + k * 1.05, x = ox + k * gap;
    const pop = E.outBack(bp(u, at, at + 0.6), 3);
    if (pop <= 0) return;
    // simpul
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(x, lineY, 14 * pop, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.globalAlpha = (1 - up) * (1 - bp(u, at, at + 1));
    ctx.beginPath(); ctx.arc(x, lineY, 14 + 70 * E.outExpo(bp(u, at, at + 1)), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1 - up;
    // tahun raksasa, kontur lalu terisi
    const ty = E.outExpo(bp(u, at + 0.1, at + 0.9));
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40, lineY - 330, 760, 300); ctx.clip();
    ctx.font = `900 230px ${F.disp}`; ctx.letterSpacing = '-8px';
    ctx.strokeStyle = C.skyL; ctx.lineWidth = 2; ctx.strokeText(ev.year, x - 10, lineY - 50 + (1 - ty) * 260);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40, lineY - 330, 760 * E.inOutCubic(bp(u, at + 0.6, at + 1.4)), 300); ctx.clip();
    ctx.fillStyle = C.paper; ctx.fillText(ev.year, x - 10, lineY - 50 + (1 - ty) * 260); ctx.restore();
    ctx.restore();
    // judul & uraian verbatim
    const tx = bp(u, at + 0.3, at + 0.9);
    ctx.globalAlpha = (1 - up) * tx;
    ctx.font = `800 44px ${F.disp}`; ctx.fillStyle = C.amber; ctx.fillText(ev.title, x, lineY + 80 + (1 - E.outCubic(tx)) * 30);
    ctx.font = `500 27px ${F.disp}`; ctx.fillStyle = C.paper;
    wrap(ctx, ev.desc, 640, 4).forEach((l, j) => ctx.fillText(l, x, lineY + 130 + j * 38 + (1 - E.outCubic(tx)) * 30));
    ctx.globalAlpha = 1 - up;
  });
  ctx.restore();

  // Visi: pernyataan resmi muncul baris demi baris.
  if (up > 0) {
    const vy = lerp(H + 100, 470, up);
    ctx.font = `italic 600 80px ${F.serif}`; ctx.fillStyle = C.gold; ctx.fillText('Visi', 110, vy);
    ctx.font = `600 44px ${F.disp}`;
    const lines = wrap(ctx, `“${P.visi}”`, 1640, 6);
    lines.forEach((l, j) => {
      const p = E.outExpo(bp(u, 4.3 + j * 0.18, 5.1 + j * 0.18));
      ctx.save(); ctx.beginPath(); ctx.rect(100, vy + 40 + j * 62, W, 64); ctx.clip();
      ctx.fillStyle = C.paper; ctx.fillText(l, 110, vy + 92 + j * 62 + (1 - p) * 70); ctx.restore();
    });
  }
  slab(ctx, bp(u, 7.2, 8) * 0.5, C.deep, C.amber);
}

// ======================================================================
// 03 JADWAL — papan split-flap: keberangkatan lalu kedatangan
// ======================================================================
const COLS = [{ k: 'time', n: 5 }, { k: 'number', n: 7 }, { k: 'city', n: 9 }, { k: 'status', n: 9 }];
const CW = 44, CH = 68, CG = 4, COLGAP = 30, ROWH = 98;
const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const rowText = (f) => ({ time: f.time.replace(' WITA', ''), number: f.number, city: f.city.toUpperCase(), status: f.status.toUpperCase() });
const statusCol = (s, arr) => (/tunda|batal/i.test(s) ? C.amber : arr ? C.skyL : C.green);
function sJadwal(ctx, u) {
  skyBg(ctx, C.navy, C.deep);
  ctx.fillStyle = 'rgba(125,211,252,0.05)';
  for (let x = 0; x <= W; x += 60) ctx.fillRect(x, 0, 1, H);
  for (let y = 0; y <= H; y += 60) ctx.fillRect(0, y, W, 1);
  slab(ctx, 0.5 + bp(u, 0, 0.8) * 0.5, C.deep, C.amber);

  const pu = bp(u, 0, 8);
  ctx.globalAlpha = 0.16; plane(ctx, lerp(-100, W + 100, pu), 150 + Math.sin(pu * 3) * 30, 0.05, 5, C.skyL); ctx.globalAlpha = 1;

  const arrPhase = u >= 4 * BEAT;
  const boardW = 70 + COLS.reduce((a, c) => a + c.n * (CW + CG), 0) + COLS.length * COLGAP;
  // Papan masuk dengan kemiringan 3D yang mengendap.
  const tilt = 1 - E.outExpo(bp(u, 0, 1.4));
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.transform(1, -0.06 * tilt, -0.25 * tilt, 1, 0, 0); ctx.scale(lerp(1, 0.86, tilt), lerp(1, 0.86, tilt)); ctx.translate(-W / 2, -H / 2);
  const bx = (W - boardW) / 2, by = 330;

  ctx.font = `italic 600 96px ${F.serif}`; ctx.fillStyle = C.paper;
  ctx.fillText('Jadwal', bx, 210);
  const jw = ctx.measureText('Jadwal ').width;
  ctx.font = `800 96px ${F.disp}`; ctx.fillStyle = shine(ctx, bx + jw, bx + jw + 600, bp(u, 0.6, 2.2), C.skyL); ctx.fillText('penerbangan', bx + jw, 210);

  const sw = 560, sx = bx + boardW - sw, sy = 140;
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, sx, sy, sw, 70, 35); ctx.fill();
  const kn = spring(u - 3.9 * BEAT, 2.2, 0.45);
  ctx.fillStyle = C.amber; rr(ctx, sx + 6 + kn * (sw / 2 - 6), sy + 6, sw / 2 - 6, 58, 29); ctx.fill();
  ctx.font = `700 24px ${F.disp}`; ctx.textAlign = 'center';
  ctx.fillStyle = kn < 0.5 ? C.deep : C.paper; ctx.fillText('Keberangkatan', sx + sw / 4 + 3, sy + 44);
  ctx.fillStyle = kn >= 0.5 ? C.deep : C.paper; ctx.fillText('Kedatangan', sx + (sw * 3) / 4, sy + 44);
  ctx.textAlign = 'left';

  let lx = bx + 70 + COLGAP;
  ['WAKTU', 'PENERBANGAN', arrPhase ? 'ASAL' : 'TUJUAN', 'STATUS'].forEach((lab, c) => { label(ctx, lab, lx, by - 18, C.skyL, 0.7, 16); lx += COLS[c].n * (CW + CG) + COLGAP; });

  // Pita sorot menyapu baris demi baris mengikuti ketuk.
  const scanY = by + ((u / BEAT) % 5) * ROWH;
  const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + CH + 30);
  sg.addColorStop(0, 'rgba(14,165,233,0)'); sg.addColorStop(0.5, 'rgba(14,165,233,0.16)'); sg.addColorStop(1, 'rgba(14,165,233,0)');
  ctx.fillStyle = sg; ctx.fillRect(bx - 16, scanY - 30, boardW + 32, CH + 60);

  for (let r = 0; r < 5; r++) {
    const y = by + r * ROWH;
    const cur = arrPhase ? ARR[r] : DEP[r], prv = arrPhase ? DEP[r] : null;
    const p0 = (arrPhase ? 4 : 0.3) * BEAT, cs = p0 + 0.05 + r * 0.06;
    const lg = u < cs && prv ? prv : cur;
    ctx.fillStyle = '#fff'; rr(ctx, bx, y + 4, 60, 60, 12); ctx.fill();
    const li = IMG[lg.logo];
    if (li) { const s = Math.min(48 / li.width, 48 / li.height); ctx.drawImage(li, bx + 30 - (li.width * s) / 2, y + 34 - (li.height * s) / 2, li.width * s, li.height * s); }
    let x = bx + 70 + COLGAP, ci = 0;
    COLS.forEach((col) => {
      const target = rowText(cur)[col.k].padEnd(col.n).slice(0, col.n);
      const before = prv ? rowText(prv)[col.k].padEnd(col.n).slice(0, col.n) : ' '.repeat(col.n);
      for (let k = 0; k < col.n; k++, ci++) {
        const settle = p0 + 0.2 + ci * 0.024 + r * 0.09;
        let ch, flipping = false;
        if (u < cs) ch = before[k];
        else if (u >= settle) ch = target[k];
        else { ch = FLAP[Math.floor(hash(r * 97 + ci * 13 + Math.floor(u * 30)) * FLAP.length)]; flipping = true; }
        const cx = x + k * (CW + CG);
        ctx.fillStyle = '#0E1A44'; rr(ctx, cx, y, CW, CH, 6); ctx.fill();
        ctx.font = `800 46px ${F.disp}`; ctx.textAlign = 'center';
        ctx.fillStyle = col.k === 'number' ? C.amber : col.k === 'status' ? statusCol(cur.status, arrPhase) : C.paper;
        ctx.fillText(ch, cx + CW / 2, y + CH / 2 + 17);
        ctx.textAlign = 'left';
        if (flipping) { const f = (u * 30) % 1; ctx.fillStyle = 'rgba(6,18,58,0.75)'; ctx.fillRect(cx, y, CW, (CH / 2) * (1 - f)); }
        ctx.fillStyle = C.deep; ctx.fillRect(cx, y + CH / 2 - 1, CW, 2);
      }
      x += col.n * (CW + CG) + COLGAP;
    });
  }
  label(ctx, `DATA PORTAL APTPAIRPORT.ID  ·  ${tanggal(DEP[0].date).toUpperCase()}  ·  WAKTU DALAM WITA`, bx, by + 5 * ROWH + 26, C.skyL, 0.55, 16);
  ctx.restore();

  tileWipe(ctx, bp(u, 7.0, 8), C.paper);
  if (u > 7.97 * BEAT) bg(ctx, C.paper);
}

// ======================================================================
// 04 STATISTIK — rekapitulasi LLAU: angka utama, tren bulanan, rute teratas
// ======================================================================
function sStatistik(ctx, u) {
  const S = D.llau;
  bg(ctx, C.paper);
  ctx.fillStyle = 'rgba(15,23,42,.07)';
  for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) ctx.fillRect(x, y, 2, 2);
  const zoom = 1 + 0.03 * bp(u, 0, 8);
  const out = E.inExpo(bp(u, 7.2, 8));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2 - out * 60); ctx.globalAlpha = 1 - out;

  label(ctx, `REKAPITULASI LLAU  ·  ${S.label.toUpperCase()}`, 110, 120, C.slate, 1);
  ctx.save(); ctx.beginPath(); ctx.rect(100, 120, 1700, 110); ctx.clip();
  const ti = E.outExpo(bp(u, 0, 0.8));
  ctx.font = `900 92px ${F.disp}`; ctx.letterSpacing = '-3px'; ctx.fillStyle = C.ink; ctx.fillText('Lalu lintas', 110, 212 + (1 - ti) * 110);
  const lw = ctx.measureText('Lalu lintas ').width;
  ctx.letterSpacing = '0px'; ctx.font = `italic 600 92px ${F.serif}`; ctx.fillStyle = C.blue; ctx.fillText('udara', 110 + lw, 212 + (1 - E.outExpo(bp(u, 0.15, 0.95))) * 110);
  ctx.restore();

  // Tiga angka utama.
  const KPI = [
    ['PENUMPANG', S.passengers, '', C.blue],
    ['PENERBANGAN', S.flights, '', C.ink],
    ['KARGO', S.cargo, ' kg', C.sky],
  ];
  KPI.forEach(([lab, val, suf, col], k) => {
    const s = (0.5 + k * 0.3) * BEAT, e = spring(u - s, 1.8, 0.5);
    if (u < s) return;
    const x = 110 + k * 575, y = 270 + (1 - e) * 500, w = 545, h = 210;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.10)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = C.card; rr(ctx, x, y, w, h, 26); ctx.fill(); ctx.restore();
    ctx.fillStyle = col; rr(ctx, x, y, 10, h, [26, 0, 0, 26]); ctx.fill();
    label(ctx, lab, x + 40, y + 56, C.slate, 1);
    const v = val * E.outExpo(prog(u, s + 0.1, s + 2.2 * BEAT));
    ctx.font = `900 96px ${F.disp}`; ctx.letterSpacing = '-4px'; ctx.fillStyle = C.ink;
    ctx.fillText(ribuan(v), x + 36, y + 160);
    const nw = ctx.measureText(ribuan(val)).width;
    ctx.letterSpacing = '0px'; ctx.font = `600 34px ${F.disp}`; ctx.fillStyle = C.slate; ctx.fillText(suf, x + 40 + nw, y + 160);
  });

  // Tren penumpang bulanan.
  const cx0 = 110, cy0 = 540, cw = 1080, ch = 420;
  const ce = spring(u - 2 * BEAT, 1.6, 0.55);
  if (u > 2 * BEAT) {
    ctx.save(); ctx.translate(0, (1 - ce) * 600);
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.10)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = C.card; rr(ctx, cx0, cy0, cw, ch, 26); ctx.fill(); ctx.restore();
    label(ctx, 'PENUMPANG PER BULAN', cx0 + 40, cy0 + 56, C.slate, 1);
    const T = S.trend, max = Math.max(...T.map((t) => t.passengers)) * 1.12;
    const ax = cx0 + 50, ay = cy0 + 90, aw = cw - 100, ah = ch - 160, bw = aw / T.length;
    const pts = [];
    T.forEach((t, j) => {
      const p = E.outBack(bp(u, 2.4 + j * 0.15, 3.2 + j * 0.15), 1.6);
      const bh = (ah * t.passengers) / max * p;
      const last = j === T.length - 1;
      const bgr = ctx.createLinearGradient(0, ay + ah - bh, 0, ay + ah);
      bgr.addColorStop(0, last ? C.amber : C.blue); bgr.addColorStop(1, last ? '#F59E0B' : C.sky);
      ctx.fillStyle = bgr;
      if (bh > 1) { rr(ctx, ax + j * bw + bw * 0.2, ay + ah - bh, bw * 0.6, bh, [12, 12, 0, 0]); ctx.fill(); }
      ctx.font = `600 20px ${F.disp}`; ctx.fillStyle = C.slate; ctx.textAlign = 'center';
      ctx.fillText(t.label, ax + j * bw + bw / 2, ay + ah + 34);
      if (p > 0.9) { ctx.font = `800 21px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText(ribuan(t.passengers), ax + j * bw + bw / 2, ay + ah - bh - 14); }
      ctx.textAlign = 'left';
      pts.push([ax + j * bw + bw / 2, ay + ah - (ah * t.passengers) / max]);
    });
    ctx.restore();
  }

  // Rute teratas — bilah horizontal dengan pesawat di ujungnya.
  const rx = 1230, ry = 540, rw = 580, rh = 420;
  const re = spring(u - 3.4 * BEAT, 1.6, 0.55);
  if (u > 3.4 * BEAT) {
    ctx.save(); ctx.translate((1 - re) * 800, 0);
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = C.navy; rr(ctx, rx, ry, rw, rh, 26); ctx.fill(); ctx.restore();
    label(ctx, 'RUTE TERSIBUK  ·  PENUMPANG', rx + 36, ry + 56, C.skyL, 0.9);
    const R = S.routes, mx = R[0].passengers;
    R.forEach((r, j) => {
      const y = ry + 100 + j * 62, p = E.outExpo(bp(u, 3.8 + j * 0.2, 4.8 + j * 0.2));
      ctx.font = `800 26px ${F.disp}`; ctx.fillStyle = C.paper; ctx.fillText(r.code, rx + 36, y + 22);
      const bwid = (rw - 260) * (r.passengers / mx) * p;
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, rx + 120, y, rw - 260, 28, 14); ctx.fill();
      ctx.fillStyle = j === 0 ? C.amber : C.sky; rr(ctx, rx + 120, y, Math.max(28, bwid), 28, 14); ctx.fill();
      if (p > 0.05) plane(ctx, rx + 120 + Math.max(28, bwid) - 14, y + 14, 0, 0.5, C.deep);
      ctx.font = `700 21px ${F.disp}`; ctx.fillStyle = C.paper; ctx.textAlign = 'right';
      ctx.fillText(ribuan(r.passengers * p), rx + rw - 30, y + 22); ctx.textAlign = 'left';
    });
    ctx.restore();
  }
  ctx.restore();
  slab(ctx, bp(u, 7.2, 8) * 0.5, C.blue, C.amber);
}

// ======================================================================
// 05 FASILITAS & WISATA — mosaik berbalik, runway membesar, kartu wisata
// ======================================================================
const MC = 6, MR = 3, MW = 290, MH = 236, MG = 20;
const slotRect = (s) => {
  const c = s % MC, r = Math.floor(s / MC);
  const x0 = (W - (MC * MW + (MC - 1) * MG)) / 2, y0 = 250;
  return [x0 + c * (MW + MG), y0 + r * (MH + MG), MW, MH];
};
const HERO_SLOT = 8, FLIPS = [1.4, 2.3, 3.2];
function sFasilitas(ctx, u) {
  bg(ctx, C.paper);
  const n = FAC.length;
  const runwayIdx = Math.max(0, FAC.findIndex((f) => f.name === 'Runway'));
  // Wajah kartu berganti tiap balik; slot tengah dipastikan berakhir di Runway.
  const face = (s, k) => (((runwayIdx - FLIPS.length * 18 + (s - HERO_SLOT)) % n + n) % n + 18 * k) % n;
  const hero = E.outExpo(bp(u, 4.0, 4.7));
  const drift = bp(u, 0, 4);

  ctx.globalAlpha = 1 - hero;
  ctx.font = `italic 600 96px ${F.serif}`; ctx.fillStyle = C.ink; ctx.fillText('Fasilitas', 105, 190);
  const fw = ctx.measureText('Fasilitas ').width;
  ctx.font = `900 96px ${F.disp}`; ctx.fillStyle = C.blue;
  ctx.fillText(String(Math.round(D.facilities.length * E.outExpo(bp(u, 0.2, 1.6)))), 105 + fw, 190);
  label(ctx, 'SISI UDARA  ·  SISI DARAT  ·  UMUM', W - 560, 180, C.slate, 1, 18);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(1 + 0.04 * drift, 1 + 0.04 * drift); ctx.rotate(-0.01 * drift); ctx.translate(-W / 2, -H / 2);
  for (let s = 0; s < MC * MR; s++) {
    if (s === HERO_SLOT && hero > 0) continue;
    const [x, y, w, h] = slotRect(s);
    const d0 = Math.hypot((s % MC) - 2.5, Math.floor(s / MC) - 1);
    const sc = E.outBack(bp(u, d0 * 0.08, 0.6 + d0 * 0.08), 2) * (1 - hero * 0.25);
    if (sc <= 0) continue;
    let k = 0, sx = 1, lift = 0;
    FLIPS.forEach((bt, j) => {
      const p = bp(u, bt + d0 * 0.06, bt + d0 * 0.06 + 0.5);
      if (p >= 0.5) k = j + 1;
      if (p > 0 && p < 1) { sx = Math.abs(Math.cos(Math.PI * p)); lift = Math.sin(Math.PI * p); }
    });
    ctx.save(); ctx.globalAlpha = 1 - hero;
    ctx.translate(x + w / 2, y + h / 2 - lift * 18); ctx.scale(sc * Math.max(0.02, sx) * (1 + 0.06 * lift), sc * (1 + 0.06 * lift)); ctx.transform(1, 0.08 * lift * (sx < 1 ? 1 : 0), 0, 1, 0, 0); ctx.translate(-w / 2, -h / 2);
    if (lift > 0) { ctx.shadowColor = 'rgba(15,23,42,.3)'; ctx.shadowBlur = 30 * lift; ctx.shadowOffsetY = 20 * lift; }
    const f = FAC[face(s, k)];
    ctx.save(); rr(ctx, 0, 0, w, h, 18); ctx.fillStyle = C.card; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.clip();
    cover(ctx, IMG[f.image], 0, 0, w, h, 1.04);
    const g = ctx.createLinearGradient(0, h * 0.45, 0, h); g.addColorStop(0, 'rgba(6,18,58,0)'); g.addColorStop(1, 'rgba(6,18,58,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.font = `700 22px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.fillText(clip(f.name, 22), 16, h - 20);
    ctx.restore(); ctx.restore();
  }
  ctx.restore();

  // Runway membesar memenuhi layar.
  if (hero > 0) {
    const [x, y, w, h] = slotRect(HERO_SLOT);
    const rx = lerp(x, 0, hero), ry = lerp(y, 0, hero), rw = lerp(w, W, hero), rh = lerp(h, H, hero);
    const f = FAC[runwayIdx];
    ctx.save(); rr(ctx, rx, ry, rw, rh, lerp(18, 0, hero)); ctx.clip();
    cover(ctx, IMG[f.image], rx, ry, rw, rh, 1 + 0.16 * bp(u, 4, 8), 0.5 + 0.06 * bp(u, 4, 8));
    const g = ctx.createLinearGradient(0, H * 0.35, 0, H); g.addColorStop(0, 'rgba(6,18,58,0)'); g.addColorStop(1, 'rgba(6,18,58,0.92)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // kilau cahaya menyapu foto
    const lp = bp(u, 4.3, 5.6);
    if (lp > 0 && lp < 1) {
      const lx = lerp(-600, W + 600, lp), lg = ctx.createLinearGradient(lx - 300, 0, lx + 300, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,240,200,0.18)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    const tx = bp(u, 4.3, 5.0);
    const ukuran = (f.details.find((d) => d.startsWith('Ukuran')) || '').replace('Ukuran:', '').trim();
    const [panjang, lebar] = ukuran.split('x').map((s) => s.trim());
    const pjg = parseFloat(panjang.replace('.', '')) || 0;
    const wis = E.outExpo(bp(u, 5.8, 6.4));
    ctx.save(); ctx.globalAlpha = tx * (1 - wis);
    ctx.font = `italic 600 170px ${F.serif}`; ctx.fillStyle = C.paper;
    ctx.fillText(f.name, 110, H - 300 + (1 - E.outExpo(tx)) * 60);
    ctx.font = `900 120px ${F.disp}`; ctx.letterSpacing = '-3px'; ctx.fillStyle = C.amber;
    ctx.fillText(`${ribuan(pjg * E.outExpo(bp(u, 4.4, 5.6)))} m × ${lebar}`, 110, H - 160);
    ctx.restore();
    label(ctx, `${f.category.toUpperCase()}  ·  ${(f.details[1] || '').trim().toUpperCase()}`, 114, H - 105, C.skyL, tx * (1 - wis), 20);

    if (wis > 0) {
      ctx.fillStyle = `rgba(6,18,58,${0.55 * wis})`; ctx.fillRect(0, 0, W, H);
      ctx.font = `italic 600 92px ${F.serif}`; ctx.fillStyle = C.paper; ctx.globalAlpha = wis;
      ctx.fillText('Jelajahi wisata', 110, 230); ctx.globalAlpha = 1;
      WIS.forEach((wi, j) => {
        const e = spring(u - (5.9 + j * 0.15) * BEAT, 1.6, 0.5);
        const cw = 520, ch = 560, cx = 110 + j * (cw + 40) + (1 - e) * 1400, cy = 300;
        const bob = Math.sin(u * 2 + j) * 6;
        ctx.save(); ctx.translate(cx + cw / 2, cy + ch / 2 + bob); ctx.rotate((1 - e) * 0.1 + (j - 1) * 0.015); ctx.translate(-cx - cw / 2, -cy - ch / 2);
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
        ctx.fillStyle = C.card; rr(ctx, cx, cy, cw, ch, 26); ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.save(); rr(ctx, cx + 14, cy + 14, cw - 28, ch - 150, 18); ctx.clip(); cover(ctx, IMG[wi.image], cx + 14, cy + 14, cw - 28, ch - 150, 1.05 + 0.05 * bp(u, 6, 8)); ctx.restore();
        ctx.font = `700 34px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText(clip(wi.name, 26), cx + 28, cy + ch - 76);
        pill(ctx, wi.category.toUpperCase(), cx + 28, cy + ch - 56, C.amber, C.ink);
        ctx.restore();
      });
    }
  }
  blinds(ctx, bp(u, 7.3, 8), C.navy);
}

// ======================================================================
// 06 BERITA & PPID — korsel berita asli, lalu tiga golongan informasi
// ======================================================================
function sInfo(ctx, u) {
  skyBg(ctx, C.navy2, C.navy);
  ctx.save(); ctx.font = `900 260px ${F.disp}`; ctx.strokeStyle = 'rgba(125,211,252,0.16)'; ctx.lineWidth = 2;
  const unit = ctx.measureText('BERITA TERKINI  ·  ').width;
  ctx.strokeText('BERITA TERKINI  ·  BERITA TERKINI  ·  BERITA TERKINI  ·  ', -((u * 300) % unit), 330);
  ctx.restore();

  const pos = [1, 2, 3].reduce((a, b) => a + spring(u - b * BEAT, 2, 0.55), 0);
  NEWS.forEach((nw, j) => {
    const e = spring(u - j * 0.08, 1.8, 0.5);
    const off = j - pos;
    const cw = 760, ch = 600, sc = lerp(1, 0.8, clamp(Math.abs(off)));
    const cx = W / 2 + off * 840 + (1 - e) * 1500 - cw / 2, cy = 300;
    if (cx > W + 100 || cx + cw < -100) return;
    ctx.save(); ctx.translate(cx + cw / 2, cy + ch / 2); ctx.scale(sc, sc); ctx.rotate(off * 0.04); ctx.translate(-cw / 2, -ch / 2);
    ctx.globalAlpha = lerp(1, 0.5, clamp(Math.abs(off)));
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    ctx.fillStyle = C.card; rr(ctx, 0, 0, cw, ch, 28); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); rr(ctx, 14, 14, cw - 28, 320, 20); ctx.clip(); cover(ctx, IMG[nw.image], 14, 14, cw - 28, 320, 1.05 + 0.08 * clamp(1 - Math.abs(off))); ctx.restore();
    const pw = pill(ctx, nw.category.toUpperCase(), 34, 360, C.amber, C.ink);
    label(ctx, tanggal(nw.date).toUpperCase(), 34 + pw + 18, 383, C.slate, 1, 15);
    ctx.font = `700 34px ${F.disp}`; ctx.fillStyle = C.ink;
    wrap(ctx, nw.title, cw - 70, 4).forEach((l, k) => ctx.fillText(l, 34, 448 + k * 42));
    ctx.restore();
  });
  ctx.font = `italic 600 92px ${F.serif}`; ctx.fillStyle = C.paper; ctx.fillText('Kabar', 110, 200);
  const kw = ctx.measureText('Kabar ').width;
  ctx.font = `800 92px ${F.disp}`; ctx.fillStyle = shine(ctx, 110 + kw, 110 + kw + 420, bp(u, 0.3, 1.8), C.skyL); ctx.fillText('bandara', 110 + kw, 200);

  // PPID — panel biru naik menutup.
  const up = E.inOutExpo(bp(u, 3.7, 4.15));
  if (up > 0) {
    const y = lerp(H + 60, -60, up);
    ctx.fillStyle = C.blue; ctx.fillRect(-60, y, W + 120, H + 200);
    ctx.save(); ctx.beginPath(); ctx.rect(-60, y, W + 120, H + 200); ctx.clip();
    bokeh(ctx, u, 14, 0.12, 9);
    ctx.translate(0, y + 60);
    ctx.font = `900 120px ${F.disp}`; ctx.fillStyle = C.paper; ctx.fillText('PPID', 110, 220);
    const pw = ctx.measureText('PPID ').width;
    ctx.font = `italic 500 76px ${F.serif}`; ctx.fillStyle = C.gold; ctx.fillText('keterbukaan informasi publik', 110 + pw + 10, 214);
    const G = [['Informasi Berkala', D.ppid.berkala], ['Informasi Serta Merta', D.ppid.sertaMerta], ['Informasi Setiap Saat', D.ppid.setiapSaat]];
    G.forEach(([lab, g], j) => {
      const s = (4.15 + j * 0.2) * BEAT, e = spring(u - s, 1.8, 0.5);
      const cw = 540, ch = 520, cx = 110 + j * (cw + 45), cy = 290 + (1 - e) * 700;
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, cx, cy, cw, ch, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `900 210px ${F.disp}`; ctx.letterSpacing = '-8px'; ctx.fillStyle = j === 1 ? C.amber : C.paper;
      ctx.fillText(String(Math.round(g.count * E.outExpo(prog(u, s + 0.05, s + 1.5 * BEAT)))), cx + 36, cy + 210);
      ctx.letterSpacing = '0px'; ctx.font = `700 34px ${F.disp}`; ctx.fillStyle = C.paper; ctx.fillText(lab, cx + 40, cy + 280);
      ctx.font = `500 19px ${F.mono}`; ctx.fillStyle = C.skyL;
      g.sample.slice(0, 3).forEach((sm, k) => {
        ctx.globalAlpha = prog(u, s + (0.5 + k * 0.15) * BEAT, s + (0.8 + k * 0.15) * BEAT);
        ctx.fillText('▸ ' + clip(sm, 34), cx + 40, cy + 350 + k * 44); ctx.globalAlpha = 1;
      });
    });
    const ca = E.outBack(bp(u, 5.6, 6.2), 2);
    if (ca > 0) {
      ctx.save(); ctx.translate(110 + 340, 880); ctx.scale(ca, ca);
      ctx.fillStyle = C.amber; rr(ctx, -340, -40, 680, 80, 40); ctx.fill();
      ctx.font = `700 30px ${F.disp}`; ctx.fillStyle = C.deep; ctx.textAlign = 'center'; ctx.fillText('Ajukan permohonan informasi  →', 0, 11); ctx.textAlign = 'left';
      ctx.restore();
    }
    ctx.restore();
  }
  slab(ctx, bp(u, 7.2, 8) * 0.5, C.deep, C.gold);
}

// ======================================================================
// 07 REGULASI & DOKUMEN — surat keputusan asli, kipas dokumen PPID
// ======================================================================
function sRegulasi(ctx, u) {
  skyBg(ctx, C.navy, C.deep);
  slab(ctx, 0.5 + bp(u, 0, 0.6) * 0.5, C.deep, C.gold);
  bokeh(ctx, u + 40, 16, 0.12, 13);
  const L = D.letters, sk = L.items[0];
  const out = E.inExpo(bp(u, 3.4, 4));

  // Teks kiri.
  ctx.save(); ctx.globalAlpha = 1 - out;
  ctx.beginPath(); ctx.rect(100, 140, 900, 260); ctx.clip();
  ctx.font = `900 104px ${F.disp}`; ctx.letterSpacing = '-3px'; ctx.fillStyle = C.paper;
  ctx.fillText('Regulasi &', 110, 250 + (1 - E.outExpo(bp(u, 0.1, 0.8))) * 140);
  ctx.letterSpacing = '0px'; ctx.font = `italic 600 104px ${F.serif}`; ctx.fillStyle = C.gold;
  ctx.fillText('dokumen publik', 110, 370 + (1 - E.outExpo(bp(u, 0.25, 0.95))) * 140);
  ctx.restore();
  const tot = D.ppid.berkala.count + D.ppid.sertaMerta.count + D.ppid.setiapSaat.count;
  ctx.save(); ctx.globalAlpha = (1 - out) * bp(u, 0.6, 1.1);
  ctx.font = `900 120px ${F.disp}`; ctx.fillStyle = C.amber; ctx.fillText(String(Math.round(tot * E.outExpo(bp(u, 0.6, 2.2)))), 110, 560);
  ctx.font = `600 32px ${F.disp}`; ctx.fillStyle = C.paper; ctx.fillText('dokumen PPID', 110, 610);
  ctx.font = `900 120px ${F.disp}`; ctx.fillStyle = C.skyL; ctx.fillText(String(L.count.keputusan + L.count.edaran), 520, 560);
  ctx.font = `600 32px ${F.disp}`; ctx.fillStyle = C.paper; ctx.fillText(L.count.keputusan === 1 && !L.count.edaran ? 'surat keputusan' : 'surat regulasi', 520, 610);
  ctx.restore();
  label(ctx, 'UNDUH LANGSUNG DARI PORTAL', 114, 680, C.skyL, (1 - out) * bp(u, 1, 1.4));

  // Kipas kartu dokumen PPID (judul asli) di belakang surat.
  const cx = 1380, cy = 560;
  DOCS.forEach((d, k) => {
    const n = DOCS.length, a = (k - (n - 1) / 2) * 0.16;
    const fan = E.outBack(bp(u, 1.0 + k * 0.08, 1.8 + k * 0.08), 1.8);
    ctx.save(); ctx.translate(cx, cy + 380 + out * 900); ctx.rotate(a * fan + out * a * 2); ctx.translate(0, -380 - fan * 60);
    ctx.fillStyle = mix('#DCE6F7', C.card, k / n); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 24;
    rr(ctx, -210, -290, 420, 580, 18); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.blue; rr(ctx, -180, -260, 70, 12, 6); ctx.fill();
    ctx.font = `700 26px ${F.disp}`; ctx.fillStyle = C.ink;
    wrap(ctx, d, 340, 2).forEach((l, j) => ctx.fillText(l, -180, -210 + j * 34));
    for (let j = 0; j < 9; j++) { ctx.fillStyle = 'rgba(15,23,42,.08)'; rr(ctx, -180, -110 + j * 34, 360 * (0.5 + 0.5 * hash(k * 9 + j)), 10, 5); ctx.fill(); }
    ctx.restore();
  });
  // Surat keputusan utama jatuh dengan pegas dan kemiringan 3D.
  const drop = spring(u - 0.2 * BEAT, 1.5, 0.45);
  if (u > 0.2 * BEAT && sk) {
    ctx.save(); ctx.translate(cx, cy + (1 - drop) * -900 + out * 1100); ctx.rotate((1 - drop) * 0.35 - 0.03); ctx.transform(1, 0, -0.12 * (1 - drop), 1, 0, 0);
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
    ctx.fillStyle = C.card; rr(ctx, -260, -340, 520, 680, 22); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.navy; rr(ctx, -260, -340, 520, 110, [22, 22, 0, 0]); ctx.fill();
    label(ctx, 'SURAT KEPUTUSAN', -224, -275, C.gold, 1, 18);
    ctx.font = `700 22px ${F.mono}`; ctx.fillStyle = C.paper; ctx.fillText(sk.number, -224, -245);
    ctx.font = `800 31px ${F.disp}`; ctx.fillStyle = C.ink;
    const lines = wrap(ctx, sk.title, 450, 5);
    lines.forEach((l, j) => {
      ctx.globalAlpha = bp(u, 0.9 + j * 0.12, 1.3 + j * 0.12);
      ctx.fillText(l, -224, -170 + j * 42);
    });
    ctx.globalAlpha = 1;
    label(ctx, `DITETAPKAN ${tanggal(sk.date).toUpperCase()}`, -224, -170 + lines.length * 42 + 30, C.slate, 1, 15);
    const pb = E.outBack(bp(u, 1.8, 2.3), 2.5);
    if (pb > 0) {
      ctx.save(); ctx.translate(0, 260); ctx.scale(pb, pb);
      ctx.fillStyle = C.blue; rr(ctx, -200, -36, 400, 72, 36); ctx.fill();
      ctx.font = `700 26px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('Unduh PDF  ↓', 0, 9); ctx.textAlign = 'left';
      ctx.restore();
    }
    // stempel bandara
    const st = E.outBack(bp(u, 2.3, 2.7), 3);
    if (st > 0) {
      ctx.save(); ctx.translate(150, 130); ctx.rotate(-0.25); ctx.scale(st * 1.0, st * 1.0); ctx.globalAlpha = 0.85;
      ctx.strokeStyle = C.sky; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.stroke();
      ctx.font = `800 20px ${F.disp}`; ctx.fillStyle = C.sky; ctx.textAlign = 'center'; ctx.fillText('RESMI', 0, 8); ctx.textAlign = 'left';
      ctx.restore();
    }
    ctx.restore();
  }
  slab(ctx, bp(u, 3.3, 4) * 0.5, C.paper, C.amber);
}

// ======================================================================
// 08 LAYANAN — aplikasi di ponsel: Pusat Bantuan → lapor kehilangan → terkirim
// ======================================================================
const LAYANAN = ['PAS', 'TIM', 'Pusat Bantuan', 'Lapor Kehilangan Barang', 'Beauty Contest', 'Extend Advance', 'Field Trip', 'Pengiklanan', 'Perijinan Usaha', 'Sertifikat OJT', 'Sewa', 'Slot Charter', 'Tenant'];
const TILES = [['Jadwal', C.blue], ['Fasilitas', C.sky], ['Berita', C.navy], ['Wisata', C.green], ['PPID', C.amber], ['Layanan', '#8B5CF6']];
const BAR = ['Beranda', 'Berita', 'Bantuan', 'Layanan', 'Akun'];
function sLayanan(ctx, u) {
  bg(ctx, C.paper);
  // Lingkaran gradien lembut di belakang ponsel.
  const gl = ctx.createRadialGradient(1505, 540, 50, 1505, 540, 700);
  gl.addColorStop(0, 'rgba(14,165,233,0.25)'); gl.addColorStop(1, 'rgba(14,165,233,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(15,23,42,.08)';
  for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) ctx.fillRect(x, y, 2, 2);
  slab(ctx, 0.5 + bp(u, 0, 0.6) * 0.5, C.paper, C.amber);
  const ex = (k) => E.inExpo(bp(u, 7.2 + k * 0.08, 7.98)) * 1500;
  const B = (n) => n * BEAT;

  ctx.save(); ctx.translate(0, -ex(0));
  ctx.beginPath(); ctx.rect(100, 120, 1000, 340); ctx.clip();
  ctx.font = `900 118px ${F.disp}`; ctx.letterSpacing = '-4px'; ctx.fillStyle = C.ink;
  ctx.fillText('Satu aplikasi,', 110, 260 + (1 - E.outExpo(bp(u, 0.1, 0.8))) * 160);
  ctx.letterSpacing = '0px'; ctx.font = `italic 600 130px ${F.serif}`;
  ctx.fillStyle = shine(ctx, 110, 900, bp(u, 1, 2.6), C.blue, C.skyL);
  ctx.fillText('di saku Anda.', 110, 410 + (1 - E.outExpo(bp(u, 0.3, 1.0))) * 200);
  ctx.restore();
  ctx.save(); ctx.translate(0, -ex(1));
  label(ctx, 'PONSEL & TABLET  ·  PASANG KE LAYAR UTAMA', 114, 500, C.slate, bp(u, 0.7, 1.1), 20);
  let cx = 110, cy = 580;
  ctx.font = `600 28px ${F.disp}`;
  LAYANAN.forEach((nm, i) => {
    const w = ctx.measureText(nm).width + 48;
    if (cx + w > 1060) { cx = 110; cy += 74; }
    const p = E.outBack(bp(u, 1 + i * 0.15, 1.6 + i * 0.15), 2.5);
    const hot = nm === 'Pusat Bantuan' && u > B(3.5);
    if (p > 0) {
      ctx.save(); ctx.translate(cx + w / 2, cy + 28 + Math.sin(u * 3 + i) * 3); ctx.scale(p, p);
      if (hot) { ctx.shadowColor = 'rgba(251,191,36,.6)'; ctx.shadowBlur = 24; }
      ctx.fillStyle = hot ? C.amber : C.card; rr(ctx, -w / 2, -28, w, 56, 28); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = hot ? C.amber : 'rgba(15,23,42,.14)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `600 28px ${F.disp}`; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText(nm, 0, 10); ctx.textAlign = 'left';
      ctx.restore();
    }
    cx += w + 14;
  });
  ctx.restore();

  const pe = spring(u - B(0.2), 1.4, 0.45);
  const PW = 430, PH = 880, px = 1290, py = 100 + (1 - pe) * 900 - ex(2) + Math.sin(u * 1.6) * 8;
  ctx.save(); ctx.translate(px + PW / 2, py + PH / 2); ctx.rotate((1 - pe) * 0.15 + 0.02 * Math.sin(u * 1.1) - E.inExpo(bp(u, 7.2, 7.98)) * 0.12); ctx.translate(-px - PW / 2, -py - PH / 2);
  ctx.shadowColor = 'rgba(15,23,42,.3)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
  ctx.fillStyle = C.ink; rr(ctx, px, py, PW, PH, 64); ctx.fill(); ctx.shadowColor = 'transparent';
  const sx = px + 16, sy = py + 16, SW = PW - 32, SH = PH - 32;
  ctx.save(); rr(ctx, sx, sy, SW, SH, 50); ctx.clip();
  const hg = ctx.createLinearGradient(sx, sy, sx + SW, sy + 300); hg.addColorStop(0, C.navy); hg.addColorStop(0.6, C.blue); hg.addColorStop(1, C.sky);
  ctx.fillStyle = C.paper; ctx.fillRect(sx, sy, SW, SH);
  ctx.fillStyle = hg; ctx.fillRect(sx, sy, SW, 270);
  ctx.font = `600 16px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.fillText(DEP[0].time.replace(' WITA', ''), sx + 34, sy + 38);
  ctx.fillStyle = C.ink; rr(ctx, sx + SW / 2 - 60, sy + 14, 120, 32, 16); ctx.fill();
  ctx.font = `800 34px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.fillText('APT Pranoto', sx + 30, sy + 116);
  label(ctx, 'SAMARINDA  ·  AAP', sx + 32, sy + 146, C.skyL, 1, 15);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(ctx, sx + 24, sy + 170, SW - 48, 74, 18); ctx.fill();
  ctx.font = `800 24px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.fillText(`${DEP[0].number}  →  ${DEP[0].code}`, sx + 44, sy + 214);
  ctx.font = `600 18px ${F.disp}`; ctx.fillStyle = statusCol(DEP[0].status, false); ctx.textAlign = 'right'; ctx.fillText(DEP[0].status, sx + SW - 44, sy + 213); ctx.textAlign = 'left';
  TILES.forEach(([nm, col], i) => {
    const c = i % 3, r = Math.floor(i / 3), tw = (SW - 48 - 24) / 3;
    const p = E.outBack(bp(u, 0.8 + i * 0.1, 1.4 + i * 0.1), 2);
    const x = sx + 24 + c * (tw + 12), y = sy + 280 + r * 150;
    ctx.save(); ctx.translate(x + tw / 2, y + 60); ctx.scale(p, p); ctx.translate(-tw / 2, -60);
    ctx.fillStyle = C.card; rr(ctx, 0, 0, tw, 130, 20); ctx.fill();
    ctx.fillStyle = col; rr(ctx, tw / 2 - 28, 18, 56, 56, 16); ctx.fill();
    ctx.font = `900 28px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(nm[0], tw / 2, 57);
    ctx.font = `600 17px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText(nm, tw / 2, 106); ctx.textAlign = 'left';
    ctx.restore();
  });
  const barY = sy + SH - 100;
  ctx.fillStyle = C.card; ctx.fillRect(sx, barY, SW, 100);
  BAR.forEach((nm, i) => {
    const x = sx + (SW / 5) * (i + 0.5);
    ctx.font = `600 14px ${F.disp}`; ctx.textAlign = 'center';
    if (i === 2) {
      const press = u > B(3.5) && u < B(3.7) ? 0.9 : 1;
      const pulse = 1 + 0.06 * Math.max(0, Math.sin(u * 8)) * (u < B(3.5) ? 1 : 0);
      ctx.save(); ctx.translate(x, barY + 4); ctx.scale(press * pulse, press * pulse);
      ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.deep; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = C.ink; ctx.fillText(nm, x, barY + 72);
    } else { ctx.fillStyle = 'rgba(100,116,139,.35)'; rr(ctx, x - 14, barY + 22, 28, 28, 8); ctx.fill(); ctx.fillStyle = C.slate; ctx.fillText(nm, x, barY + 72); }
    ctx.textAlign = 'left';
  });
  const sh = E.outExpo(bp(u, 3.7, 4.3));
  if (sh > 0) {
    ctx.fillStyle = `rgba(6,18,58,${0.45 * sh})`; ctx.fillRect(sx, sy, SW, SH);
    const shY = lerp(sy + SH, sy + 220, sh);
    ctx.fillStyle = C.card; rr(ctx, sx, shY, SW, SH, 36); ctx.fill();
    ctx.fillStyle = 'rgba(15,23,42,.2)'; rr(ctx, sx + SW / 2 - 40, shY + 14, 80, 8, 4); ctx.fill();
    ctx.font = `800 30px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText('Lapor Kehilangan', sx + 32, shY + 76);
    ctx.fillText('Barang', sx + 32, shY + 114);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = 'rgba(15,23,42,.08)'; rr(ctx, sx + 32, shY + 150 + k * 78, SW - 64, 56, 14); ctx.fill();
      const fill = E.outCubic(bp(u, 4.2 + k * 0.2, 4.6 + k * 0.2));
      ctx.fillStyle = 'rgba(15,23,42,.14)'; rr(ctx, sx + 52, shY + 172 + k * 78, Math.max(1, (SW - 140) * [0.5, 0.7, 0.35][k] * fill), 12, 6); ctx.fill();
    }
    ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(15,23,42,.3)'; ctx.lineWidth = 2; rr(ctx, sx + 32, shY + 392, SW - 64, 90, 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `600 18px ${F.disp}`; ctx.fillStyle = C.slate; ctx.textAlign = 'center'; ctx.fillText('+ Tambah foto', sx + SW / 2, shY + 444);
    const bpress = u > B(5) && u < B(5.2) ? 0.93 : 1;
    ctx.save(); ctx.translate(sx + SW / 2, shY + 540); ctx.scale(bpress, bpress);
    ctx.fillStyle = C.blue; rr(ctx, -(SW - 64) / 2, -32, SW - 64, 64, 32); ctx.fill();
    ctx.font = `700 22px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.fillText('Kirim laporan', 0, 8);
    ctx.restore(); ctx.textAlign = 'left';
  }
  const ok = bp(u, 5.1, 5.6);
  if (ok > 0) {
    ctx.fillStyle = `rgba(255,255,255,${E.outExpo(ok)})`; ctx.fillRect(sx, sy, SW, SH);
    const ccx = sx + SW / 2, ccy = sy + SH / 2 - 60;
    // cincin konfeti
    const cr = bp(u, 5.2, 6.4);
    if (cr > 0 && cr < 1) {
      const r = rng(5);
      for (let i = 0; i < 24; i++) {
        const a = r() * TAU, d = 90 + E.outExpo(cr) * (120 + r() * 120);
        ctx.globalAlpha = 1 - cr; ctx.fillStyle = [C.amber, C.sky, C.green, C.blue][i % 4];
        ctx.save(); ctx.translate(ccx + Math.cos(a) * d, ccy + Math.sin(a) * d + cr * cr * 60); ctx.rotate(a + cr * 6); ctx.fillRect(-6, -3, 12, 6); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(ccx, ccy, 80 * E.outBack(ok, 2.5), 0, TAU); ctx.fill();
    const ck = E.outCubic(bp(u, 5.3, 5.8));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ccx - 34, ccy + 2);
    if (ck < 0.4) ctx.lineTo(ccx - 34 + 22 * (ck / 0.4), ccy + 2 + 24 * (ck / 0.4));
    else { ctx.lineTo(ccx - 12, ccy + 26); ctx.lineTo(ccx - 12 + 50 * ((ck - 0.4) / 0.6), ccy + 26 - 56 * ((ck - 0.4) / 0.6)); }
    ctx.stroke(); ctx.lineCap = 'butt';
    ctx.globalAlpha = bp(u, 5.5, 5.9); ctx.textAlign = 'center';
    ctx.font = `800 32px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText('Laporan terkirim', ccx, ccy + 140);
    ctx.font = `500 19px ${F.disp}`; ctx.fillStyle = C.slate; ctx.fillText('Pantau statusnya lewat nomor tiket', ccx, ccy + 176);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  ctx.restore();
  const tapAt = (b) => Math.exp(-Math.pow((u - B(b)) / 0.08, 2));
  const goSheet = u >= B(4.4);
  const fx = goSheet ? px + PW / 2 + 40 : px + PW / 2, fy = goSheet ? py + 16 + 220 + 540 : py + 16 + SH - 96;
  const fa = bp(u, 3, 3.3) * (1 - bp(u, 5.2, 5.5));
  if (fa > 0) {
    const tp = Math.max(tapAt(3.5), tapAt(5));
    ctx.fillStyle = `rgba(15,23,42,${0.25 * fa})`; ctx.beginPath(); ctx.arc(fx, fy, 34 - 8 * tp, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(15,23,42,${0.5 * fa * tp})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx, fy, 34 + 40 * (1 - tp), 0, TAU); ctx.stroke();
  }
  ctx.restore();
  slab(ctx, bp(u, 7.3, 8) * 0.5, C.navy, C.sky);
}

// ======================================================================
// 09 TANYA JAWAB — akordeon FAQ asli, membuka satu per ketuk
// ======================================================================
function sFaq(ctx, u) {
  skyBg(ctx, C.navy, C.deep);
  slab(ctx, 0.5 + bp(u, 0, 0.5) * 0.5, C.navy, C.sky);
  bokeh(ctx, u + 60, 18, 0.13, 17);
  const Q = D.faqs.slice(0, 4);
  const out = E.inExpo(bp(u, 3.5, 4));

  ctx.save(); ctx.globalAlpha = 1 - out;
  ctx.font = `italic 600 96px ${F.serif}`; ctx.fillStyle = C.paper; ctx.fillText('Tanya', 110, 200);
  const tw = ctx.measureText('Tanya ').width;
  ctx.font = `800 96px ${F.disp}`; ctx.fillStyle = shine(ctx, 110 + tw, 110 + tw + 360, bp(u, 0.2, 1.6), C.amber, '#FFF7D6'); ctx.fillText('jawab', 110 + tw, 200);
  label(ctx, `${D.faqs.length} PERTANYAAN DI PORTAL`, W - 500, 190, C.skyL, 0.9, 18);
  ctx.restore();

  // Satu terbuka per ketuk; tinggi kartu dianimasikan dengan pegas.
  const openIdx = clamp(Math.floor(u / BEAT - 0.2), 0, Q.length - 1);
  let y = 260;
  Q.forEach((q, k) => {
    const s = (0.15 + k * 0.12) * BEAT, e = spring(u - s, 1.8, 0.55);
    if (u < s) return;
    const openP = k === openIdx ? E.outExpo(prog(u / BEAT - 0.2 - k, 0, 0.6)) : k === openIdx - 1 ? 1 - E.outExpo(prog(u / BEAT - 0.2 - (k + 1), 0, 0.5)) : 0;
    ctx.font = `500 26px ${F.disp}`;
    const ans = wrap(ctx, q.answer, 1500, 2);
    const h = 110 + openP * (ans.length * 38 + 30);
    const x = 110 + (1 - e) * 1600 + out * (k % 2 ? 1 : -1) * 2000;
    ctx.save();
    ctx.fillStyle = openP > 0.05 ? `rgba(255,255,255,${0.1 + 0.85 * openP})` : 'rgba(255,255,255,0.1)';
    rr(ctx, x, y, 1700, h, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
    const dark = openP > 0.5;
    pill(ctx, q.category.toUpperCase(), x + 34, y + 22, dark ? C.blue : 'rgba(125,211,252,0.18)', dark ? '#fff' : C.skyL, 13);
    ctx.font = `700 32px ${F.disp}`; ctx.fillStyle = dark ? C.ink : C.paper;
    ctx.fillText(clip(q.question, 88), x + 34, y + 88);
    // tanda +/− berputar
    ctx.save(); ctx.translate(x + 1640, y + 55); ctx.rotate(openP * Math.PI / 4 * 2);
    ctx.strokeStyle = dark ? C.ink : C.paper; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(0, -14 * (1 - openP)); ctx.lineTo(0, 14 * (1 - openP)); ctx.stroke();
    ctx.restore();
    if (openP > 0.05) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y + 100, 1700, h - 100); ctx.clip();
      ctx.font = `500 26px ${F.disp}`; ctx.fillStyle = C.slate; ctx.globalAlpha = openP;
      ans.forEach((l, j) => ctx.fillText(l, x + 34, y + 136 + j * 38));
      ctx.restore();
    }
    ctx.restore();
    y += h + 18;
  });
  slab(ctx, bp(u, 3.5, 4) * 0.5, '#000', C.amber);
}

// ======================================================================
// 10 MONTASE — delapan potongan per setengah ketuk
// ======================================================================
const CUTS = [
  { id: 'jadwal', b: 2, w: 'JADWAL' }, { id: 'profil', b: 2.5, w: 'PROFIL' }, { id: 'statistik', b: 5, w: 'STATISTIK' }, { id: 'fasilitas', b: 4.9, w: 'FASILITAS' },
  { id: 'info', b: 1.4, w: 'BERITA' }, { id: 'regulasi', b: 2.4, w: 'REGULASI' }, { id: 'layanan', b: 5.6, w: 'LAYANAN' }, { id: 'faq', b: 1.6, w: 'TANYA JAWAB' },
];
let mBuf, chan;
function sMontase(ctx, u) {
  if (!mBuf) { mBuf = mk(); chan = [mk(), mk(), mk()]; }
  const step = BEAT / 2;
  const c = clamp(Math.floor(u / step), 0, 7), v = u - c * step;
  const cut = CUTS[c];
  const [bc, bx] = mBuf;
  bx.save(); renderLocal(bx, cut.id, cut.b * BEAT + v * 0.5); bx.restore();

  const split = 24 * (1 - E.outExpo(clamp(v / (step * 0.8)))) + 3;
  ['#ff0000', '#00ff00', '#0000ff'].forEach((col, i) => {
    const x = chan[i][1];
    x.globalCompositeOperation = 'source-over'; x.drawImage(bc, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, W, H);
  });
  bg(ctx, '#000');
  ctx.save();
  const z = lerp(1.14, 1, E.outExpo(clamp(v / step)));
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.rotate((c % 2 ? 1 : -1) * 0.012 * (1 - v / step)); ctx.translate(-W / 2, -H / 2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(chan[0][0], split, 0); ctx.drawImage(chan[1][0], 0, 0); ctx.drawImage(chan[2][0], -split, 0);
  ctx.globalCompositeOperation = 'source-over';
  if (v < 0.08) {
    const r = rng(c * 31 + 7);
    for (let s = 0; s < 9; s++) { const y = r() * H, h = 10 + r() * 90, dx = (r() - 0.5) * 220; ctx.drawImage(bc, 0, y, W, h, dx, y, W, h); }
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff';
  ctx.font = `900 100px ${F.disp}`;
  const size = Math.min(270, (1500 / ctx.measureText(cut.w).width) * 100);
  ctx.font = `900 ${size}px ${F.disp}`;
  ctx.letterSpacing = `${lerp(60, -6, E.outExpo(clamp(v / step)))}px`;
  ctx.textAlign = 'center'; ctx.fillText(cut.w, W / 2, H / 2 + size * 0.36);
  ctx.restore();
  label(ctx, `APTPAIRPORT.ID  ·  ${c + 1} / 8`, W / 2 - 200, H / 2 + 200, '#fff', 1, 20);
  if (v < 1 / 60) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 0, W, H); }
  if (u > 3.65 * BEAT) { const f = Math.floor(u * 30) % 2; if (f) bg(ctx, C.sky); }
}

// ======================================================================
// 11 PENUTUP — partikel menyusun alamat situs, logo bandara
// ======================================================================
const NP = 2400;
let P, pBuf;
function prepParticles() {
  const [, o] = mk();
  o.fillStyle = '#fff'; o.font = `800 190px ${F.disp}`; o.letterSpacing = '-4px'; o.textAlign = 'center';
  o.fillText('aptpairport.id', W / 2, H / 2 + 80);
  const d = o.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 140) pts.push([x, y]);
  const r = rng(2026);
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  P = [];
  for (let i = 0; i < NP; i++) {
    const tg = pts[i % pts.length], c = r();
    P.push({ ang: r() * TAU, rad: 300 + r() * 900, tx: tg[0], ty: tg[1], a: r(), b: r(), col: c < 0.8 ? 0 : c < 0.93 ? 1 : 2, sz: r() < 0.7 ? 0 : 1 });
  }
  pBuf = mk();
}
function pPos(p, u) {
  const b = E.outExpo(bp(u, 0, 0.8));
  const sp = u * 0.5;
  let x = W / 2 + Math.cos(p.ang + sp * (p.b - 0.5)) * p.rad * b, y = H / 2 + Math.sin(p.ang + sp * (p.b - 0.5)) * p.rad * b * 0.6;
  const d = 0.5 * (p.tx / W) + 0.15 * p.a;
  const c = E.inOutCubic(bp(u, 0.7 + d, 1.7 + d));
  if (c > 0) { const bend = Math.sin(c * Math.PI) * 160 * (p.b - 0.5); x = lerp(x, p.tx, c) + bend; y = lerp(y, p.ty, c) - bend * 0.5; }
  if (c >= 1) { x += Math.sin(u * 7 + p.b * 40) * 0.6; y += Math.cos(u * 6 + p.a * 40) * 0.6; }
  return [x, y];
}
const PCOL = [C.paper, C.skyL, C.amber];
function sPenutup(ctx, u) {
  skyBg(ctx, C.navy, C.deep);
  bokeh(ctx, u + 80, 24, 0.12, 21);

  const pf = bp(u, 1.6, 5.5);
  if (pf > 0 && pf < 1) {
    const pt = (q) => [lerp(-200, W + 200, q), H * 0.92 - q * 760];
    const [x, y] = pt(pf);
    const tr = ctx.createLinearGradient(...pt(Math.max(0, pf - 0.4)), x, y);
    tr.addColorStop(0, 'rgba(125,211,252,0)'); tr.addColorStop(1, 'rgba(125,211,252,0.45)');
    ctx.strokeStyle = tr; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...pt(Math.max(0, pf - 0.4))); ctx.lineTo(x, y); ctx.stroke();
    plane(ctx, x, y, Math.atan2(-760, W + 400), 1.4, C.skyL);
  }

  const [pc, px] = pBuf;
  px.clearRect(0, 0, W, H); px.lineCap = 'round';
  const paths = {};
  for (const p of P) {
    const [x, y] = pPos(p, u), [x0, y0] = pPos(p, u - 1 / 90);
    const key = `${p.col}_${p.sz}`;
    (paths[key] ||= new Path2D()); paths[key].moveTo(x0, y0); paths[key].lineTo(x + 0.01, y);
  }
  for (const key in paths) {
    const [ci, sz] = key.split('_').map(Number);
    px.strokeStyle = PCOL[ci]; px.lineWidth = [2.6, 4][sz]; px.stroke(paths[key]);
  }
  const fadeP = 1 - bp(u, 3.2, 4);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(12px)'; ctx.globalAlpha = 0.8 * Math.max(0.35, fadeP); ctx.drawImage(pc, 0, 0);
  ctx.filter = 'none'; ctx.globalAlpha = Math.max(0, fadeP); ctx.drawImage(pc, 0, 0);
  ctx.restore();
  // Sesudah partikel mendarat, teks tajam mengambil alih agar alamat terbaca jelas.
  const solid = bp(u, 2.6, 3.4);
  if (solid > 0) {
    ctx.save(); ctx.globalAlpha = solid; ctx.font = `800 190px ${F.disp}`; ctx.letterSpacing = '-4px'; ctx.textAlign = 'center';
    const tw = ctx.measureText('aptpairport.id').width;
    ctx.fillStyle = shine(ctx, W / 2 - tw / 2, W / 2 + tw / 2, bp(u, 3.4, 5.0), C.paper, C.amber);
    ctx.fillText('aptpairport.id', W / 2, H / 2 + 80); ctx.restore();
  }

  if (LOGO) {
    const la = E.outExpo(bp(u, 2.4, 3.2));
    const lw = 400, lh = (lw * LOGO.height) / LOGO.width;
    ctx.globalAlpha = la; ctx.drawImage(LOGO, W / 2 - lw / 2, H / 2 - 150 - lh + (1 - la) * 40, lw, lh); ctx.globalAlpha = 1;
  }
  const li = E.outExpo(bp(u, 2.8, 3.8));
  ctx.fillStyle = C.gold; ctx.fillRect(W / 2 - 420 * li, H / 2 + 130, 840 * li, 2);
  ctx.save(); ctx.textAlign = 'center';
  ctx.font = `500 24px ${F.mono}`; ctx.letterSpacing = `${lerp(26, 8, E.outExpo(bp(u, 2.9, 4)))}px`;
  ctx.globalAlpha = bp(u, 2.9, 3.4); ctx.fillStyle = C.paper;
  ctx.fillText('BANDAR UDARA A.P.T. PRANOTO  ·  SAMARINDA', W / 2, H / 2 + 190);
  ctx.globalAlpha = 0.6 * bp(u, 3.4, 3.9); ctx.letterSpacing = '4px'; ctx.font = `500 18px ${F.mono}`; ctx.fillStyle = C.skyL;
  ctx.fillText('JADWAL  ·  STATISTIK  ·  FASILITAS  ·  BERITA  ·  PPID  ·  LAYANAN  ·  FAQ', W / 2, H / 2 + 236);
  ctx.restore();

  const flash = 1 - E.outCubic(bp(u, 0, 0.5));
  if (flash > 0) { ctx.fillStyle = `rgba(243,246,251,${flash})`; ctx.fillRect(0, 0, W, H); }
  const out = bp(u, 7.4, 8);
  if (out > 0) { ctx.fillStyle = `rgba(6,18,58,${out})`; ctx.fillRect(0, 0, W, H); }
}

// ======================================================================
// komposisi
// ======================================================================
const FN = {
  intro: sIntro, portal: sPortal, profil: sProfil, jadwal: sJadwal, statistik: sStatistik, fasilitas: sFasilitas,
  info: sInfo, regulasi: sRegulasi, layanan: sLayanan, faq: sFaq, montase: sMontase, penutup: sPenutup,
};
const sceneAt = (t) => SCENES.findLast((s) => t >= s.start) || SCENES[0];
function renderLocal(ctx, id, u) { FN[id](ctx, u); }
function renderScene(ctx, t) { const s = sceneAt(t); FN[s.id](ctx, t - s.start); }

const IMPACTS = SCENES.slice(1).map((s) => s.start);
function hud(ctx, t) {
  const fin = SCENES.at(-1).start;
  const a = prog(t, 1.2, 1.8) * (1 - prog(t, fin - 0.1, fin + 0.1));
  if (a <= 0) return;
  ctx.save();
  // Mode difference: HUD otomatis kontras di atas latar terang maupun gelap.
  ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = a * 0.9;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.font = `500 17px ${F.mono}`; ctx.letterSpacing = '3px';
  ctx.fillText(sceneAt(t).label, 56, 66);
  ctx.textAlign = 'right'; ctx.fillText('APTPAIRPORT.ID', W - 56, 66);
  ctx.fillText('AAP  ·  WALS  ·  SAMARINDA', W - 56, H - 56);
  ctx.textAlign = 'left';
  const fr = Math.floor(t * FPS);
  ctx.fillText(`TC 00:00:${String(Math.floor(t)).padStart(2, '0')}:${String(fr % FPS).padStart(2, '0')}`, 56, H - 56);
  const x0 = 56, x1 = W - 56, y = H - 34;
  ctx.globalAlpha = a * 0.3; ctx.fillRect(x0, y, x1 - x0, 1);
  const beats = Math.round(DUR / BEAT);
  for (let b = 0; b <= beats; b++) { const tall = IMPACTS.some((s) => Math.abs(s - b * BEAT) < 1e-6) ? 10 : 4; ctx.fillRect(x0 + ((x1 - x0) * b) / beats, y - tall, 1, tall); }
  ctx.globalAlpha = a * 0.9; ctx.fillRect(x0, y - 1, ((x1 - x0) * t) / DUR, 3);
  for (const [cx, cy, sx, sy] of [[28, 28, 1, 1], [W - 28, 28, -1, 1], [28, H - 28, 1, -1], [W - 28, H - 28, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(cx, cy + sy * 18); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 18, cy); ctx.stroke();
  }
  ctx.restore();
}

// Kilau cahaya hangat sekejap di setiap pergantian adegan.
function lightLeak(ctx, t) {
  for (const [k, s] of IMPACTS.entries()) {
    const d = t - s;
    if (d < 0 || d > 1.2) continue;
    const a = Math.exp(-d * 3.2) * 0.55;
    const x = k % 2 ? W * 0.9 : W * 0.1, y = k % 3 ? H * 0.15 : H * 0.85;
    const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.6);
    g.addColorStop(0, `rgba(255,200,120,${a})`); g.addColorStop(0.4, `rgba(251,120,60,${a * 0.35})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}

let grain, vignette;
function post(ctx, t) {
  if (!grain) {
    grain = [0, 1, 2, 3].map((k) => {
      const [c, x] = mk(256, 256), img = x.createImageData(256, 256), r = rng(100 + k);
      for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      x.putImageData(img, 0, 0);
      return ctx.createPattern(c, 'repeat');
    });
    vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,0.32)');
  }
  const f = Math.floor(t * FPS);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07;
  ctx.translate((f * 73) % 256, (f * 151) % 256);
  ctx.fillStyle = grain[f % 4]; ctx.fillRect(-256, -256, W + 512, H + 512);
  ctx.restore();
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
}

export function drawFrame(ctx, t) {
  let amp = 0;
  for (const ti of IMPACTS) if (t >= ti) amp += 12 * Math.exp(-(t - ti) * 10);
  ctx.save();
  ctx.translate(amp * Math.sin(t * 97), amp * Math.cos(t * 83));
  renderScene(ctx, t);
  ctx.restore();
  lightLeak(ctx, t);
  hud(ctx, t);
  post(ctx, t);
}
