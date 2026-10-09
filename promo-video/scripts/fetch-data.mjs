/**
 * Ambil snapshot data asli untuk isi UI di dalam video.
 *
 * Video tidak boleh memuat data karangan (aturan proyek), maka seluruh teks
 * data — nomor penerbangan, judul berita, nama fasilitas — dibaca dari sini.
 * Gambar ikut diunduh ke public/img supaya render tidak bergantung jaringan.
 *
 * Sumber: berita, fasilitas, wisata, FAQ, dan surat regulasi dari portal yang
 * tayang (aptpairport.id) karena isinya sudah dikurasi petugas — basis data
 * lokal masih memuat foto tertukar dan surat uji coba. Penerbangan (FIDS), PPID,
 * dan statistik LLAU dari API lokal (portal tayang belum punya endpoint LLAU).
 * Profil & linimasa dibaca dari frontend/src/lib/airportProfile.ts yang
 * berprovenans, bukan disalin tangan.
 *
 * Pakai: jalankan backend (php artisan serve --port=8000), lalu `npm run data`.
 */
import { mkdir, writeFile, copyFile, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const trim = (u) => u.replace(/\/+$/, '');
const API = trim(process.env.API_URL || 'http://127.0.0.1:8000/api/v2');
const PORTAL = trim(process.env.PORTAL_API_URL || 'https://aptpairport.id/api/v2');
const IMG_DIR = join(ROOT, 'public', 'img');
const FFMPEG = join(ROOT, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe');
const DATA_DIR = join(ROOT, 'src', 'data');

const originOf = (base) => base.replace(/\/api\/v\d+$/, '');

async function get(path, base = API) {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${base}${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(`${base}${path} → ${json.message}`);
  return json.data;
}

/**
 * URL penuh, lintasan berawalan "/" (relatif ke asal server, mis. /uploads/... di
 * portal), lintasan aset v1 (`assets_landing/...`), atau lintasan storage telanjang.
 */
function absolute(src, base) {
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith('/') || src.startsWith('assets_landing/')) return `${originOf(base)}/${src.replace(/^\/+/, '')}`;
  return `${originOf(base)}/storage/${src}`;
}

/** Unduh gambar ke public/img; kembalikan lintasan relatif atau null bila gagal. */
async function grab(src, name, base = API) {
  const url = absolute(src, base);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) return null;
    const ext = extname(new URL(url).pathname).toLowerCase();
    const file = `${name}${['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext) ? ext : '.jpg'}`;
    await writeFile(join(IMG_DIR, file), Buffer.from(await res.arrayBuffer()));
    return `img/${file}`;
  } catch {
    return null;
  }
}

const STATUS = { scheduled: 'Terjadwal', departed: 'Berangkat', landed: 'Mendarat', delayed: 'Tertunda', boarding: 'Boarding', cancelled: 'Batal' };

async function flights() {
  const { flights: all } = await get('/flights');
  const pick = (type) => {
    const seen = new Set();
    return all
      .filter((f) => f.flight_type === type && /^[A-Z0-9]{2} \d+$/.test(f.flight_number))
      .filter((f) => (seen.has(f.flight_number) ? false : seen.add(f.flight_number)))
      .slice(0, 5);
  };
  const out = [];
  for (const f of [...pick('departure'), ...pick('arrival')]) {
    out.push({
      type: f.flight_type,
      number: f.flight_number,
      airline: f.airline,
      color: f.airline_color || '#38bdf8',
      logo: await grab(f.airline_logo, `airline-${f.airline_code}`),
      city: f.flight_type === 'departure' ? f.destination_city : f.origin_city,
      code: ((f.flight_type === 'departure' ? f.destination : f.origin).match(/\(([A-Z]{3})\)/) || [])[1] || null,
      time: f.scheduled_time,
      status: STATUS[f.status] || f.remarks,
      date: f.flight_date,
    });
  }
  return out;
}

async function news() {
  // Slug `demo-*` adalah konten contoh dari seeder demo, bukan berita resmi.
  const list = (await get('/news', PORTAL)).filter((n) => !n.slug.startsWith('demo-')).slice(0, 4);
  const out = [];
  for (const n of list) {
    out.push({ title: n.title.replace(/\s+/g, ' ').trim(), category: n.category, date: n.published_at, image: await grab(n.thumbnail_url || n.image, `news-${n.id}`, PORTAL) });
  }
  return out;
}

async function facilities() {
  const list = (await get('/facilities', PORTAL)).filter((f) => f.is_operational);
  const out = [];
  for (const f of list) {
    out.push({ id: f.id, name: f.name, category: f.category, details: (f.details ?? []).filter(Boolean), location: f.location_description, image: await grab(f.image_url, `fac-${f.id}`, PORTAL) });
  }
  return out;
}

