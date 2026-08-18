# AIAIS — Panduan untuk Claude

Portal resmi & CMS Bandara APT Pranoto Samarinda. Monorepo: Laravel 13 API (`backend/`) + Next.js 16 App Router (`frontend/`).

Bahasa: **komentar kode, pesan API, dan teks UI ditulis dalam bahasa Indonesia.** Nama variabel/fungsi/kolom tetap Inggris. Ikuti kepadatan komentar berkas sekitarnya — modul yang ada menjelaskan *kenapa*, bukan *apa*.

---

## Menjalankan

```bash
# backend  → http://127.0.0.1:8000
cd backend && php artisan serve --port=8000
php artisan migrate --seed          # MySQL 8 via Laragon
composer test                       # phpunit

# frontend → http://localhost:3000
cd frontend && npm run dev
npm run lint
```

Versi produk ada di `VERSION` + `config('app.version')`. Versi **kontrak API** terpisah: `config/api.php` (backend) dan `NEXT_PUBLIC_API_VERSION` (frontend), saat ini `v2`.

---

## Backend (`backend/`)

**Struktur.** Semua controller API di `app/Http/Controllers/Api/`, satu per domain. Model di `app/Models/` tanpa sub-namespace. Tidak ada Resource/Request class — validasi dan bentuk respons ditangani di dalam controller.

**Respons.** Selalu lewat `App\Helpers\ApiResponse`:

```php
ApiResponse::success($data, 'Pesan bahasa Indonesia', $pagination = null, $code = 200);
ApiResponse::error('Pesan galat', $errors = null, $code = 400);
```

Bentuknya `{ success, message, data }` — frontend bergantung pada ketiga kunci ini.

**Routing** (`routes/api.php`). Satu grup `Route::prefix(config('api.version'))`, berisi:
- endpoint publik di tingkat atas (hanya `GET`, kecuali yang memang harus terbuka: `POST /complaints`, `/chat/*`, `/information-requests`, `/visits`);
- grup `admin` bermiddleware `auth:sanctum` untuk seluruh tulis-menulis.

Pola konvensional per modul: publik `index`/`show`; admin `adminIndex`, `store`, `update`, `destroy`. Nama method itu dipakai berulang — jangan mengarang nama baru.

Endpoint yang menerima **unggahan berkas** mendaftarkan `POST /{id}` di samping `PUT /{id}`, karena multipart tidak dapat dikirim lewat PUT dari browser (lihat rute `letters`).

**Berkas.** Unggahan publik ke disk `public` dengan nama `Str::uuid()` (nama asli kerap memuat spasi). Berkas sensitif (mis. scan KTP di `InformationRequestController`) ke disk privat dan hanya dilayani lewat endpoint admin bertoken.

**Migrasi.** Penamaan `YYYY_MM_DD_HHMMSS_*`. Hindari kolom `enum` — pakai `string` + aturan validasi, agar menambah nilai baru tidak memerlukan migrasi ALTER (lihat `letters.type` dan konstanta `Letter::TYPES`).

**Seeder.** Terdaftar di `DatabaseSeeder`. Aturan keras: **jangan mengarang data resmi.** Seeder yang memuat data portal v1 wajib mencantumkan blok provenans (sumber, tanggal ambil, catatan) seperti `LetterSeeder`. Kalau data aslinya kosong, biarkan kosong.

---

## Frontend (`frontend/src/`)

**Alamat API.** `lib/api.ts` adalah **satu-satunya** tempat URL API disusun. Impor `API_BASE_URL` dari sana; jangan menyusun ulang dari env di berkas lain.

**Klien.**
- Publik: `fetchApi()` dari `lib/api.ts`.
- Admin: `adminFetch<T>(path, { method, body })` dari `lib/adminApi.ts` — otomatis menempelkan Bearer token, dan pada 401 membersihkan sesi lalu melempar ke `/admin/login`. Untuk multipart pakai `adminUpload` (`adminFetch` selalu men-JSON-kan badan permintaan). Path yang diberikan **relatif terhadap `/admin`**, mis. `adminFetch('/letters')`.
- Semua mengembalikan `ApiResult<T> = { ok, data, message, status }`. Tangani `ok === false` dengan menampilkan `message` apa adanya — pesannya sudah berbahasa Indonesia dari backend.

Sesi admin disimpan di `localStorage` (`aiais_admin_token`, `aiais_admin_user`).

**Tipe.** Semua tipe data domain di `types/index.ts`, satu interface per model backend. Field turunan dari `$appends` ikut ditulis di sini (mis. `Letter.file_url`, `Letter.has_file`).

**Halaman admin.** `app/admin/<modul>/page.tsx`, `'use client'`, memakai kit `@/components/admin/ui` (`PageHeader`, `Panel`, `Btn`, `Badge`, `Field`, `Modal`, `ConfirmDialog`, `Toast`, `Loading`, `EmptyState`, `Table`, `Row`, `Cell`, `SearchBox`, `StatCard`, `InfoNote`, `stagger`). Jangan membuat komponen tabel/modal sendiri — kit ini sudah menanggung gaya panel admin.

