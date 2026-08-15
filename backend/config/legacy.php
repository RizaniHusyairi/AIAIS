<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Warisan portal v1 (aptpairport.id)
    |--------------------------------------------------------------------------
    |
    | Portal v2 berjalan di atas basis data dan direktori unggahan portal v1.
    | Berkas ini menampung hal-hal yang lahir dari keadaan itu.
    |
    */

    /*
     * Akar direktori `public/uploads` v1, sama dengan root disk `legacy`.
     *
     * v1 mendefinisikan ulang disk `public` Laravel-nya ke public_path('uploads'),
     * jadi SEMUA nilai kolom berkas di basis data v1 relatif terhadap direktori
     * ini — termasuk nilai berawalan "uploads/" yang di cakram menjadi
     * `uploads/uploads/...`. Penggandaan itu tersimpan di datanya, bukan di
     * logika kita.
     */
    'uploads_path' => env('LEGACY_UPLOADS_PATH'),

    /*
     * Basis data yang isinya tidak tergantikan.
     *
     * Portal v2 berjalan di atas basis data portal v1 yang sudah berisi
     * bertahun-tahun data operasional, dan tidak ada salinan v2 yang bisa
     * dipakai memulihkannya. Selama nama basis data yang aktif ada di daftar
     * ini, command perusak (migrate:fresh, migrate:rollback, db:wipe, dan
     * kawan-kawannya) ditolak — tak peduli APP_ENV-nya apa, karena kekeliruan
     * yang paling mungkin terjadi justru menjalankannya dari mesin
     * pengembangan yang kebetulan menunjuk basis data produksi.
     */
    'protected_databases' => [
        'db_apt',
        'db_apt_prod',
    ],

];
