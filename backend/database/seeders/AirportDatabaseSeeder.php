<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Complaint;
use App\Models\Document;
use App\Models\Facility;
use App\Models\News;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AirportDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Admin User
        //
        // `role` dan `is_accepted` disetel terpisah, bukan lewat
        // `updateOrCreate`: keduanya sengaja di luar `$fillable` supaya
        // kewenangan tidak pernah dapat diisi lewat mass assignment.
        $admin = User::updateOrCreate(
            ['email' => 'admin@aptpranoto-airport.id'],
            [
                'name' => 'Administrator Bandara AAP',
                'password' => Hash::make('password123'),
            ]
        );

        $admin->role = 'admin';
        $admin->is_accepted = true;
        $admin->save();

        // Jadwal penerbangan TIDAK di-seed.
        //
        // Sumber jadwal adalah FIDS bandara (lihat FlightController::index).
        // Baris contoh sebelumnya justru berbahaya: ketika umpan FIDS kosong
        // (mis. di luar jam operasi), portal menampilkannya sebagai jadwal
        // hari ini padahal datanya beku sejak seeding. Lebih baik kosong dan
        // jujur daripada terisi data lama yang tampak nyata.

        // 3. News Seeder
        $newsItems = [
            [
                'title' => 'Bandara APT Pranoto Siap Sambut Peningkatan Penumpang Libur Nasional & IKN',
                'slug' => 'bandara-apt-pranoto-sambut-peningkatan-penumpang-ikn',
                'category' => 'Berita Utama',
                'excerpt' => 'Pengelola Bandara APT Pranoto Samarinda menambah jam operasional serta fasilitas layanan publik untuk mengantisipasi lonjakan trafik udara.',
                'content' => '<p>Semarak pembangunan Ibu Kota Nusantara (IKN) mendorong peningkatan trafik udara di Bandara Aji Pangeran Tumenggung (APT) Pranoto Samarinda. Kepala Kantor UPBU Kelas I APT Pranoto menyampaikan bahwa koordinasi bersama maskapai penerbangan telah dilakukan untuk mengantisipasi demand tiket pesawat.</p><p>Selain peningkatan layanan darat, sistem informasi digital terpadu AIAIS resmi diimplementasikan guna memberikan kenyamanan maksimal bagi para pengguna jasa penerbangan.</p>',
                'thumbnail' => 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&auto=format&fit=crop',
                'author' => 'Humas UPBU AAP',
                'views_count' => 1240,
                'is_featured' => true,
                'status' => 'published',
                'published_at' => now()->subDays(2),
            ],
            [
                'title' => 'Pemasangan Fasilitas Auto-Gate Baru di Terminal Keberangkatan Domestik',
                'slug' => 'pemasangan-fasilitas-auto-gate-baru-terminal-keberangkatan',
                'category' => 'Fasilitas',
                'excerpt' => 'Integrasi boarding pass elektronik modern kini hadir di Terminal Keberangkatan Bandara APT Pranoto untuk proses verifikasi yang lebih cepat.',
                'content' => '<p>Guna meningkatkan keselamatan dan kecepatan layanan pemeriksaan keamanan (Security Check Point 2), Bandara APT Pranoto mengoperasikan sistem auto-gate terpadu. Penumpang kini cukup memindai barcode e-boarding pass pada gate otomatis.</p>',
                'thumbnail' => 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop',
                'author' => 'Unit Pelayanan & TI',
                'views_count' => 850,
                'is_featured' => false,
                'status' => 'published',
                'published_at' => now()->subDays(5),
            ],
            [
                'title' => 'Penyelenggaraan Latihan Bersama Penanggulangan Keadaan Darurat (PKP-PK)',
                'slug' => 'penyelenggaraan-latihan-bersama-pkp-pk-2026',
                'category' => 'Kegiatan',
                'excerpt' => 'Tim PKP-PK Bandara APT Pranoto bersama Basarnas dan Dinas Kesehatan menggelar simulasi keadaan darurat penerbangan.',
                'content' => '<p>Latihan bertajuk Emergency Preparedness 2026 dilaksanakan untuk menguji kesiapsiagaan personil dan peralatan pemadam kebakaran penerbangan dalam merespons kejadian darurat secara terukur dan efisien.</p>',
                'thumbnail' => 'https://images.unsplash.com/photo-1519074069444-1ba4eae720b6?w=800&auto=format&fit=crop',
                'author' => 'Humas UPBU AAP',
                'views_count' => 540,
                'is_featured' => false,
                'status' => 'published',
                'published_at' => now()->subDays(10),
            ],
        ];

        foreach ($newsItems as $news) {
            News::create($news);
        }

        // 4. Announcements Seeder
        $announcements = [
            [
                'title' => 'Himbauan Waktu Tiba Penumpang',
                'content' => 'Penumpang dihimbau untuk tiba di bandara setidaknya 2 jam sebelum waktu keberangkatan domestik.',
                'priority' => 'high',
                'is_active' => true,
                'target_audience' => 'Semua Penumpang',
                'valid_until' => now()->addMonths(6),
            ],
            [
                'title' => 'Ketentuan Barang Bawaan Cairan (LAGs)',
                'content' => 'Sesuai regulasi penerbangan, barang cair, aerosol, dan gel dalam kabin maksimal 100ml per wadah.',
                'priority' => 'medium',
                'is_active' => true,
                'target_audience' => 'Penumpang Kabin',
                'valid_until' => now()->addYear(),
            ],
        ];

        foreach ($announcements as $a) {
            Announcement::create($a);
        }

        // 5. Facilities Seeder
        $facilities = [
            [
                'name' => 'Oasis Executive Lounge',
                'category' => 'Layanan Khusus',
                'location_description' => 'Lantai 2 Terminal Keberangkatan (Dekat Gate 2)',
                'icon' => 'Armchair',
                'description' => 'Lounge eksklusif dilengkapi prasmanan kuliner, Wi-Fi kencang, sofa santai, dan ruang rapat VIP.',
                'is_operational' => true,
            ],
            [
                'name' => 'Musholla Utama Al-Muthmainnah',
                'category' => 'Keagamaan',
                'location_description' => 'Lantai 1 Area Kedatangan & Lantai 2 Keberangkatan',
                'icon' => 'Building2',
                'description' => 'Musholla ber-AC yang luas, bersih, dengan tempat wudhu terpisah untuk pria dan wanita.',
                'is_operational' => true,
            ],
            [
                'name' => 'Nursery & Baby Care Room',
                'category' => 'Umum',
                'location_description' => 'Samping Gate 3 Keberangkatan',
                'icon' => 'HeartHandshake',
                'description' => 'Ruang laktasi steril khusus ibu dan bayi, dilengkapi tempat ganti popok dan dispenser air hangat.',
                'is_operational' => true,
            ],
            [
                'name' => 'Pos Kesehatan & Pertolongan Pertama',
                'category' => 'Kesehatan',
                'location_description' => 'Lantai 1 Gedung Terminal Samping Check-in Counter',
                'icon' => 'Stethoscope',
                'description' => 'Tim medis Karantina Kesehatan Pelabuhan siap 24/7 dengan ambulans siaga.',
                'is_operational' => true,
            ],
            [
                'name' => 'Area Parkir Terpadu & Fast Charger EV',
                'category' => 'Transportasi',
                'location_description' => 'Halaman Depan Terminal',
                'icon' => 'Car',
                'description' => 'Kapasitas 1.000+ mobil dan kendaraan roda dua dengan pengawasan CCTV 24 jam.',
                'is_operational' => true,
            ],
        ];

        foreach ($facilities as $fac) {
            Facility::create($fac);
        }

        // 6. Tenants Seeder
        $tenants = [
            [
                'name' => 'Roti O & Coffee',
                'category' => 'food_beverage',
                'location' => 'Lantai 1 Lobby Keberangkatan',
                'operating_hours' => '05:30 - 20:00 WITA',
                'contact_phone' => '0812-3456-7890',
                'image_path' => 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop',
                'description' => 'Coffee bun hangat dan sajian kopi spesial khas bandara.',
                'is_active' => true,
            ],
            [
                'name' => 'Solaria Restaurant',
                'category' => 'food_beverage',
                'location' => 'Lantai 2 Food Court',
                'operating_hours' => '06:00 - 20:30 WITA',
                'contact_phone' => '0811-9876-5432',
                'image_path' => 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop',
                'description' => 'Menu masakan Nusantara dan oriental favorit penumpang.',
                'is_active' => true,
            ],
            [
                'name' => 'Oleh-Oleh Khas Samarinda (Amplang Mahakam)',
                'category' => 'retail',
                'location' => 'Lantai 2 Commercial Area',
                'operating_hours' => '06:00 - 19:30 WITA',
                'contact_phone' => '0852-1122-3344',
                'image_path' => 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=600&auto=format&fit=crop',
                'description' => 'Pusat amplang, kain sarung samarinda, dan cinderamata khas Kaltim.',
                'is_active' => true,
            ],
            // Tidak ada mitra kategori `transportation` di sini.
            //
            // Sebelumnya ada satu: "DAMRI Bus Bandara - Samarinda Kota &
            // Balikpapan", lengkap dengan nomor telepon 0813-4455-6677 dan foto
            // Unsplash. Ketiganya dikarang. Daftar transportasi bandara —
            // termasuk konter taksi koperasi di area kedatangan — didaftarkan
            // petugas dari panel admin, karena nama koperasi, jam layanan, dan
            // nomor kontaknya berubah dari waktu ke waktu. Sampai itu diisi,
            // `/tenants#transportasi` dan `/app/transportasi` menampilkan
            // keadaan kosong apa adanya.
        ];

        foreach ($tenants as $t) {
            Tenant::create($t);
        }

        // 7. Complaints Seeder
        $complaints = [
            [
                'ticket_number' => 'TKT-20260720-001',
                'reporter_name' => 'Budi Santoso',
                'reporter_email' => 'budi.santoso@email.com',
                'reporter_phone' => '081298765432',
                'category' => 'Fasilitas',
                'subject' => 'WIFI Publik di Gate 2 agak lambat',
                'description' => 'Mohon ditingkatkan kecepatan wifi gratis di ruang tunggu gate 2 saat jam padat.',
                'status' => 'resolved',
                'admin_response' => 'Terima kasih atas masukannya. Tim IT telah menambah bandwidth AP Gate 2.',
                'responded_at' => now()->subDay(),
            ],
            [
                'ticket_number' => 'TKT-20260721-002',
                'reporter_name' => 'Siti Rahma',
                'reporter_email' => 'siti.rahma@email.com',
                'reporter_phone' => '081377889900',
                'category' => 'Kebersihan',
                'subject' => 'Kebersihan toilet kedatangan',
                'description' => 'Air meluap sedikit di toilet pria dekat baggage claim 1 pada pukul 08.00.',
                'status' => 'in_progress',
                'admin_response' => 'Petugas janitor sedang melakukan penanganan perbaikan pipa.',
                'responded_at' => now()->subHours(4),
            ],
        ];

        foreach ($complaints as $c) {
            Complaint::create($c);
        }

        // 8. Documents Seeder
        $documents = [
            [
                'title' => 'Panduan Keselamatan & Hak Penumpang Penerbangan',
                'category' => 'Panduan Penumpang',
                'file_type' => 'PDF',
                'file_size' => '2.4 MB',
                'file_url' => 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                'download_count' => 320,
            ],
            [
                'title' => 'Tarif Pas Bandara & Pelayanan Jasa Penumpang Udara (PJP2U)',
                'category' => 'Regulasi',
                'file_type' => 'PDF',
                'file_size' => '1.1 MB',
                'file_url' => 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                'download_count' => 195,
            ],
            [
                'title' => 'Formulir Pengajuan Izin Pas Masuk Area Terbatas Bandara',
                'category' => 'Formulir',
                'file_type' => 'PDF',
                'file_size' => '850 KB',
                'file_url' => 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                'download_count' => 480,
            ],
        ];

        foreach ($documents as $doc) {
            Document::create($doc);
        }

        // 9. Kunjungan — SENGAJA TIDAK DITABURI.
        //
        // Seeder ini dulu membuat 50 kunjungan karangan. Angka `visitor_logs`
        // kini ditayangkan di footer portal untuk dilihat publik dan dicatat
        // dari permintaan sungguhan lewat VisitorController, sehingga baris
        // palsu berarti memajang jumlah pengunjung yang tidak pernah ada.
    }
}
