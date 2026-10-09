/**
 * Linimasa bersama reel.js (gambar) dan audio.js (musik) — satu-satunya tempat
 * tempo dan urutan adegan ditulis, supaya keduanya tidak bisa lepas sinkron.
 *
 * 80 BPM: 1 ketuk = 0,75 dtk, 1 birama (4 ketuk) = 3 dtk. Durasi adegan ditulis
 * dalam ketuk dan setiap pergantian jatuh di batas birama.
 */
export const BPM = 80;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;

const URUTAN = [
  ['intro', 8, '00 / PEMBUKA'],
  ['portal', 4, '01 / PORTAL'],
  ['profil', 8, '02 / PROFIL & LINIMASA'],
  ['jadwal', 8, '03 / JADWAL PENERBANGAN'],
  ['statistik', 8, '04 / STATISTIK LALU LINTAS UDARA'],
  ['fasilitas', 8, '05 / FASILITAS & WISATA'],
  ['info', 8, '06 / BERITA & PPID'],
  ['regulasi', 4, '07 / REGULASI & DOKUMEN'],
  ['layanan', 8, '08 / LAYANAN'],
  ['faq', 4, '09 / TANYA JAWAB'],
  ['montase', 4, '10 / SEMUA DI SATU TEMPAT'],
  ['penutup', 8, '11 / APTPAIRPORT.ID'],
];

export const SCENES = [];
{
  let at = 0;
  for (const [id, beats, label] of URUTAN) {
    SCENES.push({ id, start: at * BEAT, dur: beats * BEAT, beats, label });
    at += beats;
  }
}
export const DUR = SCENES.reduce((a, s) => a + s.dur, 0); // 60 dtk
export const scene = (id) => SCENES.find((s) => s.id === id);
