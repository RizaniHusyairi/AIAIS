# Model terminal interaktif

Halaman publik: `/terminal-3d`, melalui menu **Informasi Publik → Terminal 3D**.
Ponsel memakai halaman responsif yang sama melalui `KEEP_RESPONSIVE`.
Tidak ada endpoint, migrasi, seeder, atau perubahan backend.

## Acuan dan batas ketepatan

Sumber: tujuh foto yang diberikan pengguna pada 5 September 2026:
`28.jpg`, `40.jpg`, `58.jpg`, `15.jpg`, `APT_1668.JPG`, `APT_2135.JPG`,
dan `APT_2949.JPG`. Detail kanopi dan selasar memakai dua foto tambahan:
`APT_1672.JPG` dan `APT_1679.JPG`. Foto tidak didistribusikan ulang sebagai tekstur.

Revisi 7 September 2026 memakai `DJI_0020.JPG` dan `DJI_0039.JPG` untuk
susunan depan: kanopi melengkung terpisah dari gedung, dua koridor penghubung
beratap kaca, taman di antaranya, serta jalur antar-jemput mengikuti kanopi.
Proporsi masih berupa perkiraan visual, belum hasil pengukuran.

Model eksterior merupakan interpretasi geometris dari foto, bukan pemindaian
fotogrametri. Lengkung atap, rangka diagonal, kaca biru kehijauan, kanopi,
dan deretan garbarata menjadi acuan. Ukuran, jumlah modul fasad, dan lanskap
merupakan perkiraan. Interior, struktur teknis, dan bangunan pendukung tidak
dimodelkan. Model tidak boleh dipakai sebagai denah navigasi atau gambar ukur.

Untuk meningkatkan ketepatan diperlukan denah berdimensi, elevasi, dan foto
tegak lurus tiap sisi. Geometri dapat direvisi tanpa mengganti penampil.

## Memperbarui model

Sunting `frontend/src/lib/airportModel.ts`, kemudian dari direktori `frontend`
jalankan perintah berikut dengan Node.js 22.18+ atau 24:

```sh
node scripts/export-airport-model.mjs
```

Hasil: `frontend/public/models/apt-pranoto.glb`. Berkas ini dipakai penampil
dan tautan unduhan sehingga keduanya selalu memuat geometri yang sama.
GLB bisa dibuka di Blender atau penampil glTF lain, dengan grup bernama
Terminal, Atap, Kanopi, Selasar, Rambu, Garbarata, dan Lanskap.
Pilihan **Kanopi depan** dan **Selasar** menampilkan detail dari jarak dekat.
Papan arah mengikuti tulisan pada foto; penempatannya bersifat ilustratif.

Three.js dimuat khusus halaman ini. Geometri digabung per bahan dan bagian
untuk mengurangi draw call; tekstur eksternal tidak diperlukan. Resolusi
render dibatasi, render berhenti di luar layar/tab tersembunyi, dan putaran
otomatis hanya dimulai lewat tindakan pengunjung. Perangkat memerlukan WebGL.
