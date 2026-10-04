/**
 * Motion reel aptpairport.id — 20 dtk, 1920×1080, 60 fps.
 *
 * Tiap frame adalah fungsi murni dari waktu t (detik), digambar langsung ke
 * kanvas 2D; tidak ada linimasa atau kunci animasi. Kisi 120 BPM: satu ketuk =
 * 0,5 dtk, jadi setiap potongan, hentakan, dan perubahan jatuh tepat di irama
 * musik (audio.js memakai jam yang sama).
 *
 * Aturan isi sama dengan video promo Remotion (lihat README): semua data —
 * penerbangan, fasilitas, wisata, berita, jumlah dokumen PPID — dibaca dari
 * src/data/snapshot.json. Foto "Self Check-In" dilewati (memuat poster pejabat
 * politik); formulir hanya kerangka garis, tanpa contoh identitas.
 */
export const W = 1920, H = 1080, FPS = 60, DUR = 20, BEAT = 0.5;

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
const TAU = Math.PI * 2;
const E = {
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
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

// Pesawat tampak atas, hidung ke +x.
const PLANE = new Path2D('M30 0 L18 -3 L4 -3 L-6 -22 L-12 -22 L-6 -3 L-20 -3 L-26 -10 L-30 -10 L-27 0 L-30 10 L-26 10 L-20 3 L-6 3 L-12 22 L-6 22 L4 3 L18 3 Z');
function plane(ctx, x, y, ang, s, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s); ctx.fillStyle = col; ctx.fill(PLANE); ctx.restore(); }

// Sapuan ubin 60 px menutup layar secara diagonal — transisi antaradegan.
function tileWipe(ctx, t, t0, col) {
  if (t < t0) return;
  ctx.fillStyle = col;
  for (let r = 0; r < 18; r++) for (let c = 0; c < 32; c++) {
    const f = E.outExpo(prog(t, t0 + (c + r) * 0.0045, t0 + (c + r) * 0.0045 + 0.24));
    if (f <= 0) continue;
    const q = 62 * f;
    ctx.fillRect(c * 60 + 30 - q / 2, r * 60 + 30 - q / 2, q, q);
  }
}

// ---------- data & aset ----------
let D, IMG = {}, LOGO;
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
let FAC, WIS, NEWS, DEP, ARR;
export async function prepare() {
  D = await (await fetch('/data/snapshot.json')).json();
  FAC = D.facilities.filter((f) => f.image && f.name !== 'Self Check-In');
  WIS = D.tourisms;
  NEWS = D.news;
  DEP = D.flights.filter((f) => f.type === 'departure').slice(0, 5);
  ARR = D.flights.filter((f) => f.type === 'arrival').slice(0, 5);
  const srcs = new Set([...FAC, ...WIS, ...NEWS, ...D.flights].map((x) => x.image || x.logo).filter(Boolean));
  await Promise.all([...srcs].map(async (s) => { IMG[s] = await loadImg('/' + s); }));
  LOGO = await loadImg('/logo/logo-white-apt.svg');
  prepParticles();
}

