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
// Aset yang harus tersedia saat jaringan mati.
//
// SELURUHNYA WAJIB BENAR-BENAR ADA. `cache.addAll` bersifat semua-atau-tidak:
// satu berkas yang hilang membatalkan seluruh pemanggilan, dan karena
// kegagalannya ditelan `.catch()` di bawah, akibatnya tidak ada satu pun aset
// yang ter-cache — tanpa gejala apa pun. Persis itu yang terjadi ketika
// `/icon-app.svg` dihapus saat penggantian favicon tetapi tetap tercantum di
// sini.
const APP_SHELL = ['/app', '/icon-192.png', '/manifest.webmanifest'];

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

/* ==================================================================
   Notifikasi push untuk petugas panel
   ==================================================================

   Muatannya disusun App\Notifications\AktivitasPusatBantuan::toWebPush()
   di backend, dan SENGAJA tidak memuat data pribadi pelapor — notifikasi
   muncul di layar kunci ponsel pribadi petugas, tempat siapa pun yang
   kebetulan melihat layarnya ikut membacanya.
   ================================================================== */

self.addEventListener('push', (event) => {
  // Muatan yang tidak dapat diurai tetap ditampilkan sebagai pemberitahuan
  // umum. Notifikasi yang gagal muncul sama sekali jauh lebih buruk daripada
  // notifikasi yang judulnya kurang tepat.
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'Kiriman baru di Pusat Bantuan';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Buka panel untuk melihat rinciannya.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // `tag` membuat notifikasi sejenis saling menimpa alih-alih menumpuk
      // sepuluh baris di panel notifikasi ponsel.
      tag: data.tag || 'aiais',
      data: { path: data.path || '/admin/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const tujuan = (event.notification.data && event.notification.data.path) || '/admin/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((daftar) => {
      // Kalau panelnya sudah terbuka di suatu tab, fokuskan tab itu dan
      // arahkan — membuka tab baru tiap notifikasi meninggalkan belasan tab
      // panel yang sama pada akhir hari kerja.
      for (const klien of daftar) {
        if (klien.url.includes('/admin') && 'focus' in klien) {
          klien.navigate(tujuan);
          return klien.focus();
        }
      }

      return self.clients.openWindow(tujuan);
    })
  );
});
