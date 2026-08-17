<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Satu perangkat yang menyalakan notifikasi push.
 *
 * `endpoint`, `p256dh`, dan `auth` disembunyikan dari serialisasi: siapa pun
 * yang memegang ketiganya dapat mengirim notifikasi ke perangkat itu. Panel
 * hanya perlu tahu perangkat apa dan kapan didaftarkan.
 */
class PushSubscription extends Model
{
    protected $fillable = ['user_id', 'endpoint', 'p256dh', 'auth', 'device'];

    protected $hidden = ['endpoint', 'p256dh', 'auth'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
