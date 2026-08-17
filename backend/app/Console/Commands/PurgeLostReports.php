<?php

namespace App\Console\Commands;

use App\Models\LostReport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Musnahkan laporan kehilangan yang urusannya sudah selesai.
 *
 * ============================================================
 * KENAPA PERINTAH INI ADA
 * ============================================================
 *
 * Satu laporan kehilangan menyimpan nama, nomor ponsel, dan surel seseorang.
 * Begitu barangnya diserahkan — atau pencariannya dihentikan — data itu tidak
 * lagi punya keperluan. Menyimpannya selamanya berarti menimbun data pribadi
 * ribuan pengunjung tanpa alasan, dan setiap tahun timbunannya bertambah
 * sementara nilainya nol.
 *
 * Yang dimusnahkan hanya laporan berstatus `returned` atau `not_found` yang
 * lebih tua dari batas umur. Laporan yang masih berjalan tidak pernah
 * tersentuh, berapa pun umurnya — pencarian yang belum selesai adalah urusan
 * yang belum selesai.
 *
 * Catatan barang temuan TIDAK ikut dimusnahkan. Ia catatan gudang, bukan data
 * pribadi warga, dan berita acaranya bagian dari arsip pertanggungjawaban.
 *
 * ============================================================
 * BAWAANNYA MEMERIKSA, BUKAN MENGHAPUS
 * ============================================================
 *
 * Tanpa `--apply`, perintah ini tidak menghapus satu baris pun — ia hanya
 * melaporkan berapa yang memenuhi syarat. Pola yang sama dipakai
 * `aiais:normalize-legacy-paths`, dan alasannya sama: ia berjalan di atas
 * basis data produksi yang tidak tergantikan.
 *
 * Penjadwalnya di `routes/console.php` memanggilnya DENGAN `--apply`; yang
 * tanpa bendera itu adalah pemakaian tangan untuk melihat dampaknya lebih
 * dulu.
 */
class PurgeLostReports extends Command
{
    protected $signature = 'aiais:purge-lost-reports
                            {--apply : Benar-benar hapus; tanpa ini hanya memeriksa}
                            {--months=12 : Umur minimal laporan yang dimusnahkan, dalam bulan}';

    protected $description = 'Musnahkan laporan kehilangan yang sudah selesai dan melewati batas umur';

    public function handle(): int
    {
        $bulan = (int) $this->option('months');

        if ($bulan < 1) {
            $this->error('Batas umur minimal 1 bulan.');

            return self::FAILURE;
        }

        $terapkan = (bool) $this->option('apply');
        $batas = now()->subMonths($bulan);

        $query = LostReport::whereIn('status', LostReport::CLOSED_STATUSES)
            ->where('updated_at', '<', $batas);

        $jumlah = (clone $query)->count();

        $this->line("Batas umur   : {$bulan} bulan (sebelum {$batas->toDateString()})");
        $this->line('Status       : '.implode(', ', LostReport::CLOSED_STATUSES));
        $this->line("Memenuhi syarat: {$jumlah} laporan");

        if ($jumlah === 0) {
            $this->info('Tidak ada yang perlu dimusnahkan.');

            return self::SUCCESS;
        }

        if (! $terapkan) {
            $this->warn('Pemeriksaan saja. Jalankan ulang dengan --apply untuk benar-benar menghapus.');

            return self::SUCCESS;
        }

        $foto = 0;

        // Dipotong per seribu: satu bandara yang ramai bisa mengumpulkan
        // puluhan ribu laporan, dan memuat semuanya sekaligus ke memori hanya
        // untuk menghapusnya adalah cara yang mahal untuk gagal.
        $query->chunkById(1000, function ($laporan) use (&$foto) {
            foreach ($laporan as $satu) {
                if (! empty($satu->photo)) {
                    Storage::disk('public')->delete($satu->photo);
                    $foto++;
                }

                $satu->delete();
            }
        });

        $this->info("Selesai. {$jumlah} laporan dihapus, {$foto} foto ikut dibersihkan.");

        return self::SUCCESS;
    }
}
