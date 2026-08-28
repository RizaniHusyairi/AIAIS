<?php

namespace App\Support;

use App\Jobs\KirimWhatsApp;
use App\Models\User;
use App\Notifications\AktivitasPusatBantuan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Satu pintu untuk memberi tahu petugas bahwa ada kiriman baru dari warga.
 *
 * Dipanggil dari kelima controller Pusat Bantuan dengan satu baris, sehingga
 * aturan siapa-menerima-apa tidak tersebar ke lima tempat.
 *
 * ────────────────────────────────────────────────────────────────────────
 * KEGAGALAN DI SINI TIDAK PERNAH MENGGAGALKAN KIRIMAN WARGA
 *
 * Seluruh isinya dibungkus try/catch yang hanya menulis log. Warga yang baru
 * kehilangan dompet tidak boleh melihat "Gagal mengirim" hanya karena gateway
 * WhatsApp sedang mati atau tabel `jobs` sedang terkunci — laporannya sudah
 * tersimpan, dan nomor tiketnya tetap harus keluar.
 * ────────────────────────────────────────────────────────────────────────
 */
class Notifikasi
{
    /**
     * @param  string|null  $rincian  Label LAYANAN untuk jenis `pengajuan`.
     *                                Bukan keterangan pemohon — lihat aturan
     *                                tanpa data pribadi pada notifikasinya.
     * @param  string|null  $path     Tujuan panel, bila berbeda dari bawaan.
     */
    public static function kirim(
        string $jenis,
        ?string $ticket = null,
        ?string $rincian = null,
        ?string $path = null,
    ): void {
        try {
            $notif = new AktivitasPusatBantuan($jenis, $ticket, $rincian, $path);

            $penerima = User::penerimaNotifikasi()->get();

            if ($penerima->isNotEmpty()) {
                // Kanal `database` berjalan `sync` (lihat notifikasinya), jadi
                // lonceng terisi sebelum respons dikirim; push berantre.
                Notification::send($penerima, $notif);
            }

            /*
             * WhatsApp dikirim SEKALI, bukan per penerima — nomornya satu
             * tujuan bersama. Diantrekan supaya panggilan ke server vendor
             * tidak pernah menahan respons untuk warga.
             */
            /* Sakelarnya TIDAK diperiksa di sini lagi.
             *
             * Sejak penyetelan WhatsApp dapat diubah dari panel, satu-satunya
             * yang tahu apakah pengiriman aktif adalah `WhatsAppGateway::siap()`
             * — ia membaca basis data lebih dulu, baru .env. Memeriksa
             * `config('whatsapp.enabled')` di sini berarti sakelar panel tidak
             * pernah berpengaruh selama .env belum ikut diubah.
             *
             * Pekerjaan yang ternyata tidak perlu berhenti sendiri di
             * `siap()` tanpa memanggil server mana pun. */
            KirimWhatsApp::dispatch($notif->toWhatsApp(), $jenis);
        } catch (\Throwable $e) {
            Log::warning('Notifikasi Pusat Bantuan gagal dikirim: ' . $e->getMessage(), [
                'jenis' => $jenis,
            ]);
        }
    }
}
