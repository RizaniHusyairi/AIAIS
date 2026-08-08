<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Satu kunjungan halaman pada portal publik.
 *
 * `ip_address` sengaja TIDAK lagi diisi — pengganti privasinya adalah
 * `visitor_hash`; lihat migrasi `add_visitor_hash_to_visitor_logs_table`.
 * Kolomnya dipertahankan pada `$fillable` hanya agar baris lama tetap dapat
 * diperbarui bila suatu saat diperlukan.
 */
class VisitorLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'ip_address',
        'visitor_hash',
        'page_url',
        'user_agent',
        'device',
        'browser',
    ];
}
