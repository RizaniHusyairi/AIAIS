# Prosedur Cutover v1 → v2

Portal v2 tidak memindahkan data. Ia mengambil alih basis data portal v1
(`db_apt`) di tempat, lalu v1 dimatikan. Karena itu tidak ada "salinan v2" yang
bisa dipakai memulihkan keadaan bila ada yang salah — **cadangan adalah satu-
satunya jaring pengaman**, dan dokumen ini ada supaya langkahnya tidak
diimprovisasi pada malam peluncuran.

---

## Pengaman yang sudah tertanam di kode

`AppServiceProvider::guardIrreplaceableData()` menolak `migrate:fresh`,
`migrate:refresh`, `migrate:reset`, `migrate:rollback`, dan `db:wipe` setiap
kali `DB_DATABASE` menunjuk salah satu nama di `config/legacy.php`
(`protected_databases`), terlepas dari nilai `APP_ENV`.

`php artisan migrate` biasa **tetap diizinkan** — itu memang yang dibutuhkan
saat cutover.

Kalau menambah nama basis data produksi baru, daftarkan di
`config/legacy.php`. Jangan melonggarkan pengamannya untuk kenyamanan sesaat.

---

## Prasyarat — periksa sebelum menjadwalkan cutover

- [ ] **Migrasi v2 sudah tidak membuat ulang tabel milik v1.** Ini yang paling
      sering terlewat. `php artisan migrate` di atas `db_apt` akan menjalankan
      seluruh migrasi v2 dari nol (tabel pencatatnya `migrations_v2`, kosong di
      basis data v1 yang `migrations`-nya sudah berisi 87 baris milik v1). Bila migrasi `create_users_table` dan kawan-kawannya
      masih ada, migrasi akan gagal di tengah jalan — atau lebih buruk, separuh
      berhasil. Sebelum cutover, migrasi v2 harus tinggal yang **aditif** saja.
- [ ] Seluruh fungsi v1 sudah punya padanan di v2 (v1 dimatikan sekaligus).
- [ ] v2 sudah diuji di atas salinan `db_apt` hasil restore dump produksi
      terbaru, bukan basis data contoh.
- [ ] `php artisan migrate` sudah dicoba di atas salinan itu, dan **aplikasi v1
      masih berjalan normal sesudahnya** — pembuktian bahwa migrasinya benar-
      benar aditif.
- [ ] `LEGACY_UPLOADS_PATH` di server produksi menunjuk `public/uploads` v1
      yang sebenarnya.
- [ ] **SMTP sudah dikonfigurasi.** `MAIL_MAILER` masih `log`, artinya surel
      hanya ditulis ke berkas log dan tidak pernah terkirim. Fitur lupa-sandi
      akan tampak berhasil bagi pengguna sementara tautannya tidak pernah
      sampai. Isi `MAIL_*` dan kirim satu surel uji sebelum cutover.
- [ ] **`FRONTEND_URL` menunjuk alamat portal produksi.** Nilai inilah yang
      menyusun tautan reset kata sandi di dalam surel; bila masih
      `localhost:3000`, penerima surel mendarat di mesin mereka sendiri.
- [ ] **Umumkan bahwa seluruh petugas harus masuk ulang sekali.** Masa berlaku
      token kini 8 jam dan dihitung dari saat diterbitkan, sehingga token lama
      yang masih beredar langsung tidak berlaku begitu perubahan digelar.

---

## 1. Cadangan

Jalankan di server produksi. Simpan hasilnya **di luar server** (unduh ke mesin
lain atau salin ke penyimpanan terpisah) — cadangan yang ikut hilang bersama
servernya bukan cadangan.

```bash
STAMP=$(date +%Y%m%d-%H%M)
BACKUP=~/cutover-backup-$STAMP
mkdir -p "$BACKUP"

# Basis data. --single-transaction agar tidak mengunci tabel selama dump.
mysqldump -u root -p \
  --single-transaction --routines --triggers --events \
  db_apt > "$BACKUP/db_apt.sql"

# Berkas unggahan. Sesuaikan lintasannya dengan pemasangan v1 di server.
tar -czf "$BACKUP/uploads.tar.gz" -C /path/ke/aptp-airport-main/public uploads

# Konfigurasi v1, untuk berjaga-jaga.
cp /path/ke/aptp-airport-main/.env "$BACKUP/v1.env"

ls -lh "$BACKUP"
```

Di Windows/Laragon, `mysqldump.exe` ada di
`C:\laragon\bin\mysql\<versi>\bin\`.

### Verifikasi cadangannya — jangan dilewati

Dump yang tidak pernah dicoba di-restore bukan cadangan, melainkan harapan.

```bash
mysql -u root -p -e "CREATE DATABASE db_apt_restore_test"
mysql -u root -p db_apt_restore_test < "$BACKUP/db_apt.sql"

