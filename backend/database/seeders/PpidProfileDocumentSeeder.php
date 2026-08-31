<?php

namespace Database\Seeders;

use App\Models\PpidProfileDocument;
use Illuminate\Database\Seeder;

/**
 * SK Tim PPID yang selama ini tayang di halaman Profil PPID.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id (situs produksi v1), halaman
 *             /informasi-publik/profil-ppid-blu — tombol "SK Tim PPID".
 *   Perantara: frontend/src/lib/ppidData.ts konstanta `PPID_SK`, yang
 *             provenansnya sendiri tercatat di kepala berkas itu
 *             (diambil 2 Agustus 2026, disilang-periksa dengan Blade v1).
 *   Catatan  : judul, keterangan, dan tautan Drive-nya disalin APA ADANYA.
 *             Nomor dan tanggal penetapan SK TIDAK dicantumkan karena tidak
 *             tertulis di halaman v1 maupun di repo — mengarangnya berarti
 *             mengarang data resmi. Petugas dapat melengkapinya dari panel
 *             setelah membuka dokumennya.
 *
 *             `published_date` diisi tanggal pengambilan data, bukan tanggal
 *             SK: kolomnya wajib, dan menebak tanggal penetapan sebuah surat
 *             keputusan lebih buruk daripada tanggal yang jelas-jelas hanya
 *             menandai kapan barisnya masuk portal.
 * ────────────────────────────────────────────────────────────────────────
 *
 * Seeder ini menggantikan konstanta `PPID_SK` yang dihapus dari frontend.
 * Tanpa baris ini, SK yang selama ini tayang lenyap dari portal.
 *
 * Laporan Bulanan sengaja TIDAK diseed: tidak satu pun tayang di v1, dan
 * daftar kosong adalah keadaan yang jujur.
 */
class PpidProfileDocumentSeeder extends Seeder
{
    public function run(): void
    {
        PpidProfileDocument::firstOrCreate(
            [
                'type' => PpidProfileDocument::TYPE_SK,
                'document_link' => 'https://drive.google.com/file/d/1OPPKzeAyWu1J53CO0CG8Cbhhte-dFYLr/view',
            ],
            [
                'title' => 'SK Tim Pejabat Pengelola Informasi dan Dokumentasi (PPID)',
                'description' => 'Surat Keputusan resmi yang menetapkan tim dan struktur PPID di lingkungan BLU Kantor UPBU Kelas I A.P.T. Pranoto Samarinda.',
                'published_date' => '2026-08-02',
                'is_current' => true,
                'is_active' => true,
            ],
        );
    }
}