// ======================================================================
// 00 PEMBUKA — titik, antisipasi, landasan pacu, pesawat lepas landas, iris
// ======================================================================
function sIntro(ctx, t) {
  bg(ctx, C.deep);
  const cx = W / 2, cy = H / 2 + 40;

  const bin = E.outExpo(prog(t, 0.95, 1.4)), bout = E.inExpo(prog(t, 1.35, 1.6));
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

  // "Samarinda" naik dari balik garis landasan.
  const rise = t < 1.3 ? 1 : 1 - E.inExpo(prog(t, 1.25, 1.45));
  if (t > 0.7 && rise > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, cy - 2); ctx.clip();
    ctx.font = `italic 500 230px ${F.serif}`; ctx.fillStyle = C.paper;
    const L = glyphs(ctx, 'Samarinda');
    L.g.forEach((g, j) => {
      const p = E.outExpo(prog(t, 0.72 + j * 0.03, 1.1 + j * 0.03)) * rise;
      ctx.fillStyle = j === 0 ? C.gold : C.paper;
      ctx.fillText(g.ch, cx - L.w / 2 + g.x, cy - 40 + (1 - p) * 300);
    });
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(0, cy + 2, W, H); ctx.clip();
    ctx.font = `500 24px ${F.mono}`; ctx.letterSpacing = '7px'; ctx.fillStyle = C.skyL;
    const s = 'BANDAR UDARA A.P.T. PRANOTO  ·  AAP / WALS';
    const n = Math.floor(s.length * prog(t, 0.8, 1.25));
    const full = ctx.measureText(s).width;
    ctx.globalAlpha = rise;
    ctx.fillText(s.slice(0, n), cx - full / 2, cy + 62 - (1 - rise) * 40);
    if (n < s.length && Math.floor(t * 8) % 2 === 0) ctx.fillRect(cx - full / 2 + ctx.measureText(s.slice(0, n)).width, cy + 40, 14, 26);
    ctx.restore();
  }

  // Titik → landasan pacu (lampu garis tengah mengalir) → mengerut lagi.
  if (t < 0.5) {
    const pop = E.outBack(prog(t, 0.04, 0.34), 3);
    const sq = Math.sin(Math.PI * prog(t, 0.34, 0.5)) * 0.3;
    ctx.fillStyle = C.amber;
    ctx.beginPath(); ctx.ellipse(cx, cy, 16 * pop * (1 + sq), 16 * pop * (1 - sq), 0, 0, TAU); ctx.fill();
  } else if (t < 1.55) {
    const st = E.outExpo(prog(t, 0.5, 1.0)), col = E.inExpo(prog(t, 1.28, 1.55));
    const th = lerp(32, 3, E.outExpo(prog(t, 0.5, 0.75)));
    const w = 1240 * st * (1 - col), thick = lerp(th, 32, col);
    ctx.fillStyle = mix(C.amber, C.paper, prog(t, 0.5, 0.7));
    rr(ctx, cx - w / 2 - thick / 2, cy - thick / 2, w + thick, thick, thick / 2); ctx.fill();
    // Lampu landasan: titik kecil di bawah garis yang berlari ke kiri.
    ctx.fillStyle = C.amber;
    for (let k = 0; k < 40; k++) {
      const x = ((k * 34 - t * 900) % 1360 + 1360) % 1360 - 680;
      if (Math.abs(x) < w / 2) { ctx.globalAlpha = 0.7; ctx.fillRect(cx + x, cy + 12, 14, 3); }
    }
    ctx.globalAlpha = 1;
  }

  // Pesawat lepas landas dengan jejak kondensasi.
  const pf = prog(t, 0.9, 1.6);
  if (pf > 0 && pf < 1) {
    const e = E.inOutCubic(pf);
    const pt = (u) => [lerp(cx - 520, cx + 780, u), cy - 6 - Math.pow(u, 2.2) * 520];
    ctx.strokeStyle = C.paper; ctx.lineWidth = 3; ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const [x, y] = pt(Math.max(0, e - 0.35) + (Math.min(0.35, e) * i) / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.globalAlpha = 1;
    const [x, y] = pt(e), [x2, y2] = pt(e + 0.01);
    plane(ctx, x, y, Math.atan2(y2 - y, x2 - x), 1.6, C.amber);
  }

  // Iris biru langit menelan layar.
  if (t >= 1.55) {
    const e = E.inOutCubic(prog(t, 1.55, 1.98));
    const R = lerp(16, 1200, e);
    ctx.lineWidth = 6;
    [[1.22, C.amber], [1.1, C.skyL]].forEach(([k, col]) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, R * k + 10, 0, TAU); ctx.stroke(); });
    ctx.fillStyle = mix(C.paper, C.sky, prog(t, 1.55, 1.62));
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
  let l = mx, r = mx, u = my, b = my;
  while (l > 0 && a(l, my) < 128) l--;
  while (r < c.width && a(r, my) < 128) r++;
  while (u > 0 && a(mx, u) < 128) u--;
  while (b < c.height && a(mx, b) < 128) b++;
  return (counterCache[k] = { cx: (l + r) / 2, cy: (u + b) / 2 - base, rx: (r - l) / 2, ry: (b - u) / 2 });
}
let portal;
function sType(ctx, t) {
  const lt = t - 2, i = Math.min(3, Math.floor(lt / BEAT)), u = lt - i * BEAT;
  const Wd = WORDS[i], prev = WORDS[Math.max(0, i - 1)];
  bg(ctx, prev.bg);
  ctx.fillStyle = Wd.bg;
  for (let k = 0; k < 8; k++) ctx.fillRect(k * W / 8 - 1, -60, W / 8 + 2, (H + 120) * E.outExpo(prog(u, k * 0.014, k * 0.014 + 0.16)));

  ctx.font = `900 100px ${F.disp}`;
  const size = Math.min(640, (1560 / ctx.measureText(Wd.w).width) * 100);
  ctx.font = `900 ${size}px ${F.disp}`; ctx.letterSpacing = `${-size * 0.035}px`;
  const L = glyphs(ctx, Wd.w);
  const x0 = W / 2 - (L.w + size * 0.035) / 2;
  const capH = size * 0.727, base = H / 2 + capH / 2;

  ctx.save();
  const z = i === 3 ? E.inExpo(prog(t, 3.64, 4.0)) : 0;
  const punch = 1 + 0.07 * (1 - E.outExpo(prog(u, 0, 0.4)));
  let oc;
  if (i === 3) {
    const j = Wd.w.indexOf('O'), g = L.g[j], cc = oCounter(size);
    oc = { x: x0 + g.x + cc.cx, y: base + cc.cy, rx: cc.rx, ry: cc.ry };
    const S = lerp(1, 46, z);
    ctx.translate(lerp(oc.x, W / 2, z), lerp(oc.y, H / 2, z)); ctx.scale(S, S); ctx.translate(-oc.x, -oc.y);
  }
  ctx.translate(W / 2, H / 2); ctx.scale(punch, punch); ctx.translate(-W / 2, -H / 2);

  L.g.forEach((g, j) => {
    const d = j * 0.035, p = E.outExpo(prog(u, d, d + 0.3));
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 + g.x - size * 0.2, base - capH * 1.6, g.w + size * 0.4, capH * 1.6 + size * 0.06); ctx.clip();
    ctx.translate(x0 + g.x, base + (1 - p) * capH * 1.15);
    ctx.transform(1, 0, -0.35 * (1 - p), 1, 0, 0);
    if (i === 1) { // PORTAL. bergoyang di kakinya
      const rot = (j % 2 ? 1 : -1) * 0.18 * Math.exp(-u * 8) * Math.sin(u * 34);
      ctx.translate(g.w / 2, 0); ctx.rotate(rot); ctx.translate(-g.w / 2, 0);
    }
    const step = Math.floor(u / 0.0625);
    if (i === 2 && u > 0.12 && hash(j * 13 + step * 7) > 0.55) { // SEMUA berkedip ke serif
      ctx.font = `italic 600 ${size * 1.0}px ${F.serif}`; ctx.letterSpacing = '0px';
      ctx.fillStyle = C.amber;
      ctx.fillText(g.ch, (g.w - ctx.measureText(g.ch).width) / 2, 0);
    } else { ctx.fillStyle = Wd.fg; ctx.fillText(g.ch, 0, 0); }
    ctx.restore();
  });

  // Portal: adegan jadwal sudah hidup di dalam lubang O; kamera menembusnya.
  if (i === 3 && t > 3.64) {
    if (!portal) portal = mk();
    portal[1].save(); sJadwal(portal[1], 4.0); portal[1].restore();
    ctx.beginPath(); ctx.ellipse(oc.x, oc.y, oc.rx + 1, oc.ry + 1, 0, 0, TAU); ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = prog(t, 3.64, 3.72);
    ctx.drawImage(portal[0], 0, 0);
  }
  ctx.restore();
}

