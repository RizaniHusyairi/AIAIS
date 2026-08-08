<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Penilaian kepuasan pengunjung atas satu tiket layanan yang sudah selesai.
 *
 * Menjadi sumber angka Survei Kepuasan Masyarakat yang selama ini disebut
 * pada halaman Standar Pelayanan tanpa pernah benar-benar dikumpulkan.
 */
class ServiceRating extends Model
{
    /** Kanal layanan yang dapat dinilai. */
    public const CHANNELS = ['chat', 'complaint'];

    protected $fillable = ['ticket_number', 'channel', 'score', 'comment'];

    protected $casts = [
        'score' => 'integer',
    ];
}
