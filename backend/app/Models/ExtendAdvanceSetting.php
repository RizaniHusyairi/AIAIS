<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Pengaturan modul Extend Advance, bergaya kunci/nilai.
 *
 * Saat ini berisi satu baris: `statement_notes`, teks pernyataan tanggung
 * jawab yang harus ditandatangani Pilot In Command. Isinya merujuk NOTAM yang
 * berlaku dan merupakan DATA RESMI dari portal v1 — jangan pernah diisi
 * dengan contoh karangan, termasuk dalam seeder.
 */
class ExtendAdvanceSetting extends Model
{
    protected $table = 'extend_advance_settings';

    protected $fillable = ['key', 'value'];

    /** Teks pernyataan yang berlaku sekarang, atau null bila belum diatur. */
    public static function pernyataan(): ?string
    {
        return static::where('key', 'statement_notes')->value('value');
    }
}
