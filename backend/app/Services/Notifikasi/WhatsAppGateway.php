<?php

namespace App\Services\Notifikasi;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pengirim pesan lewat gateway WhatsApp.
 *
 * Memakai `Http` seperti `InstagramSync` dan `FlightController`, sehingga dapat
 * dipalsukan pada pengujian dengan cara yang sama.
 *
 * Bentuk permintaannya dibaca dari `config/whatsapp.php` — lihat berkas itu
 * untuk alasan mengapa ia dapat diatur, dan untuk catatan bahwa gateway
 * semacam ini tidak resmi.
 */
class WhatsAppGateway
{
    /** Kunci penghitung pemakaian harian pada cache. */
    private const KUNCI_HITUNG = 'wa:terkirim:';

    public function siap(): bool
    {
        return (bool) config('whatsapp.enabled')
            && filled(config('whatsapp.token'))
            && $this->tujuan() !== [];
    }

    /** @return array<int, string> */
    public function tujuan(): array
    {
        return collect(explode(',', (string) config('whatsapp.recipients')))
            ->map(fn ($n) => preg_replace('/[^0-9]/', '', $n))
            ->filter()
            ->values()
            ->all();
    }

    /** Berapa pesan yang sudah terkirim hari ini. */
    public function terpakaiHariIni(): int
    {
        return (int) Cache::get(self::KUNCI_HITUNG . date('Ymd'), 0);
    }

    public function sisaKuota(): int
    {
        return max(0, (int) config('whatsapp.daily_cap') - $this->terpakaiHariIni());
    }

    /**
     * Kirim satu teks ke seluruh nomor tujuan.
     *
     * Mengembalikan jumlah yang benar-benar terkirim. TIDAK pernah melempar:
     * pemanggilnya adalah kanal notifikasi, dan gateway yang sedang bermasalah
     * tidak boleh menggagalkan pengiriman warga maupun menumpuk pekerjaan
     * gagal di antrean.
     */
    public function kirim(string $teks): int
    {
        if (! $this->siap()) {
            return 0;
        }

        $terkirim = 0;

        foreach ($this->tujuan() as $nomor) {
            // Diperiksa per nomor, bukan sekali di awal: satu notifikasi ke
            // tiga nomor menghabiskan tiga jatah.
            if ($this->sisaKuota() <= 0) {
                Log::warning('Kuota WhatsApp harian habis; sisa pesan dilewati.', [
                    'kuota' => config('whatsapp.daily_cap'),
                ]);
                break;
            }

            if ($this->kirimSatu($nomor, $teks)) {
                $terkirim++;
                Cache::put(
                    self::KUNCI_HITUNG . date('Ymd'),
                    $this->terpakaiHariIni() + 1,
                    // Kedaluwarsa lewat tengah malam; penghitungnya memang
                    // hanya berlaku untuk hari berjalan.
                    now()->endOfDay()->addMinutes(5),
                );
            }
        }

        return $terkirim;
    }

    private function kirimSatu(string $nomor, string $teks): bool
    {
        $header = trim(config('whatsapp.auth_prefix') . ' ' . config('whatsapp.token'));

        $badan = [
            config('whatsapp.field_target') => $nomor,
            config('whatsapp.field_message') => $teks,
        ];

        // Hanya disertakan bila memang diisi: gateway menolak `deviceId` yang
        // bukan miliknya, dan kunci API yang sudah terikat satu perangkat tidak
        // memerlukannya sama sekali.
        if (filled(config('whatsapp.device_id'))) {
            $badan[config('whatsapp.field_device')] = (int) config('whatsapp.device_id');
        }

        try {
            $permintaan = Http::withHeaders([config('whatsapp.auth_header') => $header])
                ->timeout((int) config('whatsapp.timeout'));

            // `json` atau `form` — lihat catatan pada `config/whatsapp.php`.
            $permintaan = config('whatsapp.format') === 'form'
                ? $permintaan->asForm()
                : $permintaan->asJson();

            $res = $permintaan->post(config('whatsapp.endpoint'), $badan);
        } catch (\Throwable $e) {
            // Nomor tujuan tidak ikut dicatat: log server pun bukan tempat
            // menumpuk nomor telepon tanpa keperluan.
            Log::warning('Gateway WhatsApp tidak terjangkau: ' . $e->getMessage());

            return false;
        }

        if ($res->failed()) {
            Log::warning('Gateway WhatsApp menolak pesan.', [
                'status' => $res->status(),
                'body' => mb_substr($res->body(), 0, 300),
            ]);

            return false;
        }

        /*
         * Status HTTP saja tidak cukup.
         *
         * Gateway ini selalu membalas dengan amplop `{ success, message, data }`,
         * dan penolakan tingkat aplikasi — kunci tanpa scope `message.send`,
         * nomor yang tidak terdaftar di WhatsApp, perangkat sedang terputus —
         * dapat datang bersama HTTP 200. Tanpa pemeriksaan ini, pesan yang
         * tidak pernah terkirim ikut menghabiskan kuota harian dan tercatat
         * sebagai berhasil.
         */
        if ($res->json('success') === false) {
            Log::warning('Gateway WhatsApp menolak pesan (amplop).', [
                'status' => $res->status(),
                'message' => mb_substr((string) $res->json('message'), 0, 200),
            ]);

            return false;
        }

        return true;
    }
}
