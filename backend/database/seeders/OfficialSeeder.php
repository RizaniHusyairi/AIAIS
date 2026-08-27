<?php

namespace Database\Seeders;

use App\Models\Official;
use Illuminate\Database\Seeder;

/**
 * Pejabat struktural Kantor UPBU Kelas I A.P.T. Pranoto.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber   : aptpairport.id (portal v1), halaman "Pejabat Bandara" —
 *              DIAMBIL LANGSUNG DARI SITUS PRODUKSI YANG SEDANG TAYANG.
 *   Diambil  : 1 Agustus 2026
 *   Disalin  : dari `frontend/src/lib/airportProfile.ts` (konstanta
 *              `OFFICIALS`), yang selama ini menjadi teks otoritatifnya.
 *
 *   Seluruh teks di bawah VERBATIM. JANGAN merapikan ejaan, tanda baca, atau
 *   kapitalisasinya — ini kutipan halaman resmi, bukan salinan yang boleh
 *   disunting. Satu salah ketik pada sumber sengaja dipertahankan dan diberi
 *   catatan di tempatnya.
 *
 *   Bagan struktur organisasi menulis "MURDOKO, A.Md" sedangkan halaman
 *   tayang menulis "MURDOKO, S.H."; yang dipakai di sini halaman tayang.
 * ────────────────────────────────────────────────────────────────────────
 * PELINDUNGAN DATA PRIBADI — UU 27/2022
 *
 *   Riwayat pendidikan pejabat TIDAK dicantumkan, dan kolomnya memang tidak
 *   ada di tabel ini. Yang dimuat hanya keterangan yang melekat pada jabatan
 *   dan wajib diumumkan menurut UU 14/2008. Lihat catatan pada migrasi
 *   `create_officials_table` sebelum menambah medan apa pun.
 * ────────────────────────────────────────────────────────────────────────
 *
 * Foto menunjuk aset statis frontend (`frontend/public/pejabat/*.png`) yang
 * ikut dibundel bersama Next.js. Lintasannya berawalan "/" dan diteruskan apa
 * adanya oleh `Official::getPhotoUrlAttribute` — jadi seeder ini tidak perlu
 * menyalin berkas apa pun ke `storage/`.
 */
class OfficialSeeder extends Seeder
{
    public function run(): void
    {
        // Urutan array = urutan tampil, mengikuti hierarki jabatan.
        // Kepala Kantor WAJIB pertama: halaman profil menandai entri pertama
        // sebagai kepala kantor.
        $pejabat = [
            [
                'slug' => 'kadek',
                'name' => 'I Kadek Yuli Sastrawan, S.Ikom., S.SiT.',
                'title' => 'Kepala BLU Kantor UPBU Kelas I A.P.T. Pranoto',
                'short_title' => 'Kepala Kantor',
                'photo' => '/pejabat/kadek.png',
                'position_history' => [
                    'Kepala Kantor Otoritas Bandara Wilayah VII Sepinggan – Balikpapan (Juni 2024 – Agustus 2024)',
                    'Kepala Bidang Pelayanan dan Pengoperasian Bandar Udara Kantor Otoritas Bandara Wilayah IV Bali (2024-2025)',
                    'Kepala BLU Kantor UPBU Kelas I A.P.T. Pranoto – Samarinda (2025 – sekarang)',
                ],
                'awards' => [
                    'Satya Lancana Karya Satya 10 Tahun (2014)',
                    'Satya Lancana Karya Satya 20 Tahun (2018)',
                ],
            ],
            [
                'slug' => 'zaldi',
                'name' => 'Zaldi Ardian, A.Md',
                'title' => 'Kepala Subbagian Keuangan dan Tata Usaha',
                'short_title' => 'Kasubbag Keuangan & Tata Usaha',
                'photo' => '/pejabat/zaldi.png',
                'position_history' => [
                    'Kepala Kantor UPBU Maratua (2020–2024)',
                    'Kepala Subbagian Tata Usaha (2024–Sekarang)',
                ],
                'awards' => ['Satya Lancana Karya Satya 10.'],
            ],
            [
                'slug' => 'ikhsan',
                'name' => 'Mochamad Ikhsan Fadilah, SE, M.M.Tr',
                'title' => 'Kepala Seksi Keamanan Penerbangan dan Pelayanan Darurat',
                'short_title' => 'Kasi Keamanan Penerbangan & Pelayanan Darurat',
                'photo' => '/pejabat/ikhsan.png',
                'position_history' => [
                    'Kepala Urusan Tata Usaha (2019–2020)',
                    'Kepala UPBU Kelas III Yuvai Semaring (2020–2024)',
                    'Kepala Seksi Teknik dan Operasi (2024–2025)',
                    'Kepala Seksi Keamanan Penerbangan dan Pelayanan Darurat (2025–Sekarang).',
                ],
                'awards' => ['Satya Lancana Karya Satya 10 Tahun 2021.'],
            ],
            [
                'slug' => 'roslan',
                'name' => 'Roslan, S.E.',
                'title' => 'Kepala Seksi Pelayanan dan Kerjasama',
                'short_title' => 'Kasi Pelayanan & Kerjasama',
                'photo' => '/pejabat/roslan.png',
                'position_history' => [
                    'Kepala Seksi Pelayanan Bandara Juwata Tarakan (2018-2025)',
                    'Kepala Seksi Pelayanan dan Kerjasama (2025-sekarang)',
                ],
                'awards' => [
                    'Satya Lancana Karya Satya 10 Tahun 2012',
                    'Satya Lancana Karya Satya 20 Tahun 2020',
                ],
            ],
            [
                'slug' => 'murdoko',
                'name' => 'MURDOKO, S.H.',
                'title' => 'Kepala Seksi Teknik dan Operasi',
                'short_title' => 'Kasi Teknik & Operasi',
                'photo' => '/pejabat/murdoko.png',
                'position_history' => [
                    'Kepala Seksi Teknik, Operasi, Keamanan dan Pelayanan UPBU Kelas II Iskandar Pangkalan Bun (2019–2023)',
                    // Salah ketik "Pelayann" ADA PADA SUMBER. Dipertahankan apa adanya.
                    'Kepala Seksi Keamanan Penerbangan dan Pelayann Darurat UPBU Kelas III A.P.T. Pranoto. (2023–2025)',
                    'Kepala Seksi Teknik dan Operasi UPBU Kelas III A.P.T. Pranoto. (2025–Sekarang)',
                ],
                'awards' => [
                    'Satya Lancana Karya Satya 10 Tahun 2012.',
                    'Satya Lancana Karya Satya 20 Tahun 2021',
                ],
            ],
        ];

        foreach ($pejabat as $urutan => $data) {
            // `updateOrCreate` pada slug supaya seeder aman dijalankan ulang.
            //
            // `photo` sengaja TIDAK ikut diperbarui bila barisnya sudah ada:
            // petugas yang mengunggah foto baru lewat panel admin tidak boleh
            // kehilangan unggahannya hanya karena seeder dijalankan lagi.
            $ada = Official::where('slug', $data['slug'])->first();

            Official::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'name' => $data['name'],
                    'title' => $data['title'],
                    'short_title' => $data['short_title'],
                    'photo' => $ada?->photo ?? $data['photo'],
                    'position_history' => $data['position_history'],
                    'awards' => $data['awards'],
                    'sort_order' => $urutan,
                    'is_published' => true,
                ],
            );
        }
    }
}
