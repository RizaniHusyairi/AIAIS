# Penggelaran v2 di server aptpairport.id

Sasarannya: pemegang server cukup menjalankan **`git pull`**, dan portal
berubah ke versi terbaru dengan sendirinya.

Itu bisa dicapai, tetapi **tidak dengan `git pull` saja pada pemasangan v1
yang sekarang.** Alasannya struktural, dan perlu dipahami sebelum menyiapkan:

| | v1 | v2 |
|---|---|---|
| Bentuk | Satu aplikasi Laravel + Blade | Laravel API **+** Next.js terpisah |
| Proses | PHP-FPM saja | PHP-FPM **dan** Node |
| Sesudah tarik kode | Langsung berlaku | Harus `composer install`, `npm ci`, **`npm run build`** |

Berkas hasil `git pull` tidak menjalankan dirinya sendiri. Next.js harus
dibangun lebih dulu, dan hasilnya dilayani proses Node yang harus hidup terus.

Karena itu penyiapannya dibagi dua: **satu kali di awal**, lalu **`git pull`
seterusnya**.

---

## PERINGATAN — jangan hapus direktori v1

Setelah cutover, v1 memang berhenti melayani. Tetapi **direktorinya harus
tetap ada**, karena `public/uploads` dan `public/assets_landing` miliknya masih
menyimpan berkas yang dilayani v2: 22 foto fasilitas, berkas surat, gambar
berita, dan seterusnya. `LEGACY_UPLOADS_PATH` dan `LEGACY_PUBLIC_PATH` menunjuk
ke sana.

Yang dimatikan adalah **vhost-nya**, bukan berkasnya.

---

## Bagian 1 — Penyiapan sekali di awal

Dikerjakan seorang yang punya akses SSH dan sudo. Sesudah ini, tidak perlu
diulang.

### 1.1 Prasyarat di server

```bash
php -v          # 8.2+
composer -V
node -v         # 20+
npm -v
pm2 -v          # npm i -g pm2  (bila belum ada)
```

### 1.2 Klon v2 di direktori BARU

v2 tidak ditumpangkan ke direktori v1. Keduanya hidup berdampingan; v1 tinggal
sebagai gudang berkas.

```bash
cd /var/www
git clone https://github.com/RizaniHusyairi/AIAIS.git aiais
cd aiais
```

### 1.3 Isi berkas `.env`

Keduanya **tidak ikut git** dan harus dibuat manual — itu memang disengaja,
sandi basis data tidak boleh masuk repositori.

```bash
cp backend/.env.example backend/.env
php backend/artisan key:generate
```

Yang wajib diisi di `backend/.env`:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://aptpairport.id
FRONTEND_URL=https://aptpairport.id

DB_DATABASE=db_apt          # basis data v1 — lihat docs/CUTOVER.md

# Menunjuk ke direktori v1 yang TIDAK dihapus.
LEGACY_UPLOADS_PATH=/var/www/aptp-airport-main/public/uploads
LEGACY_UPLOADS_URL=/uploads
LEGACY_PUBLIC_PATH=/var/www/aptp-airport-main/public

# Wajib beres sebelum fitur lupa-sandi dipublikasikan; tanpa ini ia gagal senyap.
MAIL_MAILER=smtp
MAIL_HOST=...
```

Lalu `frontend/.env.production`:

```dotenv
NEXT_PUBLIC_API_ORIGIN=https://aptpairport.id
NEXT_PUBLIC_API_VERSION=v2
```

Yang diisi **asal server**, bukan URL penuh. `lib/api.ts` menyusun sendiri
`https://aptpairport.id/api/v2` dari kedua nilai itu. `NEXT_PUBLIC_API_URL`
memang tersedia sebagai override, tetapi menang atas keduanya — mengisinya
`https://aptpairport.id/api` (tanpa `/v2`) membuat panggilan backend mendarat
di Route Handler Next.js sendiri, bukan di Laravel.

### 1.4 Penggelaran pertama

```bash
./deploy.sh
```

### 1.5 Tautan penyimpanan dan cron

**Tautan penyimpanan.** Tanpa ini, setiap gambar yang diunggah lewat panel —
foto aset, foto suku cadang, salinan unggahan Instagram — membalas 403.
Gejalanya membingungkan: datanya ada di basis data, hanya gambarnya yang tidak
pernah muncul.

```bash
cd /var/www/aiais/backend && php artisan storage:link
```

**Cron.** Portal punya pekerjaan terjadwal (sinkronisasi Instagram tiap 3 jam,
penyegaran tokennya harian, pemusnahan laporan kehilangan bulanan) **dan
pemroses antrean tiap menit**. Tanpa satu baris ini, semuanya **tidak pernah
berjalan** — dan tidak ada galat apa pun; isinya sekadar tidak berubah, yang
jauh lebih sulit dikenali daripada kegagalan yang berisik.

