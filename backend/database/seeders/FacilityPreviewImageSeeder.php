<?php

namespace Database\Seeders;

use App\Models\Facility;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Foto fasilitas untuk PRATINJAU TAMPILAN — bukan data resmi.
 *
 * ────────────────────────────────────────────────────────────────────────
 * BACA INI SEBELUM MENJALANKANNYA.
 *
 * Ke-22 fasilitas di tabel `facilities` adalah data sungguhan warisan portal
 * v1, lengkap dengan `image_path` yang menunjuk `assets_landing/img/fasilitas/`.
 * Di server produksi berkas-berkas itu ADA. Pada salinan warisan di mesin
 * pengembangan ini 21 di antaranya TIDAK ada, dan yang ada pun dilayani lewat
 * URL berakar (`/assets_landing/...`) yang hanya bekerja bila portal v1 dan v2
 * berbagi satu domain — di sini tidak. Akibatnya kartu fasilitas di beranda
 * tampil tanpa gambar sama sekali.
 *
 * Seeder ini menutup lubang itu supaya rancangan kartunya dapat dinilai dengan
 * gambar. Yang disalin adalah foto SUNGGUHAN Bandara APT Pranoto dari
 * `assets_landing/img/bandara/` — bukan foto stok dari internet — tetapi
 * PASANGANNYA SEMBARANG: foto yang mendarat pada "Runway" belum tentu foto
 * landas pacu.
 *
 * Karena itu:
 *
 *   - seeder ini TIDAK didaftarkan di `DatabaseSeeder`; ia hanya berjalan bila
 *     dipanggil sendiri, dan menolak berjalan di lingkungan produksi;
 *   - `image_path` yang lama DICATAT ke manifes sebelum diganti, sehingga
 *     seluruhnya dapat dipulihkan persis seperti semula;
 *   - fasilitas yang fotonya sudah dapat dibuka TIDAK disentuh.
 *
 * Menjalankan:
 *
 *     php artisan db:seed --class=FacilityPreviewImageSeeder
 *
 * Mengembalikan:
 *
 *     php artisan db:seed --class=FacilityPreviewImageRevertSeeder
 * ────────────────────────────────────────────────────────────────────────
 */
class FacilityPreviewImageSeeder extends Seeder
{
    /** Manifes berisi lintasan lama tiap fasilitas yang disentuh. */
    public const MANIFES = 'pratinjau-fasilitas.json';

    /** Sama dengan FacilityController::DIR_FOTO — unggahan v2. */
    private const DIR = 'facilities';

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'Dibatalkan: seeder ini memasang foto yang pasangannya sembarang '
                .'dan tidak boleh berjalan di lingkungan produksi.'
            );
        }

        if (Storage::disk('local')->exists(self::MANIFES)) {
            throw new RuntimeException(
                'Dibatalkan: manifes pratinjau sebelumnya masih ada. Jalankan '
                .'FacilityPreviewImageRevertSeeder lebih dulu supaya lintasan asli '
                .'tidak hilang tertimpa manifes baru.'
            );
        }

        $sumber = $this->fotoSungguhan();

        if ($sumber === []) {
            throw new RuntimeException(
                'Dibatalkan: tidak ada foto bandara di `assets_landing/img/bandara/` '
                .'pada salinan aset warisan (disk `legacy_public`). Setel '
                .'LEGACY_PUBLIC_PATH di .env ke repo portal v1.'
            );
        }

        // Hanya yang fotonya memang tidak dapat dibuka. Unggahan sungguhan
        // lewat /admin/facilities punya `image_url` dan dilewati.
        $perlu = Facility::all()->filter(fn (Facility $f) => $f->image_url === null)->values();

        if ($perlu->isEmpty()) {
            $this->command?->info('Semua fasilitas sudah berfoto. Tidak ada yang perlu dipasang.');

            return;
        }

        $manifes = [];

        foreach ($perlu as $i => $fasilitas) {
            $asal = $sumber[$i % count($sumber)];
            $baru = self::DIR.'/'.Str::uuid().'.'.strtolower(pathinfo($asal, PATHINFO_EXTENSION));

            Storage::disk('public')->put($baru, File::get($asal));

            $manifes[] = [
                'id' => $fasilitas->id,
                'nama' => $fasilitas->name,
                'lama' => $fasilitas->image_path,
                'baru' => $baru,
            ];

            $fasilitas->update(['image_path' => $baru]);
        }

        Storage::disk('local')->put(
            self::MANIFES,
            json_encode($manifes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        );

        $this->command?->warn(
            count($manifes).' foto pratinjau dipasang. PASANGANNYA SEMBARANG — ganti dari '
            .'/admin/facilities sebelum portal ini dipakai sungguhan.'
        );
        $this->command?->info(
            'Pulihkan dengan: php artisan db:seed --class=FacilityPreviewImageRevertSeeder'
        );
    }

    /**
     * Foto sungguhan Bandara APT Pranoto pada salinan aset warisan.
     *
     * Diurutkan supaya pasangannya tetap sama tiap kali dijalankan; hasil
     * pratinjau yang berubah-ubah menyulitkan membandingkan rancangan.
     *
     * @return list<string>
     */
    private function fotoSungguhan(): array
    {
        $akar = rtrim((string) config('filesystems.disks.legacy_public.root'), '/\\');
        $dir = $akar.'/assets_landing/img/bandara';

        if ($akar === '' || ! is_dir($dir)) {
            return [];
        }

        $lintasan = array_map(
            fn ($f) => $f->getPathname(),
            array_filter(
                File::files($dir),
                fn ($f) => in_array(strtolower($f->getExtension()), ['jpg', 'jpeg', 'png', 'webp'], true),
            ),
        );

        sort($lintasan);

        return array_values($lintasan);
    }
}
