<?php

namespace Database\Seeders;

use App\Models\PpidImageDocument;
use Illuminate\Database\Seeder;

/**
 * Tiga dokumen bergambar yang selama ini tayang di halaman Profil PPID.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id (situs produksi v1), halaman
 *             /informasi-publik/profil-ppid-blu.
 *   Perantara: frontend/src/lib/ppidData.ts konstanta `PPID_DOKUMEN` beserta
 *             berkas gambarnya di frontend/public/ppid/, yang provenansnya
 *             tercatat di kepala berkas itu (diambil 2 Agustus 2026,
 *             disilang-periksa dengan Blade v1).
 *   Catatan  : judul, keterangan, dan urutan disalin APA ADANYA. Gambarnya
 *             TIDAK disalin ke disk backend — `image_path` menunjuk aset
 *             statis frontend yang sudah ada ("/ppid/..."), jadi tampilan
 *             publik tidak berubah satu piksel pun. Begitu petugas mengganti
 *             gambarnya lewat panel, baris itu beralih ke berkas unggahan.
 * ────────────────────────────────────────────────────────────────────────
 *
 * Seeder ini menggantikan konstanta `PPID_DOKUMEN` yang dihapus dari
 * frontend. Tanpa baris-baris ini, bagian "Dokumen Publik" lenyap dari /ppid.
 *
 * Aman diulang: kuncinya judul, dan baris yang sudah disunting petugas tidak
 * ditimpa.
 */
class PpidImageDocumentSeeder extends Seeder
{
    public function run(): void
    {
        $dokumen = [
            [
                'title' => 'Struktur Organisasi PPID',
                'description' => 'Susunan tim pengelola informasi dan dokumentasi bandara.',
                'image_path' => '/ppid/struktur-ppid.jpg',
            ],
            [
                'title' => 'Maklumat Pelayanan',
                'description' => 'Janji layanan PPID kepada masyarakat.',
                'image_path' => '/ppid/maklumat-pelayanan.png',
            ],
            [
                'title' => 'Standar Biaya Layanan',
                'description' => 'Rincian biaya penggandaan dan pengiriman informasi publik.',
                'image_path' => '/ppid/standar-biaya-layanan.png',
            ],
        ];

        foreach ($dokumen as $urutan => $d) {
            PpidImageDocument::firstOrCreate(
                ['title' => $d['title']],
                $d + ['sort_order' => $urutan + 1, 'is_active' => true],
            );
        }
    }
}
