<?php

namespace Database\Seeders;

use App\Models\Announcement;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Pengumuman contoh untuk merancang dan menguji papan pengumuman beranda.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS. SELURUH ISINYA KARANGAN. Tidak satu pun kalimat di berkas ini
 * berasal dari pengumuman, surat, atau pernyataan resmi Bandara APT Pranoto.
 * Tujuannya tunggal: mengisi keempat tingkat prioritas (urgent, high, medium,
 * low) beserta satu pengumuman yang masa berlakunya sudah lewat, supaya papan
 * pengumuman dapat dinilai rancangannya — termasuk apakah yang kedaluwarsa
 * benar-benar tersaring.
 *
 * Isinya sengaja dijaga TIDAK menyerupai pengumuman resmi, mengikuti aturan
 * yang sama dengan `NewsDemoSeeder`:
 *
 *   - tidak ada nomor surat, nomor keputusan, atau rujukan regulasi;
 *   - tidak ada kutipan yang diatasnamakan pejabat mana pun;
 *   - tidak ada angka statistik yang berlagak resmi;
 *   - tidak ada tanggal peristiwa yang mengaku pernah terjadi.
 *
 * Seeder ini TIDAK didaftarkan di `DatabaseSeeder`, menolak berjalan pada
 * basis data yang terdaftar berisi data sungguhan, dan seluruh barisnya
 * bertanda "[CONTOH]" pada judulnya supaya tidak mungkin tertukar dengan
 * pengumuman betulan.
 *
 * Menjalankan:
 *
 *     php artisan db:seed --class=AnnouncementDemoSeeder
 *
 * Menghapusnya kembali:
 *
 *     php artisan db:seed --class=AnnouncementDemoRevertSeeder
 * ────────────────────────────────────────────────────────────────────────
 */
class AnnouncementDemoSeeder extends Seeder
{
    /** Penanda pada judul; dipakai pula oleh seeder penghapusnya. */
    public const TANDA = '[CONTOH]';

    public function run(): void
    {
        $this->tolakBasisDataSungguhan();

        foreach ($this->contoh() as $baris) {
            Announcement::firstOrCreate(['title' => $baris['title']], $baris);
        }

        $this->command?->warn(
            count($this->contoh()).' pengumuman CONTOH ditambahkan. Seluruhnya karangan — '
            .'hapus lewat AnnouncementDemoRevertSeeder sebelum portal ini dipakai sungguhan.'
        );
    }

    /** @return list<array<string, mixed>> */
    private function contoh(): array
    {
        return [
            [
                'title' => self::TANDA.' Uji coba sistem pemanggilan penumpang',
                'content' => 'Pengeras suara di area keberangkatan diuji secara berkala. Bunyi pemanggilan yang terdengar selama pengujian bukan panggilan penerbangan.',
                'priority' => 'urgent',
                'target_audience' => 'Penumpang',
                'is_active' => true,
                'valid_until' => now()->addDays(3)->toDateString(),
            ],
            [
                'title' => self::TANDA.' Penyesuaian jalur pejalan kaki di area kedatangan',
                'content' => 'Sebagian jalur pejalan kaki dialihkan sementara. Ikuti papan petunjuk yang dipasang petugas di sepanjang koridor.',
                'priority' => 'high',
                'target_audience' => 'Pengunjung',
                'is_active' => true,
                'valid_until' => now()->addDays(14)->toDateString(),
            ],
            [
                'title' => self::TANDA.' Jam layanan pusat informasi',
                'content' => 'Pusat informasi melayani pertanyaan seputar fasilitas, transportasi, dan layanan bandara pada jam operasi terminal.',
                'priority' => 'medium',
                'target_audience' => 'Umum',
                'is_active' => true,
                'valid_until' => null,
            ],
            [
                'title' => self::TANDA.' Imbauan menjaga kebersihan ruang tunggu',
                'content' => 'Tempat sampah terpilah tersedia di setiap sudut ruang tunggu. Terima kasih telah ikut menjaga kenyamanan bersama.',
                'priority' => 'low',
                'target_audience' => 'Penumpang',
                'is_active' => true,
                'valid_until' => null,
            ],
            [
                // Sengaja kedaluwarsa: membuktikan penyaring `valid_until` bekerja.
                'title' => self::TANDA.' Pengumuman kedaluwarsa (tidak boleh tampil)',
                'content' => 'Baris ini masa berlakunya sudah lewat. Bila ia muncul di papan pengumuman, penyaring tanggal pada AnnouncementController tidak bekerja.',
                'priority' => 'urgent',
                'target_audience' => 'Umum',
                'is_active' => true,
                'valid_until' => now()->subDays(2)->toDateString(),
            ],
        ];
    }

    /**
     * Tolak menyemai basis data yang berisi data sungguhan.
     *
     * Disalin dari `NewsDemoSeeder`: memanggil seeder lewat `--class=` tidak
     * pernah melewati penjaga di `DatabaseSeeder`, sehingga tanpa salinan ini
     * pengumuman karangan bisa mendarat di portal resmi.
     */
    private function tolakBasisDataSungguhan(): void
    {
        $basisData = DB::connection()->getDatabaseName();

        if (! in_array($basisData, config('legacy.protected_databases', []), true)) {
            return;
        }

        if (env('SEED_DEMO_ANNOUNCEMENTS') === true || env('SEED_DEMO_ANNOUNCEMENTS') === 'true') {
            $this->command?->warn(
                "Penjaga dilewati lewat SEED_DEMO_ANNOUNCEMENTS pada basis data '{$basisData}'. ".
                'Pastikan ini salinan pengembangan, bukan portal yang dibaca publik.'
            );

            return;
        }

        throw new RuntimeException(
            "Penyemaian dibatalkan: '{$basisData}' terdaftar sebagai basis data berisi data sungguhan. ".
            'Pengumuman di seeder ini karangan seluruhnya dan tidak boleh terbit di portal resmi.'
        );
    }
}
