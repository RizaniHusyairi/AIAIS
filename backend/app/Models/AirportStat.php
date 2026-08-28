<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Satu angka ringkas bandara pada beranda.
 *
 * Lihat migrasinya untuk alasan `value` berupa teks dan alasan ketiga bendera
 * penampil berdiri sendiri-sendiri — keduanya keputusan yang mudah dibatalkan
 * tanpa sengaja oleh orang yang hanya membaca model ini.
 *
 * Tidak memakai `ResolvesFileUrl`: modul ini tidak menyimpan berkas apa pun.
 * Gambar dan video bagian "Tentang" tinggal di tabel `settings`, bukan di sini.
 */
class AirportStat extends Model
{
    protected $fillable = [
        'slug', 'icon', 'value', 'label_id', 'label_en',
        'show_about', 'show_numbers', 'show_hero',
        'sort_order', 'is_active',
    ];

    protected $casts = [
        'show_about' => 'boolean',
        'show_numbers' => 'boolean',
        'show_hero' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
