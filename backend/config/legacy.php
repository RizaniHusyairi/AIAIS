<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Migrasi data portal v1 (aptpairport.id)
    |--------------------------------------------------------------------------
    |
    | Dipakai hanya oleh command `aiais:import-*` dan App\Services\Legacy\*.
    | Tidak ada satu pun kode runtime portal yang membaca berkas ini.
    |
    */

    /*
     * Akar salinan `public/uploads` produksi v1.
     *
     * v1 mendefinisikan ulang disk `public` Laravel-nya ke public_path('uploads'),
     * jadi SEMUA nilai kolom berkas di basis data v1 relatif terhadap direktori
     * ini — termasuk nilai berawalan "uploads/" yang di cakram menjadi
     * `uploads/uploads/...`. Penggandaan itu tersimpan di datanya, bukan di
     * logika kita.
     */
    'uploads_path' => env('LEGACY_UPLOADS_PATH'),

    /*
     * Kapan dump produksi diambil. Dicatat pada setiap baris `legacy_imports`
     * supaya bisa dijawab "baris ini berasal dari potret basis data yang mana".
     */
    'dump_taken_at' => env('LEGACY_DUMP_TAKEN_AT'),

    /*
     * Basis data yang dianggap salinan pengembangan, bukan produksi. Command
     * impor menolak berjalan di atasnya kecuali diberi --allow-dev-db, karena
     * sebagian tabelnya (letters, news) berisi data karangan.
     */
    'dev_databases' => ['db_apt'],

];