/**
 * Sampul wisata di portal adalah unggahan petugas, bukan ilustrasi AI dari
 * tourismData.ts — jadi tanpa lencana "Ilustrasi". Jarak/waktu tempuh di portal
 * masih kosong, dan tidak diisi dari tebakan.
 */
async function tourisms() {
  const out = [];
  for (const t of await get('/tourisms', PORTAL)) {
    out.push({ name: t.name, category: t.category, city: t.city, duration: t.duration, image: await grab(t.cover_url || t.cover_image, `wisata-${t.slug}`, PORTAL), illustration: false });
  }
  return out;
}

async function ppid() {
  const [berkala, sertaMerta, setiapSaat] = await Promise.all([
    get('/periodic-documents'),
    get('/immediate-information'),
    get('/evergreen-information'),
  ]);
  // Basis data lokal masih memuat entri uji coba petugas ("... tes"); jangan sampai tayang.
  const real = (list, key) => list.filter((d) => !/\btes(t|ting)?\b/i.test(d[key] || ''));
  const categories = (list) => [...new Set(list.map((d) => d.category).filter(Boolean))].slice(0, 3);
  const b = real(berkala, 'title');
  const s = real(sertaMerta, 'uraian');
  const e = real(setiapSaat, 'title');
  return {
    berkala: { count: b.length, sample: categories(b) },
    sertaMerta: { count: s.length, sample: s.slice(0, 2).map((d) => (d.uraian || '').replace(/[^\p{L}\p{N}\s.,()\-–]/gu, '').trim()) },
    setiapSaat: { count: e.length, sample: categories(e) },
  };
}

/**
 * Statistik lalu lintas udara: rekapitulasi LLAU periode terakhir yang diunggah
 * petugas, beserta tren bulanannya. Kosong berarti belum ada laporan — gagal
 * saja, adegan statistik tidak boleh diisi angka karangan.
 */
async function llau() {
  const d = await get('/llau');
  if (!d.period) throw new Error('Belum ada rekapitulasi LLAU di API lokal — unggah laporan dulu lewat panel admin.');
  const s = d.period.summary;
  return {
    label: d.period.label,
    passengers: s.passengers.total,
    flights: s.flights.total,
    cargo: s.cargo.total,
    routes: (d.period.routes || []).slice(0, 5).map((r) => ({ code: r.code, passengers: r.passengers, flights: r.flights })),
    trend: d.trend.map((t) => ({ label: t.label, passengers: t.passengers, flights: t.flights })),
  };
}

