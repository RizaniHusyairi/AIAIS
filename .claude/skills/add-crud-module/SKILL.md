---
name: add-crud-module
description: Tambah modul konten baru pada portal AIAIS secara utuh — migration, model, controller, rute, seeder, tipe TypeScript, halaman admin, halaman publik, navbar, dan proxy mobile. Pakai saat diminta membuat modul/menu/fitur konten baru yang datanya dikelola dari panel admin (mis. "tambah menu galeri", "bikin modul pengumuman lelang", "tambah halaman regulasi baru"), atau saat memperbaiki modul yang sudah ada tapi belum lengkap lapisannya.
---

# Menambah modul CRUD di AIAIS

Modul konten AIAIS menembus sepuluh berkas. Melewatkan satu saja menghasilkan gejala yang khas: halaman ada tapi tak terjangkau dari menu, atau tampil di desktop tapi hilang di ponsel. Daftar di bawah adalah urutan kerjanya.

Baca `CLAUDE.md` lebih dulu bila belum — konvensi dasarnya ada di sana dan tidak diulang di sini.

## Sebelum menulis kode

Tetapkan tiga hal, tanyakan bila belum jelas dari permintaan:

1. **Kolomnya apa saja**, dan mana yang wajib.
2. **Ada berkas atau tidak.** Ini yang paling mengubah bentuk kode: modul berberkas butuh disk, penghapusan berkas, penanda `has_file`, rute `POST /{id}`, dan `adminUpload`.
3. **Apakah datanya sudah ada di portal v1** (`aptpairport.id`). Kalau ya, ambil datanya dan catat provenansnya di seeder. Kalau halamannya kosong di v1, seeder-nya juga kosong — jangan mengarang.

Rujukan terlengkap adalah modul **Regulasi/Letter**: berkas, dua jenis, penyaringan publik, peninggalan v1. Modul tanpa berkas lebih ringkas — contoh terdekatnya `Tenant` atau `Facility`.

## Lapisan backend

**1. Migration** — `backend/database/migrations/YYYY_MM_DD_HHMMSS_create_<tabel>_table.php`
Kolom penggolong pakai `string()->index()`, bukan `enum`. Beri `unique()` pada kolom yang memang identitas (nomor surat, slug). Komentari keputusan bentuk yang tidak jelas dari kodenya sendiri.

**2. Model** — `backend/app/Models/<Nama>.php`
`$fillable`, `$casts` (tanggal jadi `date`). Nilai penggolong yang sah jadi konstanta kelas (`public const TYPES = [...]`) supaya controller dan validasi memakai satu sumber.
Bila ada berkas: tambahkan `$appends = ['file_url', 'has_file']` dengan accessor yang **memperlakukan URL penuh sebagai ada** (dokumen v1) dan memeriksa `Storage::disk('public')->exists()` untuk lintasan relatif. Salin polanya dari `App\Models\Letter`.

**3. Controller** — `backend/app/Http/Controllers/Api/<Nama>Controller.php`
Method: `index` (publik), `adminIndex`, `store`, `update`, `destroy`. Semua respons lewat `ApiResponse`.
- `index` menyaring data yang tidak dapat dipakai; `adminIndex` mengembalikan semuanya.
- Validasi ditaruh di satu helper privat `validated(Request $request, ?int $ignoreId = null)`; pada pengubahan sisipkan `sometimes` agar pembaruan sebagian tetap sah.
- Pesan validasi ditulis berbahasa Indonesia lewat argumen ketiga `$request->validate()`.
- Berkas: simpan yang baru **sebelum** menghapus yang lama, dan lewati penghapusan bila nilainya URL penuh.

**4. Rute** — `backend/routes/api.php`
Tambahkan `use` controller di atas, satu baris `GET` publik pada grup versi, dan blok admin lengkap. Bila ada unggahan, daftarkan `POST /{id}` bersama `PUT /{id}`. Beri komentar singkat di atas blok bila ada perilaku tak terduga.

**5. Seeder** — `backend/database/seeders/<Nama>Seeder.php`, daftarkan di `DatabaseSeeder`.
Data nyata dengan blok provenans (sumber, tanggal ambil, catatan). Pakai `updateOrCreate` pada kolom unik agar seeder aman dijalankan ulang.

Jalankan `php artisan migrate --seed` dan uji endpointnya sebelum lanjut ke frontend.

## Lapisan frontend

**6. Tipe** — `frontend/src/types/index.ts`
Satu `interface` cocok dengan JSON backend, termasuk field `$appends`.

**7. Halaman admin** — `frontend/src/app/admin/<modul>/page.tsx`
`'use client'`. Ambil data dengan `adminFetch<T[]>('/<modul>')`; simpan dengan `adminUpload` bila ada berkas, `adminFetch` bila tidak. Susun dari kit `@/components/admin/ui`; jangan bikin tabel/modal sendiri. Sertakan `SearchBox`, `ConfirmDialog` untuk hapus, dan `Toast` untuk hasil aksi. Tandai baris yang datanya bermasalah alih-alih menyembunyikannya.
Komentar berkas di atas menjelaskan keputusan yang tidak terbaca dari kode — kenapa `adminUpload`, kenapa baris rusak tetap tampil.

**8. Halaman publik** — `frontend/src/app/<modul>/page.tsx`
Server Component tipis: ekspor `metadata` (`title`, `description`, `alternates.canonical`) dan render view `'use client'`. Bila ada beberapa varian rute, satu view + prop pembeda (`RegulasiSuratView`), bukan markup ganda.
Ambil data lewat `fetchApi`. Pencarian dan penyaringan di sisi klien. Ikuti bahasa visual portal: hero gradien langit, framer-motion, ikon lucide, `SkyParticles`.

**9. Navigasi** — `frontend/src/components/layout/Navbar.tsx` (publik) dan `frontend/src/app/admin/layout.tsx` (admin).
Belum didaftarkan berarti belum ada bagi pengunjung. Isi `desc` pada item navbar publik.

**10. Proxy mobile** — `frontend/src/proxy.ts`
Tambahkan pemetaan rute baru di `toAppRoute()`. Tanpa ini, pengunjung ponsel terlempar ke `/app` alih-alih layar yang setara.

## Sebelum menyatakan selesai

- `cd frontend && npm run lint`
- Buka halaman publik dan halaman admin, uji tambah–ubah–hapus satu data.
- Cek daftar publik memang **menyaring** data yang tak dapat dipakai, dan daftar admin memang menampilkannya dengan penanda.
- Laporkan lapisan mana saja yang disentuh; sebut eksplisit bila ada yang sengaja dilewati.
