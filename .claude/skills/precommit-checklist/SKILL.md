---
name: precommit-checklist
description: Pemeriksaan kualitas sebelum perubahan AIAIS dianggap selesai — lint, tes, migrasi, konvensi lintas lapisan, dan review diff. Pakai menjelang akhir tugas yang mengubah kode (backend/frontend) untuk memastikan tidak ada lapisan yang terlewat.
---

# Checklist kualitas sebelum selesai

Jalankan sebelum menyatakan tugas selesai. Bila berkas yang disentuh hanya satu sisi, sesuaikan — tidak perlu menjalankan keduanya.

## Perintah validasi (paralel)

```bash
cd backend && composer test
cd frontend && npm run lint
```

Untuk perubahan yang menyentuh tipe/API: `cd frontend && npm run build` (atau `tsc --noEmit`) agar ketidakselarasan tipe tertangkap.

## Backend

- Semua respons controller lewat `App\Helpers\ApiResponse` — bukan `response()->json()` mentah.
- Pesan validasi ditulis bahasa Indonesia lewat argumen ketiga `$request->validate()`.
- Tidak ada kolom `enum` baru — `string` + konstanta kelas (`public const TYPES/STATUSES/CATEGORIES`).
- Endpoint tulis berada di grup `admin` (kecuali alasan hukum/produk + `throttle`).
- `php artisan migrate --seed` berjalan mulus; seeder berisi blok provenans bila data nyata.
- Respons publik ber-tiket lewat `publicView()` — jangan bocorkan identitas pelapor/visitor.

## Frontend

- Tidak ada URL API literal di luar `lib/api.ts` — impor `API_BASE_URL`.
- Tipe domain di `types/index.ts` selaras JSON backend, termasuk field `$appends`.
- `adminFetch` untuk JSON, `adminUpload` untuk multipart, `adminDownload` untuk berkas privat — jangan tertukar.
- Halaman publik mengekspor `metadata` + `alternates.canonical`.
- Kit admin (`@/components/admin/ui`) dipakai untuk tabel/modal — jangan membuat komponen sendiri.

## Lintas lapisan

- **Publik menyaring, admin menampilkan semua** — daftar publik hanya data yang dapat dipakai; admin lengkap dengan penanda.
- Rute baru terdaftar di `Navbar.tsx` (publik), `app/admin/layout.tsx` (admin), dan `toAppRoute()` + `matcher` di `src/proxy.ts` (ponsel).
- Komentar menjelaskan *kenapa*, bukan *apa* — sesuai kepadatan berkas sekitarnya.
- Referensi simbol yang diubah sudah diperbarui (telusuri dengan code-searcher).

## Review

- Minta `code-reviewer-deepseek-flash` meninjau diff setelah perubahan signifikan.
- Laporkan berkas yang disentuh, dan sebut eksplisit bila ada lapisan yang sengaja dilewati.

## Yang jangan dilakukan

- Menyerahkan perubahan yang belum dicoba dijalankan/lint.
- Menambah fitur di luar permintaan sambil "sekalian".
- Mengubah konvensi yang sudah ada tanpa alasan yang dikomentari.
