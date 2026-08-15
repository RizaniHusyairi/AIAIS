<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Layanan pengajuan bandara: tenant, sewa, perizinan, slot charter, dan
 * seterusnya.
 *
 * Tabelnya milik portal v1 berikut sepuluh layanan yang selama ini tayang.
 * Tiga kolomnya bertipe JSON dan berisi larik:
 *
 *   - `requirements` — daftar berkas yang harus disiapkan pemohon
 *   - `steps`        — alur pengajuan, berurut
 *   - `pricing_info` — tarif, tiap butir `{ name, price }`; hanya terisi pada
 *                      layanan bertarif (`has_pricing`)
 *
 * `price` sengaja disimpan sebagai TEKS ("Rp. 31.000/m²"), bukan angka. Itu
 * bentuk aslinya di v1, dan satuannya berbeda-beda antar layanan — memaksanya
 * menjadi angka berarti kehilangan satuan atau mengarang normalisasi.
 *
 * `submission_url` masih menunjuk dasbor pemohon v1 ("dashboard/tenant").
 * Nilainya harus diganti lintasan portal v2 begitu modul pengajuannya ada;
 * lihat catatan pada ServiceController.
 */
class Service extends Model
{
    protected $fillable = [
        'name', 'slug', 'title', 'summary', 'description',
        'requirements', 'steps', 'has_pricing', 'pricing_info',
        'submission_url', 'is_active',
    ];

    protected $casts = [
        'requirements' => 'array',
        'steps' => 'array',
        'pricing_info' => 'array',
        'has_pricing' => 'boolean',
        'is_active' => 'boolean',
    ];
}
