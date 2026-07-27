<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Facility extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'location_description',
        'icon',
        'description',
        'is_operational',
    ];

    protected $casts = [
        'is_operational' => 'boolean',
    ];
}
