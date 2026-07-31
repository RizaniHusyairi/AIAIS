// APT Pranoto PWA Service Worker
//
// Nama cache diturunkan dari versi produk yang dikirim lewat query string saat
// pendaftaran (lihat components/pwa/PwaRegister.tsx). Scope service worker
// berasal dari PATH, bukan query, jadi `?v=` tidak mengubah scope — tetapi URL
// skrip yang berbeda membuat browser memasang worker baru alih-alih
// membandingkan byte. Handler `activate` kemudian menghapus seluruh cache
// versi sebelumnya. Dengan begitu cache berotasi otomatis tiap rilis, tanpa
// ada yang perlu menyunting berkas ini.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `apt-pranoto-${VERSION}`;
const APP_SHELL = ['/app', '/icon-app.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Network-first untuk navigasi (dokumen HTML).
  //
  // Wajib ada. Kalau HTML ikut disajikan stale-while-revalidate, maka setelah
  // versi naik kunjungan pertama masih menerima HTML lama yang merujuk chunk
  // lama ber-`?v=` lama — sehingga worker lama didaftarkan ulang dan cache
  // tidak berotasi sampai kunjungan kedua. Dengan cabang ini rotasinya terjadi
  // dalam satu kali muat. Saat jaringan mati, tetap jatuh ke cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/app'))
      )
    );
    return;
  }

  // Network-first untuk API / data langsung.
  // Aturan ini agnostik terhadap prefiks versi API (v1, v2, dst).
  if (url.pathname.includes('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Stale-while-revalidate untuk aset statis.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
