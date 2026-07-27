<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'priority',
        'is_active',
        'target_audience',
        'valid_until',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'valid_until' => 'date',
    ];
}