// ======================================================================
// 02 JADWAL — papan split-flap: keberangkatan lalu kedatangan
// ======================================================================
const COLS = [{ k: 'time', n: 5 }, { k: 'number', n: 7 }, { k: 'city', n: 9 }, { k: 'status', n: 9 }];
const CW = 44, CH = 68, CG = 4, COLGAP = 30, ROWH = 98;
const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const rowText = (f) => ({ time: f.time.replace(' WITA', ''), number: f.number, city: f.city.toUpperCase(), status: f.status.toUpperCase() });
function sJadwal(ctx, t) {
  bg(ctx, C.deep);
  ctx.fillStyle = 'rgba(125,211,252,0.05)';
  for (let x = 0; x <= W; x += 60) ctx.fillRect(x, 0, 1, H);
  for (let y = 0; y <= H; y += 60) ctx.fillRect(0, y, W, 1);

  // Pesawat melintas di latar.
  const pu = prog(t, 4.0, 7.0);
  ctx.globalAlpha = 0.18; plane(ctx, lerp(-100, W + 100, pu), 150 + Math.sin(pu * 3) * 30, 0.05, 5, C.skyL); ctx.globalAlpha = 1;

  const arrPhase = t >= 5.5;
  const boardW = 70 + COLS.reduce((a, c) => a + c.n * (CW + CG), 0) + COLS.length * COLGAP;
  const bx = (W - boardW) / 2, by = 330;

  ctx.font = `italic 600 96px ${F.serif}`; ctx.fillStyle = C.paper;
  ctx.fillText('Jadwal', bx, 210);
  const jw = ctx.measureText('Jadwal ').width;
  ctx.font = `800 96px ${F.disp}`; ctx.fillStyle = C.skyL; ctx.fillText('penerbangan', bx + jw, 210);

  // Segmented: Keberangkatan | Kedatangan.
  const sw = 560, sx = bx + boardW - sw, sy = 140;
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, sx, sy, sw, 70, 35); ctx.fill();
  const kn = spring(t - 5.45, 2.2, 0.45);
  ctx.fillStyle = C.amber; rr(ctx, sx + 6 + kn * (sw / 2 - 6), sy + 6, sw / 2 - 6, 58, 29); ctx.fill();
  ctx.font = `700 24px ${F.disp}`; ctx.textAlign = 'center';
  ctx.fillStyle = kn < 0.5 ? C.deep : C.paper; ctx.fillText('Keberangkatan', sx + sw / 4 + 3, sy + 44);
  ctx.fillStyle = kn >= 0.5 ? C.deep : C.paper; ctx.fillText('Kedatangan', sx + (sw * 3) / 4, sy + 44);
  ctx.textAlign = 'left';

  // Label kolom.
  ctx.font = `500 16px ${F.mono}`; ctx.letterSpacing = '3px'; ctx.fillStyle = C.skyL; ctx.globalAlpha = 0.7;
  let lx = bx + 70 + COLGAP;
  ['WAKTU', 'PENERBANGAN', arrPhase ? 'ASAL' : 'TUJUAN', 'STATUS'].forEach((lab, c) => { ctx.fillText(lab, lx, by - 18); lx += COLS[c].n * (CW + CG) + COLGAP; });
  ctx.globalAlpha = 1; ctx.letterSpacing = '0px';

  const scan = Math.floor((t - 4) / BEAT) % 5;
  for (let r = 0; r < 5; r++) {
    const y = by + r * ROWH;
    if (r === scan) { ctx.fillStyle = 'rgba(14,165,233,0.12)'; rr(ctx, bx - 16, y - 12, boardW + 32, CH + 24, 14); ctx.fill(); }
    const cur = arrPhase ? ARR[r] : DEP[r], prv = arrPhase ? DEP[r] : null;
    const p0 = arrPhase ? 5.5 : 4.0, cs = p0 + 0.05 + r * 0.05;
    // Logo maskapai.
    const lg = t < cs && prv ? prv : cur;
    ctx.fillStyle = '#fff'; rr(ctx, bx, y + 4, 60, 60, 12); ctx.fill();
    const li = IMG[lg.logo];
    if (li) { const s = Math.min(48 / li.width, 48 / li.height); ctx.drawImage(li, bx + 30 - (li.width * s) / 2, y + 34 - (li.height * s) / 2, li.width * s, li.height * s); }
    let x = bx + 70 + COLGAP, ci = 0;
    COLS.forEach((col) => {
      const target = rowText(cur)[col.k].padEnd(col.n).slice(0, col.n);
      const before = prv ? rowText(prv)[col.k].padEnd(col.n).slice(0, col.n) : ' '.repeat(col.n);
      for (let k = 0; k < col.n; k++, ci++) {
        const settle = p0 + 0.15 + ci * 0.018 + r * 0.07;
        let ch, flipping = false;
        if (t < cs) ch = before[k];
        else if (t >= settle) ch = target[k];
        else { ch = FLAP[Math.floor(hash(r * 97 + ci * 13 + Math.floor(t * 30)) * FLAP.length)]; flipping = true; }
        const cx = x + k * (CW + CG);
        ctx.fillStyle = '#0E1A44'; rr(ctx, cx, y, CW, CH, 6); ctx.fill();
        ctx.font = `800 46px ${F.disp}`; ctx.textAlign = 'center';
        ctx.fillStyle = col.k === 'number' ? C.amber : col.k === 'status' ? (arrPhase ? C.skyL : C.green) : C.paper;
        ctx.fillText(ch, cx + CW / 2, y + CH / 2 + 17);
        ctx.textAlign = 'left';
        if (flipping) { // daun atas sedang jatuh
          const f = (t * 30) % 1;
          ctx.fillStyle = 'rgba(6,18,58,0.75)'; ctx.fillRect(cx, y, CW, (CH / 2) * (1 - f));
        }
        ctx.fillStyle = C.deep; ctx.fillRect(cx, y + CH / 2 - 1, CW, 2);
      }
      x += col.n * (CW + CG) + COLGAP;
    });
  }
  ctx.font = `500 16px ${F.mono}`; ctx.letterSpacing = '3px'; ctx.fillStyle = C.skyL; ctx.globalAlpha = 0.55;
  ctx.fillText(`DATA PORTAL APTPAIRPORT.ID  ·  ${tanggal(DEP[0].date).toUpperCase()}  ·  WAKTU DALAM WITA`, bx, by + 5 * ROWH + 26);
  ctx.globalAlpha = 1; ctx.letterSpacing = '0px';

  tileWipe(ctx, t, 6.55, C.paper);
  if (t > 6.99) bg(ctx, C.paper);
}

