<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu baris penerbangan dari lembar LLAU.
 *
 * Penumpang dihitung seperti baris TOTAL di Excel: dewasa + anak + bayi
 * ditambah penumpang transit. Memakai definisi lain membuat angka portal
 * berbeda dari laporan resmi yang sama, dan selisih semacam itu tidak pernah
 * bisa dijelaskan kepada pembaca.
 */
class LlauFlight extends Model
{
    /** Batas tepat waktu yang lazim dipakai: paling lambat 15 menit. */
    public const ON_TIME_MINUTES = 15;

    /** Kategori yang dihitung ketepatan waktunya — hanya yang punya jadwal. */
    public const OTP_CATEGORY = 'BERJADWAL';

    protected $fillable = [
        'llau_report_id', 'row_number', 'flight_date', 'scheduled_at', 'actual_at',
        'delay_minutes', 'delay_category', 'origin', 'destination', 'operator_name',
        'operator_icao', 'operator_brand', 'flight_category', 'route_type', 'remarks',
        'flight_number', 'registration', 'aircraft_type', 'seat_capacity', 'direction',
        'pax_adult', 'pax_child', 'pax_infant', 'transit_adult', 'transit_child',
        'transit_infant', 'baggage_kg', 'cargo_kg', 'mail_kg',
    ];

    protected $casts = [
        'flight_date' => 'date',
        'scheduled_at' => 'datetime',
        'actual_at' => 'datetime',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(LlauReport::class, 'llau_report_id');
    }
}
