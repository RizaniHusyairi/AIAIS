<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Flight extends Model
{
    use HasFactory;

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
