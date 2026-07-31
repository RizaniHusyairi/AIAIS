<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Versi Kontrak API
    |--------------------------------------------------------------------------
    |
    | Prefiks segmen versi pada seluruh rute API (mis. /api/v2/flights).
    |
    | INI BUKAN VERSI PRODUK. Versi produk ada di config('app.version') dan
    | bersumber dari berkas VERSION. Nilai di sini menandai bentuk data yang
    | dikirim API: naikkan hanya ketika ada perubahan yang MERUSAK klien lama
    | (field dihapus, tipe berubah, struktur envelope berubah) — bukan ketika
    | produk merilis versi baru.
    |
    | Disimpan di config supaya perubahan berikutnya cukup satu baris, bukan
    | berburu string di berkas rute dan beberapa berkas frontend.
    |
    | Catatan: `php artisan route:cache` membekukan prefiks ini, sama seperti
    | config:cache membekukan versi produk.
    |
    */

    'version' => env('API_VERSION', 'v2'),

];