# Jumlah tabelnya harus sama dengan aslinya.
mysql -u root -p --skip-column-names -e "
  SELECT CONCAT('asli: ', (SELECT COUNT(*) FROM information_schema.tables
                           WHERE table_schema='db_apt')),
         CONCAT('restore: ', (SELECT COUNT(*) FROM information_schema.tables
                              WHERE table_schema='db_apt_restore_test'));"

mysql -u root -p -e "DROP DATABASE db_apt_restore_test"
```

Cocokkan juga jumlah baris beberapa tabel yang paling berharga —
`public_informations`, `persuratans`, `air_traffic_logs`, `nataru_flights`.

---

## 2. Cutover

```bash
# a. Hentikan v1 agar tidak ada tulisan baru yang masuk di tengah proses.
#    (matikan vhost-nya, atau alihkan ke halaman pemeliharaan)

# b. Arahkan v2 ke basis data v1.
#    backend/.env:
#      DB_DATABASE=db_apt
#      LEGACY_UPLOADS_PATH=/path/ke/aptp-airport-main/public/uploads
#      LEGACY_UPLOADS_URL=/uploads
#      LEGACY_PUBLIC_PATH=/path/ke/aptp-airport-main/public
#
#    LEGACY_PUBLIC_PATH bukan pelengkap. Sebagian kolom berkas menunjuk
#    `assets_landing/...` dan `uploads/...` — keduanya relatif terhadap
#    public/ v1, bukan terhadap direktori unggahan. Tanpa variabel ini,
#    seluruh 22 foto fasilitas dan sebagian surat tidak akan tampil.

# c. Jalankan migrasi aditif v2. Dicatat di `migrations_v2`, tidak menyentuh
#    tabel `migrations` milik v1.
php artisan migrate --force

# d. Bersihkan cache konfigurasi.
php artisan config:cache && php artisan route:cache

# e. Periksa lintasan berkas v1, lalu betulkan yang menyimpang. Dijalankan
#    SESUDAH v1 mati — langkah kedua menulis ulang kolom yang masih dibaca v1.
#
#    Tanpa --apply, command ini HANYA memeriksa dan tidak menulis apa pun.
#    Jalankan yang pertama lebih dulu dan CATAT angkanya; itulah pembanding
#    yang dipakai uji asap di bawah.
php artisan aiais:normalize-legacy-paths
php artisan aiais:normalize-legacy-paths --apply

#    Bacaan hasilnya:
#      "sudah benar"     → berkasnya ketemu, nilainya tidak diubah
#      "dibetulkan"      → nilainya salah tetapi berkasnya ditemukan di tempat lain
#      "URL penuh"       → dokumen yang masih dilayani server lain; dibiarkan
#      "tidak ditemukan" → PERIKSA dulu apakah direktori unggahan sudah tersalin
#                          lengkap sebelum menyimpulkan berkasnya hilang.
#                          Nilainya tidak pernah dikosongkan.

# f. Alihkan domain aptpairport.id ke v2, lalu pensiunkan v1.
```

### Uji asap sesudah cutover

- Halaman depan, berita, regulasi, PPID, layanan terbuka tanpa galat.
- Masuk ke panel admin dengan akun yang ada.
- Unggah satu berkas baru dari admin, pastikan tampil di halaman publik.
- Buka satu dokumen **lama** (unggahan era v1) — inilah yang membuktikan disk
  `legacy` terpasang benar.
- Hitung berkas yang gagal diselesaikan; bandingkan dengan angka sebelum
  `normalize-legacy-paths`.

---

## 3. Bila harus mundur

Selama basis datanya belum disentuh migrasi aditif, mundur cukup dengan
menyalakan kembali v1 dan mengembalikan domain. Sesudah migrasi berjalan:

```bash
# Kembalikan basis data ke keadaan sebelum cutover.
mysql -u root -p -e "DROP DATABASE db_apt; CREATE DATABASE db_apt"
mysql -u root -p db_apt < "$BACKUP/db_apt.sql"

# Kembalikan berkas bila ada yang berubah.
tar -xzf "$BACKUP/uploads.tar.gz" -C /path/ke/aptp-airport-main/public

# Nyalakan v1, kembalikan domain.
```

Migrasi v2 bersifat aditif, jadi secara teori v1 tetap berjalan meski tabel
tambahan v2 sudah ada. Restore penuh tetap cara yang paling pasti bila
keadaannya sudah tidak jelas.

---

## 4. Pasca-cutover

Setelah v2 stabil dan v1 dipensiunkan, v2 menjadi pemilik penuh `db_apt` dan
skemanya boleh dirapikan:

- enum → `string` + konstanta model, sesuai konvensi di `CLAUDE.md`
- kolom `documents` dinormalkan jadi JSON yang benar-benar JSON
- tabel sisa template booking dihapus: `countries`, `cities`, `airports`,
  `airlines`, `planes`, `flights`, `tickets`

Setiap langkah itu perusak dengan caranya sendiri. Ambil cadangan baru sebelum
masing-masing, dengan prosedur yang sama seperti di atas.
