<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Satu nomor piket penerima notifikasi WhatsApp.
 *
 * Lihat migrasinya untuk kewajiban PDP yang melekat pada tabel ini — terutama
 * bahwa kolomnya sengaja berhenti di nama dan nomor.
 */
class WaRecipient extends Model
{
    protected $fillable = ['nama', 'nomor', 'jenis', 'is_active'];

    protected $casts = [
        'jenis' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Benar bila nomor ini ingin menerima kabar berjenis `$jenis`.
     *
     * Daftar kosong berarti "semua jenis", bukan "tidak satu pun". Bawaan itu
     * disengaja: nomor yang baru ditambahkan dan lupa dicentangi lebih baik
     * menerima terlalu banyak daripada diam-diam tidak pernah menerima apa pun
     * — kegagalan kedua tidak menimbulkan gejala sampai ada yang menyadari
     * pengaduan tidak pernah ditindaklanjuti.
     */
    public function menerima(?string $jenis): bool
    {
        if ($jenis === null) {
            return true;
        }

        $daftar = $this->jenis ?? [];

        return $daftar === [] || in_array($jenis, $daftar, true);
    }

    /** Nomor siap kirim: hanya angka, tanpa plus, spasi, maupun tanda hubung. */
    public function nomorBersih(): string
    {
        return preg_replace('/[^0-9]/', '', $this->nomor) ?? '';
    }
}
