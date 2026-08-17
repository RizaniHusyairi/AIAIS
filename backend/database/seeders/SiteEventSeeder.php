<?php

namespace Database\Seeders;

use App\Models\SiteEvent;
use Illuminate\Database\Seeder;

/**
 * Perayaan bertanggal untuk animasi sambutan beranda.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : UU 24/2009 (Hari Kemerdekaan, 17 Agustus) dan kalender Masehi
 *             (Tahun Baru, 1 Januari). Rentang Posko Nataru mengikuti pola
 *             posko angkutan Natal & Tahun Baru Kementerian Perhubungan yang
 *             sudah dipakai modul Posko Nataru portal ini.
 *   Ditulis : 17 Agustus 2026
 *
 * YANG SENGAJA TIDAK DI-SEED — DAN INI YANG PALING PENTING
 *
 *   Idul Fitri, Tahun Baru Islam, Nyepi, dan Imlek TIDAK ada di sini.
 *
 *   Keempatnya mengikuti kalender Hijriah, Saka, dan Tionghoa; tanggal
 *   Masehinya bergeser tiap tahun dan ditetapkan lewat SKB Tiga Menteri yang
 *   terbit beberapa bulan sebelumnya. Menuliskan tebakan di sini berarti
 *   mengarang tanggal hari besar keagamaan pada portal resmi bandara —
 *   dilarang tegas oleh aturan proyek, dan salah tanggal pada hari besar
 *   keagamaan bukan kekeliruan kecil.
 *
 *   Panel /admin/perayaan menyediakan temanya; petugas mengisi tanggalnya
 *   setiap kali SKB terbit.
 * ────────────────────────────────────────────────────────────────────────
 */
class SiteEventSeeder extends Seeder
{
    public function run(): void
    {
        $tahun = (int) date('Y');

        $perayaan = [
            [
                'name' => 'Hari Kemerdekaan Republik Indonesia',
                'theme' => 'kemerdekaan',
                'starts_on' => "$tahun-08-17",
                'ends_on' => "$tahun-08-17",
                'greeting' => 'Dirgahayu Republik Indonesia',
                'subgreeting' => 'Bandar Udara APT Pranoto Samarinda',
                'priority' => 1,
            ],
            [
                'name' => 'Tahun Baru Masehi',
                'theme' => 'tahun-baru',
                'starts_on' => ($tahun + 1) . '-01-01',
                'ends_on' => ($tahun + 1) . '-01-01',
                'greeting' => 'Selamat Tahun Baru',
                'subgreeting' => 'Semoga tahun ini membawa perjalanan yang aman dan lancar',
                // Angka lebih kecil daripada Nataru: keduanya bertindih pada
                // 1 Januari, dan hari itu Tahun Baru yang harus menang.
                'priority' => 2,
            ],
            [
                'name' => 'Posko Angkutan Natal & Tahun Baru',
                'theme' => 'nataru',
                'starts_on' => "$tahun-12-18",
                'ends_on' => ($tahun + 1) . '-01-05',
                'greeting' => 'Selamat Hari Natal & Tahun Baru',
                'subgreeting' => 'Selamat datang di Bandar Udara APT Pranoto',
                'priority' => 5,
            ],
        ];

        foreach ($perayaan as $baris) {
            // `updateOrCreate` pada nama + tanggal mulai: menjalankan seeder
            // dua kali tidak boleh menggandakan perayaan yang sama, tetapi
            // perayaan tahun berikutnya memang baris tersendiri.
            SiteEvent::updateOrCreate(
                ['theme' => $baris['theme'], 'starts_on' => $baris['starts_on']],
                $baris,
            );
        }
    }
}
