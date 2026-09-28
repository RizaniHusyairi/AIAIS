<?php

namespace App\Support;

use App\Jobs\KirimWhatsApp;
use App\Models\InformationRequest;
use App\Notifications\BuktiPermohonanInformasi;
use App\Services\Notifikasi\WhatsAppGateway;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Kirim bukti permohonan ke pemohon sendiri, lewat surel dan/atau WhatsApp.
 *
 * Pasangan `Notifikasi` — yang itu untuk petugas, ini untuk warga. Aturan
 * pentingnya sama: KEGAGALAN DI SINI TIDAK PERNAH MENGGAGALKAN PERMOHONAN.
 * Permohonan sudah tersimpan dan tiketnya sudah keluar di layar; pengiriman
 * diantrekan, dan galat apa pun hanya dicatat.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PEMBATAS PER PENERIMA
 *
 * Formulirnya publik dan tanpa akun, jadi alamat tujuannya diketik siapa
 * saja — termasuk alamat orang lain. Tanpa pembatas, portal ini menjadi alat
 * mengirim pesan berulang ke nomor atau surel korban, dan batas laju per IP
 * pada rute tidak menolong bila pengirimnya berganti jaringan. Setiap alamat
 * hanya menerima BATAS_HARIAN bukti per hari. Kuncinya di-hash supaya cache
 * tidak menjadi daftar surel dan nomor telepon.
 * ────────────────────────────────────────────────────────────────────────
 */
class KabarPemohon
{
    public const BATAS_HARIAN = 3;

    /**
     * @return array{email: bool, whatsapp: bool}  Kanal yang benar-benar
     *         diantrekan — dipakai layar tiket agar tidak menjanjikan pesan
     *         yang tidak akan pernah datang.
     */
    public static function kirim(InformationRequest $permohonan, bool $email, bool $whatsapp): array
    {
        $hasil = ['email' => false, 'whatsapp' => false];
        $bukti = new BuktiPermohonanInformasi($permohonan);

        if ($email && filled($permohonan->email) && self::jatah('email', $permohonan->email)) {
            try {
                Notification::route('mail', $permohonan->email)->notify($bukti);
                $hasil['email'] = true;
            } catch (\Throwable $e) {
                Log::warning('Bukti permohonan (surel) gagal diantrekan: ' . $e->getMessage());
            }
        }

        if ($whatsapp && filled($permohonan->phone)) {
            try {
                $nomor = WhatsAppGateway::nomorInternasional($permohonan->phone);

                // Hanya diantrekan bila gateway memang aktif: layar tiket
                // tidak boleh menjanjikan WhatsApp yang pasti tidak terkirim.
                if ($nomor && app(WhatsAppGateway::class)->siapKeWarga() && self::jatah('wa', $nomor)) {
                    KirimWhatsApp::dispatch($bukti->teksWhatsApp(), 'informasi', $nomor);
                    $hasil['whatsapp'] = true;
                }
            } catch (\Throwable $e) {
                Log::warning('Bukti permohonan (WhatsApp) gagal diantrekan: ' . $e->getMessage());
            }
        }

        return $hasil;
    }

    /** Pakai satu jatah harian alamat ini; false bila sudah habis. */
    private static function jatah(string $kanal, string $alamat): bool
    {
        $kunci = 'kabar-pemohon:' . date('Ymd') . ':' . hash('sha256', $kanal . '|' . mb_strtolower(trim($alamat)));

        // add() hanya menulis bila kunci belum ada — pasangan atomik increment().
        Cache::add($kunci, 0, now()->endOfDay()->addMinutes(5));

        if (Cache::increment($kunci) > self::BATAS_HARIAN) {
            Log::info('Bukti permohonan dilewati: batas harian per penerima tercapai.', ['kanal' => $kanal]);

            return false;
        }

        return true;
    }
}
