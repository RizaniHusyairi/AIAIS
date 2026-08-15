<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu penerbangan yang tercatat selama periode Posko Nataru.
 *
 * `pax_total` dan `load_factor` TIDAK diterima dari pengirim — keduanya
 * dihitung dari angka penyusunnya (lihat `hitungTurunan()`). Menerima total
 * yang dikirim klien berarti mempercayai penjumlahan yang tidak dapat
 * diperiksa, dan pada data yang dipakai menyusun laporan resmi itu terlalu
 * murah harganya.
 *
 * Bayi tidak dihitung dalam load factor karena tidak menempati kursi — aturan
 * yang sama dipakai v1 dan dipertahankan.
 */
class NataruFlight extends Model
{
    /** Jenis penerbangan yang dikenali; dipakai pula sebagai aturan validasi. */
    public const STATUSES = ['Berjadwal', 'Perintis', 'Tidak Berjadwal'];

    /** Arah penerbangan. */
    public const DIRECTIONS = ['arrival', 'departure'];

    protected $fillable = [
        'nataru_event_id', 'flight_date', 'flight_time', 'airline', 'flight_number',
        'status_flight', 'route', 'direction', 'aircraft_type', 'aircraft_registration',
        'seat_capacity', 'pax_adult', 'pax_child', 'pax_infant', 'pax_total',
        'cargo', 'baggage', 'load_factor', 'ticket_price_high', 'ticket_price_low',
        'officer_name', 'user_id', 'remarks',
    ];

    protected $casts = [
        'flight_date' => 'date',
        'seat_capacity' => 'integer',
        'pax_adult' => 'integer',
        'pax_child' => 'integer',
        'pax_infant' => 'integer',
        'pax_total' => 'integer',
        'cargo' => 'integer',
        'baggage' => 'integer',
        'load_factor' => 'float',
        'ticket_price_high' => 'float',
        'ticket_price_low' => 'float',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(NataruEvent::class, 'nataru_event_id');
    }

    /**
     * Turunkan `pax_total` dan `load_factor` dari angka penyusunnya.
     *
     * `load_factor` bernilai NULL bila kapasitas kursi tidak diketahui DAN
     * belum ada angka lama — BUKAN nol. v1 menyimpan nol dalam keadaan itu,
     * sehingga penerbangan yang kapasitasnya belum diisi tampak seperti
     * penerbangan kosong melompong dan ikut menyeret turun setiap rata-rata.
     *
     * `$lfLama` menjaga data warisan. Sebagian besar baris v1 menyimpan
     * load factor TANPA menyimpan kapasitas kursinya — v1 meminta kapasitas
     * pada formulir lalu membuangnya. Tanpa penjagaan ini, menyunting satu
     * baris lama sekadar untuk membetulkan nama petugas akan menghapus load
     * factor yang sudah tercatat, dan angkanya tidak dapat dihitung ulang
     * karena kapasitasnya memang tidak pernah tersimpan.
     *
     * Begitu kapasitasnya diisi, perhitungan mengambil alih — nilai lama
     * memang seharusnya kalah oleh angka yang dapat diperiksa.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function hitungTurunan(array $data, ?float $lfLama = null): array
    {
        $dewasa = (int) ($data['pax_adult'] ?? 0);
        $anak = (int) ($data['pax_child'] ?? 0);
        $bayi = (int) ($data['pax_infant'] ?? 0);

        $data['pax_total'] = $dewasa + $anak + $bayi;

        $kapasitas = (int) ($data['seat_capacity'] ?? 0);

        // Bayi tidak menempati kursi, jadi tidak dihitung.
        $data['load_factor'] = $kapasitas > 0
            ? round((($dewasa + $anak) / $kapasitas) * 100, 2)
            : $lfLama;

        return $data;
    }
}
