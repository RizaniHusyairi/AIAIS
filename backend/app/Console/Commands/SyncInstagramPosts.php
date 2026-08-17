<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\SettingController;
use App\Services\Instagram\InstagramSync;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Tarik unggahan Instagram terbaru ke tabel lokal.
 *
 * Dijadwalkan tiap tiga jam (lihat routes/console.php). Bandara tidak
 * mengunggah sesering itu, dan laju ini jauh di bawah batas Graph API.
 *
 * Perintah ini SENGAJA tidak melempar galat keluar saat Instagram bermasalah:
 * ia hanya melaporkan dan menulis log. Penjadwal yang gagal berulang akan
 * mengirim surel kegagalan tiap tiga jam, sementara yang perlu diperbaiki —
 * token atau izin Meta — tidak akan berubah karenanya. Panel yang menunjukkan
 * keadaannya kepada petugas.
 */
class SyncInstagramPosts extends Command
{
    protected $signature = 'aiais:sync-instagram';

    protected $description = 'Tarik unggahan Instagram terbaru ke portal';

    public function handle(InstagramSync $sync): int
    {
        /*
         * Berhenti di awal bila portal sedang memakai unggahan manual.
         *
         * Bukan sekadar kerapian: tanpa penjaga ini, penjadwal memanggil Meta
         * tiap tiga jam dengan token yang memang sengaja tidak dipasang, lalu
         * gagal — dan kegagalan yang berulang selamanya adalah kegagalan yang
         * berhenti dibaca orang.
         */
        if (SettingController::modeInstagram() !== 'auto') {
            $this->info('Mode Instagram sedang MANUAL — sinkronisasi dilewati.');
            $this->line('Unggahan dimasukkan petugas lewat panel /admin/instagram.');

            return self::SUCCESS;
        }

        try {
            $hasil = $sync->jalankan();
        } catch (\Throwable $e) {
            $this->error($e->getMessage());
            Log::warning('Sinkronisasi Instagram gagal: '.$e->getMessage());

            // Unggahan yang sudah tersimpan tetap tampil di beranda.
            $this->line('Unggahan yang sudah ada tidak berubah dan tetap tampil di portal.');

            return self::SUCCESS;
        }

        $this->info(sprintf(
            'Sinkronisasi selesai: %d diperiksa · %d baru · %d diperbarui · %d gambar diunduh%s',
            $hasil['diperiksa'],
            $hasil['baru'],
            $hasil['diperbarui'],
            $hasil['gambar_diunduh'],
            $hasil['gambar_gagal'] > 0 ? ' · '.$hasil['gambar_gagal'].' gambar gagal diunduh' : '',
        ));

        if ($hasil['gambar_gagal'] > 0) {
            $this->warn(
                'Unggahan yang gambarnya gagal diunduh TIDAK ditampilkan di beranda, '
                .'dan akan dicoba lagi pada sinkronisasi berikutnya.'
            );
        }

        return self::SUCCESS;
    }
}
