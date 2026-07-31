# Prosedur Rilis

Aturan induk: **`VERSION` adalah satu-satunya tempat Anda mengetik angka
versi.** Semua yang lain menurunkan atau mencerminkan nilainya. Kalau suatu
saat ada dua angka berbeda di sistem, penyebabnya selalu langkah yang
terlewat di bawah — bukan sumber kebenaran yang bertambah.

## Alur versi

```
2.0.0-alpha.N   pengembangan aktif, fitur masih berubah
2.0.0-beta.N    fitur lengkap, sedang diuji
2.0.0-rc.N      kandidat rilis, hanya perbaikan kritis
2.0.0           menggantikan aptpairport.id (v1.0.0)
```

Setelah `2.0.0`: perbaikan → `2.0.1`, fitur baru → `2.1.0`, perubahan besar →
`3.0.0`.

## Langkah menaikkan versi

```bash
# 1. Satu-satunya tempat mengetik angka
#    sunting: d:\script\AIAIS\VERSION      -> mis. 2.0.0-beta.1

# 2. Samakan cermin di package.json
cd frontend && npm version 2.0.0-beta.1 --no-git-tag-version && cd ..

# 3. CHANGELOG.md: pindahkan isi [Unreleased] ke bagian rilis baru
#    ## [2.0.0-beta.1] - YYYY-MM-DD

# 4. Commit
git add -A
git commit -m "chore(release): v2.0.0-beta.1"

# 5. Tag beranotasi (bukan lightweight)
git tag -a v2.0.0-beta.1 -m "AIAIS v2.0.0-beta.1"

# 6. Backend — WAJIB, ini yang memunculkan angkanya
cd backend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
cd ..

# 7. Frontend — inline ulang versi + rotasi cache service worker
cd frontend && npm run build && cd ..

# 8. Verifikasi (lihat di bawah), lalu dorong
git push && git push --tags
```

**Langkah 6 dan 7 yang benar-benar membuat angka baru muncul.** Melewatkan
langkah 6 adalah penyebab klasik keluhan "kenapa `/version` masih alpha
padahal `VERSION` sudah beta" — `config:cache` membekukan nilai lama.

## Verifikasi setelah rilis

```bash
# Sumber kebenaran dan cerminnya sama
cat VERSION
node -p "require('./frontend/package.json').version"

# Backend membaca angka yang sama, termasuk setelah config di-cache
cd backend && php artisan tinker --execute="echo config('app.version');"

# Endpoint hidup pada prefiks yang benar
php artisan route:list --path=version        # GET api/v2/version
curl http://127.0.0.1:8000/api/v2/version

# Bukti versi benar-benar ter-inline ke bundel klien
grep -r "2.0.0-beta.1" frontend/.next/static | head
```

Lalu buka di browser:

- Footer portal publik, halaman `/app/profil`, dan sidebar `/admin` —
  ketiganya menampilkan angka yang sama.
- Panel admin **tidak** menampilkan peringatan selisih versi. Kalau muncul,
  langkah 6 atau 7 terlewat.
- DevTools → Application → Service Workers: URL skrip berakhiran
  `?v=<versi baru>` dan berstatus *activated*; Cache Storage hanya memuat
  `apt-pranoto-<versi baru>`, kunci versi lama sudah terhapus.

## Saat merilis `2.0.0` final

Rilis final menyentuh **dua repositori pada hari yang sama**, kalau tidak
ceritanya berhenti benar:

1. Naikkan `VERSION` ke `2.0.0` dan buat tag `v2.0.0` — dalam sesi yang sama
   dengan pemindahan DNS/host dari aptpairport.id.
2. Di repositori lama (`aptp-airport-main`), tambahkan entri CHANGELOG:
   `### Deprecated — digantikan oleh AIAIS v2.0.0 per <tanggal>`.
3. Jangan menghapus atau menimpa tag `v1.0.0` pada repo lama. Ia tetap menjadi
   titik rollback bila peralihan perlu dibatalkan.

## Tiga sumbu versi — jangan tertukar

| Sumbu | Tempat | Kapan naik |
|---|---|---|
| Versi produk | `VERSION` | Saat produk dirilis |
| Versi kontrak API | `backend/config/api.php` | Hanya saat bentuk data berubah dan merusak klien lama |
| Versi cache aset | otomatis dari versi produk | Tiap rilis, tanpa disunting |

Versi kontrak API **tidak** ikut naik hanya karena produk naik. Kalau
`/api/v2` diubah menjadi `v3` tanpa perubahan kontrak, tidak ada ruang tersisa
untuk menandai perubahan kontrak yang sesungguhnya nanti.
