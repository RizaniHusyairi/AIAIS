---
name: fix-module-bug
description: Diagnosa dan perbaiki bug lintas lapisan pada portal AIAIS — dari halaman depan, klien API, controller, model, hingga migrasi. Pakai saat ada perilaku salah atau error pada fitur apa pun (mis. "halaman berita error", "pengaduan tidak tersimpan", "chat tidak terkirim", "angka pengunjung aneh", "versi masih alpha").
---

# Perbaikan bug lintas modul AIAIS

Baca `CLAUDE.md` lebih dulu bila belum — konvensi dasarnya ada di sana dan tidak diulang di sini.

## Prinsip: tentukan lapisannya dulu

Setiap lapisan punya tanda tangan sendiri. Sebelum mengubah kode, pastikan di lapisan mana gejalanya berada — perbaikan di lapisan yang salah membuang waktu dan menimbulkan bug kedua.

| Gejala | Lapisan | Cara memeriksa |
|---|---|---|
| Tampilan/UI rusak, API normal | View `'use client'` | DevTools console + Network tab pada halaman itu |
| Data salah/kosong/500 | Klien API atau controller | `curl` endpoint-nya langsung, bandingkan JSON |
| 401 tak terduga | Klien admin | Token di `localStorage` (`aiais_admin_token`); sesi dibersihkan adminFetch bila 401 |
| Berkas gagal unggah | `adminFetch` vs `adminUpload` | `adminFetch` selalu men-JSON-kan badan; multipart wajib `adminUpload` |
| Kolom/data tidak sesuai bentuk | Model/migrasi/tipe | Baca `$fillable`, `$casts`, `$appends` + interface di `types/index.ts` |
| Halaman tak terjangkau menu | Navbar / admin layout / proxy | Cek pendaftaran di ketiganya (lihat bawah) |

## Peta jalur data (hapal atau baca sekali)

- **Publik:** view `'use client'` → `fetchApi()` (`lib/api.ts`, satu-satunya tempat URL) → rute `GET` publik di `routes/api.php` → controller → model.
- **Admin:** `adminFetch` / `adminUpload` (`lib/adminApi.ts`, path relatif `/admin`) → grup `admin` bermiddleware `auth:sanctum`.
- **Respons:** semua lewat `ApiResponse` → bentuk `{ success, message, data }`; frontend bergantung pada ketiga kunci itu.

## Pola kegagalan khas AIAIS

1. **Halaman ada tapi tak terjangkau** → rute belum didaftarkan di `Navbar.tsx` (publik), `app/admin/layout.tsx` (admin), atau `proxy.ts` (ponsel).
2. **Berfungsi di desktop, hilang di ponsel** → `toAppRoute()` di `src/proxy.ts` belum memetakan rute itu; ponsel terlempar ke `/app`.
3. **"Versi masih alpha padahal VERSION sudah beta"** → `config:cache` membekukan nilai; jalankan langkah rilis backend (`optimize:clear` + `config:cache`). Bukan bug kode.
4. **Data tampak "dikarang"** → cek apakah itu fallback `fetchApi`; fallback memang mengembalikan daftar kosong/teks "tidak dapat dimuat" — jangan ganti jadi data contoh. Kalau seeder yang curiga, lihat blok provenansnya.
5. **Berkas 404 padahal kolom terisi** → berkas terhapus dari cakram. Accessor wajib memeriksa `Storage::disk('public')->exists()` (atau perlakukan URL penuh v1 sebagai ada) — lihat `App\Models\Letter`.
6. **Unggahan PUT gagal di Laravel** → multipart tidak diparsing pada PUT; pakai rute `POST /{id}` (pola `letters`).
7. **Kategori/status ditolak validasi** → nilainya harus dari konstanta model (`Complaint::CATEGORIES`, `ChatThread::STATUSES`, dst.) — satu sumber, jangan duplikasi daftar.

## Urutan kerja

1. **Reproduksi** — minta langkah persis + teks error. Tanpa reproduksi yang jelas, jangan menebak.
2. **Petakan jalur** — halaman → endpoint → controller → model. Sebutkan jalurnya sebelum memperbaiki.
3. **Baca dulu, sekaligus** — kumpulkan berkas relevan dalam satu `read_files`; jangan mengubah kode yang belum dibaca.
4. **Perbaikan terkecil** yang konsisten dengan konvensi sekitar (komentar *kenapa*, pesan bahasa Indonesia).
5. **Verifikasi** — `curl`/`tinker` untuk endpoint, buka halamannya, lalu jalankan `composer test` (backend) dan `npm run lint` (frontend) bila kode tersentuh.
6. **Cek efek samping** — cari referensi simbol yang diubah (code-searcher); pastikan daftar publik menyaring dan admin menampilkan semua.

## Yang jangan dilakukan

- Mengembalikan `response()->json()` mentah — wajib `ApiResponse`.
- Menambah endpoint tulis di luar grup admin tanpa alasan hukum/produk.
- Mengganti data kosong dengan karangan (seeder, fallback, atau angka dasbor).
- Memperbaiki di lapisan yang salah hanya karena "mudah diubah".
