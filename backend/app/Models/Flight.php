<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Satu baris papan informasi penerbangan (FIDS).
 *
 * Tabelnya `fids_flights`, bukan `flights`. Basis data warisan v1 sudah punya
 * tabel `flights` berisi hal lain sama sekali — sisa templat aplikasi pemesanan
 * tiket 2022 yang berelasi ke `airlines`, `planes`, dan `airports`.
 */
class Flight extends Model
{
    use HasFactory;

    /** Arah penerbangan yang dikenali; dipakai pula sebagai aturan validasi. */
    public const TYPES = ['departure', 'arrival'];

    /** Status yang dikenali; kolomnya string agar status baru tak perlu ALTER. */
    public const STATUSES = [
        'scheduled', 'check_in', 'boarding', 'departed', 'delayed', 'landed', 'cancelled',
    ];

    protected $table = 'fids_flights';

    protected $fillable = [
        'flight_number',
        'airline',
        'airline_logo',
        'origin',
        'destination',
        'scheduled_time',
        'estimated_time',
        'terminal',
        'gate',
        'flight_type',
        'status',
        'remarks',
    ];
}
