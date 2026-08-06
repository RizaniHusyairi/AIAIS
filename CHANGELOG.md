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

### Added

- **Regulasi PPID** (`/ppid/regulasi`) — sembilan peraturan dalam tiga
  kelompok (undang-undang, Peraturan Komisi Informasi Pusat, dan peraturan
  Kementerian Perhubungan), memakai akordeon yang sama dengan halaman
  Layanan Informasi. Dengan ini seluruh menu PPID sudah punya halamannya;
  tidak ada lagi item bertanda "Segera" di bawah menu itu.
- **Panel admin: Permohonan Informasi Publik** (`/admin/information-requests`)
  — daftar, penyaringan, dan penjawaban permohonan yang masuk. Sisa waktu
  menuju tenggat dihitung dalam hari kerja dan ditandai merah bila terlampaui,
  dengan kartu statistik khusus "Lewat Tenggat" beserta peringatannya, karena
  angka itu hak hukum pemohon menurut UU 14/2008 Pasal 22. Perpanjangan
  7 hari kerja dapat dicatat dari sini dan langsung terlihat oleh pemohon
  saat melacak tiketnya.
- `adminDownload()` pada `lib/adminApi.ts` — pengunduh berkas bertoken.
  `adminFetch` selalu mem-parsing JSON sehingga tidak bisa menangani berkas
  biner, dan tautan `<a href>` biasa tidak membawa header Authorization.
  Berkas diambil sebagai blob lalu diunduh dari memori, jadi scan KTP pemohon
  tidak pernah memiliki URL yang dapat dibagikan.
- **Pengajuan Informasi Publik** (`/ppid/pengajuan-informasi`) — sistem
  permohonan informasi menurut UU 14/2008, lengkap dari formulir sampai
  penyimpanan:
  - Tabel `information_requests`, model, dan `InformationRequestController`
    dengan aturan validasi serta pesan kesalahan berbahasa Indonesia yang
    mengikuti aptpairport.id.
  - `POST /api/v2/information-requests` (terbuka — mengajukan permohonan
    informasi adalah hak setiap orang dan tidak boleh mensyaratkan akun) dan
    `GET /api/v2/information-requests/track/{tiket}` untuk pelacakan mandiri.
  - Endpoint admin bertoken untuk daftar, tanggapan, dan unduhan berkas.
  - Formulir tiga langkah (berkas → data & permohonan → tinjau) dengan
    validasi di sisi klien maupun server, bukti pengajuan bergaya boarding
    pass berisi nomor tiket, dan tenggat jawaban yang dihitung **10 hari
    kerja** sesuai UU 14/2008 Pasal 22.
- Empat halaman **Layanan Informasi** di bawah menu PPID, beserta
  `src/lib/publicInfoData.ts`:
  - **Laporan Layanan Informasi** (`/ppid/laporan-layanan-informasi`) —
    linimasa laporan tahunan dengan pesawat yang menyusuri rute mengikuti
    gulir, plus pencarian judul/tahun.
  - **Informasi Berkala** (`/ppid/informasi-berkala`) — 6 kategori, 9 dokumen.
  - **Informasi Serta Merta** (`/ppid/informasi-serta-merta`) — 20 maklumat
    sebagai kartu bergaya **NOTAM** (nomor seri, pita peringatan bergaris
    miring, kepala monospasi), plus pencarian. Metafora ini bukan hiasan:
    NOTAM adalah format resmi maklumat mendesak penerbangan, dan "informasi
    serta merta" adalah padanan publiknya.
  - **Informasi Setiap Saat** (`/ppid/informasi-setiap-saat`) — 3 kategori,
    9 dokumen.
- `src/components/ppid/PpidHero.tsx` dan `DocAccordion.tsx` — hero baku dan
  akordeon dokumen yang dipakai bersama seluruh halaman PPID.
- Halaman **Standar Pelayanan** (`/ppid/standar-pelayanan`) beserta
  `src/lib/serviceStandardData.ts`: dasar hukum UU 25/2009, ajakan mengisi
  Survei Kepuasan Masyarakat, dan tiga kelompok dokumen (Standar Pelayanan,
  Maklumat Pelayanan, Survei Kepuasan Masyarakat) dalam akordeon beraksesibilitas
  penuh (`aria-expanded`, `aria-controls`, panel `role="region"`).
- Halaman **Profil PPID** (`/ppid`) dan **SOP PPID** (`/ppid/sop`) — kewajiban
  UU 14/2008 tentang Keterbukaan Informasi Publik. Seluruh teks disalin dari
  aptpairport.id yang tayang 2 Agustus 2026 dan dicocokkan baris-per-baris
  dengan Blade di repo legacy; keduanya sama persis untuk halaman ini.
