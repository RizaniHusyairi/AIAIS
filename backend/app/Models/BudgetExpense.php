<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu baris rincian di bawah sebuah anggaran (`finances.flow_type = budget`).
 *
 * Basis data menghapusnya berantai bersama anggaran induknya (FK
 * `ON DELETE CASCADE` peninggalan v1), jadi menghapus satu anggaran ikut
 * membawa seluruh rinciannya — perilaku yang benar, tetapi harus diberitahukan
 * kepada petugas sebelum menghapus.
 */
class BudgetExpense extends Model
{
    protected $fillable = ['finance_id', 'description', 'amount'];

    protected $casts = ['amount' => 'integer'];

    public function finance(): BelongsTo
    {
        return $this->belongsTo(Finance::class, 'finance_id');
    }
}
