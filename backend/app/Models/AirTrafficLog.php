<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Catatan lalu lintas udara harian.
 *
 * Satu baris per tanggal, memuat empat kategori yang masing-masing dipecah
 * kedatangan dan keberangkatan: pesawat, penumpang, bagasi, dan kargo.
 * Kolom `date` unik — itulah yang menjaga agar satu hari tidak tercatat dua
 * kali dengan angka berbeda.
 *
 * Bagasi dan kargo dicatat dalam kilogram, pesawat dan penumpang dalam
 * satuan. Perbedaan satuan itu tidak disimpan di basis data; tampilan yang
 * menuliskannya.
 *
 * Tabel `air_freight_traffics` warisan v1 — pencatatan lama dengan bentuk
 * baris-per-jenis — TIDAK dipakai. Isinya kosong, sehingga tidak ada yang
 * perlu dipindahkan maupun dipertahankan.
 */
class AirTrafficLog extends Model
{
    /** Kategori yang dicatat; dipakai membentuk agregat dan validasi. */
    public const CATEGORIES = ['aircraft', 'passenger', 'baggage', 'cargo'];

    protected $fillable = [
        'date',
        'aircraft_arrival', 'aircraft_departure',
        'passenger_arrival', 'passenger_departure',
        'baggage_arrival', 'baggage_departure',
        'cargo_arrival', 'cargo_departure',
    ];

    protected $casts = [
        'date' => 'date',
        'aircraft_arrival' => 'integer',
        'aircraft_departure' => 'integer',
        'passenger_arrival' => 'integer',
        'passenger_departure' => 'integer',
        'baggage_arrival' => 'integer',
        'baggage_departure' => 'integer',
        'cargo_arrival' => 'integer',
        'cargo_departure' => 'integer',
    ];

    /** Total seluruh kategori pada baris ini, untuk keperluan ringkasan. */
    public function jumlahKategori(string $kategori): int
    {
        return (int) $this->{"{$kategori}_arrival"} + (int) $this->{"{$kategori}_departure"};
    }
}