Khusus untuk notifikasi, akibatnya paling menyesatkan: lonceng di panel tetap
terisi (kanal itu berjalan langsung), sehingga sekilas semuanya tampak normal —
sementara WhatsApp dan push tidak pernah terkirim satu pun, dan pekerjaannya
menumpuk di tabel `jobs`.

```bash
crontab -e
```

```
* * * * * cd /var/www/aiais/backend && php artisan schedule:run >> /dev/null 2>&1
```

Periksa jadwalnya terbaca:

```bash
php artisan schedule:list
```

### 1.6 Jalankan frontend sebagai layanan

```bash
cd /var/www/aiais/frontend
pm2 start npm --name aiais-frontend -- start
pm2 save
pm2 startup          # ikuti perintah yang dicetaknya, agar hidup lagi sesudah reboot
```

### 1.7 Arahkan web server

Nginx meneruskan `/api/v2` ke Laravel dan **sisanya** ke Next.js:

```nginx
server {
    server_name aptpairport.id;
    root /var/www/aiais/backend/public;

    # Unggahan panel admin (scan KTP, lampiran surat) melebihi default 1 MB.
    client_max_body_size 25m;

    # Berkas warisan v1 dilayani langsung dari direktori lamanya.
    location /uploads/ {
        alias /var/www/aptp-airport-main/public/uploads/;
        access_log off;
    }

    # Unggahan v2, lewat `php artisan storage:link`.
    location /storage/ {
        try_files $uri =404;
        access_log off;
    }

    # HANYA prefiks versi kontrak yang milik Laravel — lihat catatan di bawah.
    location /api/v2 {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # Selebihnya ke Next.js.
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Satu alamat, dua isi: pengunjung ponsel dialihkan ke /app sedangkan
        # desktop dan perayap tidak (src/proxy.ts). Tanpa baris ini, cache
        # bersama di depan portal boleh menyajikan satu salinan kepada
        # keduanya — dan yang paling merugikan adalah salinan milik Googlebot
        # sampai ke pengunjung, atau sebaliknya.
        #
        # HARUS di Nginx. Next 16 menulis sendiri header Vary pada respons
        # halaman (rsc, next-router-state-tree, ...) dan menimpa apa pun yang
        # disetel dari middleware maupun dari `headers()` di next.config.ts;
        # keduanya sudah dicoba dan tidak bertahan. `add_header` di sini
        # berjalan sesudahnya.
        add_header Vary "User-Agent" always;
    }
}
```

**`/api` bukan milik Laravel seorang diri.** Frontend punya Route Handler
sendiri di bawah prefiks yang sama:

| Path | Dilayani |
|---|---|
| `/api/v2/*` | Laravel — `backend/routes/api.php` |
| `/api/session/login`, `/logout`, `/register` | Next.js — menukar kredensial jadi cookie `httpOnly` |
| `/api/admin/*`, `/api/akun/*`, `/api/auth/*` | Next.js — proksi bersesi |

Karena itu aturannya `location /api/v2`, bukan `location /api`. Yang terakhir
merampas `/api/session/login` dan melemparnya ke PHP-FPM, sehingga **login
panel mati dengan 502** sementara seluruh halaman lain tampak sehat — gejala
yang menyesatkan, karena tidak ada yang salah pada Laravel maupun kredensialnya.

`X-Forwarded-Proto` bukan pelengkap: tanpa itu cookie sesi tidak ditandai
`Secure` di produksi.

Periksa nama soket PHP-FPM sebelum memuat ulang — `ls /run/php/`. Bila server
memakai PHP 8.3, kedua `fastcgi_pass` di atas harus ikut disesuaikan, kalau
tidak `/api/v2` menjawab 502.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 1.8 Nyalakan penggelaran otomatis

Inilah langkah yang membuat `git pull` cukup:

```bash
cd /var/www/aiais
git config core.hooksPath .githooks
echo 'export AIAIS_DEPLOY_TARGET=server' >> ~/.bashrc
source ~/.bashrc
```

Dua baris, dua maksud berbeda. `core.hooksPath` mengaktifkan hook (direktori
`.git/hooks` tidak ikut terlacak git, jadi hook harus ditunjuk). Variabel
`AIAIS_DEPLOY_TARGET` memastikan penggelaran **hanya berjalan di server** —
tanpa itu, `git pull` di laptop siapa pun ikut membangun ulang dan memuat ulang
layanan.

---

## Bagian 2 — Seterusnya

```bash
cd /var/www/aiais
git pull
```

Selesai. Hook `post-merge` memanggil `deploy.sh`, yang menjalankan:

