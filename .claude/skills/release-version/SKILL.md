---
name: release-version
description: Naikkan versi produk AIAIS sesuai docs/RELEASING.md — sunting VERSION, cermin package.json, pindahkan CHANGELOG, tag beranotasi, cache backend, build frontend, lalu verifikasi. Pakai saat diminta rilis/bump versi (mis. "naikkan ke 2.0.0-beta.1", "buat tag rilis").
---

# Prosedur rilis AIAIS

Sumber kebenaran penuh ada di `docs/RELEASING.md` — baca bila ada keraguan. Di bawah ini versi ringkas untuk dieksekusi.

## Aturan induk

**`VERSION` (root proyek) adalah satu-satunya tempat mengetik angka versi.** Semua yang lain menurunkan atau mencerminkannya. Kalau dua angka berbeda muncul di sistem, penyebabnya selalu langkah yang terlewat — bukan sumber kebenaran baru.

## Urutan eksekusi

1. Sunting `VERSION` → angka baru (mis. `2.0.0-beta.1`).
2. Cerminkan ke frontend: `cd frontend && npm version <v> --no-git-tag-version`.
3. `CHANGELOG.md`: pindahkan isi `[Unreleased]` ke bagian `## [v] - YYYY-MM-DD`.
4. Commit `chore(release): v<v>` + tag beranotasi `v<v>` — **hanya bila user meminta**; jangan commit/push/tag sendiri.
5. Backend (WAJIB — inilah yang memunculkan angkanya):
   `php artisan optimize:clear && php artisan config:cache && php artisan route:cache`
6. Frontend: `cd frontend && npm run build` (inline versi + rotasi cache service worker).
7. Verifikasi (di bawah), lalu `git push && git push --tags` bila diminta.

Galat klasik: *"kenapa `/version` masih alpha padahal VERSION sudah beta"* → langkah 5 terlewat. `config:cache` membekukan nilai lama.

## Verifikasi setelah rilis

```bash
cat VERSION
node -p "require('./frontend/package.json').version"
cd backend && php artisan tinker --execute="echo config('app.version');"
php artisan route:list --path=version        # GET api/v2/version
curl http://127.0.0.1:8000/api/v2/version
grep -r "<versi>" frontend/.next/static | head
```

Lalu di browser: footer publik, `/app/profil`, dan sidebar `/admin` menampilkan angka yang sama; panel admin tidak menampilkan peringatan selisih versi; Service Worker aktif dengan `?v=<versi baru>` dan Cache Storage hanya berisi `apt-pranoto-<versi baru>`.

## Tiga sumbu versi — jangan tertukar

| Sumbu | Tempat | Kapan naik |
|---|---|---|
| Versi produk | `VERSION` | Saat produk dirilis |
| Versi kontrak API | `backend/config/api.php` | Hanya saat bentuk data berubah dan merusak klien lama |
| Versi cache aset | otomatis dari versi produk | Tiap rilis, tanpa disunting |

Versi kontrak API **tidak** ikut naik hanya karena produk naik — mengubah `/api/v2` menjadi `v3` tanpa perubahan kontrak menghabiskan satu-satunya ruang penanda perubahan kontrak.

## Saat rilis `2.0.0` final

Menyentuh dua repositori pada hari yang sama (repo lama `aptp-airport-main` ditandai Deprecated, tag `v1.0.0` dipertahankan sebagai rollback). Detailnya ada di `docs/RELEASING.md`.
