<?php

namespace Database\Seeders;

use App\Models\AirportStat;
use Illuminate\Database\Seeder;

/**
 * Angka ringkas bandara pada beranda.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS
 *
 * Sumber      : konstanta frontend AIAIS v2 —
 *               `frontend/src/app/page.tsx` (`aboutStats`, `dalamAngka`) dan
 *               `frontend/src/components/home/HeroBoardingPass.tsx`
 *               (`ANGKA_HERO`).
 * Tanggal ambil: 28 Agustus 2026, saat modul ini dibuat.
 *
 * CATATAN YANG TIDAK BOLEH DIHAPUS:
 *
 * Angka-angka ini TIDAK terverifikasi. Ia tidak berasal dari dokumen resmi
 * bandara, tidak dari `air_traffic_logs`, dan tidak dari sumber v1 mana pun
 * yang dapat dirujuk — ia sudah ada sebagai angka bulat di kode v2 sejak
 * berandanya ditulis. Yang dikerjakan seeder ini hanyalah MEMINDAHKAN angka
 * yang sudah tayang ke tempat yang dapat disunting petugas, bukan menyatakan
 * bahwa angkanya benar.
 *
 * Sudah ada satu pertentangan di portal, dan ia sengaja dibiarkan apa adanya
 * di sini alih-alih didamaikan diam-diam:
 *
 *   - Beranda   : "1.250.000+ Penumpang / Tahun"
 *   - Profil    : `SPECS` di `frontend/src/app/profile/ProfileView.tsx`
 *                 menyebut kapasitas terminal "1,5 juta penumpang / tahun"
 *
 * Keduanya bicara tentang hal yang berbeda (realisasi vs kapasitas), tetapi
 * tidak ada satu pun rujukan yang memastikannya. Petugas yang memegang angka
 * resminya dipersilakan membetulkan lewat `/admin/angka-bandara`; jangan
 * membetulkannya dengan menebak di berkas ini.
 * ────────────────────────────────────────────────────────────────────────
 *
 * `updateOrCreate` atas `slug`: seeder ini boleh dijalankan ulang tanpa
 * menggandakan baris, dan tanpa menimpa urutan yang sudah disusun petugas.
 */
class AirportStatSeeder extends Seeder
{
    public function run(): void
    {
        $angka = [
            [
                'slug' => 'penumpang',
                'icon' => 'Users',
                'value' => '1.250.000+',
                'label_id' => 'Penumpang / Tahun',
                'label_en' => 'Passengers / Year',
                'show_about' => true,
                'show_numbers' => true,
                'show_hero' => false,
                'sort_order' => 10,
            ],
            [
                'slug' => 'destinasi',
                'icon' => 'MapPin',
                'value' => '18',
                'label_id' => 'Destinasi',
                'label_en' => 'Destinations',
                // Satu-satunya yang tampil di ketiga blok.
                'show_about' => true,
                'show_numbers' => true,
                'show_hero' => true,
                'sort_order' => 20,
            ],
            [
                'slug' => 'penerbangan',
                'icon' => 'Plane',
                'value' => '120+',
                'label_id' => 'Penerbangan / Hari',
                'label_en' => 'Flights / Day',
                'show_about' => true,
                'show_numbers' => true,
                'show_hero' => true,
                'sort_order' => 30,
            ],
            [
                'slug' => 'runway',
                'icon' => 'Ruler',
                'value' => '2.250 m',
                'label_id' => 'Panjang Runway',
                'label_en' => 'Runway Length',
                'show_about' => true,
                'show_numbers' => false,
                'show_hero' => true,
                'sort_order' => 40,
            ],
            [
                'slug' => 'akreditasi',
                'icon' => 'Award',
                'value' => '4 Star',
                'label_id' => 'Bandara Terakreditasi',
                'label_en' => 'Accredited Airport',
                'show_about' => true,
                'show_numbers' => false,
                'show_hero' => false,
                'sort_order' => 50,
            ],
            [
                'slug' => 'kepuasan',
                'icon' => 'Star',
                'value' => '98%',
                'label_id' => 'Tingkat Kepuasan Penumpang',
                'label_en' => 'Passenger Satisfaction Rate',
                // Hanya blok "APT Pranoto dalam Angka"; tidak pernah tampil di
                // kartu Tentang maupun hero.
                'show_about' => false,
                'show_numbers' => true,
                'show_hero' => false,
                'sort_order' => 60,
            ],
        ];

        foreach ($angka as $baris) {
            AirportStat::updateOrCreate(
                ['slug' => $baris['slug']],
                $baris + ['is_active' => true],
            );
        }
    }
}
