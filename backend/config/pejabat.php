<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Penanda tangan cetakan resmi
    |--------------------------------------------------------------------------
    |
    | Blok "Mengetahui" yang tercetak di kaki dokumen resmi — hari ini daftar
    | hadir rapat, dan cetakan lain yang menyusul.
    |
    | PROVENANS
    |   Sumber   : formulir daftar hadir rapat portal v1 (aptpairport.id),
    |              blok tanda tangan pada lembar cetakannya.
    |   Diambil  : 20 Agustus 2026.
    |   Nama dan nomenklatur jabatan dicocokkan dengan halaman Profil Pejabat
    |   portal (`frontend/src/lib/airportProfile.ts`, entri `kadek`).
    |   Catatan  : lembar v1 menuliskan "Sanarinda"; salah ketik itu TIDAK
    |              ditiru di sini.
    |
    | KENAPA DI BACKEND, BUKAN DI `lib/airportProfile.ts`
    |   Karena ada NIP di dalamnya. Berkas profil di frontend ikut dibundel dan
    |   dikirim ke peramban setiap pengunjung, dan catatan PDP di kepalanya
    |   melarang NIP masuk ke sana. Nilai di bawah hanya dibaca templat PDF,
    |   yang seluruhnya dilayani endpoint admin bertoken.
    |
    |   JANGAN mengembalikannya lewat endpoint publik mana pun.
    |
    | Seluruhnya dapat ditimpa lewat `.env` — pejabatnya berganti, dan
    | pergantian itu tidak boleh menunggu rilis kode.
    |
    */

    'penanda_tangan' => [
        'label' => env('PDF_TTD_LABEL', 'Mengetahui'),
        'jabatan' => env(
            'PDF_TTD_JABATAN',
            'Kepala BLU Kantor UPBU Kelas I Aji Pangeran Tumenggung Pranoto - Samarinda'
        ),
        'nama' => env('PDF_TTD_NAMA', 'I Kadek Yuli Sastrawan'),
        'nip' => env('PDF_TTD_NIP', '19760704 199803 1 001'),
    ],

];
