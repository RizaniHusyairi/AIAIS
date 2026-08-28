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

    /**
     * `$jenis` menentukan nomor mana yang menerima.
     *
     * Dibawa terpisah dari teksnya, bukan disimpulkan dari isi pesan: teks
     * notifikasi ditujukan untuk dibaca manusia dan boleh berubah kata-katanya
     * kapan saja, sedangkan penyaringan penerima tidak boleh ikut berubah
     * karenanya.
     *
     * Boleh null demi pekerjaan lama yang mungkin masih mengendap di tabel
     * `jobs` saat penggelaran — tanpa penyaringan, sama seperti sebelumnya.
     */
    public function __construct(
        public readonly string $teks,
        public readonly ?string $jenis = null,
    ) {
    }

    public function handle(WhatsAppGateway $gateway): void
    {
        $gateway->kirim($this->teks, $this->jenis);
    }
}
