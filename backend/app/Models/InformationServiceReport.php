<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Laporan Layanan Informasi Publik — laporan tahunan penyelenggaraan PPID.
 *
 * Tabelnya milik portal v1 tetapi BELUM LENGKAP: pada salinan pengembangan
 * hanya berisi laporan 2024, sedangkan halaman yang tayang hari ini juga
 * memuat laporan 2025. Karena itu halaman publik v2 sengaja belum dialihkan
 * ke API — mengalihkannya sekarang justru menghilangkan laporan 2025 dari
 * pandangan pengunjung. Panel adminnya sudah tersedia supaya laporan yang
 * kurang dapat dimasukkan, dan halaman publiknya menyusul setelah lengkap.
 *
 * `publication_year` bertipe YEAR di basis data, jadi diperlakukan sebagai
 * bilangan bulat, bukan tanggal.
 */
class InformationServiceReport extends Model
{
    protected $fillable = ['title', 'publication_year', 'document_link'];

    protected $casts = [
        'publication_year' => 'integer',
    ];
}
