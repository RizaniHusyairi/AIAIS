<?php

namespace Database\Seeders;

use App\Models\Facility;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Mengembalikan foto pratinjau fasilitas ke keadaan semula.
 *
 * Membaca manifes yang ditulis `FacilityPreviewImageSeeder`, memulihkan
 * `image_path` tiap fasilitas ke lintasan aslinya, lalu menghapus berkas
 * salinannya. Fasilitas yang `image_path`-nya sudah berubah lagi sesudah
 * pratinjau dipasang — mis. petugas mengunggah foto sungguhan lewat panel —
 * TIDAK disentuh: unggahan sungguhan lebih berharga daripada pemulihan.
 *
 * Menjalankan:
 *
 *     php artisan db:seed --class=FacilityPreviewImageRevertSeeder
 */
class FacilityPreviewImageRevertSeeder extends Seeder
{
    public function run(): void
    {
        $berkas = FacilityPreviewImageSeeder::MANIFES;

        if (! Storage::disk('local')->exists($berkas)) {
            $this->command?->info('Tidak ada manifes pratinjau. Tidak ada yang perlu dipulihkan.');

            return;
        }

        /** @var list<array{id:int,nama:string,lama:?string,baru:string}> $manifes */
        $manifes = json_decode(Storage::disk('local')->get($berkas), true) ?: [];

        $pulih = 0;
        $dilewati = 0;

        foreach ($manifes as $baris) {
            $fasilitas = Facility::find($baris['id']);

            if (! $fasilitas) {
                continue;
            }

            if ($fasilitas->image_path !== $baris['baru']) {
                // Sudah diganti sesudah pratinjau dipasang — biarkan.
                $dilewati++;

                continue;
            }

            $fasilitas->update(['image_path' => $baris['lama']]);
            Storage::disk('public')->delete($baris['baru']);
            $pulih++;
        }

        Storage::disk('local')->delete($berkas);

        $this->command?->info("Dipulihkan: {$pulih} fasilitas.".($dilewati > 0 ? " Dilewati (sudah diganti sendiri): {$dilewati}." : ''));
    }
}
