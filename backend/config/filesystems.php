<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        /*
         * Unggahan warisan portal v1.
         *
         * v1 mendefinisikan ulang disk `public` Laravel-nya ke
         * public_path('uploads'), sehingga seluruh nilai kolom berkas di basis
         * data menunjuk relatif terhadap direktori itu. Karena v2 dipasang di
         * server yang sama dan memakai basis data yang sama, berkasnya cukup
         * dilayani di tempat — tidak ada yang perlu disalin, dan unggahan lama
         * tetap terbaca apa adanya.
         *
         * Berkas BARU tetap ditulis ke disk `public` v2 dengan nama UUID.
         */
        'legacy' => [
            'driver' => 'local',
            'root' => env('LEGACY_UPLOADS_PATH', storage_path('app/legacy')),
            'url' => env('LEGACY_UPLOADS_URL', '/uploads'),
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        /*
         * Aset statis warisan v1 di luar direktori unggahan.
         *
         * Sebagian kolom berkas v1 tidak menunjuk hasil unggahan melainkan aset
         * yang ikut dikirim bersama kode — mis. `facilities.image_path` berisi
         * "assets_landing/img/fasilitas/checkin.jpg". Lintasan itu relatif
         * terhadap public/ milik v1, satu tingkat di atas akar disk `legacy`,
         * sehingga perlu disknya sendiri.
         */
        'legacy_public' => [
            'driver' => 'local',
            'root' => env('LEGACY_PUBLIC_PATH', storage_path('app/legacy-public')),
            'url' => env('LEGACY_PUBLIC_URL', ''),
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
