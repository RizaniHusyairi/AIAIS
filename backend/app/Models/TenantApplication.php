<?php

namespace App\Models;

/**
 * Pengajuan menjadi tenant (gerai) di area bandara.
 *
 * Namanya BUKAN `Tenant`: model itu sudah dipakai tabel `airport_tenants`,
 * yaitu daftar gerai yang sudah beroperasi dan tampil di halaman publik.
 * Tabel `tenants` warisan v1 justru berisi PENGAJUAN untuk menjadi gerai —
 * dua hal berbeda yang kebetulan bernama mirip. Lihat catatan pemetaan tabel
 * pada rencana.
 */
class TenantApplication extends Submission
{
    protected $table = 'tenants';

    protected $fillable = [
        'user_id', 'business_name', 'business_type', 'description',
        'rental_type', 'rental_more', 'documents',
    ];

    public function folderBerkas(): string
    {
        return 'tenants';
    }
}
