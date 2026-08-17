<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Notifikasi push peramban
    |--------------------------------------------------------------------------
    |
    | Memberi tahu petugas panel di ponsel maupun laptopnya walau panelnya
    | sedang tertutup. Berbeda dari WhatsApp, kanal ini TIDAK MELEWATI VENDOR
    | MANA PUN yang kita bayar: pesannya dikirim portal langsung ke server push
    | milik peramban (Google/Mozilla/Apple), terenkripsi ujung ke ujung dengan
    | kunci VAPID di bawah — server push itu sendiri tidak dapat membacanya.
    |
    | Karena itu kanal ini yang paling layak diandalkan; WhatsApp adalah
    | pelengkap, bukan tulang punggung.
    |
    | ===========================================================
    | KUNCI VAPID
    | ===========================================================
    |
    | Sepasang kunci yang menandai portal ini sebagai pengirim yang sah.
    | Dibuat SEKALI, lalu tidak boleh berganti: mengganti kunci membuat seluruh
    | langganan yang sudah ada tidak berlaku, dan tiap petugas harus menyalakan
    | notifikasinya lagi satu per satu tanpa diberi tahu.
    |
    | Cara membuatnya ada di docs/DEPLOY.md.
    |
    */

    'enabled' => env('WEBPUSH_ENABLED', false),

    'public_key' => env('WEBPUSH_PUBLIC_KEY'),
    'private_key' => env('WEBPUSH_PRIVATE_KEY'),

    /*
     * Identitas pengirim yang dilaporkan ke server push bila ada masalah.
     * Wajib berupa mailto: atau URL menurut spesifikasi VAPID.
     */
    'subject' => env('WEBPUSH_SUBJECT', 'mailto:mail.aptpranotoairport@gmail.com'),

    /** Batas waktu satu pengiriman ke server push. */
    'timeout' => env('WEBPUSH_TIMEOUT', 10),

];
