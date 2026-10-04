<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Hasil analisis AI atas satu pengaduan — sekaligus jejak audit.
 *
 * Setiap baris mencatat siapa yang meminta analisis, kapan, dengan model apa,
 * dan berapa tokennya. Pengiriman isi pengaduan ke penyedia luar negeri harus
 * dapat dipertanggungjawabkan, dan baris ini adalah buktinya.
 *
 * Baris tidak pernah disunting; "Analisis ulang" menambah baris baru dan
 * panel menampilkan yang terbaru.
 */
class ComplaintAiInsight extends Model
{
    protected $fillable = [
        'complaint_id',
        'model',
        'result',
        'input_tokens',
        'output_tokens',
        'requested_by',
    ];

    protected $casts = [
        'result' => 'array',
    ];

    public function complaint()
    {
        return $this->belongsTo(Complaint::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
