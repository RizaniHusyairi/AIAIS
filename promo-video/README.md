# Video Promosi — Portal Bandara APT Pranoto

Motion graphic vertikal 1080×1920, 30 fps, ±41 detik untuk Reels/TikTok/Shorts, lengkap dengan musik. Dibuat dengan [Remotion](https://www.remotion.dev/) (React), jadi bisa dirender ulang kapan saja.

## Menjalankan

```bash
npm install
npm run data        # snapshot data asli (lihat "Sumber data"); backend lokal harus jalan di :8000
npm run music       # sintesis musik → public/music.wav
npm run studio      # pratinjau & sunting di browser
npm run render      # → out/promo.mp4 (CLI Remotion, ±2 menit) — cara utama
```

`npm run render` memakai ffmpeg bawaan Remotion. Berkas itu tidak bertanda tangan, sehingga **diblokir Smart App Control** Windows 11 (kode keluar `0xC0E90002`). Di mesin yang Smart App Control-nya masih aktif, pakai jalur cadangan `npm run render:web`. Skrip ini menyajikan `web/` lewat Vite, lalu membukanya di Chrome/Edge terpasang (`--headless=new`, memakai GPU) dan merender dengan WebCodecs. Musik ditempel setelahnya lewat mediabunny, karena memasang `<Audio>` saat render membuatnya ±100× lebih lambat. Waktu render sekitar 3,5 menit.

## Motion reel 16:9 (`reel/`)

Versi kedua: reel motion graphic 1920×1080, 60 fps, 20 detik, untuk YouTube, layar terminal, dan situs. Tidak memakai Remotion. Setiap frame adalah fungsi murni dari waktu yang digambar ke kanvas 2D, lalu dienkode WebCodecs (mediabunny) di Chrome headless terpasang. Musik disintesis di `reel/audio.js` memakai jam 120 BPM yang sama.

```bash
npm run reel                                  # → out/promo-reel.mp4 (±15 dtk)
npm run reel:sheet -- "sheet=2.3,4.5,8.7"     # → out/reel-sheet.png, lembar kontak untuk pemeriksaan
```

Datanya juga `src/data/snapshot.json` dan foto di `public/img`, jadi `npm run data` ikut memperbarui reel. Aturan isi di bawah tetap berlaku.

| Dtk | Adegan |
|---|---|
| 0–2 | Titik → landasan pacu, "Samarinda", pesawat lepas landas |
| 2–4 | "SATU PORTAL. SEMUA INFO." lalu kamera menembus huruf O |
| 4–7 | Papan split-flap keberangkatan → kedatangan |
| 7–10 | Mosaik fasilitas berbalik, Runway layar penuh, kartu wisata |
| 10–13 | Korsel berita, tiga golongan informasi PPID |
| 13–16 | Aplikasi di ponsel: Pusat Bantuan → Lapor Kehilangan → terkirim |
| 16–18 | Montase delapan potongan |
| 18–20 | Partikel menyusun "aptpairport.id", logo bandara |

## Sumber data

| Data | Sumber |
|---|---|
| Berita, fasilitas, wisata (teks + foto) | Portal tayang `https://aptpairport.id/api/v2` (ubah lewat `PORTAL_API_URL`) |
| Penerbangan (FIDS), PPID | API lokal `http://127.0.0.1:8000/api/v2` (ubah lewat `API_URL`) |

Foto dikecilkan ke lebar 900 px (JPEG) oleh `scripts/shrink.ps1`.

## Adegan

| Dtk | Adegan | Berkas |
|---|---|---|
| 0–3 | Hook "Mau terbang dari Samarinda?" | `scenes/Hook.tsx` |
| 3–9 | Satu portal, semua layar — beranda desktop aptpairport.id (digambar ulang) di laptop → morph ke ponsel | `scenes/Desktop.tsx` |
| 9–14 | Jadwal penerbangan → boarding pass | `scenes/Jadwal.tsx` |
| 14–18 | Berita terkini (kartu digeser) | `scenes/Berita.tsx` |
| 18–22 | Satu aplikasi (PWA) + pasang ke layar utama | `scenes/AplikasiPwa.tsx` |
| 22–26 | Fasilitas & wisata | `scenes/FasilitasWisata.tsx` |
| 26–30 | Pusat Bantuan / lapor kehilangan | `scenes/PusatBantuan.tsx` |
| 30–37 | PPID: tiga golongan informasi + formulir permohonan | `scenes/Ppid.tsx` |
| 37–41 | CTA aptpairport.id | `scenes/Cta.tsx` |

Musik (`scripts/make-music.mjs`) bertempo 120 BPM, jadi 1 ketuk = 15 frame. Panjang dan penekanannya dihitung dari `src/timeline.json`: "drop" saat laptop muncul, hentakan saat masuk jadwal, isian drum menjelang PPID dan CTA. Jalankan `npm run music` setiap kali durasi adegan berubah.

Beranda desktop (`ui/desktop/DesktopHome.tsx`) disalin dari `frontend/src/app/page.tsx`, `Navbar.tsx`, `NamaBandaraHero.tsx`, dan `HeroBoardingPass.tsx` pada lebar 1440 px. Bila tampilan situs berubah, sesuaikan berkas itu. Papan pengumuman, Tentang, Pejabat, Wisata, dan Mitra sengaja dilewati demi durasi.

## Aturan isi

- **Tanpa data karangan.** Semua teks data berasal dari `src/data/snapshot.json`. Berita `demo-*` dan entri uji ("... tes") disaring. Jarak tempuh wisata hanya tampil bila portal mengisinya.
- **Formulir tanpa identitas.** Isian formulir hanya berupa garis kerangka, termasuk tanpa contoh fiktif.
- Foto "Self Check-In" sengaja dilewati karena memuat poster pejabat politik.
- Peta Rute dan Terminal 3D sengaja tidak ditampilkan karena keduanya belum rampung.
- Renderer web belum mendukung `backface-visibility` dan `box-shadow inset`. `FlipCard` karena itu menukar sisi berdasarkan sudut, dan kilap inset hanya muncul di Studio.
