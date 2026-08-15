#!/usr/bin/env bash
#
# Penggelaran portal AIAIS v2 di server.
#
# Dipanggil otomatis oleh git hook `post-merge` (lihat .githooks/), sehingga
# pemegang server cukup menjalankan `git pull`. Dapat pula dijalankan sendiri:
#
#     ./deploy.sh
#
# ---------------------------------------------------------------------------
# YANG PERLU DIKETAHUI SEBELUM MENGUBAH BERKAS INI
# ---------------------------------------------------------------------------
#
# 1. Skrip ini TIDAK pernah menjalankan perintah yang menghapus data. Tidak ada
#    `migrate:fresh`, `migrate:rollback`, `db:seed`, maupun `db:wipe`. Portal
#    berjalan di atas basis data produksi v1 yang tidak tergantikan; kode di
#    AppServiceProvider pun menolak perintah itu, tetapi pertahanan berlapis
#    lebih murah daripada satu kali kehilangan data.
#
# 2. Urutannya disengaja: pasang dependensi → migrasi → bangun frontend →
#    baru muat ulang layanan. Memuat ulang lebih dulu berarti proses baru
#    berjalan di atas berkas yang belum lengkap.
#
# 3. Frontend dibangun SEBELUM proses lama dimuat ulang, bukan sesudah.
#    `npm run build` menulis ke `.next/` yang sedang dibaca proses berjalan,
#    jadi jeda layanannya dipersempit ke satu langkah `reload` di akhir.
#
# 4. Skrip berhenti pada galat pertama (`set -e`). Penggelaran yang separuh
#    jalan lalu dilaporkan "berhasil" jauh lebih berbahaya daripada gagal
#    dengan jelas.

set -euo pipefail

AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AKAR"

# Nama proses Node pada PM2. Samakan dengan yang dipakai saat penyiapan awal.
PM2_APP="${AIAIS_PM2_APP:-aiais-frontend}"

biru()  { printf '\033[1;34m%s\033[0m\n' "$*"; }
hijau() { printf '\033[1;32m%s\033[0m\n' "$*"; }
merah() { printf '\033[1;31m%s\033[0m\n' "$*" >&2; }

gagal() {
  merah "GAGAL pada langkah: $1"
  merah "Portal TIDAK dimuat ulang, jadi versi lama masih melayani pengunjung."
  exit 1
}

# --- Pemeriksaan awal -------------------------------------------------------

biru "[0/6] Memeriksa prasyarat"

for perintah in php composer node npm; do
  command -v "$perintah" >/dev/null 2>&1 || gagal "perintah '$perintah' tidak ditemukan"
done

[ -f backend/.env ]  || gagal "backend/.env tidak ada — salin dari .env.example lalu isi"
[ -f frontend/.env.production ] || [ -f frontend/.env ] \
  || gagal "frontend/.env.production tidak ada"

# .env sengaja tidak ikut git. Bila berkas contohnya bertambah kunci baru,
# penggelaran akan tetap jalan tetapi kuncinya kosong — karena itu diingatkan.
if ! diff <(grep -oE '^[A-Z_]+=' backend/.env.example | sort) \
          <(grep -oE '^[A-Z_]+=' backend/.env | sort) >/dev/null 2>&1; then
  merah "PERINGATAN: kunci di backend/.env berbeda dari .env.example."
  merah "            Periksa apakah ada pengaturan baru yang belum diisi."
fi

# --- Backend ----------------------------------------------------------------

biru "[1/6] Memasang dependensi backend"
( cd backend && composer install --no-dev --optimize-autoloader --no-interaction ) \
  || gagal "composer install"

biru "[2/6] Menjalankan migrasi aditif"
# Hanya `migrate`. Migrasi v2 dicatat di tabel `migrations_v2` dan tidak
# menyentuh tabel `migrations` milik v1.
( cd backend && php artisan migrate --force ) || gagal "migrasi"

biru "[3/6] Menyegarkan cache backend"
(
  cd backend
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
) || gagal "cache backend"

# --- Frontend ---------------------------------------------------------------

biru "[4/6] Memasang dependensi frontend"
# `npm ci` bukan `npm install`: ia mengikuti package-lock.json persis, sehingga
# yang terpasang di server sama dengan yang diuji di mesin pengembangan.
( cd frontend && npm ci ) || gagal "npm ci"

biru "[5/6] Membangun frontend"
( cd frontend && npm run build ) || gagal "npm run build"

# --- Muat ulang layanan -----------------------------------------------------

biru "[6/6] Memuat ulang layanan"

if command -v pm2 >/dev/null 2>&1; then
  # `reload` bukan `restart`: PM2 menyalakan proses baru lebih dulu, baru
  # mematikan yang lama — pengunjung tidak menemui layar galat.
  pm2 reload "$PM2_APP" --update-env || gagal "pm2 reload $PM2_APP"
else
  merah "PM2 tidak ditemukan — frontend TIDAK dimuat ulang."
  merah "Muat ulang prosesnya sendiri agar hasil build yang baru terpakai."
fi

# PHP-FPM memuat kode per permintaan, tetapi opcache menyimpan bytecode-nya.
# Tanpa muat ulang, perubahan PHP baru terlihat setelah cache kedaluwarsa.
if command -v systemctl >/dev/null 2>&1 && systemctl list-units --type=service 2>/dev/null | grep -q php.*fpm; then
  sudo systemctl reload "$(systemctl list-units --type=service --no-legend 2>/dev/null | grep -o 'php[0-9.]*-fpm.service' | head -1)" 2>/dev/null \
    || merah "PERINGATAN: php-fpm tidak dapat dimuat ulang otomatis. Jalankan manual bila perubahan PHP belum terlihat."
fi

hijau ""
hijau "Penggelaran selesai."
hijau "Versi produk: $(cat VERSION 2>/dev/null || echo '(tidak terbaca)')"
hijau ""
hijau "Periksa: buka portal, lalu masuk ke /admin dan pastikan dasbornya terbuka."