- `src/lib/ppidData.ts` — visi, misi, tugas & fungsi, tiga prosedur layanan
  informasi beserta tenggat resminya, dan daftar dokumen, dengan provenans.
- `src/components/ui/ImageLightbox.tsx` — penampil dokumen layar penuh dengan
  peran dialog, Escape, klik latar, jebakan fokus, dan kembalinya fokus ke
  pemicu. Menggantikan glightbox milik v1 tanpa menambah dependensi.
- Enam dokumen resmi PPID (struktur organisasi, maklumat pelayanan, standar
  biaya layanan, dan tiga bagan alur SOP) disalin ke `public/ppid/`.
- Tautan PPID pada footer. Seluruh menu PPID pada navbar kini punya halaman —
  tidak ada lagi item bertanda "Segera" di bawah menu itu.

- **Proksi logo maskapai** `GET /api/v2/airlines/logo/{berkas}`. Server FIDS
  hanya melayani HTTP, sehingga logonya akan diblokir sebagai *mixed content*
  begitu portal berjalan di HTTPS. Berkas kini diambil di sisi server lalu
  disajikan ulang dari portal, sama seperti `imageProxy` di aptpairport.id —
  lengkap dengan penjagaannya: hanya nama berkas gambar yang wajar yang
  diteruskan dan direktori tujuan dikunci (cegah path traversal & SSRF).
  Hasilnya disimpan sehari.
- Kolom `airline_code` dan `airline_color` pada respons penerbangan, diambil
  dari `maskapai.kode` dan `maskapai.kode_warna` milik FIDS. Lencana cadangan
  kini memakai kode dan warna merek resmi alih-alih tebakan portal — tebakan
  lama bahkan salah warna untuk Garuda (biru `#005b9f`, bukan tosca) dan
  Wings Air (merah `#ed1b24`, bukan hijau).
- Salinan cadangan terakhir untuk tiap halaman FIDS. Bila penyegaran gagal,
  yang disajikan adalah jadwal terakhir yang berhasil diambil (maksimal dua
  jam) alih-alih papan kosong.
- Gate, konter check-in, dan conveyor kini tampil di kartu FIDS beranda
  (portal maupun PWA), tidak lagi hanya di halaman jadwal dan halaman detail.
- Koordinat **Long Apung (LPU, WAQL)** dan **Maratua (RTU, WAQC)** pada
  `airports.ts`, dari OurAirports (domain publik, unduhan 2 Agustus 2026).
  Keduanya rute perintis Smart Aviation dari Samarinda dan sebelumnya tidak
  terdata, sehingga peta rute menolak menggambar tiga penerbangan setiap
  harinya. Untuk LPU, kolom `ident` OurAirports masih memuat kode lama
  `WRLP`; yang dipakai `icao_code` = `WAQL`, sejalan dengan awalan WAQ*
  bandara Kalimantan Utara/Timur lain pada tabel yang sama.

- `src/lib/airportProfile.ts` — teks profil resmi (visi, misi, sejarah, tugas &
  fungsi, status BLU, rute, kontak) beserta data lima pejabat, diambil langsung
  dari aptpairport.id yang tayang pada 1 Agustus 2026. Dipakai bersama halaman
  profil dan beranda.
- Halaman profil: empat seksi baru — **Tugas & Fungsi** (dasar hukum PM 20
  Tahun 2024 beserta 12 butir fungsi), **Status & Penetapan BLU**, **Rute
  Penerbangan**, dan **Struktur Organisasi & Lokasi**.
- Dialog profil pejabat: riwayat jabatan, pendidikan, dan penghargaan muncul
  saat kartu diklik, lengkap dengan jebakan fokus, kunci gulir, dan peran ARIA.
- Foto resmi lima pejabat dan bagan struktur organisasi disalin ke
  `public/pejabat/` dan `public/profil/`.
- Anchor `#sejarah`, `#tugas-fungsi`, `#blu`, `#rute`, `#struktur`, `#lokasi`.

### Fixed

- **Formulir permohonan informasi publik v1 tidak dapat menyimpan apa pun.**
  Tabel `public_informations` di aptpairport.id memiliki kolom `user_id`
  bersifat NOT NULL tanpa nilai bawaan, sedangkan formulir publik tidak pernah
  mengisinya — jadi setiap pengiriman dari warga gagal pada batasan basis data
  dan berakhir di pesan "Terjadi kesalahan saat menyimpan data". Lebih jauh,
  kolom `nama`, `alamat`, `no_hp`, dan `email` sama sekali tidak ada di tabel
  itu meskipun formulirnya meminta keempatnya, sehingga identitas dan kontak
  pemohon dibuang diam-diam oleh mass assignment. Skema AIAIS menyimpan
  seluruh isian dan tidak menuntut akun.
