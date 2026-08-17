<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Perayaan bertanggal yang memicu animasi sambutan di beranda.
 *
 * Lihat migrasinya untuk alasan tanggalnya disimpan, bukan dihitung.
 */
class SiteEvent extends Model
{
    /**
     * Tema animasi yang punya komponennya di frontend.
     *
     * CERMIN KONSTANTA FRONTEND — harus sama persis dengan kunci `TEMA_EVENT`
     * di `frontend/src/lib/siteEvents.ts`. Nilai yang tidak dikenali frontend
     * membuat beranda tidak memainkan apa pun, diam-diam.
     */
    public const THEMES = [
        'kemerdekaan',
        'nataru',
        'tahun-baru',
        'lebaran',
        'tahun-baru-islam',
        'nyepi',
        'imlek',
    ];

    protected $fillable = [
        'name', 'theme', 'starts_on', 'ends_on',
        'greeting', 'subgreeting', 'is_active', 'priority',
    ];

    protected $casts = [
        'starts_on' => 'date',
        'ends_on' => 'date',
        'is_active' => 'boolean',
        'priority' => 'integer',
    ];

    /**
     * Perayaan yang sedang berlangsung hari ini.
     *
     * Perbandingannya memakai tanggal server, dan itu memang yang dikehendaki:
     * bandara berada di satu zona waktu, dan perayaan nasional berganti pada
     * tengah malam setempat — bukan pada tengah malam peramban pengunjung yang
     * bisa saja sedang berada di zona lain.
     */
    public function scopeBerlangsung(Builder $query, ?string $tanggal = null): Builder
    {
        $hari = $tanggal ?: now()->toDateString();

        return $query->where('is_active', true)
            ->whereDate('starts_on', '<=', $hari)
            ->whereDate('ends_on', '>=', $hari)
            // Prioritas kecil menang; seri diputus oleh yang paling baru dibuat.
            ->orderBy('priority')
            ->orderByDesc('id');
    }
}