/** FAQ aktif di portal; jawaban HTML diratakan jadi teks polos. */
async function faqs() {
  const list = await get('/faqs', PORTAL);
  if (!list.length) throw new Error('FAQ portal kosong.');
  const polos = (h) => (h || '').replace(/<\/(p|li)>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return list.slice(0, 6).map((f) => ({ category: f.category, question: f.question.trim(), answer: polos(f.answer) }));
}

/** Surat regulasi yang berkasnya tersedia di portal (publik menyaring). */
async function letters() {
  const list = (await get('/letters', PORTAL)).filter((l) => l.has_file);
  return {
    count: { keputusan: list.filter((l) => l.type === 'keputusan').length, edaran: list.filter((l) => l.type === 'edaran').length },
    items: list.slice(0, 6).map((l) => ({ type: l.type, number: l.number, title: l.title, date: l.issue_date })),
  };
}

/**
 * Linimasa & visi dari airportProfile.ts. Berkas TS itu memakai alias `@/`,
 * jadi dibundel esbuild ke memori lalu diimpor sebagai data URL.
 */
async function profile() {
  const { build } = await import('esbuild');
  const FE = join(ROOT, '..', 'frontend', 'src');
  const out = await build({
    entryPoints: [join(FE, 'lib', 'airportProfile.ts')], bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'error',
    alias: { '@': FE },
  });
  const mod = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  return { timeline: mod.TIMELINE, visi: mod.VISI.pernyataan, org: mod.ORG_NAME };
}

/**
 * Bahan beranda desktop (adegan "Satu portal, semua layar"): latar hero dari
 * setelan `bg_home` portal dan pratinjau unggahan Instagram yang tayang di
 * ponsel hero. Unggahan video (±55 MB) tidak diunduh utuh — cukup satu frame
 * yang dicuplik ffmpeg bawaan Remotion langsung dari URL-nya.
 */
async function home() {
  const settings = await get('/settings', PORTAL);
  const kv = Array.isArray(settings) ? Object.fromEntries(settings.map((s) => [s.key, s.value])) : settings;
  let heroBg = null;
  const bg = kv.bg_home || '/bg/bg-beranda.png';
  const lokal = join(ROOT, '..', 'frontend', 'public', bg.replace(/^\/+/, ''));
  if (bg.startsWith('/') && existsSync(lokal)) {
    await copyFile(lokal, join(IMG_DIR, `home-bg${extname(bg)}`));
    heroBg = `img/home-bg${extname(bg)}`;
  } else {
    heroBg = await grab(bg, 'home-bg', PORTAL);
  }

  const posts = await get('/instagram-posts', PORTAL).catch(() => []);
  const ig = [];
  for (const [i, p] of posts.slice(0, 3).entries()) {
    const url = absolute(p.image_url, PORTAL);
    if (!url) continue;
    if (p.is_video || /\.mp4$/i.test(url)) {
      const out = join(IMG_DIR, `ig-${i}.jpg`);
      // Detik ke-40 unggahan saat ini: logo HUT RI ke-81. Detik awalnya berupa
      // wajah close-up di tengah transisi — tidak layak jadi pratinjau.
      // Ganti lewat IG_FRAME_AT; detik 2 dipakai bila videonya lebih pendek.
      for (const at of [process.env.IG_FRAME_AT || '40', '2']) {
        try {
          execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', at, '-i', url, '-frames:v', '1', '-vf', 'scale=600:-2', out]);
          if (existsSync(out)) {
            ig.push({ image: `img/ig-${i}.jpg`, video: true, caption: (p.caption_excerpt || p.caption || '').trim() });
            break;
          }
        } catch {
          // ffmpeg diblokir (mis. Smart App Control) — ponsel hero jatuh ke panel bandara.
        }
      }
    } else {
      const img = await grab(url, `ig-${i}`, PORTAL);
      if (img) ig.push({ image: img, video: false, caption: (p.caption_excerpt || p.caption || '').trim() });
    }
  }
  return { heroBg, ig };
}

// Pastikan kedua sumber hidup SEBELUM menghapus snapshot lama — kalau tidak,
// backend yang mati meninggalkan public/img kosong dan video kehilangan gambar.
for (const base of [API, PORTAL]) {
  await get('/version', base).catch((e) => {
    console.error(`Sumber data tidak terjangkau: ${base} (${e.cause?.code ?? e.message}). Nyalakan backend lalu ulangi.`);
    process.exit(1);
  });
}

await mkdir(IMG_DIR, { recursive: true });
await mkdir(DATA_DIR, { recursive: true });
// Buang gambar snapshot lama agar tidak ada sisa sumber sebelumnya.
for (const f of await readdir(IMG_DIR)) await unlink(join(IMG_DIR, f));

const data = {
  fetchedAt: new Date().toISOString(),
  source: {
    flights: API, ppid: API, llau: API, news: PORTAL, facilities: PORTAL, tourisms: PORTAL, faqs: PORTAL, letters: PORTAL,
    profile: 'frontend/src/lib/airportProfile.ts',
  },
  flights: await flights(),
  news: await news(),
  facilities: await facilities(),
  tourisms: await tourisms(),
  ppid: await ppid(),
  home: await home(),
  llau: await llau(),
  faqs: await faqs(),
  letters: await letters(),
  profile: await profile(),
};
await writeFile(join(DATA_DIR, 'snapshot.json'), JSON.stringify(data, null, 2) + '\n');

// Logo resmi disalin dari frontend agar proyek video mandiri.
const PUB = join(ROOT, '..', 'frontend', 'public');
await mkdir(join(ROOT, 'public', 'logo'), { recursive: true });
for (const f of ['logo-white-apt.svg', 'logo-apt.svg', 'logo-kemenhub.png', 'icon-512.png']) {
  await copyFile(join(PUB, f), join(ROOT, 'public', 'logo', f));
}

console.log(
  `Snapshot: ${data.flights.length} penerbangan, ${data.news.length} berita, ` +
    `${data.facilities.length} fasilitas, ${data.tourisms.length} wisata, ` +
    `PPID ${data.ppid.berkala.count}/${data.ppid.sertaMerta.count}/${data.ppid.setiapSaat.count}, ` +
    `LLAU ${data.llau.label}, ${data.faqs.length} FAQ, ${data.letters.items.length} surat`,
);

if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(ROOT, 'scripts', 'shrink.ps1')], { stdio: 'inherit' });
  // shrink.ps1 mengubah PNG foto menjadi .jpg; samakan lintasan di snapshot.
  const fix = (img) => (img && !existsSync(join(ROOT, 'public', img)) ? img.replace(/\.(png|jpeg)$/, '.jpg') : img);
  for (const list of [data.news, data.facilities, data.tourisms, data.home.ig]) for (const x of list) x.image = fix(x.image);
  data.home.heroBg = fix(data.home.heroBg);
  await writeFile(join(DATA_DIR, 'snapshot.json'), JSON.stringify(data, null, 2) + '\n');
} else {
  console.warn('Lewati pengecilan gambar (shrink.ps1 khusus Windows) — render bisa lambat.');
}
