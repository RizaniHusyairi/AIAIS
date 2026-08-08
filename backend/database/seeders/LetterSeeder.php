<?php

namespace Database\Seeders;

use App\Models\Letter;
use Illuminate\Database\Seeder;

/**
 * Surat regulasi yang NYATA tayang di portal v1.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id/regulasi/surat-keputusan
 *   Diambil : 7 Agustus 2026
 *   Catatan : basis data v1 di repo legacy hanya berisi contoh karangan
 *             (SE/001/2025 dst.) yang berkasnya tidak pernah ada, jadi tidak
 *             dipakai. Halaman Surat Edaran v1 kosong ("Saat ini belum ada
 *             Surat Edaran yang tersedia"), maka di sini pun tidak ada
 *             barisnya — mengarang isinya berarti menerbitkan surat palsu.
 *
 *   `file_path` berisi URL penuh ke berkas yang masih dilayani server v1.
 *   Setelah PDF-nya dipindahkan ke cakram v2, ganti nilainya dengan lintasan
 *   relatif (mis. "letters/xxx.pdf") lewat halaman admin regulasi.
 * ────────────────────────────────────────────────────────────────────────
 */
class LetterSeeder extends Seeder
{
    public function run(): void
    {
        $letters = [
            [
                'type' => 'keputusan',
                'number' => 'AU.108/8121/APTP/2025',
                'title' => 'Penetapan Dokumen Standar Pelayanan Jasa Kebandarudaraan di Bandar Udara Kelas I Aji Pangeran Tumenggung Pranoto - Samarinda',
                'issue_date' => '2025-10-29',
                'file_path' => 'https://aptpairport.id/uploads/uploads/letters/77XZ4QMrNoNKz122ltZxh2eCr8B7vsgGF2cDBiWa.pdf',
            ],
        ];

        foreach ($letters as $letter) {
            Letter::updateOrCreate(['number' => $letter['number']], $letter);
        }
    }
}