**Halaman publik.** Server Component tipis yang mengekspor `metadata` (`title`, `description`, `alternates.canonical`) dan merender satu view `'use client'`. Bila dua rute berbagi tata letak, pisahkan view-nya dan bedakan lewat prop (`app/regulasi/RegulasiSuratView.tsx` melayani surat-keputusan dan surat-edaran).

Gaya visual publik: Tailwind v4, framer-motion, ikon lucide, hero gradien langit, `SkyParticles`, motif boarding pass. Penyaringan/pencarian dilakukan **di sisi klien** atas hasil daftar.

**Navigasi.** Menu publik didaftarkan di `components/layout/Navbar.tsx`, menu admin di `app/admin/layout.tsx`. Rute baru wajib didaftarkan di salah satunya, kalau tidak halamannya tidak akan pernah ditemukan pengunjung.

**PWA (`app/app/*`).** Melayani **ponsel dan tablet**: di bawah `md` memakai bilah bawah lima slot dengan Pusat Bantuan menonjol di tengah, di `md` ke atas bilah itu berganti rail kiri dan isinya jadi dua kolom. Daftar tujuannya ada di `components/pwa/nav.ts`; kit layarnya (`StatusBar`, `AppHeader`, `Segmented`, `KotakCari`, `Memuat`, `LayarKosong`) di `components/pwa/ui.tsx`. Daftar dokumen apa pun memakai `components/pwa/DaftarDokumen.tsx` dengan adaptor di `lib/pwaDokumen.ts` — jangan menulis layar daftar sendiri.

**Proxy mobile.** `src/proxy.ts` (sisi server) dan `components/pwa/MobileRedirect.tsx` (sisi klien) sama-sama membaca **`lib/pwaRoutes.ts`** — satu-satunya tempat pemetaan rute publik ⇄ layar PWA boleh ditulis. Rute publik baru berarti satu baris di `TABEL` sana **dan** satu baris di `config.matcher` proxy (matcher wajib literal statis; skrip verifikasi membandingkan keduanya). Halaman tanpa padanan layar PWA masuk `KEEP_RESPONSIVE`, bukan dipetakan ke layar terdekat.

**Isi PWA harus berdata.** Layar PWA menarik isinya dari API yang sama dengan desktop. Daftar konstan di dalam `app/app/**` tidak diperbolehkan kecuali bersumber `lib/` yang berprovenans (`tourismData.ts`, `relatedLinks.ts`, `airportProfile.ts`).

---

## Aturan lintas-lapis

**Publik menyaring, admin menampilkan semua.** Daftar publik hanya menampilkan data yang benar-benar dapat dipakai (mis. surat yang berkasnya ada), sementara daftar admin menampilkan seluruhnya lengkap dengan penanda supaya petugas tahu mana yang bermasalah. Pertahankan pola ini pada modul berkas apa pun.

**Peninggalan v1.** Sebagian dokumen masih dilayani `aptpairport.id`. Karena itu kolom berkas menerima **lintasan relatif maupun URL penuh**; kode yang menghapus berkas harus melewatkan URL penuh (berkas milik server lain). Lihat `App\Models\Letter`.

**Modul baru mengubah banyak berkas sekaligus** — migration, model, controller, route, seeder, tipe, halaman admin, halaman publik, navbar, proxy. Gunakan skill `add-crud-module` agar tidak ada yang terlewat.

**Skill terpasang:** `fix-module-bug` (debug lintas lapisan), `release-version` (prosedur rilis), `public-static-page` (halaman statis baru), `precommit-checklist` (kualitas sebelum selesai), serta `token-budget-advisor` dan `context-budget` (kontrol pemakaian token).

**Agent terpasang:** `sensor-data-pribadi` — menyisir data pribadi yang wajib disensor menurut UU 27/2022. Jalankan saat menambah data pejabat/pegawai, membuat modul yang menyimpan identitas orang, menyiapkan seeder atau ekspor, dan sebelum rilis. Ia **melaporkan, tidak menyunting**; nama dan jabatan pejabat sengaja dikecualikan karena UU 14/2008 justru mewajibkan keduanya diumumkan.

Berkas skill dan agent itu sendiri ada di `.claude/` dan **tidak ikut repositori** — isinya bercampur konfigurasi per-mesin (`launch.json` memuat lintasan absolut, `settings.local.json` memuat izin lokal). Salin direktori itu manual saat berpindah mesin. Berkas ini, `CLAUDE.md`, tetap ikut repositori karena ia dokumentasi proyek, bukan konfigurasi mesin.

---

## Yang jangan dilakukan

- Jangan menaruh URL API literal di luar `lib/api.ts`.
- Jangan mengembalikan `response()->json()` mentah dari controller API — pakai `ApiResponse`.
- Jangan menambahkan endpoint tulis di luar grup `admin` tanpa alasan hukum/produk yang jelas, dan bila memang perlu, beri `throttle` serta komentar alasannya.
- Jangan mengarang isi dokumen, nomor surat, atau data resmi bandara dalam seeder maupun fallback.
