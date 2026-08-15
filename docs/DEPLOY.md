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
NEXT_PUBLIC_API_URL=https://aptpairport.id/api
NEXT_PUBLIC_API_VERSION=v2
```

### 1.4 Penggelaran pertama

```bash
./deploy.sh
```

### 1.5 Jalankan frontend sebagai layanan

```bash
cd /var/www/aiais/frontend
pm2 start npm --name aiais-frontend -- start
pm2 save
pm2 startup          # ikuti perintah yang dicetaknya, agar hidup lagi sesudah reboot
```

### 1.6 Arahkan web server

Nginx meneruskan `/api` ke Laravel dan sisanya ke Next.js:

```nginx
server {
    server_name aptpairport.id;
    root /var/www/aiais/backend/public;

    # Berkas warisan v1 dilayani langsung dari direktori lamanya.
    location /uploads/ {
        alias /var/www/aptp-airport-main/public/uploads/;
        access_log off;
    }

    location /api {
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
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

`X-Forwarded-Proto` bukan pelengkap: tanpa itu cookie sesi tidak ditandai
`Secure` di produksi.

### 1.7 Nyalakan penggelaran otomatis

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

## Uji asap sesudah setiap penggelaran

- Halaman depan terbuka, jadwal penerbangan tampil.
- Satu halaman berkas warisan (mis. `/regulasi/surat-keputusan`) — berkasnya
  benar-benar terunduh, bukan 404. Ini yang paling cepat menangkap
  `LEGACY_*_PATH` yang keliru.
- `/admin` — masuk, dasbor terbuka.
- `/masuk` — halaman akun warga terbuka.

Versi yang sedang berjalan dapat diperiksa di `GET /api/v2/version`.
