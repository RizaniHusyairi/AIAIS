<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu catatan keuangan: pemasukan (`in`) atau anggaran (`budget`).
 *
 * Tabel warisan v1. Baris `budget` boleh punya rincian di `budget_expenses`;
 * baris `in` tidak pernah punya, dan controller menegakkannya — rincian yang
 * menempel pada pemasukan tidak punya arti apa pun dalam laporan.
 *
 * Kolom `flow_type` masih enum karena tabelnya milik v1 sampai cutover; lihat
 * catatan enum pada rencana. Konstanta di bawah dipakai sebagai aturan
 * validasi supaya nilainya cuma tertulis di satu tempat.
 */
class Finance extends Model
{
    /** Jenis arus dana yang dikenali. */
    public const FLOW_TYPES = ['in', 'budget'];

    protected $fillable = ['date', 'flow_type', 'amount', 'source', 'note'];

    protected $casts = [
        'date' => 'date',
        'amount' => 'integer',
    ];

    protected $appends = ['expenses_total', 'remaining', 'is_detailed'];

    public function budgetExpenses(): HasMany
    {
        return $this->hasMany(BudgetExpense::class, 'finance_id');
    }

    /** Jumlah rincian yang sudah dicatat di bawah anggaran ini. */
    public function getExpensesTotalAttribute(): int
    {
        return (int) $this->budgetExpenses->sum('amount');
    }

    /**
     * Sisa anggaran yang belum terinci.
     *
     * NULL untuk baris pemasukan — "sisa" tidak berlaku di sana, dan
     * mengembalikan nol akan membuatnya tampak seperti anggaran yang sudah
     * habis terpakai.
     */
    public function getRemainingAttribute(): ?int
    {
        return $this->flow_type === 'budget'
            ? $this->amount - $this->expenses_total
            : null;
    }

    /** Anggaran yang rinciannya sudah lengkap sampai rupiah terakhir. */
    public function getIsDetailedAttribute(): bool
    {
        return $this->flow_type === 'budget' && $this->remaining === 0;
    }
}