// ======================================================================
// 03 FASILITAS & WISATA — mosaik foto berbalik, runway membesar, kartu wisata
// ======================================================================
const MC = 6, MR = 3, MW = 290, MH = 236, MG = 20;
const slotRect = (s) => {
  const c = s % MC, r = Math.floor(s / MC);
  const x0 = (W - (MC * MW + (MC - 1) * MG)) / 2, y0 = 250;
  return [x0 + c * (MW + MG), y0 + r * (MH + MG), MW, MH];
};
const HERO_SLOT = 8;
function sFasilitas(ctx, t) {
  bg(ctx, C.paper);
  const n = FAC.length;
  const runwayIdx = Math.max(0, FAC.findIndex((f) => f.name === 'Runway'));
  // Wajah kartu berganti tiap balik; slot tengah dipastikan berakhir di Runway.
  const face = (s, k) => (((runwayIdx - 2 * 18 + (s - HERO_SLOT)) % n + n) % n + 18 * k) % n;
  const hero = E.outExpo(prog(t, 8.5, 8.92));

  ctx.globalAlpha = 1 - hero;
  ctx.font = `italic 600 96px ${F.serif}`; ctx.fillStyle = C.ink; ctx.fillText('Fasilitas', 105, 190);
  const fw = ctx.measureText('Fasilitas ').width;
  ctx.font = `900 96px ${F.disp}`; ctx.fillStyle = C.blue;
  ctx.fillText(String(Math.round(D.facilities.length * E.outExpo(prog(t, 7.1, 8.0)))), 105 + fw, 190);
  ctx.font = `500 18px ${F.mono}`; ctx.letterSpacing = '3px'; ctx.fillStyle = C.slate; ctx.textAlign = 'right';
  ctx.fillText('SISI UDARA  ·  SISI DARAT  ·  UMUM', W - 105, 180); ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;

  for (let s = 0; s < MC * MR; s++) {
    if (s === HERO_SLOT && hero > 0) continue;
    const [x, y, w, h] = slotRect(s);
    const d0 = Math.hypot((s % MC) - 2.5, Math.floor(s / MC) - 1);
    const sc = E.outBack(prog(t, 7.0 + d0 * 0.05, 7.32 + d0 * 0.05), 2) * (1 - hero * 0.25);
    if (sc <= 0) continue;
    let k = 0, sx = 1;
    [7.5, 8.0].forEach((bt, j) => {
      const p = prog(t, bt + d0 * 0.04, bt + d0 * 0.04 + 0.26);
      if (p >= 0.5) k = j + 1;
      if (p > 0 && p < 1) sx = Math.abs(Math.cos(Math.PI * p));
    });
    ctx.save(); ctx.globalAlpha = 1 - hero;
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc * Math.max(0.02, sx), sc); ctx.translate(-w / 2, -h / 2);
    const f = FAC[face(s, k)];
    ctx.save(); rr(ctx, 0, 0, w, h, 18); ctx.clip();
    cover(ctx, IMG[f.image], 0, 0, w, h);
    const g = ctx.createLinearGradient(0, h * 0.45, 0, h); g.addColorStop(0, 'rgba(6,18,58,0)'); g.addColorStop(1, 'rgba(6,18,58,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.font = `700 22px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.fillText(clip(f.name, 22), 16, h - 20);
    ctx.restore(); ctx.restore();
  }

  // Runway membesar memenuhi layar.
  if (hero > 0) {
    const [x, y, w, h] = slotRect(HERO_SLOT);
    const rx = lerp(x, 0, hero), ry = lerp(y, 0, hero), rw = lerp(w, W, hero), rh = lerp(h, H, hero);
    const f = FAC[runwayIdx];
    ctx.save(); rr(ctx, rx, ry, rw, rh, lerp(18, 0, hero)); ctx.clip();
    cover(ctx, IMG[f.image], rx, ry, rw, rh, 1 + 0.12 * prog(t, 8.5, 10));
    const g = ctx.createLinearGradient(0, H * 0.35, 0, H); g.addColorStop(0, 'rgba(6,18,58,0)'); g.addColorStop(1, 'rgba(6,18,58,0.92)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const tx = prog(t, 8.7, 9.0);
    const ukuran = (f.details.find((d) => d.startsWith('Ukuran')) || '').replace('Ukuran:', '').trim();
    const [panjang, lebar] = ukuran.split('x').map((s) => s.trim());
    const pjg = parseFloat(panjang.replace('.', '')) || 0;
    const wis = E.outExpo(prog(t, 9.25, 9.6));
    ctx.save(); ctx.globalAlpha = tx * (1 - wis);
    ctx.font = `italic 600 170px ${F.serif}`; ctx.fillStyle = C.paper;
    ctx.fillText(f.name, 110, H - 300 + (1 - E.outExpo(tx)) * 60);
    ctx.font = `900 120px ${F.disp}`; ctx.letterSpacing = '-3px'; ctx.fillStyle = C.amber;
    ctx.fillText(`${ribuan(pjg * E.outExpo(prog(t, 8.7, 9.3)))} m × ${lebar}`, 110, H - 160);
    ctx.letterSpacing = '3px'; ctx.font = `500 20px ${F.mono}`; ctx.fillStyle = C.skyL;
    ctx.fillText(`${f.category.toUpperCase()}  ·  ${(f.details[1] || '').trim().toUpperCase()}`, 114, H - 105);
    ctx.restore();

    // Kartu wisata meluncur masuk.
    if (wis > 0) {
      ctx.fillStyle = `rgba(6,18,58,${0.55 * wis})`; ctx.fillRect(0, 0, W, H);
      ctx.font = `italic 600 92px ${F.serif}`; ctx.fillStyle = C.paper; ctx.globalAlpha = wis;
      ctx.fillText('Jelajahi wisata', 110, 230); ctx.globalAlpha = 1;
      WIS.forEach((wi, j) => {
        const e = spring(t - 9.3 - j * 0.07, 1.8, 0.5);
        const cw = 520, ch = 560, cx = 110 + j * (cw + 40) + (1 - e) * 1400, cy = 300;
        ctx.save(); ctx.translate(cx + cw / 2, cy + ch / 2); ctx.rotate((1 - e) * 0.1); ctx.translate(-cx - cw / 2, -cy - ch / 2);
        ctx.fillStyle = C.card; rr(ctx, cx, cy, cw, ch, 26); ctx.fill();
        ctx.save(); rr(ctx, cx + 14, cy + 14, cw - 28, ch - 150, 18); ctx.clip(); cover(ctx, IMG[wi.image], cx + 14, cy + 14, cw - 28, ch - 150, 1.05); ctx.restore();
        ctx.font = `700 34px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText(clip(wi.name, 26), cx + 28, cy + ch - 76);
        ctx.font = `700 15px ${F.mono}`; ctx.letterSpacing = '2px';
        const cat = wi.category.toUpperCase(), pw = ctx.measureText(cat).width + 28;
        ctx.fillStyle = C.amber; rr(ctx, cx + 28, cy + ch - 56, pw, 34, 17); ctx.fill();
        ctx.fillStyle = C.ink; ctx.fillText(cat, cx + 42, cy + ch - 33); ctx.letterSpacing = '0px';
        ctx.restore();
      });
    }
  }

  // Keluar: tirai navy turun berlajur.
  ctx.fillStyle = C.navy;
  for (let k = 0; k < 8; k++) ctx.fillRect(k * W / 8 - 1, -60, W / 8 + 2, (H + 120) * E.inOutExpo(prog(t, 9.72 + k * 0.025, 9.98 + k * 0.0025)));
}

// ======================================================================
// 04 BERITA & PPID — korsel berita asli, lalu tiga golongan informasi
// ======================================================================
function sInfo(ctx, t) {
  bg(ctx, C.navy);
  // Marquee kontur.
  ctx.save(); ctx.font = `900 260px ${F.disp}`; ctx.strokeStyle = 'rgba(125,211,252,0.16)'; ctx.lineWidth = 2;
  const mq = 'BERITA TERKINI  ·  BERITA TERKINI  ·  BERITA TERKINI  ·  ';
  ctx.strokeText(mq, -((t - 10) * 420) % (ctx.measureText('BERITA TERKINI  ·  ').width), 330);
  ctx.restore();

  const pos = spring(t - 10.5, 2.2, 0.55) + spring(t - 11.0, 2.2, 0.55);
  NEWS.forEach((nw, j) => {
    const e = spring(t - 10.0 - j * 0.06, 1.8, 0.5);
    const off = j - pos;
    const cw = 760, ch = 600, sc = lerp(1, 0.82, clamp(Math.abs(off)));
    const cx = W / 2 + off * 840 + (1 - e) * 1500 - cw / 2, cy = 300;
    if (cx > W + 100 || cx + cw < -100) return;
    ctx.save(); ctx.translate(cx + cw / 2, cy + ch / 2); ctx.scale(sc, sc); ctx.translate(-cw / 2, -ch / 2);
    ctx.globalAlpha = lerp(1, 0.55, clamp(Math.abs(off)));
    ctx.fillStyle = C.card; rr(ctx, 0, 0, cw, ch, 28); ctx.fill();
    ctx.save(); rr(ctx, 14, 14, cw - 28, 320, 20); ctx.clip(); cover(ctx, IMG[nw.image], 14, 14, cw - 28, 320, 1.05); ctx.restore();
    ctx.font = `700 15px ${F.mono}`; ctx.letterSpacing = '2px';
    const cat = nw.category.toUpperCase(), pw = ctx.measureText(cat).width + 28;
    ctx.fillStyle = C.amber; rr(ctx, 34, 360, pw, 34, 17); ctx.fill();
    ctx.fillStyle = C.ink; ctx.fillText(cat, 48, 383);
    ctx.fillStyle = C.slate; ctx.fillText(tanggal(nw.date).toUpperCase(), 34 + pw + 18, 383);
    ctx.letterSpacing = '0px';
    ctx.font = `700 34px ${F.disp}`; ctx.fillStyle = C.ink;
    wrap(ctx, nw.title, cw - 70, 4).forEach((l, k) => ctx.fillText(l, 34, 448 + k * 42));
    ctx.restore();
  });
  ctx.font = `italic 600 92px ${F.serif}`; ctx.fillStyle = C.paper; ctx.fillText('Kabar', 110, 200);
  const kw = ctx.measureText('Kabar ').width;
  ctx.font = `800 92px ${F.disp}`; ctx.fillStyle = C.skyL; ctx.fillText('bandara', 110 + kw, 200);

  // PPID — panel biru naik menutup.
  const up = E.inOutExpo(prog(t, 11.36, 11.56));
  if (up > 0) {
    const y = lerp(H + 60, -60, up);
    ctx.fillStyle = C.blue; ctx.fillRect(-60, y, W + 120, H + 200);
    ctx.save(); ctx.translate(0, y + 60);
    ctx.font = `900 120px ${F.disp}`; ctx.fillStyle = C.paper; ctx.fillText('PPID', 110, 220);
    const pw = ctx.measureText('PPID ').width;
    ctx.font = `italic 500 76px ${F.serif}`; ctx.fillStyle = C.gold; ctx.fillText('keterbukaan informasi publik', 110 + pw + 10, 214);
    const G = [
      ['Informasi Berkala', D.ppid.berkala], ['Informasi Serta Merta', D.ppid.sertaMerta], ['Informasi Setiap Saat', D.ppid.setiapSaat],
    ];
    G.forEach(([lab, g], j) => {
      const s = 11.55 + j * 0.08, e = spring(t - s, 1.9, 0.5);
      const cw = 540, ch = 520, cx = 110 + j * (cw + 45), cy = 290 + (1 - e) * 700;
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, cx, cy, cw, ch, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `900 210px ${F.disp}`; ctx.letterSpacing = '-8px'; ctx.fillStyle = j === 1 ? C.amber : C.paper;
      ctx.fillText(String(Math.round(g.count * E.outExpo(prog(t, s + 0.05, s + 0.8)))), cx + 36, cy + 210);
      ctx.letterSpacing = '0px'; ctx.font = `700 34px ${F.disp}`; ctx.fillStyle = C.paper; ctx.fillText(lab, cx + 40, cy + 280);
      ctx.font = `500 19px ${F.mono}`; ctx.fillStyle = C.skyL;
      g.sample.slice(0, 3).forEach((sm, k) => {
        const a = prog(t, s + 0.3 + k * 0.08, s + 0.45 + k * 0.08);
        ctx.globalAlpha = a; ctx.fillText('▸ ' + clip(sm, 34), cx + 40, cy + 350 + k * 44); ctx.globalAlpha = 1;
      });
    });
    const ca = E.outBack(prog(t, 12.2, 12.5), 2);
    if (ca > 0) {
      ctx.save(); ctx.translate(110 + 340, 880); ctx.scale(ca, ca);
      ctx.fillStyle = C.amber; rr(ctx, -340, -40, 680, 80, 40); ctx.fill();
      ctx.font = `700 30px ${F.disp}`; ctx.fillStyle = C.deep; ctx.textAlign = 'center'; ctx.fillText('Ajukan permohonan informasi  →', 0, 11); ctx.textAlign = 'left';
      ctx.restore();
    }
    ctx.restore();
  }
  tileWipe(ctx, t, 12.55, C.paper);
  if (t > 12.99) bg(ctx, C.paper);
}

// ======================================================================
// 05 LAYANAN — aplikasi di ponsel: Pusat Bantuan → lapor kehilangan → terkirim
// ======================================================================
const LAYANAN = ['PAS', 'TIM', 'Pusat Bantuan', 'Lapor Kehilangan Barang', 'Beauty Contest', 'Extend Advance', 'Field Trip', 'Pengiklanan', 'Perijinan Usaha', 'Sertifikat OJT', 'Sewa', 'Slot Charter', 'Tenant'];
const TILES = [['Jadwal', C.blue], ['Fasilitas', C.sky], ['Berita', C.navy], ['Wisata', C.green], ['PPID', C.amber], ['Layanan', '#8B5CF6']];
const BAR = ['Beranda', 'Berita', 'Bantuan', 'Layanan', 'Akun'];
function sLayanan(ctx, t) {
  bg(ctx, C.paper);
  ctx.fillStyle = 'rgba(15,23,42,.08)';
  for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) ctx.fillRect(x, y, 2, 2);
  const ex = (k) => E.inExpo(prog(t, 15.66 + k * 0.04, 15.98)) * 1500;

  // Teks kiri.
  ctx.save(); ctx.translate(0, -ex(0));
  ctx.beginPath(); ctx.rect(100, 120, 1000, 340); ctx.clip();
  ctx.font = `900 118px ${F.disp}`; ctx.letterSpacing = '-4px'; ctx.fillStyle = C.ink;
  ctx.fillText('Satu aplikasi,', 110, 260 + (1 - E.outExpo(prog(t, 13.05, 13.45))) * 160);
  ctx.letterSpacing = '0px'; ctx.font = `italic 600 130px ${F.serif}`; ctx.fillStyle = C.blue;
  ctx.fillText('di saku Anda.', 110, 410 + (1 - E.outExpo(prog(t, 13.15, 13.55))) * 200);
  ctx.restore();
  ctx.save(); ctx.translate(0, -ex(1));
  ctx.font = `500 20px ${F.mono}`; ctx.letterSpacing = '4px'; ctx.fillStyle = C.slate; ctx.globalAlpha = prog(t, 13.4, 13.6);
  ctx.fillText('PONSEL & TABLET  ·  PASANG KE LAYAR UTAMA', 114, 500); ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
  // Keping layanan muncul tiap seperenambelas.
  let cx = 110, cy = 580;
  ctx.font = `600 28px ${F.disp}`;
  LAYANAN.forEach((nm, i) => {
    const w = ctx.measureText(nm).width + 48;
    if (cx + w > 1060) { cx = 110; cy += 74; }
    const p = E.outBack(prog(t, 13.5 + i * 0.0625, 13.8 + i * 0.0625), 2.5);
    const hot = nm === 'Pusat Bantuan' && t > 14.45;
    if (p > 0) {
      ctx.save(); ctx.translate(cx + w / 2, cy + 28); ctx.scale(p, p);
      ctx.fillStyle = hot ? C.amber : C.card; rr(ctx, -w / 2, -28, w, 56, 28); ctx.fill();
      ctx.strokeStyle = hot ? C.amber : 'rgba(15,23,42,.14)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText(nm, 0, 10); ctx.textAlign = 'left';
      ctx.restore();
    }
    cx += w + 14;
  });
  ctx.restore();

  // Ponsel.
  const pe = spring(t - 13.1, 1.6, 0.45);
  const PW = 430, PH = 880, px = 1290, py = 100 + (1 - pe) * 900 - ex(2);
  ctx.save(); ctx.translate(px + PW / 2, py + PH / 2); ctx.rotate((1 - pe) * 0.15 + lerp(0, -0.12, E.inExpo(prog(t, 15.66, 15.98)))); ctx.translate(-px - PW / 2, -py - PH / 2);
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
  ctx.font = `500 15px ${F.mono}`; ctx.letterSpacing = '2px'; ctx.fillStyle = C.skyL; ctx.fillText('SAMARINDA  ·  AAP', sx + 32, sy + 146); ctx.letterSpacing = '0px';
  // Kartu penerbangan berikut (data asli).
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(ctx, sx + 24, sy + 170, SW - 48, 74, 18); ctx.fill();
  ctx.font = `800 24px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.fillText(`${DEP[0].number}  →  ${DEP[0].code}`, sx + 44, sy + 214);
  ctx.font = `600 18px ${F.disp}`; ctx.fillStyle = C.green; ctx.textAlign = 'right'; ctx.fillText(DEP[0].status, sx + SW - 44, sy + 213); ctx.textAlign = 'left';
  TILES.forEach(([nm, col], i) => {
    const c = i % 3, r = Math.floor(i / 3), tw = (SW - 48 - 24) / 3;
    const p = E.outBack(prog(t, 13.4 + i * 0.05, 13.7 + i * 0.05), 2);
    const x = sx + 24 + c * (tw + 12), y = sy + 280 + r * 150;
    ctx.save(); ctx.translate(x + tw / 2, y + 60); ctx.scale(p, p); ctx.translate(-tw / 2, -60);
    ctx.fillStyle = C.card; rr(ctx, 0, 0, tw, 130, 20); ctx.fill();
    ctx.fillStyle = col; rr(ctx, tw / 2 - 28, 18, 56, 56, 16); ctx.fill();
    ctx.font = `900 28px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(nm[0], tw / 2, 57);
    ctx.font = `600 17px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText(nm, tw / 2, 106); ctx.textAlign = 'left';
    ctx.restore();
  });
  // Bilah bawah lima slot, Bantuan menonjol di tengah.
  const barY = sy + SH - 100;
  ctx.fillStyle = C.card; ctx.fillRect(sx, barY, SW, 100);
  BAR.forEach((nm, i) => {
    const x = sx + (SW / 5) * (i + 0.5);
    ctx.font = `600 14px ${F.disp}`; ctx.textAlign = 'center'; ctx.fillStyle = i === 2 ? C.ink : C.slate;
    if (i === 2) {
      const press = t > 14.45 && t < 14.6 ? 0.9 : 1;
      ctx.save(); ctx.translate(x, barY + 4); ctx.scale(press, press);
      ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.deep; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = C.ink; ctx.fillText(nm, x, barY + 72);
    } else { ctx.fillStyle = 'rgba(100,116,139,.35)'; rr(ctx, x - 14, barY + 22, 28, 28, 8); ctx.fill(); ctx.fillStyle = C.slate; ctx.fillText(nm, x, barY + 72); }
    ctx.textAlign = 'left';
  });
  // Lembar Lapor Kehilangan — hanya kerangka, tanpa isian identitas.
  const sh = E.outExpo(prog(t, 14.55, 14.9));
  if (sh > 0) {
    ctx.fillStyle = `rgba(6,18,58,${0.45 * sh})`; ctx.fillRect(sx, sy, SW, SH);
    const shY = lerp(sy + SH, sy + 220, sh);
    ctx.fillStyle = C.card; rr(ctx, sx, shY, SW, SH, 36); ctx.fill();
    ctx.fillStyle = 'rgba(15,23,42,.2)'; rr(ctx, sx + SW / 2 - 40, shY + 14, 80, 8, 4); ctx.fill();
    ctx.font = `800 30px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText('Lapor Kehilangan', sx + 32, shY + 76);
    ctx.fillText('Barang', sx + 32, shY + 114);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = 'rgba(15,23,42,.08)'; rr(ctx, sx + 32, shY + 150 + k * 78, SW - 64, 56, 14); ctx.fill();
      ctx.fillStyle = 'rgba(15,23,42,.14)'; rr(ctx, sx + 52, shY + 172 + k * 78, (SW - 140) * [0.5, 0.7, 0.35][k], 12, 6); ctx.fill();
    }
    ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(15,23,42,.3)'; ctx.lineWidth = 2; rr(ctx, sx + 32, shY + 392, SW - 64, 90, 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `600 18px ${F.disp}`; ctx.fillStyle = C.slate; ctx.textAlign = 'center'; ctx.fillText('+ Tambah foto', sx + SW / 2, shY + 444);
    const bp = t > 15.1 && t < 15.25 ? 0.93 : 1;
    ctx.save(); ctx.translate(sx + SW / 2, shY + 540); ctx.scale(bp, bp);
    ctx.fillStyle = C.blue; rr(ctx, -(SW - 64) / 2, -32, SW - 64, 64, 32); ctx.fill();
    ctx.font = `700 22px ${F.disp}`; ctx.fillStyle = '#fff'; ctx.fillText('Kirim laporan', 0, 8);
    ctx.restore(); ctx.textAlign = 'left';
  }
  // Terkirim.
  const ok = prog(t, 15.2, 15.5);
  if (ok > 0) {
    ctx.fillStyle = `rgba(255,255,255,${E.outExpo(ok)})`; ctx.fillRect(sx, sy, SW, SH);
    const ccx = sx + SW / 2, ccy = sy + SH / 2 - 60;
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(ccx, ccy, 80 * E.outBack(ok, 2.5), 0, TAU); ctx.fill();
    const ck = E.outCubic(prog(t, 15.3, 15.5));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ccx - 34, ccy + 2);
    if (ck < 0.4) ctx.lineTo(ccx - 34 + 22 * (ck / 0.4), ccy + 2 + 24 * (ck / 0.4));
    else { ctx.lineTo(ccx - 12, ccy + 26); ctx.lineTo(ccx - 12 + 50 * ((ck - 0.4) / 0.6), ccy + 26 - 56 * ((ck - 0.4) / 0.6)); }
    ctx.stroke(); ctx.lineCap = 'butt';
    ctx.globalAlpha = prog(t, 15.35, 15.5); ctx.textAlign = 'center';
    ctx.font = `800 32px ${F.disp}`; ctx.fillStyle = C.ink; ctx.fillText('Laporan terkirim', ccx, ccy + 140);
    ctx.font = `500 19px ${F.disp}`; ctx.fillStyle = C.slate; ctx.fillText('Pantau statusnya lewat nomor tiket', ccx, ccy + 176);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Jari mengetuk.
  const tapAt = (tt) => Math.exp(-Math.pow((t - tt) / 0.06, 2));
  const fx = t < 14.8 ? px + PW / 2 : px + PW / 2 + 40, fy = t < 14.8 ? py + 16 + SH - 96 : py + 16 + 220 + 540;
  const fa = prog(t, 14.2, 14.35) * (1 - prog(t, 15.3, 15.45));
  if (fa > 0) {
    const tp = Math.max(tapAt(14.5), tapAt(15.15));
    ctx.fillStyle = `rgba(15,23,42,${0.25 * fa})`; ctx.beginPath(); ctx.arc(fx, fy, 34 - 8 * tp, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(15,23,42,${0.5 * fa * tp})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx, fy, 34 + 40 * (1 - tp), 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// ======================================================================
// 06 SEMUA DI SATU TEMPAT — delapan potongan per seperdelapan ketuk
// ======================================================================
const CUTS = [
  { t: 5.0, w: 'JADWAL' }, { t: 7.85, w: 'FASILITAS' }, { img: 2, w: 'WISATA' }, { t: 10.65, w: 'BERITA' },
  { t: 12.3, w: 'PPID' }, { t: 13.95, w: 'LAYANAN' }, { t: 15.4, w: 'BANTUAN' }, { t: 3.3, w: 'SEMUANYA' },
];
let mBuf, chan;
function sMontage(ctx, t) {
  if (!mBuf) { mBuf = mk(); chan = [mk(), mk(), mk()]; }
  const c = clamp(Math.floor((t - 16) / 0.25), 0, 7), u = t - 16 - c * 0.25;
  const cut = CUTS[c];
  const [bc, bx] = mBuf;
  bx.save();
  if (cut.img !== undefined) { cover(bx, IMG[WIS[cut.img]?.image], 0, 0, W, H, 1.05 + u * 0.3); bx.fillStyle = 'rgba(6,18,58,.35)'; bx.fillRect(0, 0, W, H); }
  else renderScene(bx, cut.t + u * 0.5);
  bx.restore();

  const split = 24 * (1 - E.outExpo(clamp(u / 0.2))) + 3;
  ['#ff0000', '#00ff00', '#0000ff'].forEach((col, i) => {
    const x = chan[i][1];
    x.globalCompositeOperation = 'source-over'; x.drawImage(bc, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, W, H);
  });
  bg(ctx, '#000');
  ctx.save();
  const z = lerp(1.14, 1, E.outExpo(clamp(u / 0.25)));
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(chan[0][0], split, 0); ctx.drawImage(chan[1][0], 0, 0); ctx.drawImage(chan[2][0], -split, 0);
  ctx.globalCompositeOperation = 'source-over';
  if (u < 0.07) {
    const r = rng(c * 31 + 7);
    for (let s = 0; s < 9; s++) { const y = r() * H, h = 10 + r() * 90, dx = (r() - 0.5) * 220; ctx.drawImage(bc, 0, y, W, h, dx, y, W, h); }
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff';
  ctx.font = `900 100px ${F.disp}`;
  const size = Math.min(270, (1500 / ctx.measureText(cut.w).width) * 100);
  ctx.font = `900 ${size}px ${F.disp}`;
  ctx.letterSpacing = `${lerp(60, -6, E.outExpo(clamp(u / 0.25)))}px`;
  ctx.textAlign = 'center'; ctx.fillText(cut.w, W / 2, H / 2 + size * 0.36);
  ctx.restore();
  ctx.font = `500 20px ${F.mono}`; ctx.letterSpacing = '4px'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(`APTPAIRPORT.ID  ·  ${c + 1} / 8`, W / 2, H / 2 + 200); ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  if (u < 1 / 60) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 0, W, H); }
  if (t > 17.8) { const f = Math.floor((t - 17.8) * 30) % 2; if (f) bg(ctx, C.sky); }
}

// ======================================================================
// 07 APTPAIRPORT.ID — partikel menyusun alamat situs, logo bandara
// ======================================================================
const NP = 2200;
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
function pPos(p, t) {
  const b = E.outExpo(prog(t, 18.0, 18.45));
  const sp = (t - 18) * 0.6;
  let x = W / 2 + Math.cos(p.ang + sp * (p.b - 0.5)) * p.rad * b, y = H / 2 + Math.sin(p.ang + sp * (p.b - 0.5)) * p.rad * b * 0.6;
  const d = 0.25 * (p.tx / W) + 0.08 * p.a;
  const c = E.inOutCubic(prog(t, 18.35 + d, 18.85 + d));
  if (c > 0) { const bend = Math.sin(c * Math.PI) * 140 * (p.b - 0.5); x = lerp(x, p.tx, c) + bend; y = lerp(y, p.ty, c) - bend * 0.5; }
  if (c >= 1) { x += Math.sin(t * 7 + p.b * 40) * 0.6; y += Math.cos(t * 6 + p.a * 40) * 0.6; }
  return [x, y];
}
const PCOL = [C.paper, C.skyL, C.amber];
function sOutro(ctx, t) {
  const g = ctx.createRadialGradient(W / 2, H * 0.55, 100, W / 2, H * 0.55, W * 0.7);
  g.addColorStop(0, C.navy); g.addColorStop(1, C.deep);
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);

  // Pesawat & jejaknya melintas di belakang.
  const pf = prog(t, 18.7, 19.9);
  if (pf > 0) {
    const pt = (u) => [lerp(-200, W + 200, u), H * 0.92 - u * 760];
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
    const [x, y] = pPos(p, t), [x0, y0] = pPos(p, t - 1 / 90);
    const key = `${p.col}_${p.sz}`;
    (paths[key] ||= new Path2D()); paths[key].moveTo(x0, y0); paths[key].lineTo(x + 0.01, y);
  }
  for (const key in paths) {
    const [ci, sz] = key.split('_').map(Number);
    px.strokeStyle = PCOL[ci]; px.lineWidth = [2.6, 4][sz]; px.stroke(paths[key]);
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(12px)'; ctx.globalAlpha = 0.8; ctx.drawImage(pc, 0, 0);
  ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.drawImage(pc, 0, 0);
  ctx.restore();
  // Setelah partikel mendarat, teks tajam mengambil alih agar alamat terbaca jelas.
  const solid = prog(t, 19.2, 19.45);
  if (solid > 0) {
    ctx.globalAlpha = solid; ctx.fillStyle = C.paper; ctx.font = `800 190px ${F.disp}`; ctx.letterSpacing = '-4px'; ctx.textAlign = 'center';
    ctx.fillText('aptpairport.id', W / 2, H / 2 + 80); ctx.textAlign = 'left'; ctx.letterSpacing = '0px'; ctx.globalAlpha = 1;
  }

  // Logo bandara.
  if (LOGO) {
    const la = E.outExpo(prog(t, 18.95, 19.4));
    const lw = 400, lh = (lw * LOGO.height) / LOGO.width;
    ctx.globalAlpha = la; ctx.drawImage(LOGO, W / 2 - lw / 2, H / 2 - 150 - lh + (1 - la) * 40, lw, lh); ctx.globalAlpha = 1;
  }
  const li = E.outExpo(prog(t, 19.0, 19.6));
  ctx.fillStyle = C.gold; ctx.fillRect(W / 2 - 420 * li, H / 2 + 130, 840 * li, 2);
  ctx.font = `500 24px ${F.mono}`; ctx.letterSpacing = `${lerp(26, 8, E.outExpo(prog(t, 19.05, 19.7)))}px`;
  ctx.globalAlpha = prog(t, 19.05, 19.3); ctx.fillStyle = C.paper; ctx.textAlign = 'center';
  ctx.fillText('BANDAR UDARA A.P.T. PRANOTO  ·  SAMARINDA', W / 2, H / 2 + 190);
  ctx.globalAlpha = 0.6 * prog(t, 19.25, 19.5); ctx.letterSpacing = '4px'; ctx.font = `500 18px ${F.mono}`; ctx.fillStyle = C.skyL;
  ctx.fillText('JADWAL  ·  FASILITAS  ·  WISATA  ·  BERITA  ·  PPID  ·  LAYANAN', W / 2, H / 2 + 236);
  ctx.globalAlpha = 1; ctx.letterSpacing = '0px'; ctx.textAlign = 'left';

  const flash = 1 - E.outCubic(prog(t, 18.0, 18.35));
  if (flash > 0) { ctx.fillStyle = `rgba(243,246,251,${flash})`; ctx.fillRect(0, 0, W, H); }
  const out = prog(t, 19.8, 20.0);
  if (out > 0) { ctx.fillStyle = `rgba(6,18,58,${out})`; ctx.fillRect(0, 0, W, H); }
}

// ======================================================================
// komposisi
// ======================================================================
const SCENES = [
  { a: 0, f: sIntro, label: '00 / PEMBUKA' },
  { a: 2, f: sType, label: '01 / PORTAL' },
  { a: 4, f: sJadwal, label: '02 / JADWAL PENERBANGAN' },
  { a: 7, f: sFasilitas, label: '03 / FASILITAS & WISATA' },
  { a: 10, f: sInfo, label: '04 / BERITA & PPID' },
  { a: 13, f: sLayanan, label: '05 / LAYANAN' },
  { a: 16, f: sMontage, label: '06 / SEMUA DI SATU TEMPAT' },
  { a: 18, f: sOutro, label: '07 / APTPAIRPORT.ID' },
];
const sceneAt = (t) => SCENES.findLast((s) => t >= s.a) || SCENES[0];
function renderScene(ctx, t) { sceneAt(t).f(ctx, t); }

const IMPACTS = [2, 4, 7, 10, 13, 16, 18];
function hud(ctx, t) {
  const a = prog(t, 0.6, 1.0) * (1 - prog(t, 17.95, 18.1));
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
  for (let b = 0; b <= 40; b++) { const tall = IMPACTS.includes(b / 2) ? 10 : 4; ctx.fillRect(x0 + ((x1 - x0) * b) / 40, y - tall, 1, tall); }
  ctx.globalAlpha = a * 0.9; ctx.fillRect(x0, y - 1, ((x1 - x0) * t) / DUR, 3);
  for (const [cx, cy, sx, sy] of [[28, 28, 1, 1], [W - 28, 28, -1, 1], [28, H - 28, 1, -1], [W - 28, H - 28, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(cx, cy + sy * 18); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 18, cy); ctx.stroke();
  }
  ctx.restore();
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
  for (const ti of IMPACTS) if (t >= ti) amp += 12 * Math.exp(-(t - ti) * 13);
  ctx.save();
  ctx.translate(amp * Math.sin(t * 97), amp * Math.cos(t * 83));
  renderScene(ctx, t);
  ctx.restore();
  hud(ctx, t);
  post(ctx, t);
}