- **Scan KTP pemohon tersimpan di lokasi yang dapat diakses publik.** v1
  memakai cakram `public` dan nama berkas asli unggahan (yang kerap memuat
  nama dan NIK), sehingga siapa pun yang menebak URL-nya bisa mengunduh KTP
  orang lain. Di AIAIS berkas disimpan pada cakram privat dengan nama UUID;
  hanya petugas bertoken yang dapat membukanya. Diuji: permintaan langsung ke
  `/storage/...` mengembalikan 403, dan seluruh endpoint admin 401 tanpa token.
- **Berkas yatim saat penyimpanan gagal.** v1 mengunggah kedua berkas lebih
  dulu, lalu barisnya gagal dibuat — scan KTP menumpuk tanpa catatan pemilik.
  Di AIAIS berkas dihapus kembali bila penyimpanan barisnya gagal.
- **Halaman tanpa padanan PWA tidak dapat dibuka dari ponsel.** `MobileRedirect`
  mengalihkan setiap halaman non-`/app` di bawah 768 px, dan `toAppRoute`
  mengembalikan `/app` untuk lintasan yang tidak dikenalnya — sehingga
  pengunjung ponsel yang membuka `/ppid` mendarat di beranda aplikasi tanpa
  penjelasan. Kini ada daftar `KEEP_RESPONSIVE`; halaman PPID disajikan apa
  adanya karena sudah responsif dan wajib dapat diakses siapa pun.
- **Papan jadwal hanya menampilkan halaman pertama FIDS.** FIDS memberi 5 baris
  per halaman; pada 1 Agustus 2026 jadwal hari itu berisi 21 keberangkatan dan
  19 kedatangan, tetapi portal hanya menampilkan 5 + 5. **Tiga perempat jadwal
  tidak pernah tampil**, tanpa penanda apa pun bahwa ada sisanya. Kini seluruh
  halaman ditelusuri lewat `next_page_url`, cara yang dipakai aptpairport.id.
- **Logo maskapai tidak pernah muncul.** URL-nya dirakit sebagai
  `/storage/logo/` + nilai dari FIDS, padahal FIDS sudah mengirim lintasan
  lengkap `/storage/airlines/…`. Hasilnya `/storage/logo//storage/airlines/…`
  — 404 untuk setiap maskapai, sehingga seluruh papan jatuh ke lencana kode
  dua huruf. Kini lewat proksi (lihat Added).
- Kartu FIDS beranda selalu menulis status **"Terjadwal"** dengan warna hijau,
  apa pun status sebenarnya. Penerbangan yang sedang boarding, terlambat,
  bahkan dibatalkan tampil seolah normal. Kini memakai status dari FIDS.
- Penyaringan konter check-in memakai `!!c`, yang benar untuk angka `0` tetapi
  meloloskan string `"0"` sebagai konter sungguhan. Kini `Number(v) > 0`,
  aturan yang sama dengan v1.
- Papan jadwal ikut mati bila MySQL tidak dapat dihubungi, padahal jalur data
  langsung sama sekali tidak membutuhkan basis data.

- **Jajaran pejabat pada halaman profil dan beranda sepenuhnya fiktif** — lima
  nama rekaan dengan avatar kartun DiceBear, disajikan sebagai pimpinan
  bandara. Salah satunya diberi jabatan "Sekretaris Daerah Pemerintah
  Kalimantan Timur", jabatan publik nyata pada nama yang tidak ada, lengkap
  dengan kutipan pidato yang dikarang. Diganti data resmi.
- Visi dan misi pada halaman profil dikarang; diganti teks resmi (misi 6 butir).
- Luas terminal tertulis 16.400 m², seharusnya **12.700 m²**.
- Spesifikasi menyebut "Kategori PKP-PK 7"; sumber resmi hanya menyatakan
  **Kategori 6 ARFF** dan tidak pernah memakai istilah PKP-PK di halaman publik.
- Jam operasional tertulis 06.00–18.00, seharusnya **07.00–20.00 WITA**.
- Linimasa sejarah menyebut status BLU tahun 2022, seharusnya **2023**
  (KMK No. 63/KMK.05/2023). Entri "2011 Awal Pembangunan" dan "2019
  Perpanjangan Runway" dihapus karena tidak ada di sumber mana pun.
