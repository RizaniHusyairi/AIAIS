<?php

namespace App\Jobs;

use App\Services\Notifikasi\WhatsAppGateway;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Kirim satu pesan WhatsApp ke nomor piket, di luar siklus permintaan.
 *
 * Diantrekan supaya panggilan ke server gateway tidak pernah menahan respons
 * untuk warga: gateway pihak ketiga bisa lambat atau mati, dan pengunjung yang
 * baru mengirim laporan tidak boleh menunggu karenanya.
 *
 * Pemroses antreannya dijalankan cron tiap menit lewat penjadwal — lihat
 * routes/console.php. Tanpa itu, pekerjaan ini menumpuk di tabel `jobs`
 * selamanya tanpa satu pun galat.
 *
 * Teksnya diterima jadi, bukan disusun di sini: penyusunannya milik
 * `AktivitasPusatBantuan` supaya aturan "tanpa data pribadi" hanya ada di satu
 * tempat.
 */
class KirimWhatsApp implements ShouldQueue
{
    use Queueable;

    /** Tiga percobaan; gateway yang mati sesaat lazim pulih sendiri. */
    public int $tries = 3;

    /** Jeda antar percobaan, dalam detik. */
    public array $backoff = [10, 60];

    public function __construct(public readonly string $teks)
    {
    }

    public function handle(WhatsAppGateway $gateway): void
    {
        $gateway->kirim($this->teks);
    }
}
