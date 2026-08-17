<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Notifikasi WhatsApp ke petugas
    |--------------------------------------------------------------------------
    |
    | Memberi tahu petugas panel bahwa ada kiriman baru dari warga lewat Pusat
    | Bantuan. Isi pesannya SENGAJA hanya jenis, nomor tiket, dan tautan panel —
    | lihat App\Notifications\AktivitasPusatBantuan.
    |
    | ===========================================================
    | GATEWAY INI TIDAK RESMI, DAN ITU DIPUTUSKAN SADAR
    | ===========================================================
    |
    | Gateway yang menumpang WhatsApp Web tanpa izin Meta — termasuk gateway
    | milik sendiri seperti wg.aptpairport.id — melanggar ketentuan layanan
    | WhatsApp, dan nomor pengirimnya DAPAT DIBLOKIR PERMANEN kapan saja.
    |
    | Karena itu nomor yang dipasang pada perangkat gateway wajib nomor bot
    | terpisah — BUKAN nomor layanan publik bandara. Bila nomornya diblokir,
    | yang hilang hanya kanal notifikasi internal; jalur resmi ke masyarakat
    | tidak ikut terbawa. Lihat docs/DEPLOY.md.
    |
    | ===========================================================
    | BENTUK PERMINTAANNYA DAPAT DIKONFIGURASI
    | ===========================================================
    |
    | Nilai bawaannya mengikuti gateway bandara sendiri (wg.aptpairport.id),
    | tetapi seluruh gateway sejenis sama saja: POST berisi kunci, nomor tujuan,
    | dan teks pesan — yang berbeda cuma nama medan, nama header, dan bentuk
    | badannya. Ketiganya dapat diatur dari `.env` supaya berganti vendor tidak
    | menuntut satu baris kode pun.
    |
    | Padanan untuk Fonnte, bila suatu saat dipakai lagi:
    |
    |   WA_ENDPOINT=https://api.fonnte.com/send
    |   WA_FORMAT=form
    |   WA_AUTH_HEADER=Authorization
    |   WA_FIELD_TARGET=target
    |   WA_FIELD_MESSAGE=message
    |
    */

    'enabled' => env('WA_ENABLED', false),

    'endpoint' => env('WA_ENDPOINT', 'https://wg.aptpairport.id/api/v1/messages/send'),

    /*
     * Kunci gateway (`wag_<prefix>.<secret>`). Ditaruh di `.env` dan bukan basis
     * data karena — berbeda dari token Instagram — ia tidak pernah ditulis ulang
     * aplikasi saat berjalan. Juga karena `GET /settings` bersifat publik: kunci
     * yang disimpan di tabel `settings` akan ikut tersaji ke peramban siapa pun.
     */
    'token' => env('WA_TOKEN'),

    /*
     * Nama header untuk kuncinya.
     *
     * Gateway bandara memakai `X-API-Key` berisi kunci telanjang. Fonnte
     * memakai `Authorization`, juga tanpa awalan "Bearer".
     */
    'auth_header' => env('WA_AUTH_HEADER', 'X-API-Key'),

    /** Awalan nilai header; kosong berarti kunci telanjang. */
    'auth_prefix' => env('WA_AUTH_PREFIX', ''),

    /*
     * Bentuk badan permintaan: `json` atau `form`.
     *
     * BUKAN rincian sepele. Gateway bandara menuntut
     * `Content-Type: application/json`; mengirim `application/x-www-form-urlencoded`
     * kepadanya menghasilkan 4xx yang pesan galatnya tidak menyebut penyebabnya
     * sama sekali.
     */
    'format' => env('WA_FORMAT', 'json'),

    /** Nama medan pada badan permintaan. */
    'field_target' => env('WA_FIELD_TARGET', 'to'),
    'field_message' => env('WA_FIELD_MESSAGE', 'body'),

    /*
     * Perangkat pengirim pada gateway multi-perangkat.
     *
     * Kosongkan bila kunci API sudah punya perangkat bawaan — gateway bandara
     * hanya menuntut `deviceId` ketika kuncinya tidak terikat perangkat mana
     * pun. Nama medannya pun dapat diubah demi vendor lain.
     */
    'device_id' => env('WA_DEVICE_ID'),
    'field_device' => env('WA_FIELD_DEVICE', 'deviceId'),

    /*
     * Nomor tujuan, dipisah koma. Format mengikuti yang diminta gateway —
     * umumnya 62xxxxxxxxxx tanpa tanda plus.
     */
    'recipients' => env('WA_RECIPIENTS', ''),

    /** Batas waktu satu permintaan. Antrean yang menangani percobaan ulangnya. */
    'timeout' => env('WA_TIMEOUT', 10),

    /*
     * Pagar biaya harian.
     *
     * Gateway ditagih per pesan, dan endpoint publik Pusat Bantuan menerima
     * sampai sepuluh kiriman per menit per IP. Tanpa pagar ini, satu bot dapat
     * menghabiskan kuota sekaligus membanjiri ponsel petugas sampai ia
     * mematikan notifikasinya — dan notifikasi yang dimatikan sama saja dengan
     * tidak ada.
     *
     * Melewati batas berarti pesannya dilewati dan dicatat log, bukan gagal.
     */
    'daily_cap' => env('WA_DAILY_CAP', 200),

];
