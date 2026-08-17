<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\SettingController;
use App\Models\InstagramCredential;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Segarkan token Instagram sebelum umurnya habis.
 *
 * Token berumur panjang hanya bertahan ±60 hari. Bila lewat, sambungannya
 * putus TANPA GEJALA yang mencolok — beranda tetap menampilkan unggahan lama,
 * dan tidak ada yang menyadarinya sampai seseorang bertanya kenapa isinya tidak
 * pernah berubah. Itulah alasan perintah ini berjalan harian.
 *
 * Penyegaran dilakukan saat sisa umurnya kurang dari sepuluh hari, bukan pada
 * hari terakhir: dengan begitu ada sembilan kesempatan lagi bila satu kali
 * gagal karena jaringan.
 *
 * Instagram hanya menyegarkan token yang berumur SEKURANG-KURANGNYA 24 jam dan
 * belum kedaluwarsa. Token yang sudah lewat tidak dapat diselamatkan — ia harus
 * dipasang ulang lewat panel.
 */
class RefreshInstagramToken extends Command
{
    protected $signature = 'aiais:refresh-instagram-token {--force : Segarkan meski umurnya masih panjang}';

    protected $description = 'Segarkan token Instagram sebelum kedaluwarsa';

    public function handle(): int
    {
        // Sama alasannya dengan `aiais:sync-instagram`: pada mode manual tidak
        // ada token yang sedang dipakai, jadi tidak ada yang perlu disegarkan.
        if (SettingController::modeInstagram() !== 'auto') {
            $this->info('Mode Instagram sedang MANUAL — penyegaran token dilewati.');

            return self::SUCCESS;
        }

        $kredensial = InstagramCredential::aktif();

        if ($kredensial === null) {
            $this->line('Kredensial Instagram belum dipasang — tidak ada yang perlu disegarkan.');

            return self::SUCCESS;
        }

        if ($kredensial->sudahKedaluwarsa()) {
            $pesan = 'Token Instagram SUDAH kedaluwarsa dan tidak dapat disegarkan. Pasang token baru lewat panel pengelolaan.';
            $this->error($pesan);
            Log::warning($pesan);

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $kredensial->perluDisegarkan()) {
            $this->line('Token masih berumur '.$kredensial->sisaHari().' hari — belum perlu disegarkan.');

            return self::SUCCESS;
        }

        $url = rtrim(config('instagram.base_url'), '/').'/refresh_access_token';

        try {
            $res = Http::timeout(config('instagram.timeout'))->get($url, [
                'grant_type' => 'ig_refresh_token',
                'access_token' => $kredensial->access_token,
            ]);
        } catch (\Throwable $e) {
            $this->error('Tidak dapat menghubungi Instagram: '.$e->getMessage());
            Log::warning('Penyegaran token Instagram gagal: '.$e->getMessage());

            return self::SUCCESS;
        }

        if ($res->failed()) {
            $pesan = $res->json('error.message') ?? 'Instagram menolak penyegaran token.';
            $this->error($pesan);
            Log::warning('Penyegaran token Instagram gagal: '.$pesan);

            return self::SUCCESS;
        }

        $token = $res->json('access_token');

        if (blank($token)) {
            $this->error('Instagram membalas tanpa token baru.');

            return self::SUCCESS;
        }

        // `expires_in` dalam detik. Bila tidak disertakan, pakai umur baku 60
        // hari — lebih baik menyegarkan terlalu cepat daripada terlambat.
        $detik = (int) ($res->json('expires_in') ?: InstagramCredential::UMUR_HARI * 86400);

        $kredensial->update([
            'access_token' => $token,
            'expires_at' => now()->addSeconds($detik),
            'last_refreshed_at' => now(),
        ]);

        $this->info('Token Instagram disegarkan. Berlaku '.$kredensial->fresh()->sisaHari().' hari lagi.');

        return self::SUCCESS;
    }
}