- Beranda menyebut panjang runway **3.250 m** sementara halaman profil menulis
  2.250 m — satu situs, dua angka. Keduanya kini 2.250 m.

### Removed

- `FALLBACK_DEPARTURES` pada beranda: lima penerbangan karangan (GA 539 ke
  CGK, JT 367 ke SUB, dan seterusnya) yang tampil setiap kali umpan FIDS
  kosong, tanpa penanda bahwa itu bukan jadwal hari ini. Sisa terakhir dari
  data contoh yang seharusnya sudah dihapus bersama `DEMO_DEPARTURES`.
- Tautan footer "Karir & Informasi". Halamannya tidak ada di AIAIS maupun di
  aptpairport.id (`/karir` mengembalikan 404). Dihapus alih-alih dibiarkan mati
  atau diisi konten karangan.

### Changed

- **Tautan dokumen Standar Pelayanan tidak disalin dari v1.** Ketiga tombol
  "Lihat Dokumen" pada aptpairport.id menunjuk ke
  `drive.google.com/drive/folders/example-…` — harfiah berawalan "example-",
  bukan ID Drive yang sah — dan ketiganya **mengembalikan HTTP 404** saat
  diperiksa 2 Agustus 2026. Berkasnya belum pernah diunggah. Di AIAIS, judul,
  nomor, dan tanggal terbitnya tetap ditampilkan agar keberadaan dokumen itu
  diketahui publik, tetapi tombolnya berbunyi "Belum tersedia" dan pengunjung
  diarahkan ke prosedur permohonan informasi. Isi `url` pada
  `serviceStandardData.ts` begitu berkasnya terbit; tampilan berubah sendiri.
- Hero seluruh halaman PPID diseragamkan lewat komponen `PpidHero`: gradien,
  partikel, busur rute, lengkungan pemisah, dan tipografi judul kini berasal
  dari satu berkas, sehingga keseragaman menjadi sifat struktural alih-alih
  kebetulan yang harus dijaga manual. Judul Standar Pelayanan sempat memakai
  papan bolak-balik (split-flap); komponennya dihapus karena membuat halaman
  itu terasa berbeda sendiri.
- Pencarian pada Laporan Layanan Informasi dan Informasi Serta Merta ditulis
  ulang sebagai state React. Di v1 keduanya skrip inline `keyup` yang
  menyembunyikan elemen lewat `style.display`; versi ini mengumumkan jumlah
  hasil lewat `aria-live` dan punya keadaan "tidak ditemukan" yang sebenarnya.
  Nomor seri kartu Serta Merta tetap mengikuti indeks aslinya saat disaring,
  sehingga satu maklumat selalu punya nomor yang sama.
- Kelompok dokumen Standar Pelayanan diurutkan menurut alur dokumennya
  (standar → maklumat → survei), bukan alfabetis seperti v1 yang urutannya
  hanya mengikuti pengelompokan basis data.
- Pada SOP PPID, urutan prosedur mengikuti perjalanan pemohon —
  permohonan → keberatan → sengketa. Di v1 kartu pertama adalah "sengketa",
  tahap paling akhir dan paling jarang dipakai, sedangkan "permohonan" yang
  dicari hampir semua pengunjung berada di tengah. Isi tiap langkah tidak
  diubah sedikit pun.
- Nama lembaga pada SOP ditulis **Komisi** Informasi Pusat. Sumber menulis
  "Komite Informasi Pusat" pada satu kalimat, padahal dua kalimat berikutnya
  di halaman yang sama menulis "Komisi Informasi" dengan benar (UU 14/2008
  Pasal 23). Berbeda dengan salah ketik pada kutipan peraturan di
  `airportProfile.ts` yang sengaja dipertahankan, kalimat ini bukan kutipan,
  dan salah nama berarti menyesatkan pemohon soal ke mana harus mengadu.
- Istilah bagasi kedatangan diseragamkan menjadi **Conveyor** (sebelumnya
  campuran "Ban Bagasi" dan "Belt"). Itu kata yang dipakai papan FIDS bandara,
  pengumuman suara, dan aptpairport.id, sekaligus nama field pada API.
- Permintaan ke FIDS kini disimpan sementara (60 detik). aptpairport.id memakai
  15 menit; di sini sengaja jauh lebih pendek karena papan ini menampilkan
  status yang berubah cepat, dan portal memang menyegarkan diri tiap menit.
- Tautan footer "Kebijakan Privasi" sementara menunjuk ke halaman resmi pada
  portal v1, karena AIAIS belum memiliki halamannya.

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