1. `composer install --no-dev`
2. `php artisan migrate --force` — **aditif saja**
3. `config:cache`, `route:cache`, `view:cache`
4. `npm ci`
5. `npm run build`
6. `pm2 reload aiais-frontend`

Skrip berhenti pada galat pertama. Bila gagal di tengah, **layanan tidak dimuat
ulang** — versi lama tetap melayani pengunjung sampai penyebabnya dibereskan.

### Yang TIDAK dilakukan skrip ini, dan tidak akan pernah

`migrate:fresh`, `migrate:rollback`, `db:wipe`, `db:seed`. Portal berjalan di
atas basis data produksi yang tidak tergantikan. Kode di `AppServiceProvider`
sudah menolak perintah-perintah itu; skrip ini tidak memanggilnya sama sekali
sebagai lapis kedua.

### Bila perlu memutar balik

```bash
git log --oneline -5
git checkout <commit-sebelumnya>
./deploy.sh
```

Kode kembali, **tetapi migrasi tidak ikut mundur** — dan memang tidak boleh:
seluruh migrasi v2 bersifat aditif, jadi kode lama tetap berjalan di atas skema
yang lebih baru. `migrate:rollback` justru berbahaya di sini.

---

## Notifikasi petugas — prasyarat di luar kode

Portal memberi tahu petugas saat ada kiriman baru lewat Pusat Bantuan
(pengaduan, chat, laporan kehilangan, permohonan informasi, penilaian). Ada
tiga kanal, dan hanya yang pertama bekerja tanpa penyiapan apa pun.

### Lonceng di panel — sudah jalan

Tidak perlu disetel. Berjalan langsung tanpa antrean, tanpa pihak ketiga.

### Push peramban

Butuh sepasang kunci VAPID. Dibuat **sekali**, lalu jangan pernah diganti:
mengganti kunci membatalkan seluruh langganan yang sudah ada, dan tiap petugas
harus menyalakan notifikasinya lagi satu per satu tanpa diberi tahu.

```bash
cd /var/www/aiais/backend
php -r 'require "vendor/autoload.php";
  $k = Minishlink\WebPush\VAPID::createVapidKeys();
  echo "WEBPUSH_PUBLIC_KEY={$k["publicKey"]}\nWEBPUSH_PRIVATE_KEY={$k["privateKey"]}\n";'
```

Tempel keduanya ke `backend/.env` bersama:

```dotenv
WEBPUSH_ENABLED=true
WEBPUSH_SUBJECT=mailto:mail.aptpranotoairport@gmail.com
```

Petugas menyalakannya sendiri per perangkat lewat **/admin/notifikasi →
Nyalakan di perangkat ini**. Izin notifikasi hanya dapat diminta dari klik
pemakai, jadi tidak ada cara menyalakannya dari sisi server.

Di iPhone, portal harus dipasang ke layar utama lebih dulu (Bagikan → Tambahkan
ke Layar Utama); Safari tidak melayani push pada tab biasa.

### WhatsApp

Portal memakai **gateway milik bandara sendiri**, `https://wg.aptpairport.id`.
Bentuk permintaannya sudah menjadi nilai bawaan di `backend/config/whatsapp.php`,
jadi yang perlu ada di `.env` hanya ini:

```dotenv
WA_ENABLED=true
WA_TOKEN=wag_<prefix>.<secret>     # dibuat di menu API Keys gateway
WA_RECIPIENTS=628xxxxxxxxxx        # boleh beberapa, dipisah koma
WA_DAILY_CAP=200
# WA_DEVICE_ID=1                   # hanya bila kunci tidak punya perangkat bawaan
```

Kunci API-nya harus punya scope **`message.send`**. Sesudah menyunting `.env`,
jalankan `php artisan config:clear` — Laravel menyimpan konfigurasi ke cache dan
nilai lama akan terus dipakai.

Bawaan yang sudah terpasang untuk gateway ini:

| Variabel | Nilai | Keterangan |
|---|---|---|
| `WA_ENDPOINT` | `https://wg.aptpairport.id/api/v1/messages/send` | |
| `WA_AUTH_HEADER` | `X-API-Key` | kunci telanjang, tanpa awalan `Bearer` |
| `WA_FORMAT` | `json` | gateway menolak `form`; galatnya tidak menyebut sebabnya |
| `WA_FIELD_TARGET` | `to` | |
| `WA_FIELD_MESSAGE` | `body` | |

Untuk berpindah ke Fonnte, Wablas, atau sejenisnya cukup mengubah kelima
variabel itu — tidak ada kode yang perlu disentuh. Padanan Fonnte tercantum di
`backend/config/whatsapp.php`.

Gateway ini membalas dengan amplop `{ success, message, data }` dan dapat
**menolak pesan sambil tetap membalas HTTP 200** (kunci tanpa scope, nomor tidak
terdaftar di WhatsApp, perangkat terputus). `WhatsAppGateway` karena itu memeriksa
`success` pada badan balasan, bukan hanya status HTTP — penolakan seperti itu
tidak boleh terhitung sebagai terkirim dan tidak boleh memakan kuota harian.

