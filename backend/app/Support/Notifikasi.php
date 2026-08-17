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
    public static function kirim(string $jenis, ?string $ticket = null): void
    {
        try {
            $notif = new AktivitasPusatBantuan($jenis, $ticket);

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
            if (config('whatsapp.enabled')) {
                KirimWhatsApp::dispatch($notif->toWhatsApp());
            }
        } catch (\Throwable $e) {
            Log::warning('Notifikasi Pusat Bantuan gagal dikirim: ' . $e->getMessage(), [
                'jenis' => $jenis,
            ]);
        }
    }
}
