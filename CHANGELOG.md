# Changelog

Seluruh perubahan penting pada **AIAIS** dicatat di berkas ini.

Formatnya mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
dan penomorannya mengikuti [Semantic Versioning](https://semver.org/lang/id/).
Kata kunci bagian (`Added`, `Changed`, `Fixed`, `Removed`, `Security`,
`Deprecated`) sengaja dipertahankan dalam bahasa Inggris agar sesuai konvensi
dan mudah dicari; isinya berbahasa Indonesia.

> **Hubungan dengan aptpairport.id**
> AIAIS adalah generasi kedua portal Bandara APT Pranoto. Situs lama
> [aptpairport.id](https://aptpairport.id) ditandai sebagai **v1.0.0** dan punya
> CHANGELOG-nya sendiri. AIAIS dimulai dari seri **2.x** dan akan menggantikan
> situs tersebut saat mencapai `2.0.0` final.

---

## [Unreleased]

Belum ada perubahan setelah rilis terakhir.

---

## [2.0.0-alpha.1] - 2026-08-01

Rilis pra-rilis pertama yang diberi versi. Menandai kondisi monorepo saat
sistem penomoran versi mulai diberlakukan.

### Added

- Berkas `VERSION` di akar repo sebagai **sumber kebenaran tunggal** versi
  produk, dibaca frontend (`next.config.ts`) maupun backend (`config/app.php`).
- Endpoint `GET /api/v2/version` berisi nama, versi, kanal rilis, dan versi
  kontrak API. Detail teknis (versi Laravel/PHP, environment) sengaja hanya
  muncul di luar produksi.
- Tampilan versi di footer portal, halaman profil PWA, dan sidebar panel admin.
- Pendeteksi selisih versi di panel admin: memperingatkan bila backend dan
  frontend menyebut angka berbeda.
- `frontend/.env.example` sebagai dokumentasi variabel lingkungan, beserta
  aturan negasi `!.env.example` pada `.gitignore` supaya berkasnya bisa dikomit.
- Peta rute penerbangan dengan simulasi posisi pesawat (Leaflet tanpa ubin
  daring, garis pantai Natural Earth lokal), tersedia di detail penerbangan
  dan halaman `/peta-rute` beserta mode kios.
- Halaman detail penerbangan untuk portal desktop (`/flights/[id]`), yang
  sebelumnya belum ada.
- Halaman pariwisata terdekat (`/tourism`, `/app/wisata`).
- Data koordinat bandara dari OurAirports (domain publik) untuk penggambaran
  rute.

### Changed

- Prefiks kontrak API dipindah dari `/api/v1` ke `/api/v2` dan tidak lagi
  ditulis literal — kini berasal dari `config/api.php`, sehingga perpindahan
  berikutnya cukup satu baris.
- Nama cache service worker kini diturunkan dari versi produk
  (`/sw.js?v=…`), sehingga berotasi otomatis tiap rilis tanpa disunting tangan.
- Navigasi dokumen pada service worker menjadi *network-first*; sebelumnya
  *stale-while-revalidate* membuat rotasi cache tertunda satu kali muat.
- Pendaftaran service worker kini juga berjalan bila event `load` sudah
  telanjur menyala sebelum efek React dijalankan (lihat bagian Fixed).
- Data kontak resmi disamakan dengan aptpairport.id: telepon
  `+62 811 551 944`, alamat `Jl. Poros Samarinda–Bontang, Kel. Sungai Siring,
  Samarinda 75119`, surel `mail.aptpranotoairport@gmail.com`.
- API penerbangan diperkaya: tanggal penerbangan, konter check-in, ban bagasi,
  tipe pesawat, alasan keterlambatan, kota asal/tujuan, kontak maskapai, dan
  waktu pembaruan status.
- Status `check_in` dipisahkan dari `boarding`, sesuai remark FIDS.

### Fixed

- Service worker tidak pernah didaftarkan ulang pada kunjungan berikutnya.
  `PwaRegister` hanya memasang listener `load`, padahal efek React kerap
  berjalan setelah event itu menyala (halaman selesai lebih cepat daripada
  hidrasi saat berkas sudah ada di cache). Akibatnya worker lama terus
  mengendalikan halaman dan cache tidak pernah berotasi. Kini kondisi
  `document.readyState === 'complete'` ikut ditangani, dan kegagalan
  pendaftaran dicatat ke konsol alih-alih ditelan diam-diam.
- Nomor gate tidak lagi dikarang. Ketika FIDS mengirim `"-"` (belum
  ditentukan), sebelumnya diganti menjadi `"Gate 1"`.
- `estimated_time` tidak lagi disalin dari jadwal, sehingga "perkiraan" tidak
  lagi selalu sama dengan jadwal semula.
- String versi `1.0.0` yang ter-hardcode di halaman profil PWA — bertentangan
  dengan `package.json` yang saat itu bernilai `0.1.0`.
- Alamat API tidak lagi disusun ulang secara duplikat di halaman
  admin/appearance.
- Batas lebar PWA (441–767 px) yang memotong konten tanpa menampilkan bingkai
  ponsel.
- Klaim versi framework pada README (Laravel 12 → 13, PHP 8.2+ → 8.3+).

### Removed

- Seluruh data penerbangan contoh: 7 baris hasil seeder, konstanta
  `DEMO_DEPARTURES`/`DEMO_ARRIVALS`, dan `dummyFlights`. Ketika umpan FIDS
  kosong, tampilan kini menyatakan "belum ada jadwal" alih-alih menampilkan
  penerbangan karangan.
- Tiruan status bar iOS (jam `9:41`, ikon sinyal/baterai statis) pada layar
  PWA; digantikan jarak aman `safe-area-inset`.

---

[Unreleased]: https://github.com/RizaniHusyairi/AIAIS/compare/v2.0.0-alpha.1...HEAD
[2.0.0-alpha.1]: https://github.com/RizaniHusyairi/AIAIS/releases/tag/v2.0.0-alpha.1
