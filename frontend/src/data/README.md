# Data geospasial

## `indonesia-outline.json`

Garis pantai untuk latar peta rute penerbangan (`src/components/map/`).

| | |
|---|---|
| **Sumber** | Natural Earth — `ne_50m_admin_0_countries.geojson` |
| **Repositori** | https://github.com/nvkelso/natural-earth-vector |
| **Lisensi** | Domain publik (Natural Earth tidak menuntut atribusi, meski dianjurkan) |
| **Diunduh** | 27 Juli 2026 |
| **Skala** | 1:50 juta |

### Pengolahan

Berkas asli 3,0 MB diperkecil menjadi ~107 KB dengan langkah berikut:

1. Menyaring negara ke Indonesia dan tetangganya sebagai konteks visual:
   `IDN, MYS, BRN, TLS, PNG, SGP, PHL, AUS, THA, VNM, KHM`.
2. Membuang cincin poligon yang seluruhnya berada di luar kotak tampilan
   `lon 92–143°, lat -13–9°` — 111 poligon terbuang, umumnya pulau-pulau jauh
   milik negara tetangga.
3. Membulatkan koordinat ke 2 desimal (≈1,1 km). Peta ini hanya dipakai pada
   zoom 3–8, jadi presisi lebih tinggi tidak terlihat dan hanya menambah berat.
4. Membuang titik berurutan yang menjadi identik setelah pembulatan, lalu
   menutup kembali tiap cincin.

Hasil: 10 negara, 7.354 titik. Cakupan Indonesia terverifikasi dari
lon 95,21°–140,98° dan lat -10,91°–5,91° (Sabang hingga Papua), dan setiap
bandara pada `src/lib/airports.ts` dipastikan memiliki garis pantai di
sekitarnya.

### Memperbarui

Skrip pengolahnya tidak disimpan di repo karena hanya sekali pakai. Untuk
membangun ulang: unduh berkas Natural Earth di atas, lalu terapkan keempat
langkah tersebut. Perbarui tanggal unduh di tabel ini.

---

**Catatan:** peta sengaja tidak memakai ubin (tile) daring. Seluruh tampilan
digambar dari berkas ini di sisi klien, sehingga peta tetap berfungsi penuh
di jaringan lokal bandara tanpa koneksi internet. Lihat `src/lib/mapTiles.ts`
bila suatu saat ubin ingin diaktifkan.
