---
name: public-static-page
description: Tambah halaman publik statis baru pada portal AIAIS — halaman tanpa CRUD backend: Server Component tipis + metadata, view 'use client', konten di lib/, pendaftaran Navbar, pemetaan proxy mobile. Pakai saat diminta halaman statis baru (mis. FAQ, layanan, tautan terkait, profil, halaman info) atau memperbaiki halaman statis yang ada.
---

# Halaman publik statis AIAIS

Baca `CLAUDE.md` lebih dulu — pola dasarnya ada di sana. Skill ini menambahkan urutan kerja dan rujukan contohnya.

## Rujukan

- **FAQ** → `app/faq/page.tsx` + `lib/faqData.tsx` (data dipakai juga Pusat Bantuan; komentar di berkasnya melarang menggandakan).
- **Layanan** → `app/layanan/page.tsx` + `lib/serviceData.ts`.
- **Tautan terkait** → `app/tautan-terkait/page.tsx` + `lib/relatedLinks.ts`.
- **Satu view, dua rute** → `app/regulasi/RegulasiSuratView.tsx` melayani surat-keputusan dan surat-edaran lewat prop pembeda.

## Urutan kerja

1. **Data** — taruh konten di `frontend/src/lib/<nama>.ts(x)` bila dipakai lebih dari satu view; beri komentar sumber. Jangan menanam data di dalam komponen.
2. **Halaman** — `frontend/src/app/<rute>/page.tsx` sebagai Server Component tipis: ekspor `metadata` (`title`, `description`, `alternates.canonical`) dan render satu view `'use client'`. Jangan merender markup besar langsung di Server Component.
3. **View** — bahasa visual portal: hero gradien langit, `SkyParticles`, framer-motion, ikon lucide, motif boarding pass. Pencarian/penyaringan di sisi klien atas hasil yang sudah dimuat.
4. **Dua rute berbagi tata letak** → satu view + prop pembeda, bukan markup ganda.
5. **Navigasi** — daftarkan di `components/layout/Navbar.tsx` lengkap dengan `desc`. Belum didaftarkan = tidak ada bagi pengunjung.
6. **Proxy mobile** — tambahkan pemetaan di `toAppRoute()` (`src/proxy.ts`) **dan** entri `config.matcher`. Tanpa keduanya, pengunjung ponsel terlempar ke `/app` alih-alih layar setara.

## Verifikasi

- `cd frontend && npm run lint`
- Buka halamannya di desktop: menu menampilkan, metadata/canonical benar.
- Simulasikan ponsel (UA berisi `Android.*Mobile` atau `iPhone`): harus mendarat di layar PWA yang setara, bukan `/app` generik.
- Bila halaman menarik data publik: daftar publik menyaring data yang tidak dapat dipakai (pola lintas-lapis).

## Yang jangan dilakukan

- Menyusun ulang URL API di luar `lib/api.ts`.
- Membuat markup halaman publik sebagai 'use client' penuh tanpa metadata (menurunkan SEO).
- Menanam data statis di komponen bila dua view memakainya.
