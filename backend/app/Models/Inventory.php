<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * Aset inventaris bandara.
 *
 * Aplikasi INTERNAL pegawai, bukan layanan publik — rutenya karena itu berada
 * di grup `admin`, bukan `akun`.
 *
 * Dua tabel anak menyertainya, dan keduanya berbeda maksud:
 *  - `inventory_status_logs` mencatat PERPINDAHAN status (Baik ↔ Pemeliharaan)
 *    berikut alasannya. Riwayat inilah yang menjawab "sejak kapan rusak".
 *  - `inventory_logbooks` adalah jurnal pemeliharaan berjadwal — catatan
 *    kegiatan rutin, terlepas dari status asetnya.
 */
class Inventory extends Model
{
    public const STATUSES = ['Baik', 'Pemeliharaan'];

    public const DISK = 'public';

    protected $fillable = [
        'name', 'status', 'category', 'input_date', 'maintenance_report_link',
    ];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return ['input_date' => 'date'];
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(InventoryStatusLog::class)->orderByDesc('created_at');
    }

    public function logbooks(): HasMany
    {
        return $this->hasMany(InventoryLogbook::class)->orderByDesc('log_date');
    }

    /**
     * URL foto aset.
     *
     * Foto inventaris TIDAK sensitif — ia gambar peralatan, bukan orang atau
     * dokumen — jadi cakramnya publik dan aksesornya mengikuti pola tiga
     * cabang yang sama dengan `Letter`: kosong, URL penuh, atau lintasan disk.
     */
    public function getPhotoUrlAttribute(): ?string
    {
        $lintasan = $this->attributes['photo_path'] ?? null;

        if (blank($lintasan)) {
            return null;
        }

        return str_starts_with($lintasan, 'http://') || str_starts_with($lintasan, 'https://')
            ? $lintasan
            : Storage::disk(self::DISK)->url($lintasan);
    }

    public function hapusFoto(): void
    {
        $lintasan = $this->attributes['photo_path'] ?? null;

        // Berkas milik server lain (peninggalan v1) dilewati — menghapusnya
        // mustahil, dan mencobanya hanya menimbulkan galat.
        if (blank($lintasan) || str_starts_with($lintasan, 'http')) {
            return;
        }

        if (Storage::disk(self::DISK)->exists($lintasan)) {
            Storage::disk(self::DISK)->delete($lintasan);
        }
    }
}
