/**
 * Musik reel, disintesis luring dengan OfflineAudioContext — bebas lisensi.
 * Jam sama dengan reel.js: 120 BPM, 1 ketuk = 0,5 dtk. F mayor, I–V–vi–IV
 * (F–C–Dm–Bb), satu akor per birama. Hentakan jatuh di setiap pergantian
 * adegan, ada jeda hening sesaat sebelum "drop" di detik 18.
 */
const B = 0.5;
const CHORDS = [[65, 69, 72, 77], [64, 67, 72, 76], [62, 65, 69, 74], [62, 65, 70, 74]];
const ROOTS = [41, 36, 38, 34];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const bar = (t) => Math.floor(t / 2) % 4;

export async function makeMusic(dur) {
  const SR = 48000;
  const ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  let seed = 1234;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const master = ac.createGain(); master.gain.value = 0.7;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12; comp.knee.value = 6;
  master.connect(comp).connect(ac.destination);

  // Reverb (IR dibangkitkan) dan delay seperdelapan bertitik.
  const ir = ac.createBuffer(2, SR * 3, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 3.5); }
  const rev = ac.createConvolver(); rev.buffer = ir;
  const revOut = ac.createGain(); revOut.gain.value = 0.32; rev.connect(revOut).connect(master);
  const dl = ac.createDelay(1); dl.delayTime.value = 0.375;
  const fb = ac.createGain(); fb.gain.value = 0.36;
  const dlf = ac.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2800;
  const dlOut = ac.createGain(); dlOut.gain.value = 0.28;
  const pan = ac.createStereoPanner(); pan.pan.value = 0.5;
  dl.connect(dlf).connect(fb).connect(dl); dlf.connect(pan).connect(dlOut).connect(master);

  // Bus musik (pad, bass, arp) yang ditekan setiap kick.
  const bus = ac.createGain(); bus.connect(master);
  const kicks = [];

  const noiseBuf = ac.createBuffer(1, SR * 2, SR);
  { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
  const noise = (t, len) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.start(t, rnd() * 0.5, len); return s; };
  const env = (g, t, a, peak, d, end = 0.0008) => {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d);
  };
  const filt = (type, f, q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const send = (node, amt, target) => { const g = ac.createGain(); g.gain.value = amt; node.connect(g).connect(target); };

  // ---- instrumen ----
  function kick(t, g = 1) {
    const o = ac.createOscillator(); o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    const v = ac.createGain(); env(v, t, 0.003, g, 0.42);
    o.connect(v).connect(master); o.start(t); o.stop(t + 0.5);
    const n = noise(t, 0.03), hp = filt('highpass', 2500), nv = ac.createGain(); env(nv, t, 0.001, 0.22 * g, 0.02);
    n.connect(hp).connect(nv).connect(master);
    kicks.push(t);
  }
  function clap(t, g = 0.5) {
    const n = noise(t, 0.3), bp = filt('bandpass', 1300, 0.9), v = ac.createGain();
    v.gain.setValueAtTime(0.0001, t);
    for (const k of [0, 0.011, 0.022]) { v.gain.setValueAtTime(g, t + k); v.gain.exponentialRampToValueAtTime(g * 0.2, t + k + 0.009); }
    v.gain.setValueAtTime(g, t + 0.033); v.gain.exponentialRampToValueAtTime(0.0008, t + 0.25);
    n.connect(bp).connect(v); v.connect(master); send(v, 0.5, rev);
  }
  function hat(t, g = 0.08, open = false) {
    const n = noise(t, open ? 0.25 : 0.06), hp = filt('highpass', 7800), v = ac.createGain(); env(v, t, 0.001, g, open ? 0.2 : 0.04);
    const p = ac.createStereoPanner(); p.pan.value = open ? -0.25 : 0.25;
    n.connect(hp).connect(v).connect(p).connect(master);
  }
  function bass(t, m, len = 0.22, g = 0.32) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
    const s = ac.createOscillator(); s.frequency.value = hz(m);
    const lp = filt('lowpass', 900, 4); lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(180, t + len);
    const v = ac.createGain(); env(v, t, 0.005, g, len);
    const sv = ac.createGain(); env(sv, t, 0.005, g * 1.2, len);
    o.connect(lp).connect(v).connect(bus); s.connect(sv).connect(bus);
    o.start(t); s.start(t); o.stop(t + len + 0.05); s.stop(t + len + 0.05);
  }
  function stab(t, notes, g = 0.09, len = 0.3) {
    const lp = filt('lowpass', 3000, 2); lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(500, t + len);
    const v = ac.createGain(); env(v, t, 0.004, g, len);
    lp.connect(v); v.connect(bus); send(v, 0.6, rev); send(v, 0.35, dl);
    for (const m of notes) for (const d of [-9, 9]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d;
      o.connect(lp); o.start(t); o.stop(t + len + 0.05);
    }
  }
  function pad(t0, t1, notes, g = 0.035, f0 = 600, f1 = 1800) {
    const lp = filt('lowpass', f0, 1); lp.frequency.setValueAtTime(f0, t0); lp.frequency.exponentialRampToValueAtTime(f1, t1);
    const v = ac.createGain();
    v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g, t0 + 0.35);
    v.gain.setValueAtTime(g, t1 - 0.05); v.gain.exponentialRampToValueAtTime(0.0005, t1 + 0.6);
    lp.connect(v); v.connect(bus); send(v, 0.8, rev);
    for (const m of notes) for (const d of [-12, 0, 12]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d;
      o.connect(lp); o.start(t0); o.stop(t1 + 0.7);
    }
  }
  function pluck(t, m, g = 0.07) {
    const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = hz(m);
    const lp = filt('lowpass', 3000, 3); lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(350, t + 0.16);
    const v = ac.createGain(); env(v, t, 0.002, g, 0.18);
    o.connect(lp).connect(v); v.connect(bus); send(v, 0.5, dl); send(v, 0.3, rev);
    o.start(t); o.stop(t + 0.25);
  }
  function bell(t, m, g = 0.06, len = 1.4) {
    const v = ac.createGain(); env(v, t, 0.003, g, len);
    v.connect(master); send(v, 0.9, rev); send(v, 0.4, dl);
    for (const [r, a] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
      const o = ac.createOscillator(); o.frequency.value = hz(m) * r;
      const og = ac.createGain(); og.gain.value = a; o.connect(og).connect(v); o.start(t); o.stop(t + len + 0.1);
    }
  }
  function sweep(t, len, f0, f1, g = 0.2, q = 1.5) {
    const n = noise(t, len), bp = filt('bandpass', f0, q); bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + len);
    const v = ac.createGain();
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + len * 0.85); v.gain.exponentialRampToValueAtTime(0.0005, t + len);
    n.connect(bp).connect(v); v.connect(master); send(v, 0.5, rev);
  }
  function riser(t0, t1, g = 0.2) {
    sweep(t0, t1 - t0, 300, 9000, g, 2);
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(1760, t1);
    const lp = filt('lowpass', 2000); const v = ac.createGain();
    v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g * 0.25, t1 - 0.02); v.gain.linearRampToValueAtTime(0, t1);
    o.connect(lp).connect(v).connect(master); o.start(t0); o.stop(t1);
  }
  function impact(t, g = 1) {
    kick(t, 1.1 * g);
    const s = ac.createOscillator(); s.frequency.setValueAtTime(70, t); s.frequency.exponentialRampToValueAtTime(32, t + 1.2);
    const sv = ac.createGain(); env(sv, t, 0.005, 0.7 * g, 1.3);
    s.connect(sv).connect(master); s.start(t); s.stop(t + 1.4);
    const n = noise(t, 1.8), lp = filt('lowpass', 7000); lp.frequency.setValueAtTime(8000, t); lp.frequency.exponentialRampToValueAtTime(900, t + 1.5);
    const nv = ac.createGain(); env(nv, t, 0.002, 0.28 * g, 1.6);
    n.connect(lp).connect(nv); nv.connect(master); send(nv, 0.7, rev);
  }
  function blip(t, f, g = 0.06, len = 0.06, type = 'square') {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + len);
    const v = ac.createGain(); env(v, t, 0.001, g, len);
    o.connect(v).connect(master); send(v, 0.3, dl); o.start(t); o.stop(t + len + 0.02);
  }
  function tick(t, g = 0.05) {
    const n = noise(t, 0.012), hp = filt('highpass', 4000), v = ac.createGain(); env(v, t, 0.0005, g, 0.01);
    const p = ac.createStereoPanner(); p.pan.value = rnd() * 1.4 - 0.7;
    n.connect(hp).connect(v).connect(p).connect(master);
  }

  // ---- aransemen ----
  // 0–2 pembuka: titik, landasan, ketikan, pesawat lepas landas, iris.
  pad(0, 2.0, CHORDS[0].map((m) => m - 12), 0.03, 250, 1600);
  blip(0.05, 1500, 0.12, 0.14, 'sine');
  sweep(0.42, 0.45, 500, 4000, 0.22);
  for (let i = 0; i < 41; i += 2) tick(0.8 + (i / 41) * 0.45, 0.06);
  hat(1.0, 0.14, true); kick(1.0, 0.35);
  sweep(0.9, 0.7, 200, 3000, 0.2, 0.8); // deru pesawat
  riser(1.0, 2.0, 0.22);
  sweep(1.55, 0.42, 300, 6000, 0.25);

  for (const t of [2, 4, 7, 10, 13]) impact(t, t === 2 ? 1 : 0.7);

  // 2–4 satu hentakan per kata.
  for (let k = 0; k < 4; k++) {
    const t = 2 + k * B;
    if (k) kick(t, 1);
    clap(t, 0.35); stab(t, CHORDS[k].map((m) => m + 12), 0.08, 0.32); bass(t, ROOTS[k], 0.4, 0.3);
    for (let j = 1; j < 4; j++) hat(t + j * 0.125, 0.05);
  }
  riser(3.4, 4.0, 0.25);
  for (let k = 0; k < 8; k++) clap(3.5 + k * 0.0625, 0.08 + k * 0.03);

  // 4–16 groove.
  for (let t = 4; t < 16 - 1e-6; t += B) {
    const bi = Math.round((t - 4) / B);
    if (![4, 7, 10, 13].includes(t)) kick(t, 0.95);
    if (bi % 2 === 1) clap(t, 0.32);
    hat(t + 0.25, 0.09, true);
    for (let j = 0; j < 4; j++) if (j !== 2) hat(t + j * 0.125, j % 2 ? 0.05 : 0.035);
    const r = ROOTS[bar(t)];
    bass(t, r, 0.2); bass(t + 0.25, r + 12, 0.18, 0.22);
  }
  for (let b = 2; b < 8; b++) pad(b * 2, b * 2 + 2, CHORDS[b % 4], 0.028, 500 + b * 120, 900 + b * 260);
  // Papan split-flap: derak daun yang berputar, dua kali (berangkat, datang).
  for (const p0 of [4.0, 5.5]) for (let i = 0; i < 60; i++) tick(p0 + 0.08 + i * 0.016 + rnd() * 0.01, 0.035 + 0.02 * rnd());
  blip(5.45, 1100, 0.06, 0.06, 'triangle');
  // 7–13 arpeggio seperenambelas.
  const ARP = [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2];
  for (let i = 0; i < 6 * 8; i++) {
    const t = 7 + i * 0.125, ch = CHORDS[bar(t)];
    pluck(t, ch[ARP[i % 16]] + 12, 0.045 + 0.02 * Math.min(1, i / 24));
  }
  // Fasilitas: kartu berbalik, runway membesar, kartu wisata.
  for (const bt of [7.5, 8.0]) for (let d = 0; d < 6; d++) tick(bt + d * 0.04, 0.06 * (1 - d / 8));
  sweep(8.35, 0.4, 400, 5000, 0.18);
  [77, 81, 84].forEach((m, k) => bell(8.75 + k * 0.08, m, 0.03, 0.8));
  [0, 1, 2].forEach((k) => blip(9.3 + k * 0.07, 800 + k * 200, 0.05, 0.08, 'sine'));
  sweep(9.7, 0.3, 800, 7000, 0.2);
  // Berita & PPID.
  for (const t of [10.5, 11.0]) sweep(t - 0.12, 0.2, 3000, 800, 0.12);
  sweep(11.3, 0.25, 400, 6000, 0.2);
  for (let k = 0; k < 18; k++) tick(11.6 + k * 0.035, 0.04);
  blip(12.2, 1400, 0.06, 0.06, 'sine');
  // Layanan: keping muncul, ketukan Bantuan, kirim, nada sukses.
  for (let i = 0; i < 13; i++) blip(13.5 + i * 0.0625, 700 + i * 60, 0.03, 0.05, 'sine');
  tick(14.5, 0.22); blip(14.5, 1800, 0.06, 0.04, 'sine');
  sweep(14.55, 0.3, 2000, 500, 0.1);
  tick(15.15, 0.22); blip(15.15, 1800, 0.06, 0.04, 'sine');
  [72, 76, 79, 84].forEach((m, k) => bell(15.25 + k * 0.06, m, 0.04, 0.8));
  sweep(15.6, 0.4, 800, 8000, 0.2);
  // 16–18 montase: kick per seperdelapan, blip glitch, gulungan, lalu hening.
  for (let c = 0; c < 8; c++) {
    const t = 16 + c * 0.25;
    kick(t, c % 2 ? 0.75 : 1);
    blip(t, 200 + rnd() * 1800, 0.05, 0.05, 'square');
    if (c % 2 === 0) stab(t, CHORDS[(c / 2) % 4].map((m) => m + 12), 0.07, 0.18);
    bass(t, ROOTS[(c >> 1) % 4], 0.2, 0.3);
    const n = noise(t + 0.12, 0.05), bp = filt('bandpass', 3000, 3), v = ac.createGain(); env(v, t + 0.12, 0.001, 0.12, 0.05);
    n.connect(bp).connect(v).connect(master);
  }
  impact(16, 0.6);
  for (let k = 0; k < 14; k++) clap(17.0 + k * (0.85 / 14) * (1 - k / 30), 0.06 + k * 0.022);
  riser(16.5, 17.85, 0.28);
  // 18–20 penutup: drop, partikel berkumpul, akor resolusi.
  impact(18, 1.15);
  pad(18, 19.5, [53, 60, 65, 69, 72, 79], 0.04, 3000, 900);
  sweep(18.35, 0.6, 6000, 600, 0.12);
  const PENTA = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91];
  PENTA.forEach((m, k) => bell(18.4 + k * 0.04, m, 0.028, 1.2));
  [77, 84, 89].forEach((m, k) => bell(19.0 + k * 0.09, m, 0.03, 1.2));

  // Bus musik ditekan tiap kick (efek "pompa" sidechain).
  kicks.sort((a, b) => a - b);
  bus.gain.setValueAtTime(1, 0);
  for (const k of kicks) { bus.gain.setValueAtTime(1, Math.max(0, k - 0.002)); bus.gain.linearRampToValueAtTime(0.35, k + 0.01); bus.gain.linearRampToValueAtTime(1, k + 0.22); }
  // Jeda hening sebelum drop, lalu ekor musik memudar bersama gambar.
  master.gain.setValueAtTime(0.7, 17.84); master.gain.linearRampToValueAtTime(0.0, 17.87);
  master.gain.setValueAtTime(0.0, 17.995); master.gain.linearRampToValueAtTime(0.7, 18.0);
  master.gain.setValueAtTime(0.7, 19.3); master.gain.linearRampToValueAtTime(0.0, 20.0);

  const buf = await ac.startRendering();
  let pk = 0;
  for (let c = 0; c < 2; c++) for (const v of buf.getChannelData(c)) pk = Math.max(pk, Math.abs(v));
  const k = 0.89 / Math.max(pk, 1e-6);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
  return buf;
}