> **Nomor pengirimnya WAJIB nomor bot terpisah — bukan nomor layanan publik
> bandara.**
>
> Gateway semacam ini menumpang WhatsApp Web tanpa izin Meta — **termasuk
> gateway milik sendiri**. Memilikinya sendiri menghilangkan risiko kebocoran ke
> vendor, tetapi tidak menghilangkan risiko pemblokiran: yang melarang adalah
> ketentuan layanan WhatsApp, bukan penyedia gateway. Nomor yang dipakai **dapat
> diblokir permanen** kapan saja. Bila itu terjadi pada nomor bot, yang hilang
> hanya kanal notifikasi internal; lonceng panel dan push tetap berjalan. Bila
> itu terjadi pada nomor layanan resmi, yang hilang adalah kanal bandara ke
> masyarakat.

**Isi pesannya sengaja hanya jenis kiriman, nomor tiket, dan tautan panel** —
tanpa nama, nomor ponsel, maupun isi laporan warga. Pesan WhatsApp melewati
server penyedia gateway yang tidak terikat perjanjian pemrosesan data apa pun.
Jangan menambahkan rincian ke dalamnya.

### Memastikan semuanya hidup

Buka **/admin/notifikasi** lalu tekan **Kirim Notifikasi Uji**. Lonceng terisi
seketika; WhatsApp dan push menyusul dalam satu menit (menunggu giliran cron).
Bila keduanya tidak datang, periksa baris cron pada 1.5 lebih dulu — itu
penyebab yang paling sering.

---

## Instagram di beranda — prasyarat di luar kode

Seksi "Informasi Terbaru" pada beranda menarik unggahan
**@aptpranotoairport**. Kodenya sudah siap; empat hal berikut ada di luar repo
dan tanpa keempatnya seksi itu tidak akan pernah terisi.

1. **Akun harus Business atau Creator.** Akun personal tidak dilayani API
   Instagram sama sekali.
2. **Aplikasi Meta Developer + App Review** untuk izin
   `instagram_business_basic`. Instagram Basic Display API dimatikan Meta pada
   4 Desember 2024, jadi tidak ada jalan pintas yang lebih ringan.
3. **Token dipasang lewat panel** — `/admin/instagram` → *Pasang Token*. Token
   diperiksa ke Instagram sebelum disimpan, jadi salah ketik ditolak saat itu
   juga.
4. **Cron pada 1.5 harus jalan.** Sinkronisasi dan penyegaran token keduanya
   bergantung padanya.

Sesudah tersambung, panel menampilkan **hitung mundur umur token**. Angka itu
yang perlu diperhatikan: token berumur ±60 hari, dan bila penyegaran otomatis
tidak berjalan, sambungannya putus tanpa gejala — beranda tetap menampilkan
unggahan lama dan tak seorang pun menyadarinya.

Selama belum tersambung, **seksinya tidak dirender sama sekali** di beranda —
bukan tampil kosong.

---

## Uji asap sesudah setiap penggelaran

- Halaman depan terbuka, jadwal penerbangan tampil.
- Satu halaman berkas warisan (mis. `/regulasi/surat-keputusan`) — berkasnya
  benar-benar terunduh, bukan 404. Ini yang paling cepat menangkap
  `LEGACY_*_PATH` yang keliru.
- `/admin` — masuk, dasbor terbuka.
- `/masuk` — halaman akun warga terbuka.

Versi yang sedang berjalan dapat diperiksa di `GET /api/v2/version`.

### Gejala yang menunjuk langsung ke penyebabnya

| Gejala | Penyebab paling mungkin |
|---|---|
| `pm2 reload` gagal, `Process or Namespace not found` | Langkah 1.6 belum dijalankan. Build sudah selesai; cukup `pm2 start` sekali, tidak perlu mengulang `deploy.sh`. |
| Login panel 502, halaman lain sehat | `location /api` merampas `/api/session/login`. Harus `location /api/v2` — lihat 1.7. |
| Login panel 503, "Tidak dapat terhubung ke server" | `NEXT_PUBLIC_API_ORIGIN` menunjuk alamat yang tidak melayani. Berbeda dari 502: di sini Next.js hidup, Laravel-nya yang tak terjangkau. |
| Seluruh portal 502 | Proses PM2 mati. `pm2 list`, lalu `pm2 logs aiais-frontend`. |
| Halaman terbuka tapi seluruh data kosong | Cron belum terpasang, atau `/api/v2` tidak sampai ke Laravel. Uji langsung: `curl -i https://aptpairport.id/api/v2/version`. |
