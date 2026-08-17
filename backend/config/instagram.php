<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Instagram — unggahan terbaru untuk beranda
    |--------------------------------------------------------------------------
    |
    | Memakai "Instagram API with Instagram Login" (host graph.instagram.com).
    | Instagram Basic Display API sudah dimatikan Meta pada 4 Desember 2024,
    | jadi jalur lama tidak lagi tersedia.
    |
    | Tokennya TIDAK ada di sini. Ia harus dapat ditulis ulang saat penyegaran
    | otomatis, sedangkan berkas konfigurasi maupun `.env` bukan tempat yang
    | boleh ditulis aplikasi saat berjalan — lihat model InstagramCredential.
    |
    */

    'base_url' => env('INSTAGRAM_BASE_URL', 'https://graph.instagram.com'),

    'version' => env('INSTAGRAM_API_VERSION', 'v21.0'),

    /*
     * Berapa unggahan yang ditarik tiap sinkronisasi.
     *
     * Bandara tidak mengunggah sesering itu; dua belas sudah jauh melewati
     * apa yang ditampilkan beranda, dan menyisakan ruang bila beberapa
     * unggahan disembunyikan petugas.
     */
    'fetch_limit' => (int) env('INSTAGRAM_FETCH_LIMIT', 12),

    /* Berapa unggahan yang ditampilkan beranda. */
    'display_limit' => (int) env('INSTAGRAM_DISPLAY_LIMIT', 6),

    /*
     * Batas waktu permintaan. Sinkronisasi berjalan di latar lewat penjadwal,
     * jadi tidak ada pengunjung yang menunggu — tetapi menggantung tanpa batas
     * akan menahan slot penjadwal berikutnya.
     */
    'timeout' => (int) env('INSTAGRAM_TIMEOUT', 15),

    /* Batas ukuran gambar yang diunduh, dalam bita. */
    'max_image_bytes' => (int) env('INSTAGRAM_MAX_IMAGE_BYTES', 8 * 1024 * 1024),

];
